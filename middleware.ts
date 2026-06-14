import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { AI_ENABLED } from "@/lib/featureFlags";

// Routes that don't need a Supabase session refresh on every navigation.
// `updateSession` calls auth.getUser() which round-trips to Supabase Auth
// (~200ms when the project is in Tokyo); skipping it here is the biggest
// perceived speedup for anonymous visitors and for the audience flow.
function isPublicPath(path: string): boolean {
  if (
    path === "/" ||
    path === "/about" ||
    path === "/demo" ||
    path === "/features" ||
    path === "/feedback" ||
    path === "/llms.txt" ||
    path === "/login" ||
    path === "/plans" ||
    path === "/track-view"
  ) return true;
  if (
    path.startsWith("/play/") ||
    path.startsWith("/results/") ||
    path.startsWith("/templates") ||
    path.startsWith("/docs")
  ) return true;
  if (
    path.startsWith("/api/track-view") ||
    path.startsWith("/api/openapi.json") ||
    path.startsWith("/api/mcp") ||
    path.startsWith("/api/unsplash")
  ) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (!AI_ENABLED && path.startsWith("/api/ai/")) {
    return NextResponse.json(
      { error: "AI features are temporarily disabled." },
      { status: 503 },
    );
  }
  if (!AI_ENABLED && path.startsWith("/credits")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  // Belt-and-braces: if Supabase ever drops the user at the site root with an
  // OAuth `?code=` (e.g. because the redirectTo wasn't honoured), forward to
  // /auth/callback so the session gets exchanged instead of stranding them
  // on the homepage as anonymous. This check must run BEFORE the public-path
  // bail-out so the redirect still happens on `/`.
  if (path === "/" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  if (isPublicPath(path)) {
    return NextResponse.next({ request });
  }

  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
