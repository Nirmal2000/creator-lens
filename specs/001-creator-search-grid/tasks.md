---

description: "Task list template for feature implementation"
---

# Tasks: Cross-Platform Creator Search Grid

**Input**: Design documents from `/specs/001-creator-search-grid/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Add the listed tests per user story to keep each slice independently verifiable.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: [US1], [US2], [US3], [US4] aligning with spec priorities
- Include exact file paths in descriptions

## Constitution Guardrails

- Tasks MUST keep work within the Next.js App Router + Supabase stack defined in the constitution.
- Schema/policy/storage updates happen in Supabase migrations before app code tasks.
- Any package installation commands omit explicit version numbers and rely on the repo lockfile.
- Include observability or documentation tasks needed for each user story’s Definition of Done.

## Path Conventions

- App Router routes live under `app/`
- Shared utilities live under `lib/`
- Supabase migrations/functions under `supabase/`
- Tests under `tests/`
- Docs under `docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment prep, dependencies, UI theming

- [X] T001 Create `.env.local.example` with `SUPABASE_PROJECT_ID`, `SUPABASE_ANON_KEY`, `SUPABASE_SCHEMA`, `SUPABASE_STORAGE_BUCKET`, `SCRAPE_CREATORS_API_KEY` placeholders.
- [ ] T002 [P] Run `pnpm install` so `pnpm-lock.yaml` reflects resolved dependencies without pinned versions.
- [X] T003 [P] Initialize shadcn/ui config via `components.json` and scaffold dark theme tokens.
- [X] T004 [P] Apply minimalist dark styling in `app/layout.tsx` and `app/globals.css`, wiring Tailwind + font tokens.

**Note**: Attempted to run `pnpm add next react react-dom` for T002 but network access is restricted in
this environment, so dependency installation and lockfile generation remain outstanding.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Supabase schema, shared libs, API client foundation

- [X] T005 Create schema migration `supabase/migrations/20240607_search_stack.sql` defining `sm_data.search_queries`, `sm_data.media_items`, `sm_data.media_assets`, `sm_data.download_jobs`, indexes, and RLS defaults.
- [X] T006 Add storage bucket + policy setup script `supabase/storage-policies.sql` granting service-role access to `SUPABASE_STORAGE_BUCKET` and denying anon reads.
- [X] T007 Implement shared Supabase clients in `lib/supabase-client.ts` (anon) and `lib/server-supabase.ts` (service role from env) with schema set to `sm_data`.
- [X] T008 Build Scrape Creators REST client in `lib/scrape-creators.ts` that signs requests with `SCRAPE_CREATORS_API_KEY` using endpoints documented in `docs/tiktok_search_by_kw.md`, `docs/youtube_search.md`, `docs/instagram_search_reels.md`.
- [X] T009 Normalize upstream payloads in `lib/media-normalizers.ts` to the common `MediaItem` interface referenced by contracts.
- [X] T010 Add validation schemas in `lib/validators/search-filters.ts` using `zod` to enforce per-platform filters and prevent invalid combos (e.g., YouTube `uploadDate` + `filter`).

**Checkpoint**: Foundation ready—user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Unified Creator Search Grid (Priority: P1) 🎯 MVP

**Goal**: Search TikTok videos, YouTube Shorts, and Instagram Reels together with per-platform filters.

**Independent Test**: Submit a query with platform-specific filters and verify the UI grid renders normalized media cards with hover autoplay while API route returns combined payload.

### Implementation for User Story 1

- [X] T011 [US1] Implement `app/api/search/route.ts` to accept keyword + filters, call three Scrape Creators endpoints in parallel via `Promise.allSettled`, and return normalized media payload + cursor state.
- [X] T012 [P] [US1] Wire filter config drawer in `app/search/components/filter-panel.tsx` pulling parameter options from `docs/tiktok_search_by_kw.md`, `docs/youtube_search.md`, and `docs/instagram_search_reels.md`.
- [X] T013 [P] [US1] Build responsive search grid shell in `app/search/page.tsx` using React Query to submit searches and render `MediaGrid` with pagination state.
- [X] T014 [P] [US1] Create shadcn-based hover media card in `components/media-card.tsx` that swaps thumbnail for muted autoplay video sourced from Supabase (or fallback remote URL) on hover/focus.
- [X] T015 [US1] Add `components/media-grid.tsx` to group cards by platform, display metadata (creator avatar, stats), and badge applied filters.
- [X] T016 [US1] Add Playwright coverage in `tests/e2e/search-grid.spec.ts` verifying filters update per-platform calls and hover playback works.

**Checkpoint**: User Story 1 complete and demoable.

---

## Phase 4: User Story 2 - Persistent Search + Asset Capture (Priority: P1)

**Goal**: Store every search (metadata + filters) and download associated media into Supabase Storage.

**Independent Test**: Trigger a search, then verify `sm_data` tables contain search + media rows and Storage bucket contains downloaded MP4 + thumbnail files linked via signed URLs.

### Implementation for User Story 2

- [X] T017 [US2] Extend `app/api/search/route.ts` to insert rows into `sm_data.search_queries` and `sm_data.media_items`, capturing platform status, filters, and raw payloads per the data model.
- [X] T018 [P] [US2] Implement download queue helper `lib/downloads.ts` that writes to `sm_data.download_jobs` for each media item and returns job IDs.
- [X] T019 [US2] Build Supabase Edge Function in `supabase/functions/download-worker/index.ts` to fetch video/thumbnail URLs, upload into `SUPABASE_STORAGE_BUCKET`, update `sm_data.media_assets`, and retry failed jobs (logging metrics).
- [X] T020 [P] [US2] Add signed playback URL helper in `app/api/assets/[mediaId]/route.ts` (or extend history route) so UI never exposes public bucket URLs.
- [X] T021 [US2] Write Vitest integration coverage `tests/integration/search-route.spec.ts` ensuring DB writes + download queue occur once per media item.

**Checkpoint**: Searches persist fully and assets download asynchronously.

---

## Phase 5: User Story 3 - Search History Explorer (Priority: P2)

**Goal**: Replay stored searches from Supabase with filters, same grid UI, and cached media playback.

**Independent Test**: Load `/history`, filter results, select a search, and confirm media grid renders using stored data without external API calls.

### Implementation for User Story 3

- [X] T022 [US3] Implement `app/api/history/route.ts` to paginate `sm_data.search_queries`, apply keyword/platform/date filters, and include summarized media counts.
- [X] T023 [P] [US3] Build history list/filters UI in `app/history/components/search-list.tsx` sharing shadcn primitives for pills, sort, and filter controls.
- [X] T024 [US3] Implement `app/history/page.tsx` to fetch list selections, load associated media from Supabase via server Route Handler, and reuse `MediaGrid` with cached assets.
- [X] T025 [US3] Add integration tests `tests/integration/history-route.spec.ts` covering filtering logic and ensuring no outbound Scrape Creators calls occur.

**Checkpoint**: Stored searches are explorable independently of external APIs.

---

## Phase 6: User Story 4 - Infinite Fetch Controls (Priority: P3)

**Goal**: Provide “More videos” controls that fetch and append next-page results per platform.

**Independent Test**: Click “More videos” multiple times and confirm TikTok/YouTube/Instagram append new media without duplicates, halting gracefully when exhausted.

### Implementation for User Story 4

- [X] T026 [US4] Create `app/api/search/[id]/more/route.ts` to read stored cursor tokens, call next pages per platform, persist additional media rows, and update cursor state.
- [X] T027 [US4] Enhance `app/search/page.tsx` to show “More videos” CTA, merge appended results, and badge exhausted platforms.
- [X] T028 [P] [US4] Extract React hook `lib/hooks/use-more-videos.ts` encapsulating polling/disabled states per platform.
- [X] T029 [US4] Expand Playwright coverage in `tests/e2e/search-grid.spec.ts` for multi-click “More videos” behavior and exhaustion messaging.

**Checkpoint**: Infinite fetch works; user can explore deeper results.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Instrumentation, docs, QA, and DX improvements

- [ ] T030 Add observability helpers in `lib/observability.ts` plus Supabase log drain config for latency, download retries, and cache hit ratios.
- [ ] T031 Update `docs/search-history.md` and `specs/001-creator-search-grid/quickstart.md` with filter usage instructions, Edge Function deployment notes, and troubleshooting for hover playback.
- [ ] T032 Run full test suite (`pnpm test`, `pnpm test:e2e`) and capture results in `docs/testing-report.md` before handoff.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies—start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories.
- **User Stories (Phase 3-6)**: Each depends on Foundational phase. US1 & US2 (both P1) should complete before US3 (P2) and US4 (P3).
- **Polish**: Runs after all desired user stories.

### User Story Dependencies

- **US1 (Search Grid)**: Must finish before US3/US4 which reuse UI state.
- **US2 (Persistence/Assets)**: Runs in parallel with US1 after foundational tasks but must finish before US3 (history uses stored data).
- **US3 (History)**: Depends on US1 UI components and US2 persistence.
- **US4 (More videos)**: Depends on US1 base search route + UI and US2 persistence of cursor state.

### Parallel Opportunities

- Setup tasks T002-T004 can run concurrently.
- Foundational tasks T007-T010 touch separate files and can proceed in parallel once migration (T005) is staged.
- Within US1, filter UI (T012), grid shell (T013), and card component (T014) can progress simultaneously.
- US2’s download worker (T019) and signed URL route (T020) can be developed in parallel after queue helper (T018) exists.
- US3 list UI (T023) can proceed while API route (T022) is finalized, provided DTOs are agreed upon.
- US4 hook (T028) can be built alongside backend route T026 once contract defined.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Setup + Foundational phases.
2. Deliver US1 end-to-end: search filters, API route, grid UI, hover playback, e2e test.
3. Demo `/search` with live Scrape Creators data as initial milestone.

### Incremental Delivery

1. Add US2 persistence + downloads so searches are fully stored.
2. Layer US3 history explorer for cached browsing.
3. Finish with US4 “More videos” controls and polish tasks (observability, docs, QA).

### Parallel Team Strategy

- Developer A: Supabase schema, download worker, persistence (Phases 2 + US2).
- Developer B: Search UI + filters + grid (US1).
- Developer C: History view + “More videos” features (US3 + US4) once upstream slices land.
