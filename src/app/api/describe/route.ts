import { z } from "zod";

import {
  CloudinaryDescriptionError,
  describePortfolioImage,
} from "@/lib/cloudinary-description";
import { findPortfolioAssetByAssetId } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const maxDuration = 60;

const descriptionRequestSchema = z.object({
  assetId: z.string().min(8).max(200),
  publicId: z.string().min(1).max(255),
  version: z.number().int().positive(),
});

function isRecentUpload(createdAt: string, version: number) {
  const createdAtSeconds = Math.floor(
    new Date(createdAt).getTime() / 1000,
  );
  const ageInSeconds = Math.floor(Date.now() / 1000) - createdAtSeconds;

  return (
    Number.isFinite(createdAtSeconds) &&
    Math.abs(createdAtSeconds - version) <= 5 &&
    ageInSeconds >= -300 &&
    ageInSeconds <= 900
  );
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = descriptionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        message: "A valid Cloudinary asset ID is required.",
      },
      { status: 400 },
    );
  }

  try {
    const asset = await findPortfolioAssetByAssetId(parsed.data.assetId);
    if (!asset) {
      throw new CloudinaryDescriptionError(
        "Cloudinary could not verify this asset inside the portfolio folder.",
        404,
      );
    }

    if (
      asset.publicId !== parsed.data.publicId ||
      !asset.tags.includes("media-portfolio-upload") ||
      !isRecentUpload(asset.createdAt, parsed.data.version)
    ) {
      throw new CloudinaryDescriptionError(
        "AI description requires a recent matching portfolio upload.",
        403,
      );
    }

    const description = await describePortfolioImage(asset.assetId);

    return Response.json({
      ok: true,
      asset: description.asset,
      description: {
        cached: description.cached,
        modelVersion: description.modelVersion,
        quotaRemaining: description.quotaRemaining,
        requestId: description.requestId,
      },
    });
  } catch (error) {
    if (error instanceof CloudinaryDescriptionError) {
      return Response.json(
        {
          ok: false,
          message: error.message,
          requestId: error.requestId,
        },
        { status: error.status >= 400 ? error.status : 502 },
      );
    }

    if (error instanceof Error && error.name === "TimeoutError") {
      return Response.json(
        {
          ok: false,
          message:
            "Cloudinary AI Vision did not finish within 60 seconds.",
        },
        { status: 504 },
      );
    }

    return Response.json(
      {
        ok: false,
        message:
          "Cloudinary could not generate this asset description. Check the AI Vision add-on and quota.",
      },
      { status: 500 },
    );
  }
}
