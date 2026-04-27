import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { AI_ENABLED } from "@/lib/featureFlags";

export async function middleware(request: NextRequest) {
  if (!AI_ENABLED && request.nextUrl.pathname.startsWith("/api/ai/")) {
    return NextResponse.json(
      { error: "AI features are temporarily disabled." },
      { status: 503 },
    );
  }
  if (!AI_ENABLED && request.nextUrl.pathname.startsWith("/credits")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  // Belt-and-braces: if Supabase ever drops the user at the site root with an
  // OAuth `?code=` (e.g. because the redirectTo wasn't honoured), forward to
  // /auth/callback so the session gets exchanged instead of stranding them
  // on the homepage as anonymous.
  if (
    request.nextUrl.pathname === "/" &&
    request.nextUrl.searchParams.has("code")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
