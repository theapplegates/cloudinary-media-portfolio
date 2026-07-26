"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import type { PortfolioAsset } from "@/lib/portfolio-types";

const CloudinaryVideoPlayer = dynamic(
  () =>
    import("next-cloudinary").then((module) => module.CldVideoPlayer),
  {
    ssr: false,
    loading: () => <Skeleton className="aspect-video w-full rounded-xl" />,
  },
);

export function VideoPreview({ asset }: { asset: PortfolioAsset }) {
  return (
    <div className="overflow-hidden rounded-xl bg-muted">
      <CloudinaryVideoPlayer
        id={`player-${asset.assetId}`}
        src={asset.publicId}
        width={1280}
        height={720}
        controls
        colors={{
          accent: "#f4c84a",
          base: "#34383b",
          text: "#ffffff",
        }}
        config={{ cloud: { cloudName: asset.cloudName } }}
      />
    </div>
  );
}

