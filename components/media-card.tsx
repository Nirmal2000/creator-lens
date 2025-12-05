'use client';

import { useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { NormalizedMediaItem } from "@/lib/media-normalizers";
import { cn } from "@/lib/utils";

interface MediaCardProps {
  item: NormalizedMediaItem;
  isMuted: boolean;
  onToggleMute: () => void;
  onClick: () => void;
}

export function MediaCard({ item, isMuted, onToggleMute, onClick }: MediaCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleEnter = () => {
    setIsHovered(true);
    const video = videoRef.current;
    if (video) void video.play();
  };

  const handleLeave = () => {
    setIsHovered(false);
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  };

  const isYoutube = item.platform === "youtube";

  return (
    <article
      className="group relative cursor-pointer rounded-2xl border border-border/60 bg-card/70 p-3 shadow-xl transition hover:border-primary/60"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={onClick}
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-muted">
        {/* Thumbnail (Always visible initially, hidden on hover if video/iframe plays) */}
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className={cn(
              "absolute inset-0 h-full w-full object-cover opacity-100 transition-opacity duration-300",
               // For YouTube, hide thumbnail when hovered to show iframe
               // For others, the video tag sits on top with opacity transition
               isYoutube && isHovered ? "opacity-0" : "group-hover:opacity-0"
            )}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No thumbnail
          </div>
        )}

        {/* YouTube Player */}
        {isYoutube ? (
          isHovered ? (
            <div className="absolute inset-0 bg-black">
               <iframe
                className="h-full w-full pointer-events-none"
                src={`https://www.youtube.com/embed/${item.externalId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&modestbranding=1&playsinline=1&rel=0&loop=1&playlist=${item.externalId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null
        ) : (
          /* Standard Video Player (TikTok, Instagram) */
          item.playbackUrl ? (
            <>
              <video
                ref={videoRef}
                muted={isMuted}
                playsInline
                preload="metadata"
                poster={item.thumbnailUrl}
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition group-hover:opacity-100"
                src={item.playbackUrl}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute();
                }}
                className="absolute right-2 top-2 z-10 rounded-full bg-black/40 p-2 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/60 group-hover:opacity-100"
              >
                {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
            </>
          ) : null
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <span
            className={cn(
              "rounded-full border border-border/60 px-2 py-0.5",
              item.platform === "tiktok" && "text-[#69C9D0]",
              item.platform === "youtube" && "text-red-400",
              item.platform === "instagram" && "text-pink-400",
            )}
          >
            {item.platform}
          </span>
          {item.durationSeconds ? <span>{Math.round(item.durationSeconds)}s</span> : null}
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</h3>
        <p className="text-xs text-muted-foreground">{item.description?.slice(0, 120)}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>@{item.authorHandle || item.authorName}</span>
          <span>❤️ {item.stats.likes ?? item.stats.views ?? 0}</span>
          <span>💬 {item.stats.comments ?? 0}</span>
        </div>
      </div>
    </article>
  );
}
