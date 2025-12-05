import { NextResponse } from "next/server";
import { z } from "zod";
import {
  searchInstagramReels,
  searchTikTokByKeyword,
  searchYouTubeShorts,
} from "@/lib/scrape-creators";
import {
  combineNormalizedMedia,
  normalizeInstagramMedia,
  normalizeTikTokMedia,
  normalizeYouTubeMedia,
} from "@/lib/media-normalizers";
import { SearchRequestSchema } from "@/lib/validators/search-filters";
import { persistSearchResult } from "@/lib/search-storage";

const logError = (platform: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ScrapeCreators:${platform}]`, message);
  return message;
};

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const body = SearchRequestSchema.parse(rawBody);
    const startedAt = performance.now();

    const selectedPlatforms = {
      tiktok: body.platforms?.tiktok !== false,
      youtube: body.platforms?.youtube === true,
      instagram: body.platforms?.instagram === true,
    };

    if (!selectedPlatforms.tiktok && !selectedPlatforms.youtube && !selectedPlatforms.instagram) {
      selectedPlatforms.tiktok = true;
    }

    const placeholderStatus: Record<"tiktok" | "youtube" | "instagram", { status: string; error?: string }> = {
      tiktok: { status: selectedPlatforms.tiktok ? "pending" : "skipped" },
      youtube: { status: selectedPlatforms.youtube ? "pending" : "skipped" },
      instagram: { status: selectedPlatforms.instagram ? "pending" : "skipped" },
    };

    const requests: ["tiktok" | "youtube" | "instagram", Promise<unknown>][] = [];
    if (selectedPlatforms.tiktok) {
      requests.push([
        "tiktok",
        searchTikTokByKeyword({
          query: body.keyword,
          ...body.tiktok,
        }),
      ]);
    }
    if (selectedPlatforms.youtube) {
      requests.push([
        "youtube",
        searchYouTubeShorts({
          query: body.keyword,
          filter: "shorts",
          includeExtras: body.youtube?.includeExtras ?? true,
        }),
      ]);
    }
    if (selectedPlatforms.instagram) {
      requests.push([
        "instagram",
        searchInstagramReels({
          query: body.keyword,
          amount: body.instagram?.amount ?? 30,
        }),
      ]);
    }

    const payloadMap: Record<string, unknown> = {};
    if (requests.length) {
      const settled = await Promise.allSettled(requests.map(([, promise]) => promise));
      settled.forEach((result, index) => {
        const platform = requests[index][0];
        if (result.status === "fulfilled") {
          placeholderStatus[platform] = { status: "fulfilled" };
          payloadMap[platform] = result.value;
        } else {
          placeholderStatus[platform] = {
            status: "rejected",
            error: logError(platform, result.reason),
          };
        }
      });
    }

    const media = combineNormalizedMedia(
      normalizeTikTokMedia((payloadMap.tiktok as any) ?? {}),
      normalizeYouTubeMedia((payloadMap.youtube as any) ?? {}),
      normalizeInstagramMedia((payloadMap.instagram as any) ?? {}),
    );

    // Truncated console log for API results
    for (const platform of Object.keys(payloadMap)) {
      const payload = payloadMap[platform];
      const payloadString = JSON.stringify(payload);
      const truncatedPayload =
        payloadString.length > 500
          ? `${payloadString.substring(0, 500)}... (truncated)`
          : payloadString;
      console.log(`[API Result - ${platform}]:`, truncatedPayload);
    }

    const requester =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      request.headers.get("cf-connecting-ip") ??
      null;

    let searchId: string | null = null;
    try {
      searchId = await persistSearchResult({
        keyword: body.keyword,
        filters: body,
        platformStatus: placeholderStatus,
        payloadMap,
        media,
        requester,
        durationMs: Math.round(performance.now() - startedAt),
      });
    } catch (persistError) {
      console.error("persistSearchResult error", persistError);
    }

    return NextResponse.json({
      searchId,
      keyword: body.keyword,
      filters: body,
      platformStatus: placeholderStatus,
      media,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request", issues: error.flatten() },
        { status: 400 },
      );
    }

    console.error("/api/search error", error);
    return NextResponse.json(
      { message: "Unexpected error. Please try again." },
      { status: 500 },
    );
  }
}
