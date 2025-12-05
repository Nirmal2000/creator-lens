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
  if (!media.length) return [] as { id: string; platform: string; external_id: string }[];

  const { data, error } = await supabase
    .from("media_items")
    .insert(
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
    )
    .select("id, platform, external_id");

  if (error) {
    throw new Error(`Failed to insert media items: ${error.message}`);
  }

  return data ?? [];
};

const queueJobsForMedia = async (
  supabase: ReturnType<typeof createServerSupabaseClient>,
  media: NormalizedMediaItem[],
  insertedRefs: { id: string; platform: string; external_id: string }[],
) => {
  if (!media.length) return;
  const jobInputs = media
    .map((item) => {
      if (!item.playbackUrl) return null;
      const ref = insertedRefs.find(
        (row) => row.platform === item.platform && row.external_id === item.externalId,
      );
      if (!ref) return null;
      return {
        media_item_id: ref.id,
        video_url: item.playbackUrl,
        thumbnail_url: item.thumbnailUrl,
      };
    })
    .filter(Boolean) as Parameters<typeof queueDownloadJobs>[1];

  await queueDownloadJobs(supabase, jobInputs);

  // Trigger the download worker immediately
  supabase.functions.invoke("download-worker", {
    body: {}, // No specific body needed for this worker's current logic
    // invokeType: 'BACKGROUND' // Consider this if available and suitable for fire-and-forget
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
