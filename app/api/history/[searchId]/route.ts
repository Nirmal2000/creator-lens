import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/server-supabase";
import type { Platform } from "@/lib/media-normalizers";

const bucketName = process.env.SUPABASE_STORAGE_BUCKET ?? "sm_data";

export async function GET(
  _request: Request,
  context: { params: Promise<{ searchId: string }> },
) {
  try {
    const params = await context.params;
    const supabase = createServerSupabaseClient();
    const searchId = params.searchId;

    const { data: search, error: searchError } = await supabase
      .from("search_queries")
      .select("id, keyword, filters, requested_at, platform_status, result_counts")
      .eq("id", searchId)
      .maybeSingle();

    if (searchError) {
      return NextResponse.json({ message: searchError.message }, { status: 500 });
    }

    if (!search) {
      return NextResponse.json({ message: "Search not found" }, { status: 404 });
    }

    const { data: mediaRows, error: mediaError } = await supabase
      .from("media_items")
      .select(
        "id, platform, external_id, title, description, author_handle, author_name, profile_image_url, stats, duration_seconds, published_at, thumbnail_url",
      )
      .eq("search_id", searchId)
      .order("created_at", { ascending: true });

    if (mediaError) {
      return NextResponse.json({ message: mediaError.message }, { status: 500 });
    }

    const mediaIds = (mediaRows ?? []).map((row) => row.id);
    const assetsMap = new Map<string, { video_path: string | null; thumbnail_path: string | null }>();
    if (mediaIds.length) {
      const { data: assets } = await supabase
        .from("media_assets")
        .select("media_item_id, video_path, thumbnail_path")
        .in("media_item_id", mediaIds);
      assets?.forEach((asset) => {
        assetsMap.set(asset.media_item_id, {
          video_path: asset.video_path ?? null,
          thumbnail_path: asset.thumbnail_path ?? null,
        });
      });
    }

    const storage = supabase.storage.from(bucketName);

    const media = await Promise.all(
      (mediaRows ?? []).map(async (row) => {
        const asset = assetsMap.get(row.id) ?? null;
        const [videoUrl, downloadUrl, thumbnailUrl] = await Promise.all([
          asset?.video_path ? storage.createSignedUrl(asset.video_path, 60) : Promise.resolve({ data: null, error: null }),
          asset?.video_path ? storage.createSignedUrl(asset.video_path, 60, { download: true }) : Promise.resolve({ data: null, error: null }),
          asset?.thumbnail_path ? storage.createSignedUrl(asset.thumbnail_path, 60) : Promise.resolve({ data: null, error: null }),
        ]);

        return {
          platform: row.platform as Platform,
          externalId: row.external_id,
          title: row.title,
          description: row.description,
          authorHandle: row.author_handle,
          authorName: row.author_name,
          profileImageUrl: row.profile_image_url,
          stats: row.stats ?? {},
          durationSeconds: Number(row.duration_seconds ?? 0),
          publishedAt: row.published_at,
          thumbnailUrl: thumbnailUrl.data?.signedUrl ?? row.thumbnail_url,
          playbackUrl: videoUrl.data?.signedUrl ?? null,
          downloadUrl: downloadUrl.data?.signedUrl ?? null,
          raw: row,
        };
      }),
    );

    return NextResponse.json({ search, media });
  } catch (error) {
    console.error("/api/history/[searchId] error", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
