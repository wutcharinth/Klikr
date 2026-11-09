import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/user";
import type { Presentation, Slide } from "@/lib/types";
import { PresenterView } from "@/components/PresenterView";
import { headers } from "next/headers";

export default async function PresentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ data: presentation }, { data: slides }, { data: editorRow }] = await Promise.all([
    supabase.from("presentations").select("*").eq("id", id).single<Presentation>(),
    supabase
      .from("slides")
      .select("*")
      .eq("presentation_id", id)
      .order("position", { ascending: true })
      .returns<Slide[]>(),
    supabase
      .from("presentation_editors")
      .select("user_id")
      .eq("presentation_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  if (!presentation) notFound();
  if (presentation.owner_id !== user.id && !editorRow) notFound();

  const h = await headers();
  const rawHost = h.get("x-forwarded-host") ?? h.get("host") ?? "klikr.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  // Prefer the canonical custom domain when we're on Railway's preview URL,
  // so audience sees "klikrapp.com/play/CODE" instead of the railway subdomain.
  const isRailwayPreview = /\.up\.railway\.app$/.test(rawHost);
  const displayHost = (isRailwayPreview ? "www.klikrapp.com" : rawHost).replace(/^www\./, "");
  const joinUrl = `${proto}://${rawHost}/play/${presentation.code}`;
  const displayJoinUrl = `${displayHost}/play/${presentation.code}`;

  return (
    <main className="flex h-screen flex-col overflow-hidden px-4 py-3 lg:px-8 lg:py-4">
      <div className="mb-3">
        <Link href={`/edit/${presentation.id}`} className="text-xs muted-text hover:text-[var(--fg)]">
          ← Edit
        </Link>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <PresenterView
          presentation={presentation}
          slides={slides ?? []}
          joinUrl={joinUrl}
          displayJoinUrl={displayJoinUrl}
        />
      </div>
    </main>
  );
}
