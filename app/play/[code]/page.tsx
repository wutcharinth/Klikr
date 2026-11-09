import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Presentation, Slide } from "@/lib/types";
import { AudienceView } from "@/components/AudienceView";
import { toAudienceSlide } from "@/lib/audienceSlides";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: presentation } = await supabase
    .from("presentations")
    .select("*")
    .eq("code", code.toUpperCase())
    .single<Presentation>();

  if (!presentation) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-2xl font-bold">No session for code {code}</h1>
        <a href="/" className="mt-4 inline-block text-brand-600 hover:underline">
          ← Try another code
        </a>
      </main>
    );
  }

  // Slides load with the service role: the public RLS read on `slides` is
  // gone (migration 0028), because it let anyone holding the anon key read
  // every quiz answer straight from the REST API. Scoped to the presentation
  // the code resolved to, and sanitized below before reaching the client.
  const { data: slides } = await createServiceClient()
    .from("slides")
    .select("*")
    .eq("presentation_id", presentation.id)
    .order("position", { ascending: true })
    .returns<Slide[]>();

  // Never ship the quiz answer key to the phone: props are serialized into the
  // HTML/RSC payload, where any player can read them. The reveal fetches the
  // correct answer from getQuizResult once the question has closed.
  return <AudienceView presentation={presentation} slides={(slides ?? []).map(toAudienceSlide)} />;
}
