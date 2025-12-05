import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <section className="glass-panel rounded-3xl p-10">
      <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Scrape Creators</p>
      <h1 className="mt-2 text-4xl font-semibold">Control Room</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Jump into the `/search` experience to issue cross-platform creator queries, or visit `/history`
        to replay cached searches sourced from Supabase. Each feature follows the dark, minimalist
        shadcn system configured in this repository.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <Button asChild className="uppercase tracking-wide">
          <Link href="/search">Go to Search</Link>
        </Button>
        <Button variant="outline" asChild className="uppercase tracking-wide">
          <Link href="/history">View History</Link>
        </Button>
      </div>
    </section>
  );
}
