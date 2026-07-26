"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  CloudinaryDescriptionError,
  describePortfolioImage,
} from "@/lib/cloudinary-description";
import type { DescriptionActionState } from "@/lib/portfolio-types";
import { safeTokenMatch } from "@/lib/security";

const descriptionSchema = z.object({
  assetId: z.string().min(8).max(200),
  adminToken: z.string().min(1),
});

export async function generateAssetStory(
  _previousState: DescriptionActionState,
  formData: FormData,
): Promise<DescriptionActionState> {
  const parsed = descriptionSchema.safeParse({
    assetId: formData.get("assetId"),
    adminToken: formData.get("adminToken"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Add your portfolio edit token to authorize AI Vision.",
    };
  }

  const expectedToken = process.env.PORTFOLIO_ADMIN_TOKEN;
  if (
    !expectedToken ||
    !safeTokenMatch(parsed.data.adminToken, expectedToken)
  ) {
    return {
      status: "error",
      message: "The portfolio edit token is missing or does not match.",
    };
  }

  try {
    const description = await describePortfolioImage(parsed.data.assetId);
    revalidatePath("/");

    return {
      status: "success",
      message: description.cached
        ? "This AI story was already stored in Cloudinary."
        : `Cloudinary AI Vision stored the alt text and caption.${description.quotaRemaining === null ? "" : ` Quota remaining: ${description.quotaRemaining}.`}`,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof CloudinaryDescriptionError
          ? error.message
          : "Cloudinary could not generate this story. Check the AI Vision add-on and quota.",
    };
  }
}
