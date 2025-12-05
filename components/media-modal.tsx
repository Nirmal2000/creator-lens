'use client';

import { X, Volume2, VolumeX } from "lucide-react";
import type { NormalizedMediaItem } from "@/lib/media-normalizers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MediaModalProps {
  item: NormalizedMediaItem;
  isOpen: boolean;
  onClose: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export function MediaModal({ item, isOpen, onClose, isMuted, onToggleMute }: MediaModalProps) {
  if (!isOpen) return null;

  const isYoutube = item.platform === "youtube";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="relative flex h-full max-h-[80vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-background shadow-2xl animate-in zoom-in-95 duration-200 md:h-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-10 rounded-full bg-black/20 text-white hover:bg-black/40"
          onClick={onClose}
        >
          <X className="size-5" />
        </Button>

        <div className="flex h-full flex-col md:flex-row w-full">
          {/* Video Section */}
          <div className="relative flex items-center justify-center bg-black md:w-[400px] shrink-0">
             {isYoutube ? (
               <div className="h-full w-full">
                 <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${item.externalId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=1&modestbranding=1&playsinline=1&rel=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                 />
               </div>
             ) : item.playbackUrl ? (
              <>
                <video
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  controls
                  className="h-full w-full object-contain"
                  src={item.playbackUrl}
                />
                {/* Sound Toggle Overlay for Video */}
                 <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-4 right-4 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMute();
                    }}
                  >
                    {isMuted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                  </Button>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                No Video Available
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="space-y-6">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium uppercase tracking-wider",
                      item.platform === "tiktok" && "border-[#69C9D0]/30 text-[#69C9D0]",
                      item.platform === "youtube" && "border-red-400/30 text-red-400",
                      item.platform === "instagram" && "border-pink-400/30 text-pink-400",
                    )}
                  >
                    {item.platform}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.publishedAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
                
                <h2 className="text-2xl font-bold leading-tight text-foreground">{item.title}</h2>
              </div>

              <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                  {item.authorHandle?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <div className="font-semibold text-sm">@{item.authorHandle}</div>
                  <div className="text-xs text-muted-foreground">{item.authorName}</div>
                </div>
                <Button variant="outline" size="sm" className="ml-auto h-8 text-xs" asChild>
                  <a href={item.playbackUrl || "#"} target="_blank" rel="noopener noreferrer">
                    View Original
                  </a>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/30 p-4 text-center">
                <div className="space-y-1">
                  <div className="text-lg font-bold">{item.stats.views?.toLocaleString() ?? "—"}</div>
                  <div className="text-xs uppercase text-muted-foreground">Views</div>
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-bold">{item.stats.likes?.toLocaleString() ?? "—"}</div>
                  <div className="text-xs uppercase text-muted-foreground">Likes</div>
                </div>
                 <div className="space-y-1">
                  <div className="text-lg font-bold">{item.stats.comments?.toLocaleString() ?? "—"}</div>
                  <div className="text-xs uppercase text-muted-foreground">Comments</div>
                </div>
              </div>

              <div className="prose prose-sm dark:prose-invert">
                 <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Description</h3>
                 <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {item.description || "No description provided."}
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
