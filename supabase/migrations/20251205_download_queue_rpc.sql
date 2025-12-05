-- Function to safely fetch and lock the next batch of download jobs
-- Handles concurrency using SKIP LOCKED so multiple workers don't process the same job

create or replace function sm_data.get_next_download_jobs(batch_size int)
returns setof sm_data.download_jobs
language sql
as $$
  update sm_data.download_jobs
  set status = 'processing', attempted_at = now()
  where id in (
    select id
    from sm_data.download_jobs
    where status = 'queued'
    order by scheduled_at asc
    limit batch_size
    for update skip locked
  )
  returning *;
$$;
