'use client';

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterPanel } from "./components/filter-panel";
import { MediaGrid } from "@/components/media-grid";
import { useMoreVideos, type PlatformSelection } from "@/lib/hooks/use-more-videos";
import type { NormalizedMediaItem } from "@/lib/media-normalizers";
import type { SearchRequestInput } from "@/lib/validators/search-filters";

type PlatformFilters = Pick<SearchRequestInput, "tiktok" | "youtube" | "instagram">;

const defaultFilters: PlatformFilters = {
  tiktok: { date_posted: "this-week", sort_by: "relevance", region: "US" },
  youtube: { includeExtras: true },
  instagram: { amount: 30 },
};

export default function SearchPage() {
  const [keyword, setKeyword] = useState("running content inspiration");
  const [filters, setFilters] = useState<PlatformFilters>(defaultFilters);
  const [platformSelection, setPlatformSelection] = useState<PlatformSelection>({
    tiktok: true,
    youtube: false,
    instagram: false,
  });
  const [results, setResults] = useState<NormalizedMediaItem[]>([]);
  const [platformStatus, setPlatformStatus] = useState<Record<string, { status: string; error?: string }>>({});
  const [searchId, setSearchId] = useState<string | null>(null);

  const handleFiltersChange = (
    platform: keyof PlatformFilters,
    values: Record<string, string | number | boolean | undefined>,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        ...values,
      },
    }));
  };

  const searchMutation = useMutation({
    mutationFn: async () => {
      if (!Object.values(platformSelection).some(Boolean)) {
        throw new Error("Select at least one platform");
      }
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, ...filters, platforms: platformSelection }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.message ?? "Failed to fetch media");
      }

      return response.json();
    },
    onSuccess: (payload) => {
      setSearchId(payload.searchId ?? null);
      setResults(payload.media ?? []);
      setPlatformStatus(payload.platformStatus ?? {});
    },
  });

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    searchMutation.mutate();
  };

  const error = searchMutation.error instanceof Error ? searchMutation.error.message : null;

  const moreVideos = useMoreVideos({
    onAppend: (media, status) => {
      if (media.length) {
        setResults((prev) => [...prev, ...media]);
      }
      if (status) {
        setPlatformStatus((prev) => ({ ...prev, ...status }));
      }
    },
  });

  const moreError = moreVideos.error?.message ?? null;

  return (
    <div className="space-y-8">
      <section className="glass-panel rounded-3xl p-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="mt-2 text-3xl font-semibold">Discover creators across TikTok, YouTube, and Instagram</h1>
          <Link href="/history">
            <Button variant="outline">History</Button>
          </Link>
        </div>

        <form className="mt-6 flex flex-col gap-4 md:flex-row" onSubmit={handleSearch}>
          <Input
            className="flex-1 text-lg"
            placeholder="e.g. hybrid training drills"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Button
            type="submit"
            className="text-sm uppercase tracking-wide"
            disabled={searchMutation.isPending}
          >
            {searchMutation.isPending ? "Searching…" : "Search"}
          </Button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </section>

      <section className="glass-panel rounded-3xl p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Platforms</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {([
            { key: "tiktok", label: "TikTok" },
            { key: "youtube", label: "YouTube Shorts" },
            { key: "instagram", label: "Instagram Reels" },
          ] as const).map(({ key, label }) => (
            <label key={key} className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="size-4 rounded border-border"
                checked={platformSelection[key]}
                onChange={(event) =>
                  setPlatformSelection((prev) => {
                    const next = { ...prev, [key]: event.target.checked };
                    if (!Object.values(next).some(Boolean)) {
                      next.tiktok = true;
                    }
                    return next;
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">At least one platform must be selected. Default is TikTok only.</p>
      </section>

      <FilterPanel filters={filters} onFiltersChange={handleFiltersChange} />

      {searchId ? (
        <div>
          {/* <Button
            variant="outline"
            className="uppercase tracking-wide"
            onClick={() =>
              searchId && moreVideos.loadMore({ searchId, platforms: platformSelection })
            }
            disabled={moreVideos.isLoading}
          >
            {moreVideos.isLoading ? "Loading more…" : "More videos"}
          </Button> */}
          {moreError ? <p className="mt-2 text-sm text-red-400">{moreError}</p> : null}
        </div>
      ) : null}

      <MediaGrid
        items={results}
        isLoading={searchMutation.isPending || moreVideos.isLoading}
        platformStatus={platformStatus}
      />
    </div>
  );
}
