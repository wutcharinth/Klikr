import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Presentation, Slide } from "@/lib/types";
import { PresenterView } from "@/components/PresenterView";
import { QrCode } from "@/components/QrCode";
import { headers } from "next/headers";

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
      <div className="mb-3 flex items-start justify-between gap-4">
        <Link href={`/edit/${presentation.id}`} className="mt-2 text-xs muted-text hover:text-[var(--fg)]">
          ← Edit
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <div className="text-[10px] uppercase tracking-[0.18em] muted-text">Join at</div>
            <div className="mono text-sm">{displayJoinUrl}</div>
            <div className="mono text-2xl font-semibold tracking-[0.22em]">{presentation.code}</div>
          </div>
          <QrCode value={joinUrl} size={88} />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <PresenterView presentation={presentation} slides={slides ?? []} />
      </div>
    </main>
  );
}
