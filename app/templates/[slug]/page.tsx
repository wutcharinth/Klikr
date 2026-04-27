import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Template, TemplateSlide } from "@/lib/types";
import { applyTemplate } from "../actions";
import { ArrowLeft } from "lucide-react";
import NavBar from "@/components/NavBar";
import ApplyTemplateForm from "@/components/ApplyTemplateForm";

export const metadata = { title: "Template — Klikr" };

type Params = Promise<{ slug: string }>;

export default async function TemplateDetail({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: tpl } = await supabase
    .from("templates")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!tpl) notFound();

  const { data: slides } = await supabase
    .from("template_slides")
    .select("*")
    .eq("template_id", tpl.id)
    .order("position");

  const { data: related } = await supabase
    .from("templates")
    .select("slug, title, category, description, usage_count")
    .eq("category", tpl.category)
    .neq("id", tpl.id)
    .limit(3);

  const apply = applyTemplate.bind(null, slug);
  const poolSize = (slides ?? []).length;
  const defaultCount = (tpl as Template).default_count ?? poolSize;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <NavBar active="templates" />

      <Link href="/templates" className="muted-text mt-6 inline-flex items-center gap-1 text-sm hover:text-[var(--ink)]">
        <ArrowLeft className="h-3.5 w-3.5" /> All templates
      </Link>

      <div className="mt-4 flex flex-wrap items-start gap-8">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider muted-text">{tpl.category}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{tpl.title}</h1>
          <p className="mt-2 max-w-2xl text-[15px] muted-text">{tpl.description}</p>
        </div>
        <div className="w-full sm:w-72 shrink-0">
          <ApplyTemplateForm action={apply} poolSize={poolSize} defaultCount={defaultCount} />
        </div>
      </div>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider muted-text">
          {poolSize > defaultCount
            ? `${poolSize} questions in pool · ${defaultCount} used by default`
            : `${poolSize} slide${poolSize === 1 ? "" : "s"}`}
        </h2>
        {(slides ?? []).map((s) => (
          <SlidePreview key={s.id} slide={s as TemplateSlide} />
        ))}
      </section>

      {related && related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">Similar templates</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.slug} href={`/templates/${r.slug}`} className="panel p-4 hover:border-[var(--blue)]">
                <p className="font-medium">{r.title}</p>
                <p className="mt-1 line-clamp-2 text-xs muted-text">{r.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function SlidePreview({ slide }: { slide: TemplateSlide }) {
  return (
    <div className="panel-soft p-5">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider muted-text">
        <span>{labelForType(slide.type)}</span>
        {slide.kahoot_mode && <span style={{ color: "var(--blue)" }}>Kahoot mode</span>}
      </div>
      <p className="mt-2 text-lg font-medium">{slide.question || "Untitled"}</p>
      <SlideBody slide={slide} />
    </div>
  );
}

function SlideBody({ slide }: { slide: TemplateSlide }) {
  if (slide.type === "mcq" || slide.type === "quiz") {
    const opts = ((slide.config as { options?: string[] }).options ?? []);
    const correct = (slide.config as { correct_index?: number }).correct_index;
    return (
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {opts.map((o, i) => (
          <li
            key={i}
            className="rounded-lg px-3 py-2 text-sm"
            style={{
              background: "var(--white)",
              border: "1px solid var(--line)",
              ...(slide.type === "quiz" && correct === i ? { borderColor: "var(--blue)", color: "var(--blue)" } : {}),
            }}
          >
            {o}
          </li>
        ))}
      </ul>
    );
  }
  if (slide.type === "rating") {
    const cfg = slide.config as { scale: 5 | 10; min_label?: string; max_label?: string };
    return (
      <div className="mt-3 flex items-center justify-between text-xs muted-text">
        <span>{cfg.min_label ?? (cfg.scale === 5 ? "1" : "0")}</span>
        <span className="mono">{cfg.scale === 5 ? "1 → 5" : "0 → 10"}</span>
        <span>{cfg.max_label ?? cfg.scale}</span>
      </div>
    );
  }
  if (slide.type === "wordcloud") {
    return <p className="mt-3 text-xs muted-text">Audience submits short words; the cloud grows live.</p>;
  }
  if (slide.type === "open") {
    return <p className="mt-3 text-xs muted-text">Open-ended responses streamed live.</p>;
  }
  if (slide.type === "qa") {
    return <p className="mt-3 text-xs muted-text">Audience submits questions and upvotes the best ones.</p>;
  }
  return null;
}

function labelForType(t: string): string {
  switch (t) {
    case "mcq": return "Multiple choice";
    case "quiz": return "Quiz";
    case "wordcloud": return "Word cloud";
    case "open": return "Open-ended";
    case "qa": return "Q&A";
    case "rating": return "Rating";
    case "embed": return "Embedded slide";
    default: return t;
  }
}
