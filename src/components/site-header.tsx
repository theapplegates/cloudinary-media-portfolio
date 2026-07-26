import Link from "next/link";
import { Cloud, Info, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary shadow-sm">
            <Cloud aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-serif text-lg leading-none">
              Media Quest
            </span>
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              Cloudinary portfolio studio
            </span>
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            <Sparkles data-icon="inline-start" />
            Next.js App Router
          </Badge>
          <Link
            href="/"
            className={buttonVariants({ variant: "ghost" })}
            aria-label="Open portfolio studio"
          >
            Studio
          </Link>
          <Link
            href="/about"
            className={buttonVariants({ variant: "outline" })}
            aria-label="About this Cloudinary demo"
          >
            <Info data-icon="inline-start" />
            <span className="hidden sm:inline">About</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
