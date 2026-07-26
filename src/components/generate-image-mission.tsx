"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CldImage } from "next-cloudinary";
import {
  Bot,
  FolderCheck,
  KeyRound,
  Sparkles,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  GENERATION_MODELS,
  isGenerationFamily,
  isGenerationTier,
  type GenerationFamily,
  type GenerationTier,
} from "@/lib/generation-models";
import type { PortfolioAsset } from "@/lib/portfolio-types";

type GenerationState = "idle" | "generating" | "success" | "error";

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
      typeof asset.cloudName === "string" &&
      asset.resourceType === "image" &&
      typeof asset.width === "number" &&
      typeof asset.height === "number" &&
      typeof asset.assetFolder === "string",
  );
}

function getMessage(value: unknown, fallback: string) {
  const record = readRecord(value);
  return typeof record?.message === "string" ? record.message : fallback;
}

export function GenerateImageMission({
  assetFolder,
  generationReady,
  onGenerated,
}: {
  assetFolder: string;
  generationReady: boolean;
  onGenerated: (asset: PortfolioAsset) => void;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(
    "A playful editorial portrait of a Kenyan creative technologist in a colorful paper-cut studio",
  );
  const [family, setFamily] =
    useState<GenerationFamily>("nano-banana");
  const [tier, setTier] = useState<GenerationTier>("standard");
  const [adminToken, setAdminToken] = useState("");
  const [state, setState] = useState<GenerationState>("idle");
  const [message, setMessage] = useState("");
  const [generatedAsset, setGeneratedAsset] =
    useState<PortfolioAsset | null>(null);
  const selectedModel =
    GENERATION_MODELS.find((model) => model.id === family) ||
    GENERATION_MODELS[0];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!generationReady || state === "generating") {
      return;
    }

    setState("generating");
    setMessage(
      "Cloudinary is generating a 1K managed asset. This can take up to two minutes.",
    );

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          family,
          tier,
          adminToken,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const record = readRecord(payload);

      if (!response.ok || record?.ok !== true) {
        throw new Error(
          getMessage(
            payload,
            "Cloudinary could not generate this image. Check the add-on and account quota.",
          ),
        );
      }

      if (!isPortfolioAsset(record.asset)) {
        throw new Error(
          "Cloudinary completed the request without a verified portfolio asset.",
        );
      }

      const generation = readRecord(record.generation);
      const description = readRecord(record.description);
      const quotaRemaining =
        typeof generation?.quotaRemaining === "number"
          ? generation.quotaRemaining
          : null;

      setGeneratedAsset(record.asset);
      setState("success");
      setMessage(
        `Generated with ${selectedModel.name} and verified in ${record.asset.assetFolder}.${description?.stored === true ? " Cloudinary AI Vision stored its alt text and caption." : ` ${typeof description?.message === "string" ? description.message : "AI description is pending."}`}${quotaRemaining === null ? "" : ` Image generation quota remaining: ${quotaRemaining}.`}`,
      );
      setAdminToken("");
      onGenerated(record.asset);
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The image generation request did not finish.",
      );
    }
  }

  if (!generationReady) {
    return (
      <Alert>
        <Bot aria-hidden="true" />
        <AlertTitle>Image generation needs server configuration</AlertTitle>
        <AlertDescription>
          Enable the Cloudinary Image Generation add-on, then add API
          credentials, an edit token, and a signed generation preset whose
          destination folder is <code>{assetFolder}</code>.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_16rem]">
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="generation-prompt">
              Describe the portfolio image
            </FieldLabel>
            <Textarea
              id="generation-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              minLength={12}
              maxLength={600}
              rows={4}
              required
              disabled={state === "generating"}
              placeholder="A cinematic editorial portrait with..."
            />
            <FieldDescription>
              {prompt.length}/600 characters. Review generated output before
              publishing it.
            </FieldDescription>
          </Field>

          <FieldSet>
            <FieldLegend variant="label">Generation model</FieldLegend>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="generation-family">
                  Model family
                </FieldLabel>
                <Select
                  value={family}
                  disabled={state === "generating"}
                  onValueChange={(value) => {
                    if (isGenerationFamily(value)) {
                      setFamily(value);
                    }
                  }}
                >
                  <SelectTrigger id="generation-family" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Cloudinary model families</SelectLabel>
                      {GENERATION_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  {selectedModel.purpose}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="generation-tier">
                  Model tier
                </FieldLabel>
                <Select
                  value={tier}
                  disabled={state === "generating"}
                  onValueChange={(value) => {
                    if (isGenerationTier(value)) {
                      setTier(value);
                    }
                  }}
                >
                  <SelectTrigger id="generation-tier" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Generation tier</SelectLabel>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Premium models can consume more add-on quota.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>

          <Field>
            <FieldLabel htmlFor="generation-token">
              Portfolio edit token
            </FieldLabel>
            <Input
              id="generation-token"
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              autoComplete="current-password"
              required
              disabled={state === "generating"}
              placeholder="Protect generation credits"
            />
            <FieldDescription>
              The route verifies this token before using server-only
              Cloudinary credentials.
            </FieldDescription>
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={
                state === "generating" ||
                prompt.trim().length < 12 ||
                !adminToken
              }
            >
              {state === "generating" ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Sparkles data-icon="inline-start" />
              )}
              {state === "generating"
                ? "Generating managed asset"
                : "Generate with Cloudinary"}
            </Button>
            <Badge variant="outline">
              <FolderCheck data-icon="inline-start" />
              {assetFolder}
            </Badge>
          </div>
        </FieldGroup>
      </form>

      <div className="flex min-h-64 flex-col gap-3">
        {generatedAsset ? (
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
            <CldImage
              src={generatedAsset.publicId}
              alt={
                generatedAsset.alt ||
                "Generated portfolio preview awaiting AI description"
              }
              fill
              crop="fill"
              gravity="auto"
              sizes="(max-width: 1024px) 100vw, 16rem"
              config={{
                cloud: {
                  cloudName: generatedAsset.cloudName,
                },
              }}
              className="object-cover"
            />
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-background/70 p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-secondary/15">
                <KeyRound
                  aria-hidden="true"
                  className="size-6 text-secondary"
                />
              </span>
              <p className="text-sm text-muted-foreground">
                Your API secret stays on the server. The generated original
                returns here after Cloudinary verifies its folder.
              </p>
            </div>
          </div>
        )}

        {message ? (
          <Alert
            variant={state === "error" ? "destructive" : "default"}
            aria-live="polite"
          >
            <Sparkles aria-hidden="true" />
            <AlertTitle>
              {state === "error"
                ? "Generation did not finish"
                : state === "success"
                  ? "Managed asset ready"
                  : "Generation in progress"}
            </AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
