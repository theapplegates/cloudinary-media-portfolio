"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CldUploadWidget,
  type CloudinaryUploadWidgetInfo,
  type CloudinaryUploadWidgetOptions,
} from "next-cloudinary";
import {
  Camera,
  CheckCircle2,
  CloudUpload,
  ImagePlus,
  Sparkles,
} from "lucide-react";

import { GenerateImageMission } from "@/components/generate-image-mission";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type {
  PortfolioAsset,
  PortfolioFolderMode,
} from "@/lib/portfolio-types";

function isUploadInfo(
  info: string | CloudinaryUploadWidgetInfo | undefined,
): info is CloudinaryUploadWidgetInfo {
  return (
    typeof info === "object" &&
    info !== null &&
    typeof info.public_id === "string" &&
    typeof info.asset_id === "string"
  );
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function isPortfolioAsset(value: unknown): value is PortfolioAsset {
  const asset = readRecord(value);

  return Boolean(
    asset &&
      typeof asset.assetId === "string" &&
      typeof asset.publicId === "string" &&
      typeof asset.alt === "string" &&
      typeof asset.caption === "string",
  );
}

function getMessage(value: unknown) {
  const record = readRecord(value);
  return typeof record?.message === "string"
    ? record.message
    : "Cloudinary AI Vision could not describe this image.";
}

function toPortfolioAsset(
  info: CloudinaryUploadWidgetInfo,
  cloudName: string,
  assetFolder: string,
): PortfolioAsset {
  const dynamicFolder =
    typeof info.asset_folder === "string" ? info.asset_folder : "";

  return {
    assetId: info.asset_id,
    publicId: info.public_id,
    cloudName,
    displayName:
      info.display_name ||
      info.original_filename ||
      info.public_id.split("/").at(-1) ||
      "New upload",
    resourceType: info.resource_type === "video" ? "video" : "image",
    format: info.format,
    width: info.width,
    height: info.height,
    bytes: info.bytes,
    duration:
      typeof info.duration === "number" ? info.duration : undefined,
    createdAt: info.created_at,
    secureUrl: info.secure_url,
    tags: info.tags || [],
    alt: info.context?.custom?.alt || "",
    caption: info.context?.custom?.caption || "",
    assetFolder: dynamicFolder || info.folder || assetFolder,
    isOptimistic: true,
  };
}

export function UploadMission({
  cloudName,
  assetFolder,
  generationReady,
  folderMode,
  uploadPreset,
  uploadReady,
  onUploaded,
}: {
  cloudName: string;
  assetFolder: string;
  generationReady: boolean;
  folderMode: PortfolioFolderMode;
  uploadPreset: string;
  uploadReady: boolean;
  onUploaded: (asset: PortfolioAsset) => void;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const uploadOptions: CloudinaryUploadWidgetOptions & {
    asset_folder?: string;
  } = {
    sources: ["local", "camera", "url"],
    multiple: true,
    maxFiles: 8,
    resourceType: "auto",
    clientAllowedFormats: [
      "jpg",
      "jpeg",
      "png",
      "webp",
      "avif",
      "gif",
      "mp4",
      "webm",
      "mov",
    ],
    maxImageFileSize: 12_000_000,
    maxVideoFileSize: 80_000_000,
    showAdvancedOptions: true,
    showPoweredBy: true,
    tags: ["media-portfolio-upload"],
    ...(folderMode === "fixed"
      ? { folder: assetFolder }
      : { asset_folder: assetFolder }),
  };

  async function describeUploadedImage(
    asset: PortfolioAsset,
    info: CloudinaryUploadWidgetInfo,
  ) {
    if (asset.resourceType !== "image") {
      return;
    }

    if (!info.version) {
      setMessage(
        `${asset.displayName} uploaded, but its response could not start AI Vision.`,
      );
      return;
    }

    setMessage(
      `${asset.displayName} uploaded. Cloudinary AI Vision is writing its alt text and caption...`,
    );

    try {
      const response = await fetch("/api/describe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assetId: asset.assetId,
          publicId: asset.publicId,
          version: info.version,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const record = readRecord(payload);

      if (!response.ok || record?.ok !== true) {
        throw new Error(getMessage(payload));
      }

      if (!isPortfolioAsset(record.asset)) {
        throw new Error(
          "Cloudinary completed the analysis without a verified portfolio asset.",
        );
      }

      const description = readRecord(record.description);
      const quotaRemaining =
        typeof description?.quotaRemaining === "number"
          ? description.quotaRemaining
          : null;

      onUploaded(record.asset);
      setMessage(
        `${asset.displayName} is ready with AI-generated alt text and caption.${quotaRemaining === null ? "" : ` AI Vision quota remaining: ${quotaRemaining}.`}`,
      );
      router.refresh();
    } catch (error) {
      setMessage(
        `${asset.displayName} uploaded, but its AI story failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  return (
    <Card className="relative overflow-hidden border-2 border-dashed border-primary/70 bg-primary/10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 size-52 rounded-full bg-secondary/15 blur-3xl"
      />
      <CardHeader>
        <Badge variant="secondary" className="w-fit">
          Mission 01
        </Badge>
        <CardTitle className="font-serif text-2xl sm:text-3xl">
          Add your next story
        </CardTitle>
        <CardDescription className="max-w-2xl text-base">
          Upload images or videos, or generate a managed image with
          Cloudinary&apos;s multi-model Image Generation API. Every source
          lands in one portfolio folder, and AI Vision writes image alt text
          and captions automatically.
        </CardDescription>
        <CardAction>
          <span className="grid size-12 place-items-center rounded-2xl bg-background shadow-sm">
            <ImagePlus aria-hidden="true" className="size-6 text-secondary" />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="min-w-0">
          <TabsList aria-label="Choose how to add portfolio media">
            <TabsTrigger value="upload">
              <CloudUpload data-icon="inline-start" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="generate">
              <Sparkles data-icon="inline-start" />
              Generate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="min-h-72 pt-5">
            <div className="flex flex-col gap-3">
              {uploadReady ? (
                <CldUploadWidget
                  uploadPreset={uploadPreset}
                  config={{ cloud: { cloudName } }}
                  options={uploadOptions}
                  onOpen={() => {
                    setUploading(true);
                    setMessage(
                      "Upload Widget opened. Choose up to eight assets.",
                    );
                  }}
                  onSuccess={(result) => {
                    if (isUploadInfo(result.info)) {
                      const asset = toPortfolioAsset(
                        result.info,
                        cloudName,
                        assetFolder,
                      );
                      onUploaded(asset);
                      setMessage(
                        `${result.info.original_filename || "Asset"} reached Cloudinary.`,
                      );
                      void describeUploadedImage(asset, result.info);
                    }
                  }}
                  onQueuesEnd={(_, { widget }) => {
                    setUploading(false);
                    setMessage(
                      "Upload complete. Refreshing while Cloudinary AI Vision finishes image descriptions...",
                    );
                    widget.close();
                    router.refresh();
                  }}
                  onError={(error) => {
                    setUploading(false);
                    setMessage(
                      typeof error === "string"
                        ? error
                        : "The upload did not finish. Check the preset restrictions.",
                    );
                  }}
                >
                  {({ open, isLoading }) => (
                    <Button
                      type="button"
                      size="lg"
                      className="w-full sm:w-fit"
                      disabled={Boolean(isLoading)}
                      onClick={() => open()}
                    >
                      {isLoading || uploading ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <CloudUpload data-icon="inline-start" />
                      )}
                      {isLoading || uploading
                        ? "Upload Widget is active"
                        : "Open Cloudinary Upload Widget"}
                    </Button>
                  )}
                </CldUploadWidget>
              ) : (
                <Alert>
                  <Camera aria-hidden="true" />
                  <AlertTitle>
                    Upload mission needs two public values
                  </AlertTitle>
                  <AlertDescription>
                    Copy <code>.env.example</code> to{" "}
                    <code>.env.local</code>, then add your cloud name and
                    unsigned upload preset. Configure that preset&apos;s Asset
                    folder or legacy destination folder as{" "}
                    <code>{assetFolder}</code>.
                  </AlertDescription>
                </Alert>
              )}

              <p
                className="min-h-5 text-sm text-muted-foreground"
                aria-live="polite"
              >
                {message}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="generate" className="min-h-72 pt-5">
            <GenerateImageMission
              assetFolder={assetFolder}
              generationReady={generationReady}
              onGenerated={onUploaded}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 aria-hidden="true" className="size-4 text-secondary" />
          One Cloudinary asset folder: {assetFolder}
        </span>
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 aria-hidden="true" className="size-4 text-secondary" />
          No API secret in the browser
        </span>
      </CardFooter>
    </Card>
  );
}
