'use client';

import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MediaGrid } from "@/components/media-grid";
import type { NormalizedMediaItem } from "@/lib/media-normalizers";
import { HistoryFilters } from "./components/history-filters";
import { HistoryList } from "./components/history-list";
import { useSearchParams } from "next/navigation";

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

  // Track the user's explicit selection. If null, we auto-select the first item from the API.
  const [manualSelectedId, setManualSelectedId] = useState<string | null>(initialSearchId);

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

  // Derived selection: fall back to the first item if the user hasn't picked one yet.
  const selectedId = useMemo(() => {
    if (manualSelectedId) return manualSelectedId;
    if (historyQuery.data?.items?.length) return historyQuery.data.items[0].id;
    return null;
  }, [manualSelectedId, historyQuery.data]);

  // Sync the URL with the computed selection to allow deep linking.
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

  return (
    <div className="space-y-8">
      <section className="glass-panel rounded-3xl p-8">        
        <h1 className="mt-2 text-3xl font-semibold">Browse stored searches from Supabase</h1>
        <p className="mt-2 text-muted-foreground">
          Apply filters to the query log, select a search, and replay the stored media grid without
          hitting external APIs.
        </p>
      </section>

      <HistoryFilters
        values={filters}
        onChange={setFilters}
        onSubmit={() => {
          setSubmittedFilters(filters);
          setManualSelectedId(null);
        }}
      />

      <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
        <div>
          {historyQuery.isLoading ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-muted-foreground">Loading…</div>
          ) : historyQuery.error ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-red-400">Failed to load history.</div>
          ) : (
            <HistoryList
              items={historyQuery.data?.items ?? []}
              selectedId={selectedId}
              onSelect={setManualSelectedId}
            />
          )}
        </div>

        <div>
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
      </div>
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
