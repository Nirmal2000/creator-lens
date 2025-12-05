'use client';

import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MediaGrid } from "@/components/media-grid";
import type { NormalizedMediaItem } from "@/lib/media-normalizers";
import { HistoryFilters } from "./components/history-filters";
import { HistoryList } from "./components/history-list";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface HistoryFiltersState {
  keyword: string;
  platform: string;
  from: string;
  to: string;
}

export interface HistorySummary {
  id: string;
  keyword: string;
  filters: unknown;
  requested_at: string;
  platform_status: Record<string, { status: string; error?: string }>;
  result_counts: Record<string, number>;
}

const buildQueryString = (filters: HistoryFiltersState) => {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params.toString();
};

function HistoryPageContent() {
  const searchParams = useSearchParams();
  const initialSearchId = searchParams.get("id");

  const [filters, setFilters] = useState<HistoryFiltersState>({
    keyword: "",
    platform: "",
    from: "",
    to: "",
  });
  const [submittedFilters, setSubmittedFilters] = useState(filters);

  // Track the user's explicit selection.
  const [selectedId, setSelectedId] = useState<string | null>(initialSearchId);

  const historyQuery = useQuery<{ items: HistorySummary[] }>({
    queryKey: ["history", submittedFilters],
    queryFn: async () => {
      const qs = buildQueryString(submittedFilters);
      const response = await fetch(`/api/history?${qs}`);
      if (!response.ok) {
        throw new Error("Failed to load history");
      }
      return response.json();
    },
  });

  // Sync the URL with the selection to allow deep linking.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (selectedId) {
      url.searchParams.set("id", selectedId);
    } else {
      url.searchParams.delete("id");
    }
    window.history.replaceState(null, "", url.toString());
  }, [selectedId]);

  const detailQuery = useQuery<{ search: HistorySummary; media: NormalizedMediaItem[] }>({
    queryKey: ["history-detail", selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const response = await fetch(`/api/history/${selectedId}`);
      if (!response.ok) {
        throw new Error("Failed to load search media");
      }
      return response.json();
    },
  });

  const selectedSearchSummary = useMemo(() => {
    return historyQuery.data?.items.find(item => item.id === selectedId);
  }, [selectedId, historyQuery.data]);

  return (
    <div className="space-y-8">
      <section className="glass-panel rounded-3xl p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="mt-2 text-3xl font-semibold">Browse stored searches from Supabase</h1>
            <p className="mt-2 text-muted-foreground">
              Apply filters to the query log, select a search, and replay the stored media grid without
              hitting external APIs.
            </p>
          </div>
          <Link href="/search">
            <Button>Search</Button>
          </Link>
        </div>
      </section>

      <HistoryFilters
        values={filters}
        onChange={setFilters}
        onSubmit={() => {
          setSubmittedFilters(filters);
          setSelectedId(null);
        }}
      />

      <div> {/* This div now holds only the HistoryList */}
        {historyQuery.isLoading ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-muted-foreground">Loading…</div>
        ) : historyQuery.error ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-red-400">Failed to load history.</div>
        ) : (
          <HistoryList
            items={historyQuery.data?.items ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
      </div>

      <Sheet open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>{selectedSearchSummary?.keyword ? `Results for "${selectedSearchSummary.keyword}"` : "Search Results"}</SheetTitle>
            <SheetDescription>
              {selectedSearchSummary ? `Requested on ${new Date(selectedSearchSummary.requested_at).toLocaleDateString()}` : "Select a search from the list to view its media."}
            </SheetDescription>
          </SheetHeader>
          <div className="pt-4 pb-8 overflow-y-auto"> {/* Added overflow-y-auto for the content */}
            {detailQuery.error ? (
              <div className="glass-panel rounded-2xl p-10 text-center text-red-400">
                Failed to load media for this search.
              </div>
            ) : (
              <MediaGrid
                items={detailQuery.data?.media ?? []}
                isLoading={detailQuery.isLoading}
                platformStatus={detailQuery.data?.search.platform_status ?? {}}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading history…</div>}>
      <HistoryPageContent />
    </Suspense>
  );
}
