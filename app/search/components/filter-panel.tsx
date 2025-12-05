'use client';

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SearchRequestInput } from "@/lib/validators/search-filters";

const tiktokDateOptions = [
  { label: "Yesterday", value: "yesterday" },
  { label: "This week", value: "this-week" },
  { label: "This month", value: "this-month" },
  { label: "Last 3 months", value: "last-3-months" },
  { label: "Last 6 months", value: "last-6-months" },
  { label: "All time", value: "all-time" },
];

const tiktokSortOptions = [
  { label: "Relevance", value: "relevance" },
  { label: "Most liked", value: "most-liked" },
  { label: "Date posted", value: "date-posted" },
];

const instagramAmountOptions = [10, 20, 30, 40, 50, 60];

type Platform = "tiktok" | "youtube" | "instagram";

interface FilterPanelProps {
  filters: Pick<SearchRequestInput, "tiktok" | "youtube" | "instagram">;
  onFiltersChange: (
    platform: Platform,
    values: Record<string, string | number | boolean | undefined>,
  ) => void;
}

const handleSelectChange = (
  value: string,
  platform: Platform,
  key: string,
  onChange: FilterPanelProps["onFiltersChange"],
) => {
  onChange(platform, { [key]: value === "any" ? undefined : value });
};

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  return (
    <section className="glass-panel rounded-3xl p-6">
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1 space-y-4">
          <h3 className="text-lg font-semibold text-primary">TikTok Filters</h3>
          <label className="flex flex-col gap-2 text-sm">
            Date posted
            <Select
              value={filters.tiktok?.date_posted ?? "any"}
              onValueChange={(value) =>
                handleSelectChange(value, "tiktok", "date_posted", onFiltersChange)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {tiktokDateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            Sort by
            <Select
              value={filters.tiktok?.sort_by ?? "any"}
              onValueChange={(value) =>
                handleSelectChange(value, "tiktok", "sort_by", onFiltersChange)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Default</SelectItem>
                {tiktokSortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            Region (proxy location)
            <Input
              className="uppercase"
              maxLength={2}
              placeholder="US"
              value={filters.tiktok?.region ?? ""}
              onChange={(event) =>
                onFiltersChange("tiktok", {
                  region: event.currentTarget.value.toUpperCase() || undefined,
                })
              }
            />
          </label>
        </div>

        <div className="flex-1 space-y-4">
          <h3 className="text-lg font-semibold text-primary">YouTube Shorts</h3>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={filters.youtube?.includeExtras ?? true}
              onChange={(event) =>
                onFiltersChange("youtube", { includeExtras: event.currentTarget.checked })
              }
            />
            Include likes/comments (slower response)
          </label>
          <p className="text-xs text-muted-foreground">
            Shorts mode requires `filter=shorts`, so YouTube upload-date and sort parameters are
            disabled to avoid API errors.
          </p>
        </div>

        <div className="flex-1 space-y-4">
          <h3 className="text-lg font-semibold text-primary">Instagram Reels Filters</h3>
          <label className="flex flex-col gap-2 text-sm">
            Amount (max 60)
            <Select
              value={String(filters.instagram?.amount ?? 10)}
              onValueChange={(value) =>
                onFiltersChange("instagram", { amount: Number(value) })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                {instagramAmountOptions.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value} reels
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <p className="text-xs text-muted-foreground">
            1 credit for every 10 reels. Max 60.
          </p>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Large requests (20) take longer because each reel must be scraped individually per the API
            docs. Keep values modest while iterating.
          </p>
        </div>
      </div>
    </section>
  );
}
