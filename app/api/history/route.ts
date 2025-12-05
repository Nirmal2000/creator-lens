import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/server-supabase";

const parseDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword");
    const platform = searchParams.get("platform");
    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("search_queries")
      .select("id, keyword, filters, requested_at, platform_status, result_counts", { count: "exact" })
      .order("requested_at", { ascending: false })
      .limit(25);

    if (keyword) {
      query = query.ilike("keyword", `%${keyword}%`);
    }

    if (from) {
      query = query.gte("requested_at", from);
    }

    if (to) {
      query = query.lte("requested_at", to);
    }

    if (platform && ["tiktok", "youtube", "instagram"].includes(platform)) {
      query = query.not(`result_counts->>${platform}`, "is", null);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    console.error("/api/history error", error);
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
