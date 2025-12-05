# Phase 0 Research – Cross-Platform Creator Search Grid

## Remote Media Download Compliance
- **Decision**: Download TikTok/YouTube/Instagram assets via Supabase Edge Function using the
  Scrape Creators URLs and store them in `SUPABASE_STORAGE_BUCKET` strictly for internal research with
  retention capped at 30 days unless re-requested.
- **Rationale**: Supabase Edge Functions can call third-party URLs with the `SCRAPE_CREATORS_API_KEY`,
  persist to Storage using service-role keys, and log audit trails. Limiting retention keeps compliant
  with platform fair-use expectations and reduces storage bloat.
- **Alternatives considered**: (a) Stream videos directly from third parties on hover (fails when
  assets expire; no offline replay). (b) Download within Next.js Route Handler (risks request timeout
  and blocks ISR). Edge Functions provide async execution + retries.

## Hover Autoplay Performance
- **Decision**: Use HTML5 `<video>` elements configured with `preload="metadata"`, `muted`, and
  `playsInline`, triggered via `IntersectionObserver` + pointer events. On hover (or focus), swap the
  thumbnail for a cached MP4 served from Supabase Storage; on touch devices, fall back to tap-to-play.
- **Rationale**: Loading only metadata keeps initial payload light, while storing assets in Supabase
  ensures consistent performance. Observers prevent playing offscreen cards, and user interaction gates
  reduce CPU.
- **Alternatives considered**: (a) Animate GIF/MP4 sprites (poor quality; heavier). (b) Autoplay all
  cards simultaneously (too heavy). (c) Convert to WebM previews (extra processing pipeline).

## Parallel Fetch Orchestration
- **Decision**: Implement a `POST /api/search` Route Handler that triggers the three Scrape Creators
  endpoints in parallel via `Promise.allSettled`, normalizes results on the server, and streams progress
  to the UI using React Query polling until Supabase persistence completes.
- **Rationale**: Route Handlers offer server-only access to secrets and can reuse Next.js caching. They
  can respond quickly with normalized payload while a background job finishes downloads. Testing via
  Vitest is straightforward.
- **Alternatives considered**: (a) Client-side fetches (would expose API key; inconsistent). (b) Server
  Actions tied to form submission (less explicit control over retries + streaming). (c) Dedicated worker
  queue (overkill for current scale).

## Download Worker Pipeline
- **Decision**: Use a Supabase Edge Function (`download-worker`) triggered via
  `sm_data.download_jobs` table insert. Function fetches the video/thumbnail, writes to Storage, updates
  `media_assets` row with checksum + status, and retries up to 3 times using Supabase cron.
- **Rationale**: Keeps heavy downloads off the Next.js request path, leverages Supabase’s managed cron,
  and centralizes retry/error logging. DB trigger ensures every media item eventually has assets.
- **Alternatives considered**: (a) Next.js background route with `setTimeout` (not reliable on Vercel).
  (b) External worker (increases ops overhead). (c) Download during initial search response (would slow
  UI below 4s goal).
