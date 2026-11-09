// Server clock for client-side timer sync (lib/serverClock.ts). Must never be
// cached: a stale timestamp would skew every phone's countdown.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { now: Date.now() },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
