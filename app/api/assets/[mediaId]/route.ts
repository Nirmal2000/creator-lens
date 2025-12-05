import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/server-supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  try {
    const supabase = createServerSupabaseClient();
    const { mediaId } = await params;

    const { data: asset, error } = await supabase
      .from("media_assets")
      .select("video_path, thumbnail_path")
      .eq("media_item_id", mediaId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    if (!asset) {
      return NextResponse.json({ message: "Asset not found" }, { status: 404 });
    }

    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "sm_data";
    const storage = supabase.storage.from(bucket);

    const [videoUrl, thumbnailUrl] = await Promise.all([
      storage.createSignedUrl(asset.video_path, 60),
      asset.thumbnail_path ? storage.createSignedUrl(asset.thumbnail_path, 60) : Promise.resolve({ data: null, error: null }),
    ]);

    if (videoUrl.error) {
      return NextResponse.json({ message: videoUrl.error.message }, { status: 500 });
    }

    return NextResponse.json({
      videoUrl: videoUrl.data?.signedUrl,
      thumbnailUrl: thumbnailUrl.data?.signedUrl ?? null,
    });
  } catch (error) {
    console.error("/api/assets error", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
