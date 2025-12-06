'use client';

import { useState } from "react";
import { Download, CheckSquare, Square } from "lucide-react";
import type { NormalizedMediaItem } from "@/lib/media-normalizers";
import { MediaCard } from "./media-card";
import { MediaModal } from "./media-modal";
import { Button } from "@/components/ui/button";

interface MediaGridProps {
  items: NormalizedMediaItem[];
  isLoading: boolean;
  platformStatus: Record<string, { status: string; error?: string }>;
}

export function MediaGrid({ items, isLoading, platformStatus }: MediaGridProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [selectedItem, setSelectedItem] = useState<NormalizedMediaItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const statusEntries = Object.entries(platformStatus ?? {});

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.externalId)));
    }
  };

  const handleBulkDownload = async () => {
    const itemsToDownload = items.filter((item) => selectedIds.has(item.externalId));
    
    for (const item of itemsToDownload) {
      const isYoutube = item.platform === "youtube";
      const url = item.downloadUrl
        ? item.downloadUrl
        : item.playbackUrl && !isYoutube
          ? `/api/proxy-download?url=${encodeURIComponent(item.playbackUrl)}&filename=${item.platform}-${item.externalId}.mp4`
          : null;

      if (url) {
        // Create a temporary link to trigger download
        const link = document.createElement("a");
        link.href = url;
        link.download = ""; // Filename is handled by Content-Disposition header in proxy/supabase
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Small delay to prevent browser throttling
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
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

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                setSelectedIds(new Set());
              }}
            >
              {isSelectionMode ? "Cancel Selection" : "Select Items"}
            </Button>
            
            {isSelectionMode && (
              <>
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {selectedIds.size === items.length ? (
                    <><CheckSquare className="mr-2 size-4" /> Deselect All</>
                  ) : (
                    <><Square className="mr-2 size-4" /> Select All</>
                  )}
                </Button>
                <Button 
                  size="sm" 
                  disabled={selectedIds.size === 0}
                  onClick={handleBulkDownload}
                >
                  <Download className="mr-2 size-4" />
                  Download ({selectedIds.size})
                </Button>
              </>
            )}
          </div>
        )}
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
            selectable={isSelectionMode}
            isSelected={selectedIds.has(item.externalId)}
            onToggleSelect={() => toggleSelection(item.externalId)}
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
