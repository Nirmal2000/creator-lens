'use client';

import type { HistorySummary } from "../page";

interface HistoryListProps {
  items: HistorySummary[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}

export function HistoryList({ items, selectedId, onSelect }: HistoryListProps) {
  if (!items.length) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-muted-foreground">
        No stored searches yet. Run a search and check back.
      </div>
    );
  }

  return (
    <ul className="glass-panel divide-y divide-border/40 rounded-3xl">
      {items.map((item) => (
        <li key={item.id}>
          <button
            className={`flex w-full flex-col gap-1 px-6 py-4 text-left transition hover:bg-border/10 ${selectedId === item.id ? "bg-border/20" : ""}`}
            onClick={() => onSelect(item.id)}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{item.keyword}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(item.requested_at).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {Object.entries(item.result_counts ?? {})
                .map(([platform, count]) => `${platform}: ${count}`)
                .join(" · ") || "No media"}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
