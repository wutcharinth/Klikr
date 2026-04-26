import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Presentation, Slide } from "@/lib/types";
import { PresenterView } from "@/components/PresenterView";

export default async function PresentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: presentation } = await supabase
    .from("presentations")
    .select("*")
    .eq("id", id)
    .single<Presentation>();
  if (!presentation) notFound();
  if (presentation.owner_id !== userData.user.id) {
    const { data: editorRow } = await supabase
      .from("presentation_editors")
      .select("user_id")
      .eq("presentation_id", id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!editorRow) notFound();
  }

  const { data: slides } = await supabase
    .from("slides")
    .select("*")
    .eq("presentation_id", id)
    .order("position", { ascending: true })
    .returns<Slide[]>();

  return (
    <main className="flex min-h-screen flex-col px-6 py-4 lg:px-10 lg:py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/edit/${presentation.id}`} className="text-xs muted-text hover:text-[var(--fg)]">
          ← Edit
        </Link>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.18em] muted-text">Code</div>
          <div className="mono text-2xl font-semibold tracking-[0.18em]">{presentation.code}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <PresenterView presentation={presentation} slides={slides ?? []} />
      </div>
    </main>
  );
}
