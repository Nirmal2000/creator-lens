import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PlatformState } from "@/lib/search-storage";

vi.mock("@/lib/search-storage", () => ({
  persistSearchResult: vi.fn().mockResolvedValue("search-id-123"),
}));

vi.mock("@/lib/scrape-creators", () => ({
  searchTikTokByKeyword: vi.fn().mockResolvedValue({ cursor: 2, search_item_list: [] }),
  searchYouTubeShorts: vi.fn().mockResolvedValue({ videos: [] }),
  searchInstagramReels: vi.fn().mockResolvedValue({ reels: [] }),
}));

import { persistSearchResult } from "@/lib/search-storage";
import { POST } from "@/app/api/search/route";

describe("POST /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists search metadata and returns payload", async () => {
    const request = new Request("http://localhost/api/search", {
      method: "POST",
      body: JSON.stringify({ keyword: "hybrid training" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.keyword).toBe("hybrid training");
    expect(persistSearchResult).toHaveBeenCalledTimes(1);

    const args = (persistSearchResult as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(args.keyword).toBe("hybrid training");
    expect(args.platformStatus).toMatchObject<Record<string, PlatformState>>({
      tiktok: { status: "fulfilled" },
      youtube: { status: "skipped" },
      instagram: { status: "skipped" },
    });
  });
});
