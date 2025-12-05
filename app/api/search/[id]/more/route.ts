import { NextResponse } from "next/server";
import { z } from "zod";
import {
  searchTikTokByKeyword,
  searchYouTubeShorts,
  searchInstagramReels,
} from "@/lib/scrape-creators";
import {
  combineNormalizedMedia,
  normalizeTikTokMedia,
  normalizeYouTubeMedia,
  normalizeInstagramMedia,
} from "@/lib/media-normalizers";
import { appendSearchResults } from "@/lib/search-storage";
import { SearchRequestSchema } from "@/lib/validators/search-filters";
import { createServerSupabaseClient } from "@/lib/server-supabase";

const MoreRequestSchema = z.object({
  platforms: z
    .object({
      tiktok: z.boolean().optional(),
      youtube: z.boolean().optional(),
      instagram: z.boolean().optional(),
    })
    .partial()
    .optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const startedAt = performance.now();
    const body = await request.json().catch(() => ({}));
    const parsed = MoreRequestSchema.parse(body);
    const supabase = createServerSupabaseClient();
    const { id } = await params;

    const { data: searchRow, error } = await supabase
      .from("search_queries")
      .select("id, keyword, filters, cursor_state, result_counts")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    if (!searchRow) {
      return NextResponse.json({ message: "Search not found" }, { status: 404 });
    }

    const parsedFilters = SearchRequestSchema.partial().safeParse(searchRow.filters);
    const storedFilters = parsedFilters.success ? parsedFilters.data : undefined;

    const platformSelection = {
      tiktok: parsed.platforms?.tiktok ?? storedFilters?.platforms?.tiktok ?? true,
      youtube: parsed.platforms?.youtube ?? storedFilters?.platforms?.youtube ?? true,
      instagram: parsed.platforms?.instagram ?? storedFilters?.platforms?.instagram ?? true,
    };

    const cursorState = (searchRow.cursor_state ?? {}) as Record<string, unknown>;

    const placeholderStatus: Record<string, { status: string; error?: string }> = {
      tiktok: { status: platformSelection.tiktok ? "pending" : "skipped" },
      youtube: { status: platformSelection.youtube ? "pending" : "skipped" },
      instagram: { status: platformSelection.instagram ? "pending" : "skipped" },
    };

    const requests: ["tiktok" | "youtube" | "instagram", Promise<unknown>][] = [];

    if (platformSelection.tiktok && cursorState.tiktok != null) {
      requests.push([
        "tiktok",
        searchTikTokByKeyword({
          query: searchRow.keyword,
          ...storedFilters?.tiktok,
          cursor: cursorState.tiktok,
        }),
      ]);
    } else if (platformSelection.tiktok) {
      placeholderStatus.tiktok = { status: "exhausted" };
    }

    if (platformSelection.youtube && cursorState.youtube) {
      requests.push([
        "youtube",
        searchYouTubeShorts({
          query: searchRow.keyword,
          filter: "shorts",
          continuationToken: cursorState.youtube,
          includeExtras: storedFilters?.youtube?.includeExtras ?? true,
        }),
      ]);
    } else if (platformSelection.youtube) {
      placeholderStatus.youtube = { status: "exhausted" };
    }

    if (platformSelection.instagram) {
      placeholderStatus.instagram = { status: "exhausted" };
    }

    if (!requests.length) {
      return NextResponse.json({
        message: "No additional pages available",
        platformStatus: placeholderStatus,
        media: [],
      });
    }

    const payloadMap: Record<string, unknown> = {};
    const settled = await Promise.allSettled(requests.map(([, promise]) => promise));
    settled.forEach((result, index) => {
      const platform = requests[index][0];
      if (result.status === "fulfilled") {
        placeholderStatus[platform] = { status: "fulfilled" };
        payloadMap[platform] = result.value;
      } else {
        placeholderStatus[platform] = {
          status: "rejected",
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        };
      }
    });

    const media = combineNormalizedMedia(
      normalizeTikTokMedia((payloadMap.tiktok as any) ?? {}),
      normalizeYouTubeMedia((payloadMap.youtube as any) ?? {}),
      normalizeInstagramMedia((payloadMap.instagram as any) ?? {}),
    );

    await appendSearchResults({
      searchId: params.id,
      platformStatus: placeholderStatus,
      payloadMap,
      media,
      durationMs: Math.round(performance.now() - startedAt),
    });

    return NextResponse.json({
      searchId: params.id,
      platformStatus: placeholderStatus,
      media,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid request", issues: error.flatten() }, { status: 400 });
    }
    console.error("/api/search/[id]/more error", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
