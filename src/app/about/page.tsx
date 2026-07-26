import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CloudUpload,
  DatabaseZap,
  Globe2,
  LockKeyhole,
  Sparkles,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "About the project",
  description:
    "How the Cloudinary Upload Widget, Next.js App Router, Server Actions, transformations, and CDN delivery fit together.",
};

const steps = [
  {
    icon: CloudUpload,
    title: "1. Upload",
    description:
      "Upload media directly with an unsigned preset, or generate a managed image through a protected server route.",
  },
  {
    icon: DatabaseZap,
    title: "2. Describe",
    description:
      "Cloudinary AI Vision generates distinct alt text and a caption, then the app stores both with the asset.",
  },
  {
    icon: Sparkles,
    title: "3. Transform",
    description:
      "CldImage produces smart crops, responsive variants, effects, and an opt-in generative fill.",
  },
  {
    icon: Globe2,
    title: "4. Deliver",
    description:
      "Automatic format and quality reduce bytes while Cloudinary delivers cached derivatives at the edge.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <section className="flex max-w-4xl flex-col gap-4">
        <Badge className="w-fit">About the project</Badge>
        <h1 className="text-balance font-serif text-4xl leading-none sm:text-6xl">
          A complete Cloudinary workflow you can see.
        </h1>
        <p className="max-w-3xl text-pretty text-lg leading-8 text-muted-foreground">
          Media Quest is the companion app for “Build a Media Portfolio in 30
          Minutes with Cloudinary Upload Widget, Next.js App Router, and Server
          Actions.” It starts on the working studio because the workflow is the
          story.
        </p>
        <Link
          href="/"
          className={buttonVariants({ className: "w-fit" })}
        >
          Open the studio
          <ArrowRight data-icon="inline-end" />
        </Link>
      </section>

      <Separator />

      <section aria-labelledby="architecture-title">
        <div className="mb-5">
          <h2 id="architecture-title" className="font-serif text-3xl">
            The four-part media loop
          </h2>
          <p className="mt-2 text-muted-foreground">
            Each stage leaves visible evidence in the interface.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.title}>
                <CardHeader>
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/20">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <CardTitle>{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              Browser
            </Badge>
            <CardTitle>Public upload and delivery values</CardTitle>
            <CardDescription>
              The cloud name, unsigned preset, public IDs, and delivery URLs
              can be present in browser code.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            The Upload Widget is a Client Component. It never imports the
            Cloudinary Node.js software development kit or receives the API
            secret.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              Server
            </Badge>
            <CardTitle>Authenticated analysis and metadata writes</CardTitle>
            <CardDescription>
              Admin API credentials and the edit token remain server-only.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            New uploads use Cloudinary&apos;s signed response as short-lived
            proof. The Server Action handles older assets by validating the
            edit token before AI Vision analyzes and updates context metadata.
          </CardContent>
        </Card>
      </section>

      <Alert>
        <LockKeyhole aria-hidden="true" />
        <AlertTitle>Why unsigned uploads here?</AlertTitle>
        <AlertDescription>
          A restricted unsigned preset keeps this public tutorial focused. Use
          signed uploads and real user authentication when uploads are private,
          account-specific, or sensitive.
        </AlertDescription>
      </Alert>
    </div>
  );
}
