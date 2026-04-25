import { createClient } from "@/lib/supabase/server";
import type { Presentation, Slide } from "@/lib/types";
import { AudienceView } from "@/components/AudienceView";

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

  const { data: slides } = await supabase
    .from("slides")
    .select("*")
    .eq("presentation_id", presentation.id)
    .order("position", { ascending: true })
    .returns<Slide[]>();

  return <AudienceView presentation={presentation} slides={slides ?? []} />;
}
