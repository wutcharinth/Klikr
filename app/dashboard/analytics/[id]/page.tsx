import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Slide, MCQConfig, QuizConfig, RatingConfig } from "@/lib/types";
import { ArrowLeft, Download, FileText } from "lucide-react";
import AIThemeSummary from "@/components/AIThemeSummary";
import NavBar from "@/components/NavBar";

type Params = Promise<{ id: string }>;

export default async function AnalyticsPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");

  const { data: pres } = await supabase.from("presentations").select("*").eq("id", id).maybeSingle();
  if (!pres || pres.owner_id !== u.user.id) notFound();

  const [{ data: slides }, { data: participants }, { data: responses }] = await Promise.all([
    supabase.from("slides").select("*").eq("presentation_id", id).order("position"),
    supabase.from("participants").select("*").eq("presentation_id", id),
    supabase
      .from("responses")
      .select("*, slides!inner(presentation_id)")
      .eq("slides.presentation_id", id),
  ]);

  const allSlides = (slides ?? []) as Slide[];
  const allParticipants = participants ?? [];
  const allResponses = (responses ?? []) as { id: string; slide_id: string; participant_id: string; value_text: string | null; value_index: number | null; response_ms: number | null }[];

  const totalParticipants = allParticipants.length;
  const totalResponses = allResponses.length;
  const avgResponseMs = avg(allResponses.map((r) => r.response_ms).filter((n): n is number => typeof n === "number"));
  const completion = totalParticipants && allSlides.length
    ? Math.round((totalResponses / (totalParticipants * allSlides.length)) * 100)
    : 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <NavBar active="dashboard" />

      <Link href="/dashboard" className="muted-text mt-6 inline-flex items-center gap-1 text-sm hover:text-[var(--ink)]">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider muted-text">Analytics</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{pres.title}</h1>
          <p className="mt-1 text-xs muted-text">Code <span className="mono">{pres.code}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/api/export/${id}?format=xlsx`} className="btn-ghost text-sm"><Download className="h-3.5 w-3.5" /> Excel</a>
          <a href={`/api/export/${id}?format=pdf`} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm"><FileText className="h-3.5 w-3.5" /> PDF</a>
        </div>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-4">
        <Stat label="Participants" value={totalParticipants.toLocaleString()} />
        <Stat label="Responses" value={totalResponses.toLocaleString()} />
        <Stat label="Completion" value={`${completion}%`} />
        <Stat label="Avg response" value={avgResponseMs ? `${(avgResponseMs / 1000).toFixed(1)}s` : "—"} />
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Per-slide</h2>
        {allSlides.map((s, i) => (
          <SlideAnalytics
            key={s.id}
            slide={s}
            position={i}
            responses={allResponses.filter((r) => r.slide_id === s.id)}
            participantCount={totalParticipants}
          />
        ))}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-soft p-4">
      <p className="text-[11px] uppercase tracking-wider muted-text">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function SlideAnalytics({
  slide,
  position,
  responses,
  participantCount,
}: {
  slide: Slide;
  position: number;
  responses: { id: string; participant_id: string; value_text: string | null; value_index: number | null; response_ms: number | null }[];
  participantCount: number;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider muted-text">
        <span>{position + 1}. {slide.type}</span>
        <span>{responses.length} / {participantCount} answered</span>
      </div>
      <p className="mt-2 text-lg font-medium">{slide.question || <span className="muted-text">(empty)</span>}</p>

      {(slide.type === "mcq" || slide.type === "quiz") && (
        <MCQBars slide={slide} responses={responses} />
      )}
      {slide.type === "rating" && <RatingStats slide={slide} responses={responses} />}
      {slide.type === "wordcloud" && (
        <p className="mt-3 text-sm muted-text">{responses.length} words submitted.</p>
      )}
      {(slide.type === "open" || slide.type === "qa") && (
        <AIThemeSummary slideId={slide.id} sample={responses.map((r) => r.value_text ?? "").filter(Boolean).slice(0, 5)} />
      )}
    </div>
  );
}

function MCQBars({ slide, responses }: { slide: Slide; responses: { value_index: number | null }[] }) {
  const cfg = slide.config as MCQConfig | QuizConfig;
  const opts = cfg.options ?? [];
  const counts = opts.map((_, i) => responses.filter((r) => r.value_index === i).length);
  const max = Math.max(1, ...counts);
  const correct = (slide.config as QuizConfig).correct_index;
  return (
    <div className="mt-3 space-y-1.5">
      {opts.map((opt, i) => {
        const pct = (counts[i] / max) * 100;
        const isCorrect = slide.type === "quiz" && correct === i;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-32 truncate text-sm">{opt}</span>
            <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: "var(--pale)" }}>
              <div className="h-full" style={{ width: `${pct}%`, background: isCorrect ? "#26890C" : "var(--blue)" }} />
            </div>
            <span className="mono text-xs muted-text w-10 text-right">{counts[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function RatingStats({ slide, responses }: { slide: Slide; responses: { value_index: number | null }[] }) {
  const cfg = slide.config as RatingConfig;
  const vals = responses.map((r) => r.value_index).filter((n): n is number => typeof n === "number");
  const a = avg(vals);
  return (
    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
      <Pill label="Average" value={a ? a.toFixed(1) : "—"} />
      <Pill label="Lowest" value={vals.length ? Math.min(...vals).toString() : "—"} />
      <Pill label="Highest" value={vals.length ? Math.max(...vals).toString() : "—"} />
      {cfg.scale === 10 && <NPSPill values={vals} />}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-soft p-3">
      <p className="text-[10px] uppercase tracking-wider muted-text">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function NPSPill({ values }: { values: number[] }) {
  if (values.length === 0) return <Pill label="NPS" value="—" />;
  const promoters = values.filter((v) => v >= 9).length;
  const detractors = values.filter((v) => v <= 6).length;
  const nps = Math.round(((promoters - detractors) / values.length) * 100);
  return <Pill label="NPS" value={`${nps > 0 ? "+" : ""}${nps}`} />;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
