const BASE_URL = "https://api.scrapecreators.com/v1";

const defaultHeaders = () => {
  const apiKey = process.env.SCRAPE_CREATORS_API_KEY;
  if (!apiKey) {
    throw new Error("Missing SCRAPE_CREATORS_API_KEY env var");
  }
  return {
    "x-api-key": apiKey,
  };
};

const buildQueryString = (params: Record<string, unknown>) =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");

const fetchJson = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, {
    headers: {
      ...defaultHeaders(),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Scrape Creators error (${res.status}): ${message}`);
  }

  return res.json() as Promise<T>;
};

export const searchTikTokByKeyword = async <T = unknown>(filters: Record<string, unknown>) => {
  const query = buildQueryString(filters);
  return fetchJson<T>(`${BASE_URL}/tiktok/search/keyword?${query}`);
};

export const searchYouTubeShorts = async <T = unknown>(filters: Record<string, unknown>) => {
  const query = buildQueryString(filters);
  return fetchJson<T>(`${BASE_URL}/youtube/search?${query}`);
};

export const searchInstagramReels = async <T = unknown>(filters: Record<string, unknown>) => {
  const query = buildQueryString(filters);
  return fetchJson<T>(`${BASE_URL}/instagram/reels/search?${query}`);
};
