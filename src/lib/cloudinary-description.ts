import "server-only";

import { z } from "zod";

import {
  findPortfolioAssetByAssetId,
  updatePortfolioDescription,
} from "@/lib/cloudinary";

interface AnalyzeApiResponse {
  data?: unknown;
  limits?: unknown;
  request_id?: unknown;
}

const descriptionSchema = z.object({
  alt: z.string().trim().min(5).max(220),
  caption: z.string().trim().min(5).max(320),
});

const outputSchema = {
  type: "object",
  properties: {
    alt: {
      type: "string",
      description:
        "Objective accessible alt text, 8 to 25 words, describing visible and relevant content without starting with image of or photo of.",
    },
    caption: {
      type: "string",
      description:
        "Concise editorial portfolio caption, 12 to 35 words, distinct from the alt text and without unsupported claims.",
    },
  },
  required: ["alt", "caption"],
  additionalProperties: false,
};

const DESCRIPTION_PROMPT = [
  "Create accessible metadata for this portfolio image.",
  "Describe only visible and relevant content.",
  "Do not identify people, infer sensitive traits, or start the alt text with image of or photo of.",
  "Return JSON matching this schema:",
  "```json",
  JSON.stringify(outputSchema),
  "```",
].join("\n");

export interface PortfolioDescriptionResult {
  asset: NonNullable<
    Awaited<ReturnType<typeof findPortfolioAssetByAssetId>>
  >;
  cached: boolean;
  modelVersion: string;
  quotaRemaining: number | null;
  requestId: string;
}

export class CloudinaryDescriptionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "CloudinaryDescriptionError";
  }
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getResponseValue(response: AnalyzeApiResponse) {
  const data = readRecord(response.data);
  const analysis = readRecord(data?.analysis);
  const responses = Array.isArray(analysis?.responses)
    ? analysis.responses
    : [];
  const first = readRecord(responses[0]);

  return {
    modelVersion:
      typeof analysis?.model_version === "number" ||
      typeof analysis?.model_version === "string"
        ? String(analysis.model_version)
        : "",
    value: readString(first?.value),
  };
}

function getQuotaRemaining(response: AnalyzeApiResponse) {
  const limits = readRecord(response.limits);
  const quotas = Array.isArray(limits?.addons_quota)
    ? limits.addons_quota
    : Array.isArray(limits?.items)
      ? limits.items
      : [];

  for (const item of quotas) {
    const quota = readRecord(item);
    if (
      quota?.type === "ai_vision" &&
      typeof quota.remaining === "number"
    ) {
      return quota.remaining;
    }
  }

  return null;
}

function getErrorMessage(payload: unknown, fallback: string) {
  const record = readRecord(payload);
  const error = readRecord(record?.error);

  return (
    readString(error?.message) ||
    readString(record?.error) ||
    readString(record?.message) ||
    fallback
  );
}

function getServerConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new CloudinaryDescriptionError(
      "Cloudinary AI descriptions need the cloud name and server-side API credentials.",
      503,
    );
  }

  return { cloudName, apiKey, apiSecret };
}

export async function describePortfolioImage(
  assetId: string,
): Promise<PortfolioDescriptionResult> {
  const asset = await findPortfolioAssetByAssetId(assetId);

  if (!asset) {
    throw new CloudinaryDescriptionError(
      "Cloudinary could not verify this asset inside the portfolio folder.",
      404,
    );
  }

  if (asset.resourceType !== "image") {
    throw new CloudinaryDescriptionError(
      "This AI Vision workflow currently describes image assets only.",
      415,
    );
  }

  if (
    asset.descriptionSource === "cloudinary_ai_vision" &&
    asset.alt &&
    asset.caption
  ) {
    return {
      asset,
      cached: true,
      modelVersion: asset.descriptionModel || "",
      quotaRemaining: null,
      requestId: "",
    };
  }

  const config = getServerConfig();
  const authorization = Buffer.from(
    `${config.apiKey}:${config.apiSecret}`,
  ).toString("base64");
  const response = await fetch(
    `https://api.cloudinary.com/v2/analysis/${encodeURIComponent(config.cloudName)}/analyze/ai_vision_general`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: {
          asset_id: asset.assetId,
        },
        prompts: [DESCRIPTION_PROMPT],
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  const payload: unknown = await response.json().catch(() => null);
  const record = readRecord(payload);
  const requestId = readString(record?.request_id);

  if (!response.ok) {
    throw new CloudinaryDescriptionError(
      getErrorMessage(
        payload,
        `Cloudinary AI Vision failed with status ${response.status}.`,
      ),
      response.status,
      requestId || undefined,
    );
  }

  const result = (record || {}) as AnalyzeApiResponse;
  const { modelVersion, value } = getResponseValue(result);
  let structuredValue: unknown;

  try {
    structuredValue = JSON.parse(value);
  } catch {
    throw new CloudinaryDescriptionError(
      "Cloudinary AI Vision returned an invalid structured description.",
      502,
      requestId || undefined,
    );
  }

  const description = descriptionSchema.safeParse(structuredValue);
  if (!description.success) {
    throw new CloudinaryDescriptionError(
      "Cloudinary AI Vision returned alt text or a caption outside the expected limits.",
      502,
      requestId || undefined,
    );
  }

  await updatePortfolioDescription(
    asset.publicId,
    asset.resourceType,
    description.data.alt,
    description.data.caption,
    modelVersion,
  );
  const persistedAsset = await findPortfolioAssetByAssetId(asset.assetId);

  if (
    !persistedAsset ||
    persistedAsset.alt !== description.data.alt ||
    persistedAsset.caption !== description.data.caption
  ) {
    throw new CloudinaryDescriptionError(
      "Cloudinary generated the description, but context metadata readback did not match.",
      502,
      requestId || undefined,
    );
  }

  return {
    asset: persistedAsset,
    cached: false,
    modelVersion,
    quotaRemaining: getQuotaRemaining(result),
    requestId,
  };
}
