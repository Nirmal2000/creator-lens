'use client';

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { NormalizedMediaItem } from "@/lib/media-normalizers";
import type { PlatformState } from "@/lib/search-storage";

export type PlatformSelection = {
  tiktok: boolean;
  youtube: boolean;
  instagram: boolean;
};

interface LoadMoreParams {
  searchId: string;
  platforms: PlatformSelection;
}

interface UseMoreVideosOptions {
  onAppend: (media: NormalizedMediaItem[], status: Record<string, PlatformState>) => void;
}

export function useMoreVideos({ onAppend }: UseMoreVideosOptions) {
  const [platformStatus, setPlatformStatus] = useState<Record<string, PlatformState>>({});

  const mutation = useMutation({
    mutationFn: async ({ searchId, platforms }: LoadMoreParams) => {
      const response = await fetch(`/api/search/${searchId}/more`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platforms }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message ?? "Failed to load more videos");
      }

      return response.json();
    },
    onSuccess: (payload) => {
      setPlatformStatus(payload.platformStatus ?? {});
      onAppend(payload.media ?? [], payload.platformStatus ?? {});
    },
  });

  return {
    loadMore: (params: LoadMoreParams) => mutation.mutate(params),
    platformStatus,
    isLoading: mutation.isPending,
    error: mutation.error as Error | null,
  };
}
