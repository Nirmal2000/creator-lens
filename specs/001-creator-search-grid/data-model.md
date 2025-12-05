# Data Model – Cross-Platform Creator Search Grid

All tables live in Supabase Postgres schema **`sm_data`** (never `public`). Default RLS denies access
except for service-role keys used by Route Handlers/Edge Functions.

## Tables

### `sm_data.search_queries`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` | Search identifier returned to UI |
| `keyword` | text | not null | Raw search keyword submitted |
| `filters` | jsonb | not null | Serialized filter selections per platform |
| `requested_by` | text | not null default 'system' | Since auth not required, store client fingerprint/IP hash |
| `requested_at` | timestamptz | not null default now() | Submission timestamp |
| `platform_status` | jsonb | not null | TikTok/YouTube/Instagram status (success/error, latency) |
| `cursor_state` | jsonb | not null | Continuation token per platform (cursor, continuationToken, reel offset) |
| `result_counts` | jsonb | not null | Number of media inserted per platform |
| `duration_ms` | integer | not null | Total upstream latency |
| `raw_payload` | jsonb | not null | Redacted copy of combined Scrape Creators response for auditing |

Indexes: `btree(keyword)`, `gin(filters jsonb_path_ops)`, `btree(requested_at)`.

### `sm_data.media_items`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `search_id` | uuid | FK → `search_queries.id` on delete cascade |
| `platform` | text | check in ('tiktok','youtube','instagram') |
| `external_id` | text | unique | Platform-specific identifier (aweme_id, videoId, shortcode) |
| `title` | text | not null |
| `description` | text | not null default '' |
| `author_handle` | text | not null |
| `author_name` | text | not null |
| `profile_image_url` | text | not null |
| `stats` | jsonb | not null | Views/likes/comments etc. |
| `duration_seconds` | numeric | not null |
| `published_at` | timestamptz | nullable |
| `thumbnail_url` | text | not null | Original upstream thumbnail |
| `storage_asset_id` | uuid | FK → `media_assets.id`, nullable until download completes |
| `created_at` | timestamptz | default now() |

Indexes: `btree(search_id)`, `btree(platform, external_id)`, `gin(stats)`.

### `sm_data.media_assets`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | uuid | PK |
| `media_item_id` | uuid | unique FK → `media_items.id` |
| `video_path` | text | not null | Storage path within `SUPABASE_STORAGE_BUCKET` |
| `thumbnail_path` | text | not null |
| `download_status` | text | check in ('pending','complete','failed') |
| `checksum` | text | not null | SHA-256 of video payload |
| `size_bytes` | bigint | not null |
| `retries` | smallint | default 0 |
| `last_downloaded_at` | timestamptz | nullable |

### `sm_data.download_jobs`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | bigint | identity primary key |
| `media_item_id` | uuid | FK → `media_items.id` |
| `video_url` | text | not null |
| `thumbnail_url` | text | not null |
| `status` | text | default 'queued' |
| `failure_reason` | text | nullable |
| `scheduled_at` | timestamptz | default now() |
| `attempted_at` | timestamptz | nullable |

Edge Function reads new rows, attempts download, updates status + `media_assets`.

## Storage Bucket

- Name: `SUPABASE_STORAGE_BUCKET`
- Structure:
  - `videos/{search_id}/{platform}/{external_id}.mp4`
  - `thumbnails/{search_id}/{platform}/{external_id}.jpg`
- Access: private, signed URLs generated for UI playback via server Route Handler.

## Relationships

- `search_queries 1→N media_items`
- `media_items 1→1 media_assets`
- `media_items 1→1 download_jobs` (until job complete)

## Policies

- Service role (server-side) has full access.
- Anonymous key only reads `search_queries`/`media_items` via RPC/REST endpoints exposed through Next.js
  Route Handlers (UI never queries Supabase directly).
