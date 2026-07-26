import "server-only";

import { randomInt, randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

import { getPortfolioFolder } from "@/lib/cloudinary";
import {
  getGenerationModel,
  type GenerationFamily,
  type GenerationTier,
} from "@/lib/generation-models";

interface CloudinaryGenerationAsset {
  bytes?: unknown;
  format?: unknown;
  height?: unknown;
  model?: unknown;
  seed?: unknown;
  storage?: unknown;
  width?: unknown;
}

interface CloudinaryGenerationResponse {
  data?: unknown;
  limits?: unknown;
  request_id?: unknown;
}

export interface ManagedGeneration {
  assetId: string;
  bytes: number;
  cloudName: string;
  format: string;
  height: number;
  modelId: string;
  publicId: string;
  quotaRemaining: number | null;
  requestId: string;
  secureUrl: string;
  seed: number | null;
  width: number;
}

export class CloudinaryGenerationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "CloudinaryGenerationError";
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function getErrorMessage(payload: unknown, fallback: string) {
  const record = readRecord(payload);
  if (!record) {
    return fallback;
  }

  if (typeof record.error === "string") {
    return record.error;
  }

  const error = readRecord(record.error);
  if (error && typeof error.message === "string") {
    return error.message;
  }

  return typeof record.message === "string" ? record.message : fallback;
}

function getFirstAsset(
  response: CloudinaryGenerationResponse,
): CloudinaryGenerationAsset | null {
  const data = readRecord(response.data);
  if (!data || !Array.isArray(data.assets)) {
    return null;
  }

  return readRecord(data.assets[0]) as CloudinaryGenerationAsset | null;
}

function getQuotaRemaining(response: CloudinaryGenerationResponse) {
  const limits = readRecord(response.limits);
  if (!limits || !Array.isArray(limits.addons_quota)) {
    return null;
  }

  for (const item of limits.addons_quota) {
    const quota = readRecord(item);
    if (quota?.type === "image_generation") {
      const remaining = readNumber(quota.remaining);
      return remaining || remaining === 0 ? remaining : null;
    }
  }

  return null;
}

function getServerConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const generationPreset = process.env.CLOUDINARY_IMAGE_GENERATION_PRESET;

  if (!cloudName || !apiKey || !apiSecret || !generationPreset) {
    throw new CloudinaryGenerationError(
      "Image generation needs the Cloudinary cloud name, API credentials, and a signed generation preset.",
      503,
    );
  }

  return { cloudName, apiKey, apiSecret, generationPreset };
}

async function assertGenerationPresetFolder(
  config: ReturnType<typeof getServerConfig>,
) {
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  let payload: unknown;

  try {
    payload = await cloudinary.api.upload_preset(config.generationPreset);
  } catch {
    throw new CloudinaryGenerationError(
      `Cloudinary could not inspect the ${config.generationPreset} upload preset. Check the preset name and API credentials.`,
      503,
    );
  }
  const preset = readRecord(payload);
  const settings = readRecord(preset?.settings);
  const assetFolder =
    readString(settings?.asset_folder) ||
    readString(preset?.asset_folder) ||
    readString(settings?.folder) ||
    readString(preset?.folder);
  const requiredFolder = getPortfolioFolder();

  if (preset?.unsigned === true) {
    throw new CloudinaryGenerationError(
      `${config.generationPreset} must be a signed upload preset before it can protect generated assets.`,
      409,
    );
  }

  if (assetFolder !== requiredFolder) {
    throw new CloudinaryGenerationError(
      `${config.generationPreset} must use ${requiredFolder} as its destination folder before image generation can run.`,
      409,
    );
  }
}

export async function generateManagedPortfolioImage({
  family,
  prompt,
  tier,
}: {
  family: GenerationFamily;
  prompt: string;
  tier: GenerationTier;
}): Promise<ManagedGeneration> {
  const config = getServerConfig();
  await assertGenerationPresetFolder(config);
  const model = getGenerationModel(family, tier);
  const generatedId = `portfolio-generation-${randomUUID()}`;
  const seed = model.seedSupport
    ? randomInt(1, 2_147_483_647)
    : null;
  const authorization = Buffer.from(
    `${config.apiKey}:${config.apiSecret}`,
  ).toString("base64");

  const response = await fetch(
    `https://api.cloudinary.com/v2/generate/${encodeURIComponent(config.cloudName)}/text_to_image`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_size: {
          aspect_ratio: "1:1",
          resolution: "1K",
        },
        model: {
          id: model.modelId,
        },
        prompt,
        ...(seed === null ? {} : { seed }),
        target: {
          public_id: generatedId,
          target_type: "managed_asset",
          upload_preset: config.generationPreset,
        },
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );

  const payload: unknown = await response.json().catch(() => null);
  const responseRecord = readRecord(payload);
  const requestId = readString(responseRecord?.request_id);

  if (!response.ok) {
    throw new CloudinaryGenerationError(
      getErrorMessage(
        payload,
        `Cloudinary Image Generation failed with status ${response.status}.`,
      ),
      response.status,
      requestId || undefined,
    );
  }

  const result = (responseRecord || {}) as CloudinaryGenerationResponse;
  const asset = getFirstAsset(result);
  const storage = readRecord(asset?.storage);
  const assetId = readString(storage?.asset_id);
  const publicId = readString(storage?.public_id);
  const secureUrl = readString(storage?.secure_url);

  if (!asset || !assetId || !publicId || !secureUrl) {
    throw new CloudinaryGenerationError(
      "Cloudinary returned a generation response without a managed asset.",
      502,
      requestId || undefined,
    );
  }

  const returnedModel = readRecord(asset.model);

  return {
    assetId,
    bytes: readNumber(asset.bytes),
    cloudName: config.cloudName,
    format: readString(asset.format) || "png",
    height: readNumber(asset.height) || 1024,
    modelId: readString(returnedModel?.id) || model.modelId,
    publicId,
    quotaRemaining: getQuotaRemaining(result),
    requestId,
    secureUrl,
    seed:
      typeof asset.seed === "number"
        ? asset.seed
        : seed,
    width: readNumber(asset.width) || 1024,
  };
}
