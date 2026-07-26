"use client";

import { useActionState } from "react";
import {
  CheckCircle2,
  KeyRound,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { generateAssetStory } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type {
  DescriptionActionState,
  PortfolioAsset,
} from "@/lib/portfolio-types";

const initialState: DescriptionActionState = {
  status: "idle",
  message: "",
};

export function AiStoryPanel({
  asset: initialAsset,
  editReady,
}: {
  asset: PortfolioAsset;
  editReady: boolean;
}) {
  const asset = initialAsset;
  const [state, formAction, pending] = useActionState(
    generateAssetStory,
    initialState,
  );
  const hasDescription = Boolean(asset.alt && asset.caption);

  if (asset.resourceType !== "image") {
    return (
      <Alert>
        <WandSparkles aria-hidden="true" />
        <AlertTitle>Image descriptions only</AlertTitle>
        <AlertDescription>
          This AI Vision mission generates alt text and captions for images.
          Video accessibility needs a separate transcription and description
          workflow.
        </AlertDescription>
      </Alert>
    );
  }

  if (hasDescription) {
    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <Sparkles data-icon="inline-start" />
            {asset.descriptionSource === "cloudinary_ai_vision"
              ? "Cloudinary AI Vision"
              : "Cloudinary context"}
          </Badge>
          {asset.descriptionModel ? (
            <Badge variant="outline">
              Model {asset.descriptionModel}
            </Badge>
          ) : null}
        </div>

        <div className="grid gap-3">
          <div className="rounded-xl bg-muted p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Accessible alt text
            </p>
            <p className="mt-2 leading-6">{asset.alt}</p>
          </div>
          <div className="rounded-xl bg-secondary/10 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Portfolio caption
            </p>
            <p className="mt-2 leading-6">{asset.caption}</p>
          </div>
        </div>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-secondary"
          />
          Stored as Cloudinary context metadata and read back by immutable
          asset ID.
        </p>

        {state.status !== "idle" ? (
          <Alert aria-live="polite">
            <CheckCircle2 aria-hidden="true" />
            <AlertTitle>AI story ready</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  }

  if (!editReady) {
    return (
      <Alert>
        <KeyRound aria-hidden="true" />
        <AlertTitle>AI description is not configured</AlertTitle>
        <AlertDescription>
          Add the server-side Cloudinary credentials and portfolio edit token
          to describe older images.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="assetId" value={asset.assetId} />
      <Alert>
        <Sparkles aria-hidden="true" />
        <AlertTitle>Let Cloudinary write this story</AlertTitle>
        <AlertDescription>
          This older image has no stored description. AI Vision will generate
          separate alt text and a caption, then save both to Cloudinary.
        </AlertDescription>
      </Alert>

      <Field>
        <FieldLabel htmlFor={`describe-token-${asset.assetId}`}>
          Portfolio edit token
        </FieldLabel>
        <Input
          id={`describe-token-${asset.assetId}`}
          name="adminToken"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          placeholder="Authorize AI Vision for this older asset"
        />
        <FieldDescription>
          New uploads are described automatically from their verified
          Cloudinary upload response.
        </FieldDescription>
      </Field>

      <Button
        type="submit"
        disabled={pending}
      >
        {pending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <WandSparkles data-icon="inline-start" />
        )}
        {pending
          ? "Generating alt text and caption"
          : "Generate story with Cloudinary AI"}
      </Button>

      {state.status !== "idle" ? (
        <Alert
          variant={state.status === "error" ? "destructive" : "default"}
          aria-live="polite"
        >
          <Sparkles aria-hidden="true" />
          <AlertTitle>
            {state.status === "error"
              ? "Description failed"
              : "AI story ready"}
          </AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
