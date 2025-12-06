export type Platform = "tiktok" | "youtube" | "instagram";

export interface NormalizedMediaItem {
  platform: Platform;
  externalId: string;
  title: string;
  description: string;
  authorHandle: string;
  authorName: string;
  profileImageUrl: string;
  stats: Record<string, number>;
  durationSeconds: number;
  publishedAt?: string;
  thumbnailUrl: string;
  playbackUrl?: string;
  downloadUrl?: string;
  raw: unknown;
}

interface TikTokItem {
  aweme_info?: {
    aweme_id?: string;
    desc?: string;
    author?: {
      unique_id?: string;
      nickname?: string;
      avatar_thumb?: { url_list?: string[] };
    };
    statistics?: {
      play_count?: number;
      digg_count?: number;
      comment_count?: number;
    };
    duration?: number;
    create_time?: number;
    video?: {
      cover?: { url_list?: string[] };
      download_addr?: { url_list?: string[] };
    };
  };
}

interface YouTubeItem {
  id?: string;
  title?: string;
  description?: string;
  channel?: {
    handle?: string;
    title?: string;
    thumbnail?: string;
  };
  viewCountInt?: number;
  publishedTime?: string;
  lengthSeconds?: number;
  thumbnail?: string;
  url?: string;
}

interface InstagramReel {
  id?: string;
  shortcode?: string;
  caption?: string;
  owner?: {
    username?: string;
    full_name?: string;
    profile_pic_url?: string;
  };
  like_count?: number;
  comment_count?: number;
  video_duration?: number;
  taken_at?: string;
  thumbnail_src?: string;
  video_url?: string;
}

const coerceNumber = (value?: string | number | null) => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined;
};

export const normalizeTikTokMedia = (payload: { search_item_list?: TikTokItem[] }): NormalizedMediaItem[] => {
  return (payload.search_item_list ?? [])
    .map((item) => item.aweme_info)
    .filter(Boolean)
    .map((aweme) => ({
      platform: "tiktok" as const,
      externalId: aweme!.aweme_id ?? "",
      title: aweme!.desc ?? "",
      description: aweme!.desc ?? "",
      authorHandle: aweme!.author?.unique_id ?? "",
      authorName: aweme!.author?.nickname ?? "",
      profileImageUrl: aweme!.author?.avatar_thumb?.url_list?.[0] ?? "",
      stats: {
        views: aweme!.statistics?.play_count ?? 0,
        likes: aweme!.statistics?.digg_count ?? 0,
        comments: aweme!.statistics?.comment_count ?? 0,
      },
      durationSeconds: coerceNumber(aweme!.duration) ?? 0,
      publishedAt: aweme!.create_time ? new Date(aweme!.create_time * 1000).toISOString() : undefined,
      thumbnailUrl: aweme!.video?.cover?.url_list?.[0] ?? "",
      playbackUrl: aweme!.video?.download_addr?.url_list?.[0],
      raw: aweme,
    }));
};

export const normalizeYouTubeMedia = (payload: { videos?: YouTubeItem[]; shorts?: YouTubeItem[] }): NormalizedMediaItem[] => {
  const items = [...(payload.videos ?? []), ...(payload.shorts ?? [])];
  return items.map((video) => ({
    platform: "youtube" as const,
    externalId: video.id ?? video.url ?? "",
    title: video.title ?? "",
    description: video.description ?? "",
    authorHandle: video.channel?.handle ?? "",
    authorName: video.channel?.title ?? "",
    profileImageUrl: video.channel?.thumbnail ?? "",
    stats: {
      views: video.viewCountInt ?? 0,
    },
    durationSeconds: coerceNumber(video.lengthSeconds) ?? 0,
    publishedAt: video.publishedTime,
    thumbnailUrl: video.thumbnail ?? "",
    playbackUrl: video.url || (video.id ? `https://www.youtube.com/watch?v=${video.id}` : undefined),
    raw: video,
  }));
};

export const normalizeInstagramMedia = (payload: { reels?: InstagramReel[] }): NormalizedMediaItem[] => {
  return (payload.reels ?? []).map((reel) => ({
    platform: "instagram" as const,
    externalId: reel.shortcode ?? reel.id ?? "",
    title: reel.caption ?? "",
    description: reel.caption ?? "",
    authorHandle: reel.owner?.username ?? "",
    authorName: reel.owner?.full_name ?? "",
    profileImageUrl: reel.owner?.profile_pic_url ?? "",
    stats: {
      likes: reel.like_count ?? 0,
      comments: reel.comment_count ?? 0,
    },
    durationSeconds: coerceNumber(reel.video_duration) ?? 0,
    publishedAt: reel.taken_at,
    thumbnailUrl: reel.thumbnail_src ?? "",
    playbackUrl: reel.video_url,
    raw: reel,
  }));
};

export const combineNormalizedMedia = (
  tiktok: NormalizedMediaItem[] = [],
  youtube: NormalizedMediaItem[] = [],
  instagram: NormalizedMediaItem[] = [],
) => [...tiktok, ...youtube, ...instagram];
