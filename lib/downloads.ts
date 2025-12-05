import type { SupabaseClient } from "@supabase/supabase-js";

export interface DownloadJobInput {
  media_item_id: string;
  video_url: string;
  thumbnail_url?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const queueDownloadJobs = async (
  supabase: any,
  jobs: DownloadJobInput[],
) => {
  if (!jobs.length) return;

  const payload = jobs.map((job) => ({
    media_item_id: job.media_item_id,
    video_url: job.video_url,
    thumbnail_url: job.thumbnail_url ?? null,
  }));

  const { error } = await supabase.from("download_jobs").insert(payload);
  if (error) {
    throw new Error(`Failed to queue download jobs: ${error.message}`);
  }
};
