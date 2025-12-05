'use client';

import { useState } from "react";
import type { NormalizedMediaItem } from "@/lib/media-normalizers";
import { MediaCard } from "./media-card";
import { MediaModal } from "./media-modal";

interface MediaGridProps {
  items: NormalizedMediaItem[];
  isLoading: boolean;
  platformStatus: Record<string, { status: string; error?: string }>;
}

export function MediaGrid({ items, isLoading, platformStatus }: MediaGridProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [selectedItem, setSelectedItem] = useState<NormalizedMediaItem | null>(null);
  const statusEntries = Object.entries(platformStatus ?? {});

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs">
        {statusEntries.map(([platform, meta]) => (
          <span
            key={platform}
            className="rounded-full border border-border/50 px-3 py-1 text-muted-foreground"
          >
            {platform}: {meta.status}
            {meta.error ? ` – ${meta.error}` : null}
          </span>
        ))}
        {isLoading ? <span className="text-muted-foreground">Fetching latest results…</span> : null}
      </div>

      {items.length === 0 && !isLoading ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-muted-foreground">
          Enter a keyword and apply platform filters to explore creators.
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <MediaCard
            key={`${item.platform}-${item.externalId}`}
            item={item}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            onClick={() => setSelectedItem(item)}
          />
        ))}
      </div>

      {selectedItem ? (
        <MediaModal
          item={selectedItem}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
        />
      ) : null}
    </section>
  );
}
