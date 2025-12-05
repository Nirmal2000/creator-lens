import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? `https://${Deno.env.get("SUPABASE_PROJECT_ID")}.supabase.co`;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STORAGE_BUCKET = Deno.env.get("SUPABASE_STORAGE_BUCKET") ?? "sm_data";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars for download-worker");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  db: { schema: Deno.env.get("SUPABASE_SCHEMA") ?? "sm_data" },
});

type DownloadJob = {
  id: number;
  media_item_id: string;
  video_url: string;
  thumbnail_url?: string | null;
};

const downloadBuffer = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download asset (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
};

const storeFile = async (path: string, content: Uint8Array, contentType: string) => {
  const { error, data } = await supabase.storage.from(STORAGE_BUCKET).upload(path, content, {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return data?.path ?? path;
};

const upsertAssetRecord = async (
  mediaItemId: string,
  videoPath: string,
  thumbnailPath: string | null,
  sizeBytes: number,
) => {
  const checksum = crypto.randomUUID();
  const { error } = await supabase.from("media_assets").upsert(
    {
      media_item_id: mediaItemId,
      video_path: videoPath,
      thumbnail_path: thumbnailPath,
      download_status: "complete",
      checksum,
      size_bytes: sizeBytes,
      retries: 0,
      last_downloaded_at: new Date().toISOString(),
    },
    { onConflict: "media_item_id" },
  );

  if (error) throw error;
};

const markJobStatus = async (id: number, status: "complete" | "failed", failureReason?: string) => {
  const { error } = await supabase
    .from("download_jobs")
    .update({
      status,
      failure_reason: failureReason ?? null,
      attempted_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
};

const fetchNextJobs = async (limit: number): Promise<DownloadJob[]> => {
  // Use the RPC function to safely get the next batch of jobs
  const { data, error } = await supabase.rpc("get_next_download_jobs", { batch_size: limit });

  if (error) throw error;
  return data as DownloadJob[];
};

const processSingleJob = async (job: DownloadJob) => {
  try {
    const videoBuffer = await downloadBuffer(job.video_url);
    const videoPath = `videos/${job.media_item_id}-${Date.now()}.mp4`;
    await storeFile(videoPath, videoBuffer, "video/mp4");

    let thumbnailPath: string | null = null;
    if (job.thumbnail_url) {
      const thumbBuffer = await downloadBuffer(job.thumbnail_url);
      thumbnailPath = `thumbnails/${job.media_item_id}-${Date.now()}.jpg`;
      await storeFile(thumbnailPath, thumbBuffer, "image/jpeg");
    }

    await upsertAssetRecord(job.media_item_id, videoPath, thumbnailPath, videoBuffer.byteLength);
    await markJobStatus(job.id, "complete");
    return { id: job.id, status: "success" };
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    await markJobStatus(job.id, "failed", String(error));
    return { id: job.id, status: "error", error: String(error) };
  }
};

serve(async () => {
  try {
    const BATCH_SIZE = 5;
    const MAX_LOOPS = 3; // Process up to 15 items per invocation
    let totalProcessed = 0;

    for (let i = 0; i < MAX_LOOPS; i++) {
      const jobs = await fetchNextJobs(BATCH_SIZE);
      if (!jobs.length) {
        // If no jobs were found in the first loop, respond with no-jobs.
        // Otherwise, break as no more jobs are queued.
        if (i === 0) {
          return new Response(JSON.stringify({ message: "no-jobs" }), { status: 200 });
        }
        break;
      }

      // Process all jobs in the current batch concurrently
      const results = await Promise.allSettled(jobs.map(processSingleJob));

      totalProcessed += jobs.length;
      console.log(`Processed batch ${i + 1}, items: ${jobs.length}, total: ${totalProcessed}`);

      // If any job failed, log it
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`Error processing job ${jobs[index].id}:`, result.reason);
        }
      });
    }

    // Self-chaining: If we processed any jobs, there might be more.
    // Trigger another worker instance to pick up the next batch.
    if (totalProcessed > 0) {
      console.log(`Processed ${totalProcessed} jobs. Triggering next worker...`);
      // Fire-and-forget invocation
      supabase.functions.invoke("download-worker", {
        body: {},
      }).catch((err) => console.error("Failed to trigger next worker:", err));
    }

    return new Response(JSON.stringify({ message: "processed", count: totalProcessed }), { status: 200 });
  } catch (error) {
    console.error("download-worker overall failure", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
