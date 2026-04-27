import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function publicOrigin(request: NextRequest): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredOrigin) return new URL(configuredOrigin).origin;

  // Behind Railway's proxy, request.url binds to the internal localhost:PORT.
  // Use x-forwarded-host / host header so OAuth redirects point at the public URL.
  const proto =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "") ??
    "https";
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;
  return `${proto}://${host}`;
}

function safeRedirectPath(value: string | null): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  try {
    const parsed = new URL(value, "https://klikr.invalid");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/dashboard";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));
  const origin = publicOrigin(request);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
