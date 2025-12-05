# Quickstart – Cross-Platform Creator Search Grid

## Prerequisites

- Node.js 20+
- `pnpm` installed
- Supabase project with schema `sm_data` (create via SQL migration in `supabase/migrations`)
- Environment variables:
  - `SUPABASE_PROJECT_ID`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (Vercel secret only)
  - `SUPABASE_SCHEMA=sm_data`
  - `SUPABASE_STORAGE_BUCKET`
  - `SCRAPE_CREATORS_API_KEY`

## Setup

1. Install dependencies (no versions specified):
   ```bash
   pnpm install
   ```
2. Copy env template:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill keys listed above; service-role key stays in Vercel env only.
3. Apply Supabase migrations:
   ```bash
   supabase db push --schema sm_data
   ```
4. Create private storage bucket:
   ```bash
   supabase storage buckets create "$SUPABASE_STORAGE_BUCKET" --public=false
   ```
5. Deploy Edge Function for media downloads:
   ```bash
   supabase functions deploy download-worker --project-ref "$SUPABASE_PROJECT_ID"
   supabase cron schedule download-worker --invoke download-worker --every "5 minutes"
   ```
6. Start local dev server:
   ```bash
   pnpm dev
   ```
7. Run tests:
   ```bash
   pnpm test     # unit + integration
   pnpm test:e2e # Playwright
   ```

## Verifying Setup

- Visit `http://localhost:3000/search`, run a query, and confirm grid renders from live API responses.
- Check Supabase dashboard → `sm_data.*` tables for persisted search + media rows.
- Inspect Storage bucket for downloaded MP4 + thumbnail files.
- Visit `/history` to confirm cached playback works without new API calls.
