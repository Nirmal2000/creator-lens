import { z } from "zod";

const TikTokFilterSchema = z.object({
  date_posted: z
    .enum(["yesterday", "this-week", "this-month", "last-3-months", "last-6-months", "all-time"])
    .optional(),
  sort_by: z.enum(["relevance", "most-liked", "date-posted"]).optional(),
  region: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .optional(),
  cursor: z.union([z.string(), z.number()]).optional(),
  trim: z.boolean().optional(),
});

const YouTubeFilterSchema = z
  .object({
    uploadDate: z.enum(["last_hour", "today", "this_week", "this_month", "this_year"]).optional(),
    sortBy: z.enum(["relevance", "upload_date"]).optional(),
    filter: z.literal("shorts").optional(),
    includeExtras: z.boolean().optional(),
    continuationToken: z.string().optional(),
  })
  .refine(
    (val) => !(val.filter && (val.uploadDate || val.sortBy)),
    "YouTube filter cannot be combined with uploadDate or sortBy",
  );

const InstagramFilterSchema = z.object({
  amount: z.number().int().min(1).max(60).optional(),
});

const PlatformsSchema = z
  .object({
    tiktok: z.boolean().optional(),
    youtube: z.boolean().optional(),
    instagram: z.boolean().optional(),
  })
  .default({ tiktok: true, youtube: false, instagram: false });

export const SearchRequestSchema = z.object({
  keyword: z.string().trim().min(1, "Keyword is required"),
  tiktok: TikTokFilterSchema.optional(),
  youtube: YouTubeFilterSchema.optional(),
  instagram: InstagramFilterSchema.optional(),
  platforms: PlatformsSchema.optional(),
});

export type SearchRequestInput = z.infer<typeof SearchRequestSchema>;
