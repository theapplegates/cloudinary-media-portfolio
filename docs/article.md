# Build a Media Portfolio in 30 Minutes with Cloudinary Upload Widget, Next.js App Router, and Server Actions

A portfolio starts with a file picker, but it rarely ends there. Visitors use
different screens and browsers. Editors need accessible descriptions. A
portrait may need a different crop from a gallery card. Videos need a capable
player. Every byte still has to reach the visitor quickly.

This tutorial builds **Media Quest**, a playful portfolio studio that handles
that complete path. You will upload images and videos directly to Cloudinary,
read them back in a Next.js Server Component, explore responsive
transformations, and let Cloudinary AI Vision generate and persist alt text
plus captions. A Server Action provides protected AI backfill for older
images. The home route is the working product rather than a marketing page.

The key proof is refresh persistence: upload an asset, refresh the browser,
and the same asset returns from Cloudinary Search API. This is not a local
array dressed up as a gallery.

> Repository: replace with your public GitHub URL before publication  
> Live demo: replace with your deployed URL before publication

## What you will build

Media Quest includes four connected stations:

- **Upload Mission** opens Cloudinary Upload Widget with local file, camera,
  and remote URL sources, or generates a managed image through Cloudinary's
  multi-model Image Generation API.
- **Portfolio Vault** reads persisted images and videos from one Cloudinary
  asset folder, then adds search and resource-type filters.
- **Transformation Lab** derives several visual treatments from one original,
  including automatic-gravity cropping and opt-in generative fill.
- **Delivery Board** explains responsive `srcset`, automatic format and
  quality, the delivery hostname, and CDN caching.

Open any asset to inspect its dimensions and delivery URL. The detail sheet
also displays a read-only AI story. Cloudinary AI Vision creates distinct alt
text and a portfolio caption, while the app validates and stores both as
Cloudinary context metadata. You do not write either field manually.

## Why Cloudinary and the App Router fit together

The browser is good at selecting files and showing immediate feedback. It
should not receive an API secret. The server is good at authenticated Search
API queries and controlled metadata writes. It should not become an
unnecessary media proxy.

This split gives each layer one clear job:

```text
Browser -> Upload Widget -> Cloudinary
Bounded recent upload -> Analyze API -> alt text + caption -> context
Cloudinary -> Search API -> Server Component -> gallery
Older asset -> Server Action -> AI Vision -> Cloudinary metadata
Public ID -> transformation URL -> CDN -> visitor
```

Cloudinary's Upload Widget supports direct uploads while an unsigned upload
preset supplies account-side restrictions. The
[Cloudinary Upload Widget documentation](https://cloudinary.com/documentation/upload_widget)
and [upload preset documentation](https://cloudinary.com/documentation/upload_presets)
cover the available sources and preset controls.

Next.js Server Components keep the Admin API credentials out of the client
bundle. A Server Action lets an authorized editor trigger AI backfill for an
older asset without accepting author-written metadata. See the current
[Next.js Server Actions guide](https://nextjs.org/docs/app/guides/server-actions)
for the framework's security and validation recommendations.

## Prerequisites

You need:

- Node.js 20.9 or newer
- A Cloudinary account
- The Cloudinary AI Vision add-on for automatic image descriptions
- The Cloudinary Image Generation add-on for the optional generation path
- Basic React and TypeScript familiarity
- About 30 minutes for the core path

Clone the project, install the packages, and create your local environment
file:

```bash
npm install
cp .env.example .env.local
```

The project uses Next.js 16, React 19, `next-cloudinary`, the Cloudinary Node
SDK, Zod, Tailwind CSS, and shadcn/ui. Its playful TweakCN theme uses
self-hosted fonts, rounded cards, bright yellow action surfaces, and purple
progress accents.

## Minute 0 to 5: create a restricted upload preset

Open the Cloudinary Console, choose **Settings**, open **Upload**, and add an
upload preset.

Use these values:

- Preset name: `media_portfolio_unsigned`
- Signing mode: **Unsigned**
- Asset folder: `media-portfolio`
- Allowed formats: `jpg,jpeg,png,webp,avif,gif,mp4,webm,mov`

Set account-level file-size restrictions that match your product. The demo
also asks the widget to allow at most eight queued files, 12 MB images, and
80 MB videos. Browser options improve the experience, but the preset is the
enforcement boundary.

Add the public upload values to `.env.local`:

```dotenv
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=media_portfolio_unsigned
```

These values may reach the browser. An unsigned preset is not a secret, so it
must be narrow. Never add `NEXT_PUBLIC_` to an API secret.

## Minute 5 to 10: upload without proxying media through Next.js

`UploadMission` is a Client Component because the widget needs browser events.
The essential integration is compact:

```tsx
<CldUploadWidget
  uploadPreset={uploadPreset}
  config={{ cloud: { cloudName } }}
  options={{
    sources: ["local", "camera", "url"],
    multiple: true,
    maxFiles: 8,
    resourceType: "auto",
  }}
  onSuccess={(result) => addOptimisticAsset(result)}
  onQueuesEnd={(_, { widget }) => {
    widget.close();
    router.refresh();
  }}
>
  {({ open }) => (
    <Button onClick={() => open()}>Upload media</Button>
  )}
</CldUploadWidget>
```

The actual component performs result type checks, reports status through an
`aria-live` region, and adds a temporary optimistic card. When the queue ends,
`router.refresh()` asks the Server Component for Cloudinary's persisted view.
For images, it also forwards the immutable asset ID, public ID, and version to
`/api/describe`. The server reads the asset back and requires the exact
portfolio folder, preset tag, resource type, matching creation version, and a
15-minute window before AI Vision can spend quota.
The app detects Cloudinary folder mode. The widget sends
`asset_folder=media-portfolio` for dynamic folders or
`folder=media-portfolio` for a legacy fixed-folder environment. The unsigned
preset defines the same destination as the authoritative value.
Read the full implementation in
[`src/components/upload-mission.tsx`](../src/components/upload-mission.tsx).

This path is efficient because the file travels from the visitor to
Cloudinary. Your Next.js function does not buffer a large image or video.

## Power-up: generate a managed portfolio image

The Upload Mission also has a **Generate** tab. It follows the same managed
asset pattern used in the companion image-generation project: the browser
sends a prompt, model family, tier, and portfolio edit token to a Node.js Route
Handler. The Cloudinary API key and secret remain on the server.

Enable the
[Cloudinary Image Generation add-on](https://cloudinary.com/documentation/image_generation_addon),
then create a signed preset named `media_portfolio_generations`. Set its
dynamic **Asset folder** or legacy **Folder** to the same `media-portfolio`
value used by the unsigned Upload Widget preset.

Add the preset name to `.env.local`:

```dotenv
CLOUDINARY_IMAGE_GENERATION_PRESET=media_portfolio_generations
```

The route maps five allowlisted model families and standard or premium tiers
to current model IDs. It calls the account-scoped `text_to_image` endpoint with
HTTP Basic authentication:

```ts
const response = await fetch(
  `https://api.cloudinary.com/v2/generate/${cloudName}/text_to_image`,
  {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      model: { id: modelId },
      target: {
        target_type: "managed_asset",
        public_id: generatedId,
        upload_preset: generationPreset,
      },
    }),
  },
);
```

The request has a 120-second timeout because image generation takes longer
than a metadata write. The edit token protects add-on credits in this
single-user demo. A public multi-user product should add authentication,
durable rate limiting, ownership checks, and account quota monitoring.

Folder consistency is verified rather than assumed. Before spending quota,
the route reads the generation preset through Admin API and confirms it is
signed and targets `media-portfolio` through the mode-appropriate folder
field. After generation, it reads the immutable asset ID and verifies the
stored folder again. The gallery likewise chooses `asset_folder` for dynamic
folders or `folder` for fixed folders, so both uploads and generations remain
visible after refresh. The protected generation route then asks AI Vision for
alt text and a caption before returning the generated asset.

## Minute 10 to 15: read the portfolio on the server

Add the server-only values to `.env.local`:

```dotenv
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_PORTFOLIO_FOLDER=media-portfolio
CLOUDINARY_IMAGE_GENERATION_PRESET=media_portfolio_generations
PORTFOLIO_ADMIN_TOKEN=create_a_long_random_token
```

The Cloudinary module begins with `import "server-only"`. That guard makes an
accidental client import fail during development instead of leaking privileged
code into the browser.

The home page is a Server Component:

```tsx
export default async function Home() {
  await connection();
  const snapshot = await getPortfolioSnapshot();

  return (
    <main>
      <MediaStudio snapshot={snapshot} />
    </main>
  );
}
```

`connection()` tells Next.js that the result belongs to request time. Live
Cloudinary data is not frozen into a production build.

`getPortfolioSnapshot()` configures the Node SDK and queries Search API:

```ts
const folderMode = await resolveFolderMode();
const folderField = folderMode === "fixed" ? "folder" : "asset_folder";

const result = await cloudinary.search
  .expression(`${folderField}="${PORTFOLIO_FOLDER}"`)
  .sort_by("created_at", "desc")
  .max_results(40)
  .with_field("context")
  .with_field("tags")
  .execute();
```

The function treats the SDK response as external data, checks field types, and
returns a smaller `PortfolioAsset` shape. This prevents rendering code from
depending on every detail of the Admin API response. The current
[Cloudinary Search API reference](https://cloudinary.com/documentation/search_method)
explains expressions, sorting, fields, and pagination.

When credentials are absent, Media Quest enters a labelled demo mode with
public assets from Cloudinary's `demo` cloud. Upload and metadata setup states
remain visible. It never claims those samples are the user's persistent data.

## Minute 15 to 20: transform one original into a responsive system

The portfolio does not create and upload five copies of every image. It keeps
one original and expresses each layout need as a transformation.

The gallery cards use `CldImage`, a width and height, responsive sizing hints,
and accessible alt text. The component generates a responsive `srcset` while
Cloudinary applies automatic format and quality delivery. `f_auto` can choose
an efficient browser-supported format, while `q_auto` balances visual quality
and bytes. Cloudinary documents both in its
[image optimization guide](https://cloudinary.com/documentation/image_optimization).

The Transformation Lab makes the URL model visible:

1. **Fit** preserves the complete frame inside a landscape box.
2. **Smart crop** uses fill cropping with automatic gravity to protect the
   visually relevant region.
3. **Portrait** first identifies the subject, then creates an editorial
   vertical composition.
4. **Grayscale** changes the treatment without creating another stored source.
5. **Generative fill** expands the image to a new aspect ratio when the user
   explicitly enables it.

Generative transformations can add processing cost and may require human
review. Media Quest labels that choice and leaves it off by default. This is a
more honest product pattern than silently spending transformation credits.

Cloudinary transformations are URL instructions. Different transformation
URLs become separately cacheable derived assets, while the original remains
available for future designs. Use the
[transformation reference](https://cloudinary.com/documentation/transformation_reference)
when adding effects beyond this lab.

## Minute 20 to 25: generate alt text and captions with AI Vision

Alt text and captions have related but different jobs. Alt text communicates
visible, relevant content when the image is unavailable. A portfolio caption
can add editorial framing for every visitor. Reusing one generic sentence for
both weakens that distinction.

Register for the
[Cloudinary AI Vision add-on](https://cloudinary.com/documentation/cloudinary_ai_vision_addon).
The server calls AI Vision General through the
[Analyze API](https://cloudinary.com/documentation/analyze_api_guide) with the
immutable Cloudinary asset ID. One prompt includes a JSON Schema requiring
separate `alt` and `caption` strings:

```ts
const response = await fetch(
  `${analysisBaseUrl}/analyze/ai_vision_general`,
  {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: { asset_id: asset.assetId },
      prompts: [descriptionPrompt],
    }),
  },
);
```

Structured output arrives as a JSON string inside
`data.analysis.responses[0].value`. The app parses it, validates both strings
with Zod, and rejects malformed or oversized output before writing anything.
It then stores the result with the asset:

```ts
await cloudinary.uploader.explicit(asset.publicId, {
  type: "upload",
  resource_type: "image",
  context: {
    alt,
    caption,
    ai_description_source: "cloudinary_ai_vision",
    ai_description_model: modelVersion,
  },
});
```

The helper reads the immutable asset ID back and compares the persisted
metadata with the generated values. This makes Cloudinary, rather than React
state, the source of truth.

Two automatic triggers cover new images:

1. Upload Widget returns the immutable asset ID, public ID, and version. The
   description route verifies those values against a recent, tagged image in
   the exact portfolio folder before calling AI Vision.
2. Image Generation already runs behind the edit token, so its route calls AI
   Vision immediately after folder verification.

An older image without metadata displays one **Generate story with Cloudinary
AI** action. Its Server Action accepts only `assetId` and the edit token. It
does not accept manually written alt text or captions.

Read the full workflow in
[`src/lib/cloudinary-description.ts`](../src/lib/cloudinary-description.ts),
[`src/app/api/describe/route.ts`](../src/app/api/describe/route.ts), and
[`src/app/actions.ts`](../src/app/actions.ts).

AI-generated text still needs an editorial review policy. Automation removes
repetitive writing, but it does not guarantee Web Content Accessibility
Guidelines (WCAG) conformance or prevent every unsupported inference.

## Minute 25 to 30: inspect delivery and verify the proof

Start the project:

```bash
npm run dev
```

Open `http://localhost:3000`, upload an image, and watch it appear. Then perform
the important test:

1. Refresh the browser.
2. Confirm the uploaded asset remains.
3. Open **Generate** and create one standard-tier managed image.
4. Confirm the response verifies the folder and stores AI metadata.
5. Open either asset's detail sheet.
6. Inspect the read-only AI alt text and portfolio caption.
7. Refresh again and confirm both fields remain without manual writing.
8. Open the Delivery Board and inspect the generated URL.

The app also exposes `/api/health`. It reports readiness booleans and the asset
folder without returning credential values.

Run the full local verification before deployment:

```bash
npm run check
```

That command runs ESLint, TypeScript, and an optimized production build.

## Where the CDN and multi-CDN fit

A Cloudinary delivery URL normally uses `res.cloudinary.com`. On the first
request for a transformation, Cloudinary produces or retrieves the derived
asset and delivers it through the configured CDN. Subsequent requests can be
served from edge caches close to visitors.

Private CDN distributions and custom delivery hostnames require account
configuration. Cloudinary also offers smart and dynamic multi-CDN capabilities
for eligible accounts, generally as enterprise delivery features. They are
configured at the Cloudinary account and delivery layer, not activated by a
React state toggle.

Media Quest shows the active delivery hostname and accepts optional
`NEXT_PUBLIC_CLOUDINARY_SECURE_DISTRIBUTION` and
`NEXT_PUBLIC_CLOUDINARY_PRIVATE_CDN` values. Only set them after Cloudinary has
configured that distribution for your account. Read
[Cloudinary's advanced URL delivery options](https://cloudinary.com/documentation/advanced_url_delivery_options)
for the current requirements.

This separation is powerful: application code asks for the media variant, and
the delivery configuration decides how that response reaches the visitor.

## Performance and accessibility choices worth keeping

The demo includes several patterns that belong in production work:

- Gallery images have intrinsic dimensions, responsive size hints, and lazy
  loading outside the leading content.
- The video player is dynamically imported only when a video detail view needs
  it.
- Search uses `useDeferredValue`, keeping typing responsive as the gallery
  filters.
- Alt text is stored with the asset instead of scattered through page code.
- Loading, empty, error, demo, and incomplete-setup states are distinct.
- Upload status uses a polite live region.
- Motion is reduced when the visitor requests reduced motion.
- Server credentials remain in a module guarded by `server-only`.

Performance is a system property. Cloudinary reduces media weight, while
Next.js controls rendering and JavaScript boundaries. The best result comes
from using both intentionally.

## Ideas for the next quest

Once the core proof works, extend one boundary at a time:

- Add signed uploads when users need dynamic, trusted upload parameters.
- Add authentication and per-user asset folders.
- Add durable per-user limits for Image Generation API credits.
- Add durable per-user limits for AI Vision analysis tokens.
- Create a webhook-driven moderation or AI-tagging workflow.
- Paginate Search API results with `next_cursor`.
- Add a comparison panel that records transferred bytes through the browser
  Performance API.
- Generate social cards with a Cloudinary overlay transformation.
- Add an authenticated delete flow with confirmation and an audit trail.
- Connect a configured private CDN or enterprise multi-CDN account and compare
  cache headers across regions.

The most important design principle remains the same: store the original once,
keep privileged operations on the server, and derive delivery-ready media at
the edge.

## Frequently asked questions

### Is an unsigned upload preset safe?

It is intentionally public, so safety comes from restriction. Limit formats,
file sizes, asset location, and any transformations the preset may apply. Use
signed uploads when the server must authorize dynamic parameters or user
ownership.

### Why use Search API instead of keeping upload results in React state?

React state provides immediate feedback but disappears on refresh. Search API
readback proves persistence and lets other sessions see the same Cloudinary
source of truth.

### Why use both a route handler and a Server Action for AI metadata?

The route handler receives identifiers from a fresh Upload Widget upload,
reads the asset back, applies bounded folder, tag, type, version, and age
checks, then starts analysis automatically. The Server Action is the protected
retry and backfill path for older assets. Both keep the API secret on the
server and verify the immutable asset ID and portfolio folder.

### Does generated alt text guarantee accessibility?

No. AI Vision accelerates description work and centralizes the result in
Cloudinary, but output can omit context or make mistakes. Define review rules
for important content and treat decorative images separately with empty alt
text where appropriate.

### Does `f_auto,q_auto` mean every visitor receives the same file?

No. Cloudinary can negotiate an appropriate format and choose an automatic
quality level for the requested transformation. Browser support, content, and
delivery configuration influence the result.

### Does this app enable Cloudinary multi-CDN?

No client application can enable an account-level CDN product. The app
demonstrates CDN-ready transformation URLs and configurable delivery hosts.
Cloudinary must enable private CDN or eligible smart and dynamic multi-CDN
features for the account.

### Can the same approach handle video?

Yes. Upload Widget uses `resourceType: "auto"`, the server normalizes image and
video results, and video details load Cloudinary Video Player. Production
video workflows may add eager transformations, adaptive streaming, captions,
and webhook status handling.

### Are Cloudinary-generated images stored with uploads?

Yes. A `managed_asset` generation target stores the generated original in the
Cloudinary product environment. This project applies a signed preset and then
verifies that its asset folder matches the Upload Widget's `media-portfolio`
folder.

## SEO & GEO Optimization Strategy:

| Field | Recommendation |
| --- | --- |
| SEO title | Build a Cloudinary Media Portfolio with Next.js in 30 Minutes |
| Meta description | Build a responsive Next.js portfolio with Cloudinary Upload Widget, automatic AI alt text and captions, Image Generation, transformations, and CDN delivery. |
| Primary keyword | Cloudinary Next.js media portfolio |
| Secondary keywords | Cloudinary Upload Widget Next.js, Cloudinary AI Vision alt text, Cloudinary Image Generation API, Next.js Server Actions Cloudinary, responsive Cloudinary images, Cloudinary multi-CDN |
| Search intent | Hands-on tutorial for developers evaluating Cloudinary with the Next.js App Router |
| Suggested slug | `/blog/cloudinary-nextjs-media-portfolio` |

Use the article title as the only H1. Keep the first paragraph focused on the
upload, transformation, metadata, and delivery problem. Add descriptive alt
text to screenshots such as “Media Quest transformation lab comparing smart
crop and portrait variants.”

For answer engines, preserve the direct definitions in “Why Cloudinary and the
App Router fit together,” the numbered verification proof, the multi-CDN
boundary, and the FAQ answers. They state claims in self-contained language
that can be cited without surrounding marketing copy.

Add `BlogPosting` JSON-LD with `headline`, `description`, `author`,
`datePublished`, `dateModified`, `image`, `mainEntityOfPage`, and the canonical
URL. Add `FAQPage` JSON-LD whose questions and answers match the visible FAQ
verbatim. Do not add schema for content that is hidden from readers.

Link to the public repository near the introduction and to the deployed demo
near the 30-minute verification section. Retain the official Cloudinary and
Next.js documentation links as primary-source citation signals. After
publication, add one internal link from a related image optimization article
and one from a Next.js integration hub.
