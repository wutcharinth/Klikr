import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { QuizPodium } from "@/components/QuizPodium";
import type { Participant, Presentation } from "@/lib/types";

// Public results page. Reachable from QuizPodium's "Share results" button
// after a session closes. Uses the service-role client so RLS on closed
// presentations doesn't hide the data — the URL itself is the share token,
// so anyone with the presentation id can see the leaderboard.

export const dynamic = "force-dynamic";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: presentation } = await supabase
    .from("presentations")
    .select("id, title, code, state, created_at")
    .eq("id", id)
    .maybeSingle<Pick<Presentation, "id" | "title" | "code" | "state" | "created_at">>();

  if (!presentation) notFound();

  const { data: participants } = await supabase
    .from("participants")
    .select("id, presentation_id, nickname, score, created_at")
    .eq("presentation_id", id)
    .order("score", { ascending: false })
    .returns<Participant[]>();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="mb-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] muted-text">Final results</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{presentation.title || "Klikr session"}</h1>
        <p className="mt-1 text-sm muted-text">{(participants ?? []).length} player{(participants ?? []).length === 1 ? "" : "s"}</p>
      </div>
      <QuizPodium participants={participants ?? []} presentationId={presentation.id} />
    </main>
  );
}
