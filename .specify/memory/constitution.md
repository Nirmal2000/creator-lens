<!--
Sync Impact Report
- Version change: N/A → 1.0.0
- Modified principles:
  - (new) I. Next.js + Supabase Stack
  - (new) II. Supabase Data Integrity
  - (new) III. Versionless Dependency Installation
  - (new) IV. Vertical Slice Delivery
  - (new) V. Observability & Documentation
- Added sections: Core Principles, Technology Constraints, Delivery Workflow, Governance
- Removed sections: None
- Templates requiring updates:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
- Follow-up TODOs: None
-->
# Scrape Creators Constitution

## Core Principles

### I. Next.js + Supabase Stack
All UI, API routes, and server actions must be implemented in Next.js (App Router, TypeScript).
Supabase provides every persistence, auth, file storage, and background job capability. Alternative
frameworks or services require governance approval with a migration plan and rollback strategy.

### II. Supabase Data Integrity
Modeling work starts in Supabase (SQL, row-level security, storage policies) before any feature code
is merged. Each feature documents the tables, views, storage buckets, and policies it touches.
Row-level security must default to deny, with policies only opening the minimum scope required per
user story. Secrets live in Supabase configuration or Vercel environment variables—never in git.

### III. Versionless Dependency Installation
All package installation commands MUST omit explicit version numbers (`pnpm add next`, `npm install
@supabase/supabase-js`, etc.). Lockfiles capture exact versions; documentation and task
descriptions never pin versions manually. When scaffolding requires capability guarantees, document
the needed feature (e.g., "supports App Router") instead of a literal version number.

### IV. Vertical Slice Delivery
Every feature ships as a self-contained slice that spans Supabase schema changes, Next.js server
actions, client components, and test coverage. Designs favor server actions or edge functions
co-located with the UI they support. No cross-story coupling is allowed without a documented API
contract and failure handling path.

### V. Observability & Documentation
Each slice instruments Supabase logs and Next.js Route Handlers with structured logging, traces, and
business metrics (creator counts, ingestion failures, etc.). Docs in `docs/` and feature specs are
updated alongside code so new contributors can replay the data flow end-to-end without guesswork.

## Technology Constraints

- TypeScript + Next.js App Router is mandatory for all frontend/server modules.
- Supabase Postgres, Auth, Edge Functions, and Storage are the source of truth. Adding another
  database, auth layer, or queue requires governance approval first.
- Package management uses `pnpm` (preferred) or `npm`. Installation commands never include
  `@version` suffixes; rely on lockfiles for reproducibility.
- Hosting targets Vercel for the Next.js app and Supabase Edge Functions. Any other runtime must be
  justified in a plan and reviewed before implementation.
- CLI scripts are Node-based and live under `scripts/` or `package.json` scripts for consistent CI
  usage.

## Delivery Workflow

1. Capture user journeys and Supabase data needs in the feature spec before planning tasks.
2. Plans identify the Supabase tables/policies involved, the Next.js routes affected, and the target
   deployment surface (App Router pages, Route Handlers, Edge Functions).
3. Tasks group work by user story so each slice can be shipped/tested independently and rolled back
   without collateral damage.
4. Before merging, run Supabase migrations, unit tests, and user-story validation passes. Logging
   and metrics instrumentation is part of the Definition of Done.
5. Deployment instructions highlight any new environment variables, Supabase configuration steps, or
   manual migrations required.

## Governance

- This constitution supersedes all other docs; reviewers block PRs that violate stack or versionless
  install rules.
- Amendments require a written rationale referencing impacted principles, updated templates, and a
  communication plan for contributors.
- Versioning follows SemVer: MAJOR for replacing/removing principles, MINOR for adding principles or
  sections, PATCH for clarifications or typos.
- Compliance is reviewed quarterly by project maintainers, and violations block releases until
  remediated.

**Version**: 1.0.0 | **Ratified**: 2024-06-07 | **Last Amended**: 2024-06-07
