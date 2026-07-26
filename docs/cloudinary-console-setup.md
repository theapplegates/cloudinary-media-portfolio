# Cloudinary console setup

This guide connects Media Quest to your own Cloudinary product environment.
The app deliberately separates values that may reach the browser from
credentials that must remain on the server.

## 1. Copy the environment template

```bash
cp .env.example .env.local
```

Find your cloud name, API key, and API secret in the Cloudinary Console. Add
them to `.env.local`. Keep `CLOUDINARY_API_SECRET` server-only.

## 2. Create the unsigned upload preset

In the Cloudinary Console:

1. Open **Settings**, then **Upload**.
2. Find **Upload presets** and select **Add upload preset**.
3. Set the preset name to `media_portfolio_unsigned`.
4. Change **Signing mode** to **Unsigned**.
5. Set the destination to `media-portfolio`: use **Asset folder** in dynamic
   folder mode or **Folder** in legacy fixed folder mode.
6. Restrict allowed formats to the formats used by this demo:
   `jpg,jpeg,png,webp,avif,gif,mp4,webm,mov`.
7. Add account-level file-size limits appropriate for your project.
8. Save the preset.

The component also applies browser-side limits of 12 MB for images, 80 MB for
videos, and eight files per queue. It detects the product environment folder
mode through Admin API and sends either `asset_folder=media-portfolio`
(dynamic) or `folder=media-portfolio` (fixed).
Preset restrictions are the authoritative enforcement layer. Do not make an
unrestricted unsigned preset. If the request and unsigned preset both define
the folder, Cloudinary uses the preset value, so keep both values identical.

The gallery uses that same mode to query Search API with either
`asset_folder="media-portfolio"` or `folder="media-portfolio"`.

## 3. Enable AI Vision

Open the
[Cloudinary AI Vision add-on](https://console.cloudinary.com/app/marketplace/details/ai_vision)
and register for a plan. The app uses AI Vision General through the Analyze
API. One structured prompt returns two different fields:

- objective alt text for assistive technology;
- a concise editorial caption for the portfolio interface.

The app validates that output, stores it as `alt` and `caption` context
metadata, then reads the asset back from Cloudinary. No extra upload-preset
parameter is required for this Analyze API workflow.

## 4. Enable Image Generation and create its signed preset

Open the
[Cloudinary Image Generation add-on](https://console.cloudinary.com/app/marketplace/details/image_generation)
and register for it. Generate one image in the Console if your account asks
you to activate the available plan through its first generation.

Create a second upload preset for server-side generated assets:

1. Open **Settings**, then **Upload**.
2. Find **Upload presets** and select **Add upload preset**.
3. Set the preset name to `media_portfolio_generations`.
4. Keep **Signing mode** set to **Signed**.
5. Set its dynamic **Asset folder** or legacy fixed **Folder** to the same
   `media-portfolio` value.
6. Add a `media-portfolio-generated` tag if you want an additional gallery
   filter in the Cloudinary Console.
7. Leave incoming and eager transformations empty. The app derives responsive
   variants from the unchanged generated original at delivery time.
8. Save the preset.

The two presets serve different trust zones but must share one destination:

| Preset | Signing mode | Destination folder |
| --- | --- | --- |
| `media_portfolio_unsigned` | Unsigned | `media-portfolio` |
| `media_portfolio_generations` | Signed | `media-portfolio` |

The protected Next.js route reads the signed preset through Admin API before
spending generation quota. It refuses to continue unless the preset is signed
and its mode-appropriate destination equals `media-portfolio`. After
Cloudinary creates the managed image, the route reads it back by immutable
asset ID and verifies the folder again.

## 5. Fill in `.env.local`

```dotenv
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=media_portfolio_unsigned

CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_PORTFOLIO_FOLDER=media-portfolio
CLOUDINARY_IMAGE_GENERATION_PRESET=media_portfolio_generations
PORTFOLIO_ADMIN_TOKEN=create_a_long_random_token
```

The app detects folder mode when Admin API credentials are present. For a
browser-upload-only integration on a legacy environment, add
`CLOUDINARY_FOLDER_MODE=fixed`.

Generate a long random edit token with a password manager. It is a
demonstration access gate for older-image AI backfill and image generation
credits. New uploads use a bounded recent-upload check instead of exposing
this token in the browser. It is not a
substitute for real user authentication,
durable rate limiting, or per-user authorization.

Restart the development server whenever environment values change.

## 6. Check the safe health endpoint

Run the app and visit
[http://localhost:3000/api/health](http://localhost:3000/api/health).
The response reports readiness booleans and the configured asset folder. It
never returns the API key, API secret, preset value, or edit token.

Expected live-mode shape:

```json
{
  "ok": true,
  "mode": "live",
  "cloudinary": {
    "cloudNameConfigured": true,
    "uploadPresetConfigured": true,
    "adminCredentialsConfigured": true,
    "editTokenConfigured": true,
    "imageGenerationPresetConfigured": true,
    "imageGenerationReady": true,
    "assetFolder": "media-portfolio"
  }
}
```

## 7. Prove the end-to-end workflow

1. Open the Upload Widget and upload one image.
2. Wait for AI Vision to report that alt text and a caption were stored.
3. Open **Generate**, enter the edit token, and create one standard-tier image.
4. Confirm the result says the folder was verified and AI metadata was stored.
5. Refresh the browser manually.
6. Confirm both assets remain in the gallery.
7. Open each image and inspect its read-only AI story.
8. Refresh again and confirm the metadata remains without manual writing.

In the Cloudinary Console, open **Assets** and inspect `media-portfolio`.
Both the Upload Widget asset and the generated `text-to-image` asset should
appear there.

Persistence after refresh proves that the UI is reading from Cloudinary rather
than keeping a local-only mock array.

## Optional delivery host configuration

Most accounts should keep the default `res.cloudinary.com` host. If
Cloudinary has configured a private CDN or custom secure distribution for your
account, set:

```dotenv
NEXT_PUBLIC_CLOUDINARY_SECURE_DISTRIBUTION=media.example.com
NEXT_PUBLIC_CLOUDINARY_PRIVATE_CDN=true
```

Only set these values after Cloudinary has enabled the corresponding delivery
configuration. Smart and dynamic multi-CDN are Cloudinary account-level
features, generally associated with enterprise plans. No application checkbox
can activate them.

Read the current
[advanced URL delivery options](https://cloudinary.com/documentation/advanced_url_delivery_options)
before changing the delivery host.

## Production hardening checklist

- Replace the demonstration edit token with your authentication and
  authorization system.
- Prefer signed uploads when upload parameters must be chosen dynamically.
- Keep the upload preset tightly restricted and periodically review it.
- Add rate limiting to write operations.
- Add durable per-user quota enforcement before exposing image generation
  publicly.
- Monitor Image Generation and AI Vision quota and keep premium models opt-in.
- Validate ownership or tenancy before changing an asset.
- Use a webhook if downstream work must happen only after Cloudinary confirms
  processing.
- Scope API credentials and rotate exposed credentials immediately.
- Review moderation, backup, retention, and deletion requirements for your
  product.
