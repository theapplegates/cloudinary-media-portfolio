export type PortfolioResourceType = "image" | "video";

export type PortfolioMode = "live" | "demo";

export type PortfolioFolderMode = "dynamic" | "fixed";

export interface PortfolioAsset {
  assetId: string;
  publicId: string;
  cloudName: string;
  displayName: string;
  resourceType: PortfolioResourceType;
  format: string;
  width: number;
  height: number;
  bytes: number;
  duration?: number;
  createdAt: string;
  secureUrl: string;
  tags: string[];
  alt: string;
  caption: string;
  descriptionSource?: string;
  descriptionModel?: string;
  assetFolder: string;
  isOptimistic?: boolean;
}

export interface PortfolioSnapshot {
  assets: PortfolioAsset[];
  mode: PortfolioMode;
  message: string;
  cloudName: string;
  uploadPreset: string;
  uploadReady: boolean;
  adminReady: boolean;
  editReady: boolean;
  generationReady: boolean;
  assetFolder: string;
  folderMode: PortfolioFolderMode;
  deliveryHost: string;
}

export interface DescriptionActionState {
  status: "idle" | "success" | "error";
  message: string;
  updatedAt?: string;
}
