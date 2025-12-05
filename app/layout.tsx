import "./globals.css";
import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: "Scrape Creators",
  description: "Unified creator search grid",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <QueryProvider>
          <main className="min-h-screen bg-background text-foreground">
            <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">{children}</div>
          </main>
        </QueryProvider>
      </body>
    </html>
  );
}
