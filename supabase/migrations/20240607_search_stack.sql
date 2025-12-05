create schema if not exists sm_data;

create extension if not exists "uuid-ossp";

set search_path = sm_data, public;

create table if not exists sm_data.search_queries (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  filters jsonb not null,
  requested_by text not null default 'system',
  requested_at timestamptz not null default now(),
  platform_status jsonb not null,
  cursor_state jsonb not null,
  result_counts jsonb not null,
  duration_ms integer not null,
  raw_payload jsonb not null
);

create table if not exists sm_data.media_items (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references sm_data.search_queries(id) on delete cascade,
  platform text not null check (platform in ('tiktok','youtube','instagram')),
  external_id text not null,
  title text not null,
  description text not null default '',
  author_handle text not null,
  author_name text not null,
  profile_image_url text not null,
  stats jsonb not null,
  duration_seconds numeric not null,
  published_at timestamptz,
  thumbnail_url text not null,
  created_at timestamptz not null default now(),
  unique (platform, external_id)
);

create table if not exists sm_data.media_assets (
  id uuid primary key default gen_random_uuid(),
  media_item_id uuid not null unique references sm_data.media_items(id) on delete cascade,
  video_path text not null,
  thumbnail_path text not null,
  download_status text not null default 'pending' check (download_status in ('pending','complete','failed')),
  checksum text not null,
  size_bytes bigint not null,
  retries smallint not null default 0,
  last_downloaded_at timestamptz
);

alter table sm_data.media_items
  add column if not exists storage_asset_id uuid references sm_data.media_assets(id);

create table if not exists sm_data.download_jobs (
  id bigserial primary key,
  media_item_id uuid not null references sm_data.media_items(id) on delete cascade,
  video_url text not null,
  thumbnail_url text not null,
  status text not null default 'queued' check (status in ('queued','processing','complete','failed')),
  failure_reason text,
  scheduled_at timestamptz not null default now(),
  attempted_at timestamptz
);

create index if not exists search_queries_keyword_idx on sm_data.search_queries using btree(keyword);
create index if not exists search_queries_requested_at_idx on sm_data.search_queries(requested_at desc);
create index if not exists media_items_search_idx on sm_data.media_items(search_id);
create index if not exists media_items_platform_idx on sm_data.media_items(platform, external_id);
create index if not exists media_items_stats_idx on sm_data.media_items using gin(stats);

grant usage on schema sm_data to postgres, service_role;
grant usage on schema sm_data to anon, authenticated;
grant all privileges on all tables in schema sm_data to service_role;
alter default privileges in schema sm_data grant all on tables to service_role;

alter table sm_data.search_queries enable row level security;
alter table sm_data.media_items enable row level security;
alter table sm_data.media_assets enable row level security;
alter table sm_data.download_jobs enable row level security;

drop policy if exists service_role_full_access on sm_data.search_queries;
drop policy if exists service_role_full_access_media on sm_data.media_items;
drop policy if exists service_role_full_access_assets on sm_data.media_assets;
drop policy if exists service_role_full_access_jobs on sm_data.download_jobs;

create policy service_role_full_access on sm_data.search_queries
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy service_role_full_access_media on sm_data.media_items
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy service_role_full_access_assets on sm_data.media_assets
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy service_role_full_access_jobs on sm_data.download_jobs
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

reset search_path;
