import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/server-supabase", () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { createServerSupabaseClient } from "@/lib/server-supabase";
import { GET as historyList } from "@/app/api/history/route";
import { GET as historyDetail } from "@/app/api/history/[searchId]/route";

const historyItems = [
  {
    id: "search-1",
    keyword: "running",
    filters: {},
    requested_at: "2024-06-01T12:00:00Z",
    platform_status: { tiktok: { status: "fulfilled" } },
    result_counts: { tiktok: 3 },
  },
];

const mediaRows = [
  {
    id: "media-1",
    search_id: "search-1",
    platform: "tiktok",
    external_id: "vid-1",
    title: "Running tips",
    description: "",
    author_handle: "coach",
    author_name: "Coach",
    profile_image_url: "https://avatar",
    stats: { views: 1 },
    duration_seconds: 30,
    published_at: "2024-05-30T00:00:00Z",
    thumbnail_url: "https://thumb",
  },
];

const mediaAssets = [
  {
    media_item_id: "media-1",
    video_path: "videos/media-1.mp4",
    thumbnail_path: "thumbnails/media-1.jpg",
  },
];

type Builder = ReturnType<typeof createListBuilder>;

function createListBuilder(data: unknown) {
  const builder: any = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    not: vi.fn(() => builder),
    then: (resolve: (value: any) => void) => Promise.resolve(resolve({ data, error: null })),
  };
  return builder;
}

function createPromiseBuilder(data: unknown) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    in: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve({ data, error: null })),
    then: (resolve: (value: any) => void) => Promise.resolve(resolve({ data, error: null })),
  };
  return builder;
}

const signedUrlResponse = { data: { signedUrl: "https://signed-url" }, error: null };

describe("history API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns stored searches with filters", async () => {
    const listBuilder = createListBuilder(historyItems);
    (createServerSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "search_queries") return listBuilder;
        throw new Error("Unexpected table" + table);
      }),
    });

    const response = await historyList(new Request("http://localhost/api/history?keyword=run"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.items).toHaveLength(1);
    expect(listBuilder.ilike).toHaveBeenCalled();
  });

  it("returns media for stored search using signed URLs", async () => {
    const searchSingle = {
      select: vi.fn(() => searchSingle),
      eq: vi.fn(() => searchSingle),
      maybeSingle: vi.fn(() => Promise.resolve({ data: historyItems[0], error: null })),
    };

    const mediaBuilder = {
      select: vi.fn(() => mediaBuilder),
      eq: vi.fn(() => mediaBuilder),
      order: vi.fn(() => mediaBuilder),
      then: (resolve: (value: any) => void) => Promise.resolve(resolve({ data: mediaRows, error: null })),
    } as Builder;

    const assetsBuilder = {
      select: vi.fn(() => assetsBuilder),
      in: vi.fn(() => assetsBuilder),
      then: (resolve: (value: any) => void) => Promise.resolve(resolve({ data: mediaAssets, error: null })),
    } as Builder;

    (createServerSupabaseClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "search_queries") return searchSingle;
        if (table === "media_items") return mediaBuilder;
        if (table === "media_assets") return assetsBuilder;
        throw new Error("Unexpected table" + table);
      }),
      storage: {
        from: vi.fn(() => ({
          createSignedUrl: vi.fn(() => Promise.resolve(signedUrlResponse)),
        })),
      },
    });

    const response = await historyDetail(new Request("http://localhost/api/history/search-1"), {
      params: { searchId: "search-1" },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.media).toHaveLength(1);
    expect(body.media[0].playbackUrl).toBe("https://signed-url");
  });
});
