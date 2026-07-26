import { NextResponse } from "next/server";

import { getPortfolioFolder } from "@/lib/cloudinary";

export function GET() {
  const cloudNameConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  );
  const uploadPresetConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  );
  const adminCredentialsConfigured = Boolean(
    cloudNameConfigured &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
  const editTokenConfigured = Boolean(process.env.PORTFOLIO_ADMIN_TOKEN);
  const imageGenerationPresetConfigured = Boolean(
    process.env.CLOUDINARY_IMAGE_GENERATION_PRESET,
  );

  return NextResponse.json({
    ok: true,
    mode: adminCredentialsConfigured ? "live" : "demo",
    cloudinary: {
      cloudNameConfigured,
      uploadPresetConfigured,
      adminCredentialsConfigured,
      editTokenConfigured,
      imageGenerationPresetConfigured,
      imageGenerationReady: Boolean(
        adminCredentialsConfigured &&
          editTokenConfigured &&
          imageGenerationPresetConfigured,
      ),
      assetFolder: getPortfolioFolder(),
    },
  });
}
