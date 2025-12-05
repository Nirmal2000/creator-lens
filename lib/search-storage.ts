import type { NormalizedMediaItem } from "@/lib/media-normalizers";
import { queueDownloadJobs } from "@/lib/downloads";
import { createServerSupabaseClient } from "@/lib/server-supabase";

export interface PlatformState {
  status: string;
  error?: string;
}

interface PersistArgs {
  keyword: string;
  filters: unknown;
  platformStatus: Record<string, PlatformState>;
  payloadMap: Record<string, unknown>;
  media: NormalizedMediaItem[];
  requester?: string | null;
  durationMs: number;
}

const deriveCursorState = (
  payloadMap: Record<string, unknown>,
  previous?: Record<string, unknown> | null,
) => ({
  tiktok:
    (payloadMap.tiktok as any)?.cursor ??
    (previous ? (previous as Record<string, unknown>).tiktok : null) ??
    null,
  youtube:
    (payloadMap.youtube as any)?.continuationToken ??
    (previous ? (previous as Record<string, unknown>).youtube : null) ??
    null,
  instagram: null,
});

const deriveResultCounts = (media: NormalizedMediaItem[]) =>
  media.reduce<Record<string, number>>((acc, item) => {
    acc[item.platform] = (acc[item.platform] ?? 0) + 1;
    return acc;
  }, {});

const mergeCounts = (
  baseCounts: Record<string, number> | null,
  media: NormalizedMediaItem[],
) => {
  const delta = deriveResultCounts(media);
  const merged = { ...(baseCounts ?? {}) } as Record<string, number>;
  for (const [platform, count] of Object.entries(delta)) {
    merged[platform] = (merged[platform] ?? 0) + count;
  }
  return merged;
};

const insertMediaItems = async (
  supabase: ReturnType<typeof createServerSupabaseClient>,
  searchId: string,
  media: NormalizedMediaItem[],
) => {
  if (!media.length)
    return [] as {
      id: string;
      platform: string;
      external_id: string;
      storage_asset_id: string | null;
    }[];

  const { data, error } = await supabase
    .from("media_items")
    .upsert(
      media.map((item) => ({
        search_id: searchId,
        platform: item.platform,
        external_id: item.externalId,
        title: item.title,
        description: item.description,
        author_handle: item.authorHandle,
        author_name: item.authorName,
        profile_image_url: item.profileImageUrl,
        stats: item.stats,
        duration_seconds: item.durationSeconds,
        published_at: item.publishedAt ?? null,
        thumbnail_url: item.thumbnailUrl,
      })),
      { onConflict: "platform, external_id" },
    )
    .select("id, platform, external_id, storage_asset_id, created_at");

  if (error) {
    throw new Error(`Failed to insert media items: ${error.message}`);
  }

  if (data) {
    const now = Date.now();
    let inserted = 0;
    let updated = 0;

    data.forEach((item) => {
      const createdTime = new Date(item.created_at).getTime();
      // If created within the last 10 seconds, assume it's new
      if (now - createdTime < 10000) {
        inserted++;
      } else {
        updated++;
      }
    });

    console.log(
      `[SearchPersistence] Processed ${data.length} items: ${inserted} inserted, ${updated} updated.`,
    );
  }

  return data ?? [];
};

const queueJobsForMedia = async (
  supabase: ReturnType<typeof createServerSupabaseClient>,
  media: NormalizedMediaItem[],
  insertedRefs: {
    id: string;
    platform: string;
    external_id: string;
    storage_asset_id: string | null;
  }[],
) => {
  if (!media.length) return;

  // First, filter out media items that either lack a playback URL or are already downloaded.
  const candidateMediaItems = media
    .map((item) => {
      if (!item.playbackUrl) return null;
      const ref = insertedRefs.find(
        (row) =>
          row.platform === item.platform && row.external_id === item.externalId,
      );
      if (!ref) return null;
      if (ref.storage_asset_id) return null; // Skip if already downloaded
      return { item, ref }; // Keep both for later processing
    })
    .filter(Boolean) as { item: NormalizedMediaItem; ref: NonNullable<typeof insertedRefs[number]> }[];

  if (!candidateMediaItems.length) {
    console.log("[SearchPersistence] No candidate media items for download after initial filtering.");
    return;
  }

  const candidateMediaItemIds = candidateMediaItems.map(c => c.ref.id);

  // Check for existing active download jobs (queued or processing) for these media items.
  const { data: existingJobs, error: existingJobsError } = await supabase
    .from("download_jobs")
    .select("media_item_id")
    .in("media_item_id", candidateMediaItemIds)
    .in("status", ["queued", "processing"]); // Only consider active jobs

  if (existingJobsError) {
    console.error("Failed to check for existing download jobs:", existingJobsError.message);
    // Log the error but continue to avoid blocking the queuing process entirely.
  }

  const existingJobMediaItemIds = new Set(existingJobs?.map(job => job.media_item_id) || []);

  // Filter out media items that already have an active job.
  const jobsToQueue = candidateMediaItems
    .filter(c => !existingJobMediaItemIds.has(c.ref.id))
    .map((c) => ({
      media_item_id: c.ref.id,
      video_url: c.item.playbackUrl!, // playbackUrl is guaranteed by earlier check
      thumbnail_url: c.item.thumbnailUrl,
    }));

  if (!jobsToQueue.length) {
    console.log("[SearchPersistence] No new download jobs to queue after de-duplication.");
    return;
  }

  await queueDownloadJobs(supabase, jobsToQueue);
  console.log(`[SearchPersistence] Queued ${jobsToQueue.length} new download jobs.`);

  // Trigger the download worker immediately
  supabase.functions.invoke("download-worker", {
    body: {},
  }).catch((err) => {
    console.error("Failed to trigger download worker from search-storage:", err);
  });
};

export const persistSearchResult = async (args: PersistArgs) => {
  const supabase = createServerSupabaseClient();

  const { data: searchRow, error: searchError } = await supabase
    .from("search_queries")
    .insert({
      keyword: args.keyword,
      filters: args.filters,
      requested_by: args.requester ?? "anonymous",
      platform_status: args.platformStatus,
      cursor_state: deriveCursorState(args.payloadMap),
      result_counts: deriveResultCounts(args.media),
      duration_ms: args.durationMs,
      raw_payload: args.payloadMap,
    })
    .select("id")
    .single();

  if (searchError) {
    throw new Error(`Failed to insert search row: ${searchError.message}`);
  }

  const insertedMedia = await insertMediaItems(supabase, searchRow.id, args.media);
  await queueJobsForMedia(supabase, args.media, insertedMedia);

  return searchRow.id;
};

interface AppendArgs {
  searchId: string;
  platformStatus: Record<string, PlatformState>;
  payloadMap: Record<string, unknown>;
  media: NormalizedMediaItem[];
  durationMs: number;
}

export const appendSearchResults = async (args: AppendArgs) => {
  const supabase = createServerSupabaseClient();
  const { data: searchRow, error } = await supabase
    .from("search_queries")
    .select("id, cursor_state, result_counts")
    .eq("id", args.searchId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load search ${args.searchId}: ${error.message}`);
  }
  if (!searchRow) {
    throw new Error(`Search ${args.searchId} not found`);
  }

  const insertedMedia = await insertMediaItems(supabase, args.searchId, args.media);
  await queueJobsForMedia(supabase, args.media, insertedMedia);

  const updatedCounts = mergeCounts(searchRow.result_counts ?? {}, args.media);
  const updatedCursorState = deriveCursorState(args.payloadMap, searchRow.cursor_state);

  const { error: updateError } = await supabase
    .from("search_queries")
    .update({
      platform_status: args.platformStatus,
      cursor_state: updatedCursorState,
      result_counts: updatedCounts,
      duration_ms: args.durationMs,
      raw_payload: args.payloadMap,
    })
    .eq("id", args.searchId);

  if (updateError) {
    throw new Error(`Failed to update search ${args.searchId}: ${updateError.message}`);
  }

  return insertedMedia.map((ref) => ref.id);
};
