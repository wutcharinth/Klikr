import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const APP_NAME = "klikr";

export async function GET(req: Request) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return NextResponse.json({ error: "Unsplash not configured" }, { status: 503 });

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("q") ?? "").trim();
  if (!query || query.length > 80) {
    return NextResponse.json({ error: "Query required (≤ 80 chars)" }, { status: 400 });
  }
  const page = Math.max(1, Math.min(10, Number(searchParams.get("page") ?? 1)));

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", "24");
  url.searchParams.set("content_filter", "high");

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: `Unsplash ${res.status}` }, { status: 502 });
  }
  const data = (await res.json()) as {
    results: Array<{
      id: string;
      alt_description: string | null;
      urls: { thumb: string; small: string; regular: string };
      links: { download_location: string };
      user: { name: string; username: string; links: { html: string } };
    }>;
    total_pages: number;
  };

  const photos = data.results.map((p) => ({
    id: p.id,
    alt: p.alt_description ?? "",
    thumb: p.urls.thumb,
    regular: p.urls.regular,
    download_location: p.links.download_location,
    photographer: p.user.name,
    photographer_url: `${p.user.links.html}?utm_source=${APP_NAME}&utm_medium=referral`,
  }));

  return NextResponse.json({ photos, total_pages: data.total_pages });
}
