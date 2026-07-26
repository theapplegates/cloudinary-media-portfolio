export const GENERATION_MODELS = [
  {
    id: "flux",
    name: "Flux",
    purpose: "Photorealistic scenes",
    standardId: "flux-2-klein-9b",
    premiumId: "flux-2-pro",
    seedSupport: true,
  },
  {
    id: "recraft",
    name: "Recraft",
    purpose: "Vector art and illustration",
    standardId: "recraft-v3",
    premiumId: "recraft-v4",
    seedSupport: false,
  },
  {
    id: "gpt-image",
    name: "GPT Image",
    purpose: "Campaign-ready creative",
    standardId: "gpt-image-1-mini",
    premiumId: "gpt-image-2",
    seedSupport: false,
  },
  {
    id: "nano-banana",
    name: "Nano Banana",
    purpose: "General-purpose generation",
    standardId: "nano-banana-1",
    premiumId: "nano-banana-2",
    seedSupport: true,
  },
  {
    id: "ideogram",
    name: "Ideogram",
    purpose: "Text, realism, and art",
    standardId: "ideogram-v4-turbo",
    premiumId: "ideogram-v4-base",
    seedSupport: true,
  },
] as const;

export type GenerationFamily = (typeof GENERATION_MODELS)[number]["id"];
export type GenerationTier = "standard" | "premium";

export function isGenerationFamily(
  value: unknown,
): value is GenerationFamily {
  return GENERATION_MODELS.some((model) => model.id === value);
}

export function isGenerationTier(value: unknown): value is GenerationTier {
  return value === "standard" || value === "premium";
}

export function getGenerationModel(
  family: GenerationFamily,
  tier: GenerationTier,
) {
  const model = GENERATION_MODELS.find((item) => item.id === family);

  if (!model) {
    throw new Error(`Unsupported Cloudinary generation family: ${family}`);
  }

  return {
    ...model,
    modelId: tier === "premium" ? model.premiumId : model.standardId,
  };
}

