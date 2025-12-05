# Feature Specification: Cross-Platform Creator Search Grid

**Feature Branch**: `001-creator-search-grid`  
**Created**: 2024-06-07  
**Status**: Draft  
**Input**: User description: "create an UI that offers a search bar and lists the results from each platform docs/tiktok_search_by_kw.md docs/youtube_search.md docs/instagram_search_reels.md in a grid. we display only the videos from tikto, shorts from youtube and reels from instagram.
UI/UX must be top notch, displaying relevant metadata on the media. on hover must play the media, by default must use thumbnail and hover start media. anytime search is made, every info must be stored in DB. all media must be downloaded and stored as well.
then another that is just history showing stuff from DB. same grid format.
allow for filters using the stuff from API. in search page we get results from the 3 platforms and at the bottom of page add a more videos button to again fetch from the 3 platforms."

## Constitution Guardrails

- Assume a Next.js App Router + Supabase stack unless a governance-approved exception exists.
- Describe which Supabase tables/policies/storage buckets each story touches.
- When referencing dependency installation, omit version numbers (e.g., `pnpm add supabase-js`).
- Note the logging/metrics signals required to observe the story in production.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Creator Search Grid (Priority: P1)

As a researcher, I want to search TikTok videos, YouTube Shorts, and Instagram Reels at once so I can scan comparable content in a single, high-polish grid.

**Why this priority**: This is the flagship workflow; without a cohesive multi-platform search UI, downstream storage/history has no value.

**Independent Test**: Enter a keyword plus filters, verify the UI renders a responsive grid with hover-to-play media per platform, and confirm metadata (creator handle, title, stats) appears for each card.

**Acceptance Scenarios**:

1. **Given** the search page, **When** I submit a keyword, **Then** the app fires parallel requests to TikTok keyword search (videos only), YouTube search filtered to shorts, and Instagram reels search, returning a normalized grid.
2. **Given** the filter drawer, **When** I select TikTok `date_posted`, YouTube `uploadDate`, or Instagram `amount`, **Then** the respective API call includes those params and results refresh while the grid badges reflect the applied filter.
3. **Given** a populated grid, **When** I hover a media card, **Then** the thumbnail swaps to autoplaying inline video with muted sound while hover-out pauses it.

---

### User Story 2 - Persistent Search + Asset Capture (Priority: P1)

As a data curator, I want every search and media item persisted (metadata + downloaded media) so I can rehydrate results and audit what was viewed later.

**Why this priority**: Compliance and replay requirements mandate that queries, API parameters, and retrieved media are safely stored in Supabase.

**Independent Test**: Perform a search, then inspect Supabase `search_queries`, `media_items`, and Storage buckets to confirm query context, normalized metadata, media files, and logging entries exist.

**Acceptance Scenarios**:

1. **Given** a successful search request, **When** the API responses return, **Then** the backend stores a `search_queries` row (keyword, filters, cursor tokens, counts, duration, requester) before responding to the client.
2. **Given** each media result, **When** it is processed, **Then** the system saves normalized metadata in `media_items`, links to the parent search, and enqueues download+transcode jobs that write MP4/thumbnail files into Supabase Storage (`media-assets/` bucket) with retry + checksum validation.
3. **Given** a subsequent visit, **When** I refresh the search grid with a “load from DB” toggle, **Then** cached media + metadata hydrate immediately even if third-party APIs are unreachable, and telemetry logs capture cache hits/misses.

---

### User Story 3 - Search History Explorer (Priority: P2)

As a teammate, I want a dedicated history view that replays previous searches and their media in the same grid so I can browse curated content without requerying external APIs.

**Why this priority**: Enables collaboration, reduces API costs, and leverages stored media/assets.

**Independent Test**: Navigate to `/history`, ensure stored searches appear with filters/date range controls, select a search to render its media grid with hover playback sourced from Supabase only.

**Acceptance Scenarios**:

1. **Given** the history page, **When** I filter by keyword, platform, or date, **Then** the list of stored searches updates via Supabase queries and selecting one shows the associated grid with metadata.
2. **Given** a history grid, **When** I click “More videos”, **Then** the system uses stored continuation tokens (if any) or triggers a background fetch to retrieve the next page per platform, persists it, and appends results to the grid.
3. **Given** downloaded media files, **When** I hover history cards, **Then** playback uses Supabase Storage URLs (no third-party fetch), respecting thumbnail default + hover autoplay behavior identical to the search page.

---

### User Story 4 - Infinite Fetch Controls (Priority: P3)

As a power user, I want a “More videos” control that re-fetches next results from all three sources simultaneously so I can keep exploring without leaving the page.

**Why this priority**: Ensures deeper discovery beyond the first response, matching the explicit requirement.

**Independent Test**: On the search page, trigger “More videos” twice and verify TikTok cursor, YouTube continuation, and Instagram pagination deliver appended cards while persisting tokens.

**Acceptance Scenarios**:

1. **Given** an initial search, **When** I click “More videos”, **Then** backend reads previously returned cursor/continuation tokens per platform, makes follow-up API calls, and merges results into the same grid without duplicates.
2. **Given** a third-party API returns no further items, **When** “More videos” is pressed, **Then** a UI toast explains which platform is exhausted while others continue to append.
3. **Given** a manual refresh, **When** prior paged results exist, **Then** the system resumes from stored tokens so the user does not see repeated videos.

---

### Edge Cases

- One or more APIs fail/time out → show per-platform error pill while still rendering results from other sources and persist failure state with observability logs.
- Duplicate media across searches (same TikTok aweme_id, YouTube id, Instagram shortcode) → deduplicate before storage and show previously downloaded asset rather than re-downloading.
- Media download failures (403/expired URLs) → queue retry with exponential backoff and flag the item in history with a warning badge until download succeeds.
- Hover autoplay on touch devices → fall back to tap-to-preview overlay and prevent unwanted bandwidth usage.
- YouTube Shorts filter incompatibility with `uploadDate`/`sortBy` combos → disable conflicting filters in UI with explanatory tooltip.
- Instagram limit of 60 reels → enforce client-side max and communicate credits impact before request.
- Storage quota overruns → emit alerts when bucket usage nears threshold and block downloads until resolved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The search page MUST fire concurrent requests to TikTok keyword search, YouTube search (with `filter=shorts`), and Instagram reels search whenever the user submits a query.
- **FR-002**: The UI MUST provide filter controls mapping directly to API parameters (TikTok `date_posted`, `sort_by`, `region`; YouTube `uploadDate`, `sortBy`, `filter`, `includeExtras`; Instagram `amount`) and prevent invalid combos.
- **FR-003**: Each media card MUST render a thumbnail, creator avatar, handle, title/caption snippet, stats (views/likes/comments when available), platform badge, and on-hover video playback sourced from the downloaded asset (muted by default).
- **FR-004**: Every search MUST create entries in Supabase `search_queries`, `media_items`, and `media_assets` tables plus store raw API payloads for auditing; failures log to observability channels with request IDs.
- **FR-005**: The system MUST download each media item (video + thumbnail) into Supabase Storage, associate storage paths with `media_items`, and reuse stored assets in UI/historical views.
- **FR-006**: The `/history` route MUST display stored searches with filters and render previously downloaded media grids without re-hitting third-party APIs unless “More videos” is explicitly used and a continuation token exists.
- **FR-007**: The “More videos” control MUST fetch next pages from all three APIs using saved cursor/continuation tokens, persist new results, and append them to current view while updating tokens atomically.
- **FR-008**: Telemetry MUST capture search latency per platform, download success rates, and cache hit/miss metrics, surfaced via Supabase logs or an APM dashboard.

### Key Entities *(include if feature involves data)*

- **search_queries**: `{ id, keyword, filters (jsonb), requested_by, requested_at, platform_status (jsonb), cursor_state (jsonb), duration_ms }`
- **media_items**: `{ id, search_id, platform ('tiktok'|'youtube'|'instagram'), external_id, title, description, author_handle, author_name, profile_image_url, stats (jsonb), duration_seconds, published_at, storage_asset_id, raw_payload (jsonb), created_at }`
- **media_assets**: `{ id, media_item_id, video_path, thumbnail_path, download_status ('pending'|'complete'|'failed'), checksum, size_bytes, retries, last_downloaded_at }`
- **download_jobs** (optional queue metadata): tracks async downloads + retries for large assets.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of searches render combined grid results (all available platforms) within 4 seconds, excluding time spent downloading assets asynchronously.
- **SC-002**: 100% of executed searches create persisted records with linked media metadata and downloadable assets within 2 minutes of completion.
- **SC-003**: History view serves cached media (no third-party API calls) for at least 90% of visits, measured by cache hit ratio logs.
- **SC-004**: Less than 1% of media downloads fail without retry resolution over a rolling 24-hour period, tracked via observability metrics.
- **SC-005**: “More videos” interactions append new content without duplicates at least 99% of the time, validated by automated tests comparing external IDs.
