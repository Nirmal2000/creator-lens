# Implementation Plan: Cross-Platform Creator Search Grid

**Branch**: `001-creator-search-grid` | **Date**: 2024-06-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-creator-search-grid/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a Next.js (App Router) experience with two primary routes: `/search` for issuing multi-platform
creator searches and `/history` for replaying stored searches. The search page accepts keyword plus
platform-specific filter inputs (TikTok `date_posted`/`region`, YouTube `uploadDate`/`filter`, Instagram
`amount`), calls the Scrape Creators TikTok, YouTube Shorts, and Instagram Reels endpoints in parallel,
and renders a shadcn-styled dark UI grid where thumbnails swap to autoplaying video on hover. Each
search writes query details and normalized media metadata into Supabase schema `sm_data`, downloads
media files into the `SUPABASE_STORAGE_BUCKET`, and emits observability logs. The history page hydrates
data from Supabase only, providing the same grid presentation, pagination, and “More videos” controls
using stored continuation tokens without hitting third-party APIs unless requested.

## Technical Context

**Language/Version**: TypeScript 5.x + Next.js App Router (latest)  
**Primary Dependencies**: React 18, `next`, `@supabase/supabase-js`, shadcn/ui (Radix primitives),
Tailwind CSS, `@tanstack/react-query` for caching, `zod` for validation, Supabase Edge Functions for
asset download/retry orchestration  
**Storage**: Supabase Postgres schema `sm_data`, Supabase Storage bucket `SUPABASE_STORAGE_BUCKET`,
Supabase cron metadata for download retries  
**Testing**: Playwright for route-level flows (hover playback, pagination), Jest + React Testing Library
for components, Vitest-based integration tests for Route Handlers  
**Target Platform**: Vercel-hosted Next.js web app with Supabase backend services
**Project Type**: Single web project (monorepo with `/app`, `/components`, `/lib`, `/supabase`)  
**Performance Goals**: Initial combined search grid renders within 4s p95; download jobs finish within
2 minutes; hover playback begins <250ms on cached assets  
**Constraints**: Dark minimalist UI with shadcn; no authentication layer; env vars limited to
`SUPABASE_PROJECT_ID`, `SUPABASE_ANON_KEY`, `SUPABASE_SCHEMA=sm_data`, `SUPABASE_STORAGE_BUCKET`,
`SCRAPE_CREATORS_API_KEY`; versionless dependency installs  
**Scale/Scope**: Up to ~100 media items per search per platform (~300 cards per request), ~500 stored
searches/week, storage growth driven by MP4 + thumbnails (est. 10GB/month)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Stack alignment**: ✅ Next.js App Router + TypeScript end-to-end; Supabase handles data/storage.
- **Supabase-first modeling**: ✅ Tables `sm_data.search_queries`, `sm_data.media_items`,
  `sm_data.media_assets`, `sm_data.download_jobs` defined plus Storage bucket + policies before coding.
- **Versionless installs**: ✅ Document `pnpm add next`, `pnpm add @supabase/supabase-js`, etc., letting
  lockfile pin versions.
- **Observability & docs**: ✅ Add Supabase log drains for search latency/download retries, update docs
  (`quickstart.md`, `docs/search-history.md`), capture metrics in Definition of Done.

## Project Structure

### Documentation (this feature)

```text
specs/001-creator-search-grid/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md (via /speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── layout.tsx (dark minimalist shell)
├── search/
│   ├── page.tsx
│   └── components/
├── history/
│   └── page.tsx
├── api/
│   ├── search/route.ts
│   ├── search/[id]/more/route.ts
│   └── history/route.ts
components/
├── media-card.tsx
├── media-grid.tsx
├── filters/
└── layout/
lib/
├── supabase-client.ts
├── server-supabase.ts
├── scrape-creators.ts
├── media-normalizers.ts
└── downloads.ts
supabase/
├── migrations/20240607_search_stack.sql
└── functions/download-worker/index.ts
scripts/
└── download-runner.ts (local debugging)
tests/
├── integration/search-route.spec.ts
├── integration/history-route.spec.ts
├── ui/media-card.test.tsx
└── e2e/search-grid.spec.ts
```

**Structure Decision**: Single Next.js project with App Router; API Route Handlers co-located under
`app/api`. Shared libraries live in `/lib`, Supabase migrations/functions tracked in `/supabase`, and
dedicated tests directories cover integration/e2e/UI flows. This supports vertical slices per user
story and complies with the constitution.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Phase 0 – Research & Unknown Resolution

1. **Hover autoplay performance** – Determine best practice for muted autoplay on hover (preload
   strategy, responsive fallbacks for touch devices, GPU cost mitigation).
2. **Parallel fetch orchestration** – Choose between a server action vs dedicated Route Handler for
   orchestrating three Scrape Creators calls, streaming partial results, and handling rate limits.
3. **Download worker pipeline** – Decide where asynchronous asset downloads/transcodes run (Supabase Edge
   Function vs Next.js cron job) and how retries/checksums are tracked.

Deliverable: `research.md` summarizing decision, rationale, and alternatives for each topic. All unknowns
resolved before moving to design.

## Phase 1 – Design, Data Model, Contracts

1. **Data modeling** – Generate `data-model.md` describing `sm_data` tables (columns, indexes, RLS),
   relationships, and storage bucket structure.
2. **API contracts** – Capture REST contracts for `POST /api/search`, `POST /api/search/{id}/more`,
   `GET /api/history`, `GET /api/history/{searchId}` with request/response schemas in
   `contracts/search-history.openapi.yaml`.
3. **Quickstart** – Write `quickstart.md` covering environment setup, Supabase migrations/seed, shadcn
   styling, local Next dev commands, download-worker deployment, and verifying `.env` variables.
4. **Agent context** – Re-run `.specify/scripts/bash/update-agent-context.sh codex` after design is
   captured so repository guidance lists new technologies (shadcn, react-query, Supabase schema).
5. **Gate re-check** – Confirm plan still meets constitution requirements post-design. No violations
   expected.

## Phase 2 – Implementation Outline (input to `/speckit.tasks`)

1. Decompose vertical slices per user story (search grid, persistence/downloads, history explorer, more
   videos control) referencing data model + contracts.
2. Enumerate testing strategy (component, integration, e2e) per slice.
3. Sequence dependencies: Supabase migrations → download worker → Route Handlers → UI wiring → telemetry
   instrumentation → docs updates. Output consumed by `/speckit.tasks`.
