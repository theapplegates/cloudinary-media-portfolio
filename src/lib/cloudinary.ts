import "server-only";

import { v2 as cloudinary } from "cloudinary";

import type {
  PortfolioAsset,
  PortfolioFolderMode,
  PortfolioResourceType,
  PortfolioSnapshot,
} from "@/lib/portfolio-types";

const PORTFOLIO_FOLDER =
  process.env.CLOUDINARY_PORTFOLIO_FOLDER || "media-portfolio";

interface SearchResource {
  asset_id?: unknown;
  public_id?: unknown;
  display_name?: unknown;
  resource_type?: unknown;
  format?: unknown;
  width?: unknown;
  height?: unknown;
  bytes?: unknown;
  duration?: unknown;
  created_at?: unknown;
  secure_url?: unknown;
  tags?: unknown;
  context?: unknown;
  asset_folder?: unknown;
  folder?: unknown;
}

interface SearchResponse {
  resources?: unknown;
}

interface CloudinaryConfigResponse {
  settings?: unknown;
}

interface UploadPresetResponse {
  asset_folder?: unknown;
  folder?: unknown;
  settings?: unknown;
  unsigned?: unknown;
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readResourceType(value: unknown): PortfolioResourceType | null {
  return value === "image" || value === "video" ? value : null;
}

function readContext(resource: SearchResource) {
  if (
    typeof resource.context !== "object" ||
    resource.context === null ||
    !("custom" in resource.context)
  ) {
    return {
      alt: "",
      caption: "",
      descriptionModel: "",
      descriptionSource: "",
    };
  }

  const custom = resource.context.custom;
  if (typeof custom !== "object" || custom === null) {
    return {
      alt: "",
      caption: "",
      descriptionModel: "",
      descriptionSource: "",
    };
  }

  const prompt = "prompt" in custom ? readString(custom.prompt) : "";
  const modelId = "model_id" in custom ? readString(custom.model_id) : "";
  const alt = "alt" in custom ? readString(custom.alt) : "";
  const caption = "caption" in custom ? readString(custom.caption) : "";
  const descriptionModel =
    "ai_description_model" in custom
      ? readString(custom.ai_description_model)
      : "";
  const descriptionSource =
    "ai_description_source" in custom
      ? readString(custom.ai_description_source)
      : "";

  return {
    alt:
      alt ||
      (prompt ? `AI-generated portfolio image based on: ${prompt}` : ""),
    caption:
      caption ||
      (prompt
        ? `${modelId ? `Generated with ${modelId}. ` : ""}${prompt}`
        : ""),
    descriptionModel,
    descriptionSource,
  };
}

function normalizeResource(
  resource: SearchResource,
  cloudName: string,
): PortfolioAsset | null {
  const resourceType = readResourceType(resource.resource_type);
  const assetId = readString(resource.asset_id);
  const publicId = readString(resource.public_id);

  if (!resourceType || !assetId || !publicId) {
    return null;
  }

  const context = readContext(resource);
  const displayName =
    readString(resource.display_name) ||
    publicId.split("/").at(-1)?.replaceAll("_", " ") ||
    "Untitled asset";

  return {
    assetId,
    publicId,
    cloudName,
    displayName,
    resourceType,
    format: readString(resource.format),
    width: readNumber(resource.width),
    height: readNumber(resource.height),
    bytes: readNumber(resource.bytes),
    duration:
      typeof resource.duration === "number" ? resource.duration : undefined,
    createdAt: readString(resource.created_at, new Date(0).toISOString()),
    secureUrl: readString(resource.secure_url),
    tags: Array.isArray(resource.tags)
      ? resource.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    alt: context.alt,
    caption: context.caption,
    descriptionModel: context.descriptionModel,
    descriptionSource: context.descriptionSource,
    assetFolder:
      readString(resource.asset_folder) ||
      readString(resource.folder) ||
      PORTFOLIO_FOLDER,
  };
}

function getCloudName() {
  return process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
}

function hasAdminCredentials() {
  return Boolean(
    getCloudName() &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

function configureCloudinary() {
  const cloudName = getCloudName();

  cloudinary.config({
    cloud_name: cloudName,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudName;
}

function configuredFolderMode(): PortfolioFolderMode | null {
  return process.env.CLOUDINARY_FOLDER_MODE === "fixed" ||
    process.env.CLOUDINARY_FOLDER_MODE === "dynamic"
    ? process.env.CLOUDINARY_FOLDER_MODE
    : null;
}

async function resolveFolderMode(): Promise<PortfolioFolderMode> {
  const override = configuredFolderMode();
  if (override) {
    return override;
  }

  const result = (await cloudinary.api.config({
    settings: true,
  })) as CloudinaryConfigResponse;
  const settings =
    typeof result.settings === "object" && result.settings !== null
      ? (result.settings as Record<string, unknown>)
      : null;

  return settings?.folder_mode === "fixed" ? "fixed" : "dynamic";
}

function getPresetFolder(preset: UploadPresetResponse) {
  const settings =
    typeof preset.settings === "object" && preset.settings !== null
      ? (preset.settings as Record<string, unknown>)
      : null;

  return (
    readString(settings?.asset_folder) ||
    readString(preset.asset_folder) ||
    readString(settings?.folder) ||
    readString(preset.folder)
  );
}

async function isUnsignedUploadPresetReady(uploadPreset: string) {
  if (!uploadPreset) {
    return false;
  }

  try {
    const preset = (await cloudinary.api.upload_preset(
      uploadPreset,
    )) as UploadPresetResponse;

    return preset.unsigned === true && getPresetFolder(preset) === PORTFOLIO_FOLDER;
  } catch {
    return false;
  }
}

function escapeSearchValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

const demoAssets: PortfolioAsset[] = [
  {
    assetId: "demo-beach-boat",
    publicId: "samples/landscapes/beach-boat",
    cloudName: "demo",
    displayName: "Beach boat",
    resourceType: "image",
    format: "jpg",
    width: 1920,
    height: 1280,
    bytes: 0,
    createdAt: "2026-07-23T08:00:00.000Z",
    secureUrl:
      "https://res.cloudinary.com/demo/image/upload/samples/landscapes/beach-boat.jpg",
    tags: ["landscape", "sample"],
    alt: "A small boat resting near a calm tropical shoreline",
    caption: "A cinematic travel still ready for responsive delivery.",
    assetFolder: "samples/landscapes",
  },
  {
    assetId: "demo-spices",
    publicId: "samples/food/spices",
    cloudName: "demo",
    displayName: "Market spices",
    resourceType: "image",
    format: "jpg",
    width: 1200,
    height: 800,
    bytes: 0,
    createdAt: "2026-07-22T08:00:00.000Z",
    secureUrl:
      "https://res.cloudinary.com/demo/image/upload/samples/food/spices.jpg",
    tags: ["food", "sample"],
    alt: "Colorful spices arranged in bowls at a market",
    caption: "Smart cropping keeps the bright ingredients in frame.",
    assetFolder: "samples/food",
  },
  {
    assetId: "demo-bike",
    publicId: "samples/bike",
    cloudName: "demo",
    displayName: "City bike",
    resourceType: "image",
    format: "jpg",
    width: 1200,
    height: 800,
    bytes: 0,
    createdAt: "2026-07-21T08:00:00.000Z",
    secureUrl: "https://res.cloudinary.com/demo/image/upload/samples/bike.jpg",
    tags: ["product", "sample"],
    alt: "A bicycle photographed outdoors",
    caption: "One original, many product-ready crops.",
    assetFolder: "samples",
  },
  {
    assetId: "demo-reindeer",
    publicId: "samples/animals/reindeer",
    cloudName: "demo",
    displayName: "Reindeer",
    resourceType: "image",
    format: "jpg",
    width: 1200,
    height: 800,
    bytes: 0,
    createdAt: "2026-07-20T08:00:00.000Z",
    secureUrl:
      "https://res.cloudinary.com/demo/image/upload/samples/animals/reindeer.jpg",
    tags: ["wildlife", "sample"],
    alt: "A reindeer standing in a snowy landscape",
    caption: "Automatic quality keeps detail without shipping the original.",
    assetFolder: "samples/animals",
  },
  {
    assetId: "demo-elephants",
    publicId: "samples/elephants",
    cloudName: "demo",
    displayName: "Elephants",
    resourceType: "video",
    format: "mp4",
    width: 1280,
    height: 720,
    bytes: 0,
    duration: 13.5,
    createdAt: "2026-07-19T08:00:00.000Z",
    secureUrl:
      "https://res.cloudinary.com/demo/video/upload/samples/elephants.mp4",
    tags: ["video", "sample"],
    alt: "Elephants walking through grassland",
    caption: "The player negotiates a browser-ready video format.",
    assetFolder: "samples",
  },
];

export function getPortfolioFolder() {
  return PORTFOLIO_FOLDER;
}

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const cloudName = getCloudName();
  const uploadPreset =
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";
  const uploadReady = Boolean(cloudName && uploadPreset);
  const adminReady = hasAdminCredentials();
  const editReady = Boolean(adminReady && process.env.PORTFOLIO_ADMIN_TOKEN);
  const generationReady = Boolean(
    adminReady &&
      editReady &&
      process.env.CLOUDINARY_IMAGE_GENERATION_PRESET,
  );
  const deliveryHost =
    process.env.NEXT_PUBLIC_CLOUDINARY_SECURE_DISTRIBUTION ||
    "res.cloudinary.com";
  const fallbackFolderMode = configuredFolderMode() || "dynamic";

  if (!adminReady) {
    return {
      assets: demoAssets,
      mode: "demo",
      message:
        "Demo assets are active. Add Cloudinary Admin API credentials to read your persisted portfolio after refresh.",
      cloudName: cloudName || "demo",
      uploadPreset,
      uploadReady,
      adminReady,
      editReady,
      generationReady,
      assetFolder: PORTFOLIO_FOLDER,
      folderMode: fallbackFolderMode,
      deliveryHost,
    };
  }

  try {
    configureCloudinary();
    const [folderMode, validatedUploadReady] = await Promise.all([
      resolveFolderMode(),
      isUnsignedUploadPresetReady(uploadPreset),
    ]);
    const folderField =
      folderMode === "fixed" ? "folder" : "asset_folder";

    const result = (await cloudinary.search
      .expression(
        `${folderField}="${escapeSearchValue(PORTFOLIO_FOLDER)}"`,
      )
      .sort_by("created_at", "desc")
      .max_results(40)
      .with_field("context")
      .with_field("tags")
      .execute()) as SearchResponse;

    const resources = Array.isArray(result.resources)
      ? result.resources
      : [];
    const assets = resources
      .map((resource) =>
        normalizeResource(resource as SearchResource, cloudName),
      )
      .filter((asset): asset is PortfolioAsset => asset !== null);

    return {
      assets,
      mode: "live",
      message:
        assets.length > 0
          ? `Cloudinary returned ${assets.length} persisted asset${assets.length === 1 ? "" : "s"} from ${PORTFOLIO_FOLDER}.`
          : `Your ${PORTFOLIO_FOLDER} asset folder is connected and ready for its first upload.`,
      cloudName,
      uploadPreset,
      uploadReady: uploadReady && validatedUploadReady,
      adminReady,
      editReady,
      generationReady,
      assetFolder: PORTFOLIO_FOLDER,
      folderMode,
      deliveryHost,
    };
  } catch {
    return {
      assets: demoAssets,
      mode: "demo",
      message:
        "Cloudinary credentials were found, but the server readback failed. Check the cloud name, API key, secret, and asset folder.",
      cloudName: cloudName || "demo",
      uploadPreset,
      uploadReady,
      adminReady,
      editReady,
      generationReady,
      assetFolder: PORTFOLIO_FOLDER,
      folderMode: fallbackFolderMode,
      deliveryHost,
    };
  }
}

export async function findPortfolioAssetByAssetId(assetId: string) {
  if (!hasAdminCredentials()) {
    return null;
  }

  const cloudName = configureCloudinary();
  let result: SearchResponse;

  try {
    result = (await cloudinary.api.resources_by_asset_ids([assetId], {
      context: true,
      tags: true,
    })) as SearchResponse;
  } catch (error) {
    const nestedError =
      typeof error === "object" &&
      error !== null &&
      "error" in error &&
      typeof error.error === "object" &&
      error.error !== null
        ? error.error
        : null;
    const httpCode =
      typeof error === "object" &&
      error !== null &&
      "http_code" in error
        ? error.http_code
        : nestedError && "http_code" in nestedError
          ? nestedError.http_code
          : null;

    if (
      httpCode === 400 ||
      httpCode === 404
    ) {
      return null;
    }

    throw error;
  }

  const resource = Array.isArray(result.resources)
    ? result.resources[0]
    : undefined;

  if (!resource) {
    return null;
  }

  const asset = normalizeResource(resource as SearchResource, cloudName);
  return asset?.assetFolder === PORTFOLIO_FOLDER ? asset : null;
}

export async function updatePortfolioDescription(
  publicId: string,
  resourceType: PortfolioResourceType,
  alt: string,
  caption: string,
  modelVersion: string,
) {
  configureCloudinary();

  await cloudinary.uploader.explicit(publicId, {
    type: "upload",
    resource_type: resourceType,
    context: {
      alt,
      caption,
      ai_description_source: "cloudinary_ai_vision",
      ai_description_model: modelVersion || "1",
    },
  });
}
