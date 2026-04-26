import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Presentation, Slide, SlideType } from "@/lib/types";
import { addSlide } from "./actions";
import { SlideEditor } from "@/components/SlideEditor";
import ThemeEditor from "@/components/ThemeEditor";
import EditorsModal, { type Editor } from "@/components/EditorsModal";
import { Sparkles } from "lucide-react";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
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

  const isOwner = presentation.owner_id === userData.user.id;
  if (!isOwner) {
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

  const { data: editorRows } = await supabase
    .from("presentation_editors")
    .select("user_id, profiles:profiles!presentation_editors_user_id_fkey(display_name)")
    .eq("presentation_id", id);
  const editors: Editor[] = (editorRows ?? []).map((r) => {
    type EditorRowProfile = { display_name: string | null } | { display_name: string | null }[] | null;
    const p = (r as unknown as { user_id: string; profiles: EditorRowProfile }).profiles;
    const profile = Array.isArray(p) ? p[0] : p;
    return {
      user_id: (r as unknown as { user_id: string }).user_id,
      display_name: profile?.display_name ?? null,
    };
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between gap-2">
        <Link href="/dashboard" className="text-xs muted-text hover:text-[var(--fg)]">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <ThemeEditor presentationId={id} initial={presentation.theme ?? null} />
          {isOwner && <EditorsModal presentationId={id} initial={editors} />}
          <Link href={`/edit/${id}/import`} className="btn-ghost text-sm">Import slides</Link>
          <Link href={`/present/${presentation.id}`} className="btn-primary">Present</Link>
        </div>
      </div>

      <div className="mt-8 flex items-end justify-between">
        <div>
          <div className="pill">Editing</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{presentation.title}</h1>
          {!isOwner && <p className="mt-1 text-xs muted-text">You're a co-editor on this deck.</p>}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.18em] muted-text">Room code</div>
          <div className="mono mt-1 text-2xl font-semibold tracking-[0.18em]">{presentation.code}</div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-[260px_1fr]">
        <aside>
          <div className="text-[10px] uppercase tracking-[0.18em] muted-text">
            Slides ({slides?.length ?? 0})
          </div>
          <ol className="mt-3 space-y-2">
            {slides?.map((s, i) => (
              <li key={s.id} className="panel-soft p-3 text-sm">
                <div className="mono text-[10px] muted-text">
                  #{String(i + 1).padStart(2, "0")} · {s.type}{s.kahoot_mode ? " · K" : ""}
                </div>
                <div className="mt-1 truncate">
                  {s.question || <span className="muted-text">(empty)</span>}
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 text-[10px] uppercase tracking-[0.18em] muted-text">Add slide</div>
          <div className="mt-2 space-y-2">
            {(["mcq", "wordcloud", "open", "qa", "quiz", "rating", "embed"] as SlideType[]).map((t) => (
              <form
                key={t}
                action={async () => {
                  "use server";
                  await addSlide(id, t);
                }}
              >
                <button className="btn-ghost w-full justify-start py-2 text-sm">
                  + {labelFor(t)}
                </button>
              </form>
            ))}
          </div>

          <div className="mt-6 panel-soft p-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--blue)" }} />
              AI shortcuts
            </div>
            <p className="mt-1 muted-text">
              Open any MCQ or Quiz slide to use <strong>Suggest options</strong>.
            </p>
          </div>
        </aside>

        <section className="space-y-5">
          {slides?.length === 0 ? (
            <div className="panel-soft p-12 text-center text-sm muted-text">
              Add a slide on the left to get started.
            </div>
          ) : (
            slides?.map((s, i) => (
              <SlideEditor key={s.id} slide={s} index={i} presentationId={id} />
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function labelFor(t: SlideType) {
  return ({
    mcq: "Multiple choice",
    wordcloud: "Word cloud",
    open: "Open-ended",
    quiz: "Quiz",
    qa: "Q&A (upvoted)",
    rating: "Rating / NPS",
    embed: "Embed PPT/Slides",
  } as Record<SlideType, string>)[t];
}
