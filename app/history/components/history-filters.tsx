'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface HistoryFiltersProps {
  values: {
    keyword: string;
    platform: string;
    from: string;
    to: string;
  };
  onChange: (values: HistoryFiltersProps["values"]) => void;
  onSubmit: () => void;
}

export function HistoryFilters({ values, onChange, onSubmit }: HistoryFiltersProps) {
  const setValue = (key: keyof HistoryFiltersProps["values"], value: string) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <form
      className="glass-panel flex flex-col gap-4 rounded-3xl p-6 md:flex-row md:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex-1 space-y-2">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Keyword</label>
        <Input
          placeholder="e.g. running"
          value={values.keyword}
          onChange={(event) => setValue("keyword", event.target.value)}
        />
      </div>

      <div className="flex-1 space-y-2">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Platform</label>
        <Select
          value={values.platform || "all"}
          onValueChange={(value) => setValue("platform", value === "all" ? "" : value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">From</label>
        <Input
          type="date"
          value={values.from}
          onChange={(event) => setValue("from", event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">To</label>
        <Input
          type="date"
          value={values.to}
          onChange={(event) => setValue("to", event.target.value)}
        />
      </div>

      <Button type="submit" className="uppercase tracking-wide">
        Filter
      </Button>
    </form>
  );
}
