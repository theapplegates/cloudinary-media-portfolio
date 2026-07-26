import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { TooltipProvider } from "@/components/ui/tooltip";

import "@fontsource-variable/quicksand/wght.css";
import "@fontsource/bree-serif/400.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "./globals.css";
import "next-cloudinary/dist/cld-video-player.css";

export const metadata: Metadata = {
  title: {
    default: "Media Quest | Cloudinary portfolio studio",
    template: "%s | Media Quest",
  },
  description:
    "A playful Next.js portfolio powered by Cloudinary Upload Widget, AI Vision descriptions, Image Generation, transformations, and optimized delivery.",
  applicationName: "Media Quest",
  keywords: [
    "Cloudinary",
    "Next.js",
    "Upload Widget",
    "Server Actions",
    "AI alt text",
    "Cloudinary AI Vision",
    "media portfolio",
    "image optimization",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <TooltipProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <footer className="border-t bg-background/80">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                <p>Built to teach one upload-to-delivery workflow.</p>
                <p>Cloudinary is the media source of truth.</p>
              </div>
            </footer>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
