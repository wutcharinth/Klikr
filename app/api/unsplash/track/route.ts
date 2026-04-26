import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return NextResponse.json({ ok: true });

  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { download_location?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const loc = body.download_location;
  if (!loc || !/^https:\/\/api\.unsplash\.com\//.test(loc)) {
    return NextResponse.json({ error: "Invalid download_location" }, { status: 400 });
  }

  await fetch(loc, {
    headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
    cache: "no-store",
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
