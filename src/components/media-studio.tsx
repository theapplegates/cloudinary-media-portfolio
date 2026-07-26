"use client";

import {
  useDeferredValue,
  useMemo,
  useState,
  type SyntheticEvent,
} from "react";
import {
  CldImage,
  type CldImageProps,
} from "next-cloudinary";
import {
  Bot,
  Check,
  CircleGauge,
  CloudCog,
  Code2,
  Film,
  Filter,
  Gamepad2,
  Globe2,
  ImageIcon,
  Info,
  Layers3,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  Zap,
} from "lucide-react";

import { AiStoryPanel } from "@/components/ai-story-panel";
import { UploadMission } from "@/components/upload-mission";
import { VideoPreview } from "@/components/video-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  PortfolioAsset,
  PortfolioSnapshot,
} from "@/lib/portfolio-types";

type FilterValue = "all" | "image" | "video";
type TransformationPreset =
  | "original"
  | "smart"
  | "portrait"
  | "mono"
  | "generative";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const presetDetails: Record<
  TransformationPreset,
  { label: string; note: string; icon: typeof Palette }
> = {
  original: {
    label: "Fit",
    note: "Preserve the whole frame",
    icon: Layers3,
  },
  smart: {
    label: "Smart crop",
    note: "4:3 crop with automatic gravity",
    icon: CircleGauge,
  },
  portrait: {
    label: "Portrait",
    note: "Consistent 4:5 source crop",
    icon: ImageIcon,
  },
  mono: {
    label: "Monochrome",
    note: "Chain a grayscale effect",
    icon: Palette,
  },
  generative: {
    label: "Generative fill",
    note: "Opt-in AI canvas extension",
    icon: WandSparkles,
  },
};

function formatBytes(bytes: number) {
  if (!bytes) {
    return "Sample asset";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }

  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function imageConfig(asset: PortfolioAsset): CldImageProps["config"] {
  const secureDistribution =
    process.env.NEXT_PUBLIC_CLOUDINARY_SECURE_DISTRIBUTION;
  const privateCdn =
    process.env.NEXT_PUBLIC_CLOUDINARY_PRIVATE_CDN === "true";

  return {
    cloud: {
      cloudName: asset.cloudName,
    },
    url:
      secureDistribution && asset.cloudName !== "demo"
        ? { secureDistribution, privateCdn }
        : undefined,
  };
}

function AssetThumbnail({ asset }: { asset: PortfolioAsset }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
      <CldImage
        src={asset.publicId}
        alt={asset.alt || `Preview of ${asset.displayName}`}
        fill
        crop="fill"
        gravity="auto"
        aspectRatio="4:3"
        assetType={asset.resourceType === "video" ? "video" : "image"}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        config={imageConfig(asset)}
        className="object-cover transition-transform duration-300 group-hover/card:scale-[1.02] motion-reduce:transition-none"
      />
      <div className="absolute top-3 left-3">
        <Badge variant="secondary">
          {asset.resourceType === "video" ? (
            <Film data-icon="inline-start" />
          ) : (
            <ImageIcon data-icon="inline-start" />
          )}
          {asset.resourceType}
        </Badge>
      </div>
      {asset.isOptimistic ? (
        <div className="absolute top-3 right-3">
          <Badge>
            <Zap data-icon="inline-start" />
            New
          </Badge>
        </div>
      ) : null}
    </div>
  );
}

function AssetCard({
  asset,
  onSelect,
}: {
  asset: PortfolioAsset;
  onSelect: (assetId: string) => void;
}) {
  return (
    <Card className="group/card min-w-0 transition-transform duration-200 hover:-translate-y-1 motion-reduce:transition-none">
      <button
        type="button"
        className="-mt-(--card-spacing) text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={() => onSelect(asset.assetId)}
        aria-label={`Open details for ${asset.displayName}`}
      >
        <AssetThumbnail asset={asset} />
      </button>
      <CardHeader>
        <CardTitle className="truncate">{asset.displayName}</CardTitle>
        <CardDescription className="line-clamp-2 min-h-10">
          {asset.caption ||
            "Cloudinary AI Vision is preparing this portfolio caption."}
        </CardDescription>
        <CardAction>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Inspect ${asset.displayName}`}
                  onClick={() => onSelect(asset.assetId)}
                />
              }
            >
              <Info />
            </TooltipTrigger>
            <TooltipContent>Inspect Cloudinary metadata</TooltipContent>
          </Tooltip>
        </CardAction>
      </CardHeader>
      <CardFooter className="justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {dateFormatter.format(new Date(asset.createdAt))}
        </span>
        <span className="text-xs font-medium">
          {asset.width}×{asset.height}
        </span>
      </CardFooter>
    </Card>
  );
}

function TransformationPreview({
  asset,
  preset,
  onDeliveryUrl,
}: {
  asset: PortfolioAsset;
  preset: TransformationPreset;
  onDeliveryUrl: (url: string) => void;
}) {
  const handleLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    onDeliveryUrl(event.currentTarget.currentSrc);
  };
  const common = {
    src: asset.publicId,
    alt: `${presetDetails[preset].label} preview of ${asset.displayName}`,
    sizes: "(max-width: 1024px) 100vw, 60vw",
    config: imageConfig(asset),
    onLoad: handleLoad,
    className: "h-full w-full object-contain",
  } satisfies Partial<CldImageProps>;

  if (preset === "original") {
    return (
      <CldImage
        {...common}
        width={asset.width || 1200}
        height={asset.height || 900}
        crop="fit"
      />
    );
  }

  if (preset === "portrait") {
    return (
      <CldImage
        {...common}
        width={900}
        height={1125}
        crop={{
          type: "thumb",
          source: true,
          width: 1200,
          height: 1500,
          gravity: "auto",
        }}
      />
    );
  }

  if (preset === "generative") {
    return (
      <CldImage
        {...common}
        width={1200}
        height={900}
        fillBackground={{
          crop: "pad",
          gravity: "south",
          prompt: "playful editorial paper shapes in a warm creative studio",
        }}
      />
    );
  }

  return (
    <CldImage
      {...common}
      width={1200}
      height={900}
      crop="fill"
      gravity="auto"
      rawTransformations={preset === "mono" ? ["e_grayscale"] : undefined}
    />
  );
}

function TransformationLab({
  assets,
  onInspect,
  onDeliveryUrl,
}: {
  assets: PortfolioAsset[];
  onInspect: (assetId: string) => void;
  onDeliveryUrl: (url: string) => void;
}) {
  const imageAssets = assets.filter((asset) => asset.resourceType === "image");
  const [assetId, setAssetId] = useState(imageAssets[0]?.assetId || "");
  const [preset, setPreset] =
    useState<TransformationPreset>("smart");
  const [showAiWarning, setShowAiWarning] = useState(false);
  const selected =
    imageAssets.find((asset) => asset.assetId === assetId) || imageAssets[0];

  if (!selected) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ImageIcon />
          </EmptyMedia>
          <EmptyTitle>Upload an image to unlock the lab</EmptyTitle>
          <EmptyDescription>
            Video assets use the player; image assets can run every visual
            recipe below.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid min-h-[36rem] gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
      <Card className="min-w-0">
        <CardHeader>
          <Badge className="w-fit">Live transformation</Badge>
          <CardTitle className="font-serif text-2xl">
            {presetDetails[preset].label}
          </CardTitle>
          <CardDescription>
            {presetDetails[preset].note}. The original remains untouched.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid min-h-[26rem] place-items-center overflow-hidden rounded-xl bg-muted/60 p-3">
            <TransformationPreview
              key={`${selected.assetId}-${preset}`}
              asset={selected}
              preset={preset}
              onDeliveryUrl={onDeliveryUrl}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Automatic format and quality are active
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onInspect(selected.assetId)}
          >
            <Info data-icon="inline-start" />
            Inspect asset
          </Button>
        </CardFooter>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Choose an original</CardTitle>
            <CardDescription>
              Every recipe starts from one Cloudinary public ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
          <Select
            value={selected.assetId}
            onValueChange={(value) => {
              if (value) {
                setAssetId(value);
              }
            }}
          >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Portfolio images</SelectLabel>
                  {imageAssets.map((asset) => (
                    <SelectItem key={asset.assetId} value={asset.assetId}>
                      {asset.displayName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Pick a power-up</CardTitle>
            <CardDescription>
              Standard transformations are generated and cached on demand.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(
              Object.entries(presetDetails) as [
                TransformationPreset,
                (typeof presetDetails)[TransformationPreset],
              ][]
            ).map(([value, details]) => {
              const Icon = details.icon;
              const selectedPreset = preset === value;

              return (
                <Button
                  key={value}
                  variant={selectedPreset ? "secondary" : "outline"}
                  className="h-auto justify-start py-3 text-left"
                  onClick={() => {
                    if (value === "generative") {
                      setShowAiWarning(true);
                      return;
                    }
                    setPreset(value);
                  }}
                >
                  <Icon data-icon="inline-start" />
                  <span className="flex min-w-0 flex-col items-start">
                    <span>{details.label}</span>
                    <span className="truncate text-xs font-normal opacity-75">
                      {details.note}
                    </span>
                  </span>
                  {selectedPreset ? (
                    <Check data-icon="inline-end" className="ml-auto" />
                  ) : null}
                </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAiWarning} onOpenChange={setShowAiWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use a generative transformation?</DialogTitle>
            <DialogDescription>
              Generative fill consumes more transformation credits than a
              standard resize. Cloudinary creates the derived result only
              after you continue.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <Bot aria-hidden="true" />
            <AlertTitle>Human review still matters</AlertTitle>
            <AlertDescription>
              Generated pixels can be useful for layouts, but inspect the
              result before publishing it.
            </AlertDescription>
          </Alert>
          <DialogFooter showCloseButton>
            <Button
              onClick={() => {
                setPreset("generative");
                setShowAiWarning(false);
              }}
            >
              <WandSparkles data-icon="inline-start" />
              Generate this variant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeliveryBoard({
  snapshot,
  deliveryUrl,
}: {
  snapshot: PortfolioSnapshot;
  deliveryUrl: string;
}) {
  const capabilities = [
    {
      icon: Globe2,
      title: "Global CDN delivery",
      body: `Assets are delivered through ${snapshot.deliveryHost}. Cloudinary handles origin storage, cacheable derived assets, and edge delivery.`,
    },
    {
      icon: CircleGauge,
      title: "Automatic format",
      body: "The browser can receive AVIF, WebP, or another supported format from the same public ID.",
    },
    {
      icon: Zap,
      title: "Automatic quality",
      body: "Cloudinary analyzes each asset and balances visual fidelity against transfer size.",
    },
    {
      icon: Layers3,
      title: "Responsive source sets",
      body: "CldImage and the sizes prop let the browser choose an appropriately sized candidate.",
    },
  ];

  return (
    <div className="grid min-h-[32rem] gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {capabilities.map((capability) => {
          const Icon = capability.icon;
          return (
            <Card key={capability.title} size="sm">
              <CardHeader>
                <span className="grid size-9 place-items-center rounded-xl bg-primary/20">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <CardTitle>{capability.title}</CardTitle>
                <CardDescription>{capability.body}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <Badge variant="secondary" className="w-fit">
            <Code2 data-icon="inline-start" />
            Live delivery evidence
          </Badge>
          <CardTitle className="font-serif text-2xl">
            One public ID, many edge-ready results
          </CardTitle>
          <CardDescription>
            Open the Transformation Lab first. The browser-selected URL appears
            here after the image loads.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="overflow-x-auto rounded-xl bg-muted p-4">
            <code className="break-all text-xs leading-6">
              {deliveryUrl || "Run a transformation to inspect its delivery URL."}
            </code>
          </div>
          <Separator />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-primary/15 p-4">
              <p className="text-xs text-muted-foreground">Format</p>
              <p className="mt-1 font-serif text-lg">Auto</p>
            </div>
            <div className="rounded-xl bg-secondary/10 p-4">
              <p className="text-xs text-muted-foreground">Quality</p>
              <p className="mt-1 font-serif text-lg">Auto</p>
            </div>
            <div className="rounded-xl bg-accent/15 p-4">
              <p className="text-xs text-muted-foreground">Cache</p>
              <p className="mt-1 font-serif text-lg">Edge ready</p>
            </div>
          </div>
          <Alert>
            <ShieldCheck aria-hidden="true" />
            <AlertTitle>About multi-CDN</AlertTitle>
            <AlertDescription>
              This demo proves Cloudinary delivery through your configured
              distribution. Smart and dynamic multi-CDN options are
              enterprise capabilities configured with Cloudinary, not a
              client-side toggle.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

function AssetDetails({
  asset,
  editReady,
}: {
  asset: PortfolioAsset | null;
  editReady: boolean;
}) {
  if (!asset) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6">
      {asset.resourceType === "video" ? (
        <VideoPreview asset={asset} />
      ) : (
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
          <CldImage
            src={asset.publicId}
            alt={asset.alt || `Preview of ${asset.displayName}`}
            fill
            crop="fit"
            sizes="(max-width: 640px) 100vw, 40vw"
            config={imageConfig(asset)}
            className="object-contain"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs text-muted-foreground">Dimensions</p>
          <p className="mt-1 font-medium">
            {asset.width}×{asset.height}
          </p>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs text-muted-foreground">Original size</p>
          <p className="mt-1 font-medium">{formatBytes(asset.bytes)}</p>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs text-muted-foreground">Format</p>
          <p className="mt-1 font-medium uppercase">{asset.format}</p>
        </div>
        <div className="rounded-xl bg-muted p-3">
          <p className="text-xs text-muted-foreground">Asset folder</p>
          <p className="mt-1 truncate font-medium">{asset.assetFolder}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">Public ID</p>
        <code className="mt-2 block overflow-x-auto rounded-xl bg-muted p-3 text-xs">
          {asset.publicId}
        </code>
      </div>

      <Separator />
      <div>
        <h3 className="font-serif text-lg">Cloudinary AI story</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          AI Vision writes distinct alt text and a portfolio caption back to
          Cloudinary context metadata.
        </p>
      </div>
      {asset.isOptimistic ? (
        <Alert>
          <CloudCog aria-hidden="true" />
          <AlertTitle>Waiting for source-of-truth readback</AlertTitle>
          <AlertDescription>
            The upload succeeded. Cloudinary is indexing the asset while AI
            Vision prepares its stored description.
          </AlertDescription>
        </Alert>
      ) : (
        <AiStoryPanel
          key={`${asset.assetId}-${asset.alt}-${asset.caption}`}
          asset={asset}
          editReady={editReady}
        />
      )}
    </div>
  );
}

export function MediaStudio({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const [uploadedAssets, setUploadedAssets] = useState<PortfolioAsset[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [query, setQuery] = useState("");
  const [deliveryUrl, setDeliveryUrl] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const assets = useMemo(() => {
    const byId = new Map<string, PortfolioAsset>();
    for (const asset of uploadedAssets) {
      byId.set(asset.assetId, asset);
    }
    for (const asset of snapshot.assets) {
      byId.set(asset.assetId, asset);
    }
    return [...byId.values()];
  }, [snapshot.assets, uploadedAssets]);

  const filteredAssets = useMemo(
    () =>
      assets.filter((asset) => {
        const matchesType =
          filter === "all" || asset.resourceType === filter;
        const searchable =
          `${asset.displayName} ${asset.caption} ${asset.tags.join(" ")}`.toLowerCase();
        return matchesType && searchable.includes(deferredQuery);
      }),
    [assets, deferredQuery, filter],
  );

  const selected =
    assets.find((asset) => asset.assetId === selectedId) || null;
  const describedAssets = assets.filter(
    (asset) => asset.alt && asset.caption,
  ).length;
  const questProgress =
    snapshot.mode === "demo"
      ? 20
      : assets.length === 0
        ? 45
        : describedAssets === 0
          ? 75
          : 100;

  const handleUploaded = (asset: PortfolioAsset) => {
    setUploadedAssets((current) => [
      asset,
      ...current.filter((item) => item.assetId !== asset.assetId),
    ]);
    setSelectedId(asset.assetId);
  };

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="studio-title" className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col justify-center gap-4">
          <Badge className="w-fit">
            <Gamepad2 data-icon="inline-start" />
            Your media workspace
          </Badge>
          <div>
            <h1
              id="studio-title"
              className="max-w-4xl text-balance font-serif text-4xl leading-none sm:text-5xl lg:text-6xl"
            >
              Turn one upload into a whole portfolio.
            </h1>
            <p className="mt-4 max-w-3xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              Upload once, let Cloudinary AI Vision write the accessible
              story, and use smart transformations plus optimized CDN
              delivery for every view.
            </p>
          </div>
        </div>

        <Card className="bg-secondary text-secondary-foreground">
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Quest status
            </Badge>
            <CardTitle className="font-serif text-2xl">
              {questProgress === 100 ? "Portfolio powered up" : "Keep building"}
            </CardTitle>
            <CardDescription className="text-secondary-foreground/75">
              {snapshot.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={questProgress}>
              <ProgressLabel>Cloudinary proof</ProgressLabel>
          <ProgressValue />
            </Progress>
          </CardContent>
          <CardFooter className="justify-between bg-background/10">
            <span className="text-xs">
              {snapshot.mode === "live" ? "Live cloud" : "Demo cloud"}
            </span>
            <Badge>{snapshot.mode === "live" ? "Connected" : "Preview"}</Badge>
          </CardFooter>
        </Card>
      </section>

      <UploadMission
        cloudName={snapshot.cloudName}
        assetFolder={snapshot.assetFolder}
        generationReady={snapshot.generationReady}
        folderMode={snapshot.folderMode}
        uploadPreset={snapshot.uploadPreset}
        uploadReady={snapshot.uploadReady}
        onUploaded={handleUploaded}
      />

      <Tabs defaultValue="gallery" className="min-w-0">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge variant="outline" className="mb-2">
              Mission control
            </Badge>
            <h2 className="font-serif text-3xl">Build, remix, deliver</h2>
          </div>
          <TabsList aria-label="Media workspace views">
            <TabsTrigger value="gallery">
              <ImageIcon data-icon="inline-start" />
              Gallery
            </TabsTrigger>
            <TabsTrigger value="lab">
              <Sparkles data-icon="inline-start" />
              Lab
            </TabsTrigger>
            <TabsTrigger value="delivery">
              <Globe2 data-icon="inline-start" />
              Delivery
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="gallery" className="min-h-[34rem] pt-5">
          <Card className="mb-5" size="sm">
            <CardContent className="grid gap-3 sm:grid-cols-[1fr_13rem]">
              <Field>
                <FieldLabel htmlFor="asset-search" className="sr-only">
                  Search portfolio
                </FieldLabel>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="asset-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search names, captions, or tags"
                    className="pl-9"
                  />
                </div>
              </Field>
              <Select
                value={filter}
                onValueChange={(value) => setFilter(value as FilterValue)}
              >
                <SelectTrigger className="w-full">
                  <Filter aria-hidden="true" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Asset type</SelectLabel>
                    <SelectItem value="all">All media</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {filteredAssets.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.assetId}
                  asset={asset}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ImageIcon />
                </EmptyMedia>
                <EmptyTitle>No assets match this view</EmptyTitle>
                <EmptyDescription>
                  Clear the search or upload the first asset into your
                  Cloudinary portfolio folder.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </TabsContent>

        <TabsContent value="lab" className="min-h-[34rem] pt-5">
          <TransformationLab
            assets={assets}
            onInspect={setSelectedId}
            onDeliveryUrl={setDeliveryUrl}
          />
        </TabsContent>

        <TabsContent value="delivery" className="min-h-[34rem] pt-5">
          <DeliveryBoard snapshot={snapshot} deliveryUrl={deliveryUrl} />
        </TabsContent>
      </Tabs>

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId("");
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="pr-10 font-serif text-2xl">
              {selected?.displayName || "Asset details"}
            </SheetTitle>
            <SheetDescription>
              Read from Cloudinary with AI-generated context metadata.
            </SheetDescription>
          </SheetHeader>
          <AssetDetails asset={selected} editReady={snapshot.editReady} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
