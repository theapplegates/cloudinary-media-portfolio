import { z } from "zod";

import {
  CloudinaryGenerationError,
  generateManagedPortfolioImage,
} from "@/lib/cloudinary-generation";
import {
  CloudinaryDescriptionError,
  describePortfolioImage,
} from "@/lib/cloudinary-description";
import {
  findPortfolioAssetByAssetId,
  getPortfolioFolder,
} from "@/lib/cloudinary";
import {
  isGenerationFamily,
  isGenerationTier,
  type GenerationFamily,
  type GenerationTier,
} from "@/lib/generation-models";
import type { PortfolioAsset } from "@/lib/portfolio-types";
import { safeTokenMatch } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 120;

const generationSchema = z.object({
  prompt: z.string().trim().min(12).max(600),
  family: z.custom<GenerationFamily>(isGenerationFamily),
  tier: z.custom<GenerationTier>(isGenerationTier),
  adminToken: z.string().min(1),
});

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = generationSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        message:
          "Add a prompt between 12 and 600 characters, then choose a supported model and tier.",
      },
      { status: 400 },
    );
  }

  const expectedToken = process.env.PORTFOLIO_ADMIN_TOKEN;
  if (
    !expectedToken ||
    !safeTokenMatch(parsed.data.adminToken, expectedToken)
  ) {
    return Response.json(
      {
        ok: false,
        message: "The portfolio edit token is missing or does not match.",
      },
      { status: 403 },
    );
  }

  try {
    const generation = await generateManagedPortfolioImage({
      family: parsed.data.family,
      prompt: parsed.data.prompt,
      tier: parsed.data.tier,
    });
    const persistedAsset = await findPortfolioAssetByAssetId(
      generation.assetId,
    );
    if (!persistedAsset) {
      throw new CloudinaryGenerationError(
        `Cloudinary generated the image, but the signed preset did not place it in the required ${getPortfolioFolder()} asset folder.`,
        409,
        generation.requestId || undefined,
      );
    }

    let asset: PortfolioAsset = {
      ...persistedAsset,
      displayName:
        persistedAsset.displayName || `Generated with ${generation.modelId}`,
    };
    let description:
      | {
          modelVersion: string;
          quotaRemaining: number | null;
          requestId: string;
          stored: true;
        }
      | {
          message: string;
          stored: false;
        };

    try {
      const generatedDescription = await describePortfolioImage(
        generation.assetId,
      );
      asset = generatedDescription.asset;
      description = {
        modelVersion: generatedDescription.modelVersion,
        quotaRemaining: generatedDescription.quotaRemaining,
        requestId: generatedDescription.requestId,
        stored: true,
      };
    } catch (error) {
      description = {
        message:
          error instanceof CloudinaryDescriptionError
            ? error.message
            : "The image is stored, but Cloudinary AI Vision could not write its description.",
        stored: false,
      };
    }

    return Response.json({
      ok: true,
      asset,
      description,
      generation: {
        modelId: generation.modelId,
        quotaRemaining: generation.quotaRemaining,
        requestId: generation.requestId,
        seed: generation.seed,
        folderVerified: true,
      },
    });
  } catch (error) {
    if (error instanceof CloudinaryGenerationError) {
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
            "Cloudinary did not finish the image within 120 seconds. No local asset was created.",
        },
        { status: 504 },
      );
    }

    return Response.json(
      {
        ok: false,
        message:
          "The image could not be generated. Check the add-on, credentials, signed preset, and account quota.",
      },
      { status: 500 },
    );
  }
}
