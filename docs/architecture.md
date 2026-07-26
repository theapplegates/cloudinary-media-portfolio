# Media Quest architecture

Media Quest is intentionally small enough to teach in one sitting while still
using real persistence and real delivery URLs.

## Request flow

```text
Browser ---- unsigned upload preset ----> Cloudinary Upload Widget
  |                                         |
  | prompt, model, tier, edit token         v
  v                                  Cloudinary asset storage
Next.js generation route
  |
  | Basic Auth + signed preset
  v
Cloudinary Image Generation API
  |
  | managed asset in media-portfolio
  v
Cloudinary asset storage
  |
  | bounded recent-upload proof or protected generation
  v
Next.js description route / generation route
  |
  | Basic Auth + immutable asset ID + structured prompt
  v
Cloudinary AI Vision Analyze API
  |
  | distinct alt text and caption
  v
Cloudinary context metadata
                                  |
                                  | Search API, server credentials
                                  v
Next.js Server Component <--- normalized portfolio snapshot
  |
  | public IDs and safe metadata
  v
Interactive gallery and transformation lab
  |
  | older asset ID + edit token, no manual description text
  v
Next.js Server Action ---> verify immutable asset ID and folder
                                  |
                                  | trigger AI Vision and explicit update
                                  v
                         Cloudinary context metadata
```

## Browser boundary

The client receives only values needed for unsigned upload and delivery:

- Cloud name
- Unsigned upload preset
- Prompt and allowlisted generation model choice
- Public IDs
- Asset dimensions and display metadata
- Optional configured delivery host

The Upload Widget transfers files directly from the browser to Cloudinary.
The application server does not proxy large media bodies.

After an image upload, the client forwards its immutable asset ID, public ID,
and version to the description route. The server reads the asset from
Cloudinary and requires the exact folder, preset tag, image resource type,
matching creation version, and a 15-minute window before spending AI Vision
quota. Repeated calls return stored metadata without another analysis.

The generation form sends text and allowlisted model choices to a protected
route. It never receives the Cloudinary API key or secret.

## Server boundary

`src/lib/cloudinary.ts` imports `server-only` and is the only module that
configures the Cloudinary Node SDK with the API key and secret. It:

- queries the portfolio folder through Search API;
- calls the authenticated Image Generation API with a 120-second timeout;
- verifies the generation preset is signed and targets the portfolio folder
  before spending quota;
- verifies the returned immutable asset ID belongs to the portfolio folder;
- normalizes external response data before it reaches components;
- verifies an immutable asset ID belongs to the configured folder;
- calls AI Vision General with a structured JSON Schema prompt;
- validates distinct alt text and captions before writing context metadata;
- reads the metadata back by immutable asset ID.

The Server Action accepts only an older asset ID and the demonstration edit
token. It never accepts author-written alt text or captions. The AI Vision
helper performs the folder check, analysis, context update, and readback, then
the action calls `revalidatePath("/")`.

The generation route applies the same token gate before spending add-on quota.
It accepts only model families and tiers declared in the server-shared
allowlist. Cloudinary stores the result as a managed asset, then the Admin API
performs folder readback before the route returns success. It then calls AI
Vision so the generated image returns with persisted alt text and a caption.

## Rendering boundary

The home page is a Server Component. `connection()` opts the portfolio request
into request-time rendering, so live Cloudinary data is not captured at build
time.

The interactive studio is a Client Component because it owns search, filters,
selected-asset state, Upload Widget callbacks, and transformation controls.
The Cloudinary video player is dynamically imported so image-only visits do
not pay its full JavaScript cost.

## Media transformation model

The app stores one original and derives delivery variants through Cloudinary
URL transformations:

- responsive thumbnail;
- fixed landscape fill;
- automatic-gravity smart crop;
- two-stage portrait art direction;
- grayscale treatment;
- opt-in generative fill.

`f_auto` and `q_auto` are applied at delivery time. Cloudinary can cache each
derived URL at the CDN edge. The source original remains reusable for future
layouts.

## Demo and live modes

If Admin API credentials are absent, the server returns a labelled set of
public Cloudinary sample assets. This is a real delivery demonstration but not
the user's persistent portfolio.

When server credentials are present, the Search API response becomes the
portfolio source of truth. If a live query fails, the UI reports the failure
instead of silently pretending sample data is live data.

## Deliberate scope limits

This educational build does not include user accounts, role-based permissions,
moderation queues, webhooks, destructive asset deletion, durable AI rate
limits, or billing controls.
Those features matter in production, but adding them to a 30-minute learning
path would obscure the upload-to-delivery proof.
