-- Ensure the private sm_data bucket exists (value matches SUPABASE_STORAGE_BUCKET)
insert into storage.buckets (id, name, public)
select 'sm_data', 'sm_data', false
where not exists (
  select 1 from storage.buckets where name = 'sm_data'
);

-- Storage policies live on storage.objects; default deny unless policy allows
drop policy if exists "sm_data service" on storage.objects;
drop policy if exists "sm_data deny" on storage.objects;

create policy "sm_data service"
on storage.objects
for all
using (bucket_id = 'sm_data' and auth.role() = 'service_role')
with check (bucket_id = 'sm_data' and auth.role() = 'service_role');

-- Explicit deny ensures anon cannot interact with bucket objects
create policy "sm_data deny"
on storage.objects
for all
using (bucket_id <> 'sm_data')
with check (bucket_id <> 'sm_data');
