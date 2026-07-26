# Media Quest

Media Quest is a playful media portfolio studio built with Next.js App Router,
Cloudinary, Server Actions, and shadcn/ui. The home route opens directly into
the working app. There is no marketing landing page.

The demo follows one complete workflow:

1. Upload an image or video through Cloudinary Upload Widget.
2. Or generate a managed image through Cloudinary Image Generation API.
3. Refresh the portfolio from Cloudinary Search API.
4. Compare responsive, optimized, and art-directed transformations.
5. Let Cloudinary AI Vision generate alt text and captions automatically.
6. Inspect the resulting delivery URL and CDN behavior.

Without credentials, the app starts in a clearly labelled demo mode using
public assets from Cloudinary's `demo` cloud. With credentials, Cloudinary
becomes the portfolio's persistent source of truth.

## Start the project

Requirements: Node.js 20.9 or newer and a Cloudinary account.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You can preview the
interface before filling in `.env.local`; upload and AI description workflows unlock
after the Cloudinary setup below.

## Configure Cloudinary

Follow [docs/cloudinary-console-setup.md](docs/cloudinary-console-setup.md) to
create an unsigned upload preset and copy the required account values. The
minimum live-upload configuration is:

```dotenv
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=media_portfolio_unsigned
```

To read persisted assets, generate images, and store AI metadata, also add the server-only
values:

```dotenv
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_PORTFOLIO_FOLDER=media-portfolio
CLOUDINARY_IMAGE_GENERATION_PRESET=media_portfolio_generations
PORTFOLIO_ADMIN_TOKEN=create_a_long_random_token
```

The server detects whether the Cloudinary product environment uses dynamic or
legacy fixed folders and selects the matching upload and Search API fields.
For a browser-upload-only legacy setup without Admin API credentials, set
`CLOUDINARY_FOLDER_MODE=fixed`.

Never prefix the API secret or edit token with `NEXT_PUBLIC_`.

## What the app demonstrates

- Direct browser-to-Cloudinary image and video uploads
- Server-side text-to-image generation across five Cloudinary model families
- Managed generation assets verified in the same portfolio folder before the
  API response succeeds
- Cloudinary AI Vision structured output for distinct alt text and captions
- Automatic AI description after bounded Upload Widget and protected Image
  Generation responses
- Camera, local-file, and remote-URL upload sources
- App Router Server Components for the initial media query
- A validated, token-protected Server Action for older-image AI backfill
- Search API readback, proving persistence after refresh
- `CldImage` responsive `srcset` generation and lazy delivery
- `f_auto` and `q_auto` delivery optimization
- Fill, automatic-gravity crop, portrait art direction, grayscale, and
  opt-in generative fill
- Cloudinary Video Player, loaded only when an asset detail sheet needs it
- Delivery URL evidence and an accurate explanation of private CDN and
  enterprise multi-CDN options
- Accessible empty, loading, error, and setup states

## Project map

```text
src/app/page.tsx                 Server-rendered portfolio entry point
src/app/actions.ts               AI description backfill Server Action
src/app/api/describe/route.ts    Verified-upload AI Vision route
src/app/api/generate/route.ts    Protected Image Generation route
src/app/api/health/route.ts      Safe configuration health check
src/components/media-studio.tsx  Gallery, lab, delivery board, details
src/components/upload-mission.tsx
src/components/ai-story-panel.tsx
src/components/generate-image-mission.tsx
src/lib/cloudinary-description.ts Server-only AI Vision client
src/lib/cloudinary-generation.ts Server-only generation API client
src/lib/cloudinary.ts            Server-only Search and Upload API access
docs/article.md                  Publication-ready tutorial draft
```

The trust boundaries and request flow are expanded in
[docs/architecture.md](docs/architecture.md).

## Validate

```bash
npm run check
```

This runs ESLint, TypeScript, and a production build. The build uses webpack
explicitly because this dependency combination currently compiles reliably
there while Turbopack can stall during production font and player CSS
processing. Development still uses the Next.js default development bundler.

## Multi-CDN note

Every transformed Cloudinary delivery URL is cacheable at the CDN edge.
Cloudinary's smart and dynamic multi-CDN features are account-level delivery
options, generally associated with enterprise plans. The demo exposes the
delivery host and documents that boundary; it does not misrepresent multi-CDN
as a browser toggle.

## Tutorial

The complete beginner-oriented article is in
[docs/article.md](docs/article.md). Before publishing it, replace the marked
repository and live-demo placeholders with public URLs.

## Official references

- [Cloudinary Upload Widget](https://cloudinary.com/documentation/upload_widget)
- [Cloudinary Upload presets](https://cloudinary.com/documentation/upload_presets)
- [Cloudinary Search API](https://cloudinary.com/documentation/search_method)
- [Cloudinary AI Vision](https://cloudinary.com/documentation/cloudinary_ai_vision_addon)
- [Cloudinary Analyze API](https://cloudinary.com/documentation/analyze_api_guide)
- [Cloudinary image accessibility](https://cloudinary.com/documentation/accessible_media_images)
- [Cloudinary image optimization](https://cloudinary.com/documentation/image_optimization)
- [Cloudinary advanced delivery options](https://cloudinary.com/documentation/advanced_url_delivery_options)
- [Next.js Server Actions](https://nextjs.org/docs/app/guides/server-actions)
- [next-cloudinary documentation](https://next.cloudinary.dev/)
