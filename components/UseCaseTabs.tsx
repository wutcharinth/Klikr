"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, GraduationCap, Lightbulb, CheckSquare, Image as ImageIcon, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

type Audience = "business" | "education";

type UseCase = {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  body: string;
  /** Link target for the per-card CTA. */
  href: string;
  /** Background gradient for the right-hand stage. */
  bg: string;
  /** Headline shown on the right-hand stage. */
  stageTitle: string;
  /** Three rows shown as bars on the stage to evoke a real screen. */
  stageRows: { label: string; value: number; color: string }[];
};

const business: UseCase[] = [
  {
    Icon: MessageCircle,
    title: "Get live feedback",
    body: "Invite live, anonymous feedback to know how your meeting, workshop, or training really landed.",
    href: "/templates?category=Surveys",
    bg: "linear-gradient(135deg,#fff7ed,#fde68a 60%)",
    stageTitle: "Please rate the following:",
    stageRows: [
      { label: "Meeting content was relevant", value: 7.4, color: "#7c3aed" },
      { label: "We aligned on next steps", value: 6.8, color: "#f97316" },
      { label: "My questions were addressed", value: 7.0, color: "#2563eb" },
    ],
  },
  {
    Icon: CheckSquare,
    title: "Make decisions",
    body: "Let the room weigh in. Run a quick poll and move forward with confidence — together.",
    href: "/templates?category=Business",
    bg: "linear-gradient(135deg,#eff6ff,#dbeafe 60%)",
    stageTitle: "Which option should we ship first?",
    stageRows: [
      { label: "Option A", value: 6.0, color: "#2563eb" },
      { label: "Option B", value: 9.2, color: "#16a34a" },
      { label: "Option C", value: 3.4, color: "#94a3b8" },
    ],
  },
  {
    Icon: Lightbulb,
    title: "Generate ideas",
    body: "Brainstorm with everyone in the room. Word clouds and open responses surface the best thinking.",
    href: "/templates?category=Brainstorming",
    bg: "linear-gradient(135deg,#fdf4ff,#fae8ff 60%)",
    stageTitle: "What should we focus on next quarter?",
    stageRows: [
      { label: "Onboarding", value: 8.8, color: "#a21caf" },
      { label: "Reliability", value: 6.5, color: "#7c3aed" },
      { label: "Pricing", value: 5.1, color: "#db2777" },
    ],
  },
  {
    Icon: ImageIcon,
    title: "Make it memorable",
    body: "Engagement that sticks. Quizzes, leaderboards, and a final podium make every session feel like an event.",
    href: "/templates?category=Classroom",
    bg: "linear-gradient(135deg,#ecfeff,#a5f3fc 60%)",
    stageTitle: "Top 3 — final scores",
    stageRows: [
      { label: "🥇 Bob", value: 9.4, color: "#f59e0b" },
      { label: "🥈 Frank", value: 8.6, color: "#94a3b8" },
      { label: "🥉 Dave", value: 7.7, color: "#d97706" },
    ],
  },
];

const education: UseCase[] = [
  {
    Icon: GraduationCap,
    title: "Check understanding",
    body: "Run a quick comprehension check at the end of class. Spot what stuck and what needs another pass.",
    href: "/templates?category=Classroom",
    bg: "linear-gradient(135deg,#ecfdf5,#bbf7d0 60%)",
    stageTitle: "How confident are you with the topic?",
    stageRows: [
      { label: "Confident", value: 8.4, color: "#16a34a" },
      { label: "Getting there", value: 6.7, color: "#65a30d" },
      { label: "Lost", value: 2.3, color: "#94a3b8" },
    ],
  },
  {
    Icon: Lightbulb,
    title: "Spark discussion",
    body: "Ask an open question, watch ideas land, and pull the most interesting ones into the discussion.",
    href: "/templates?category=Classroom",
    bg: "linear-gradient(135deg,#fdf4ff,#fae8ff 60%)",
    stageTitle: "One word for today's lesson",
    stageRows: [
      { label: "Eye-opening", value: 9.0, color: "#a855f7" },
      { label: "Tricky", value: 6.4, color: "#9333ea" },
      { label: "Fun", value: 7.2, color: "#c026d3" },
    ],
  },
  {
    Icon: CheckSquare,
    title: "Run a fair quiz",
    body: "Timed questions with a real podium. Faster correct answers earn more points.",
    href: "/templates?category=Classroom",
    bg: "linear-gradient(135deg,#fef2f2,#fecaca 60%)",
    stageTitle: "Final scores",
    stageRows: [
      { label: "🥇 Lia", value: 9.6, color: "#f59e0b" },
      { label: "🥈 Theo", value: 8.1, color: "#94a3b8" },
      { label: "🥉 Ava", value: 7.4, color: "#d97706" },
    ],
  },
  {
    Icon: MessageCircle,
    title: "Hear every voice",
    body: "Anonymous Q&A means the quietest students get heard. Upvotes float the best questions to the top.",
    href: "/templates?category=Classroom",
    bg: "linear-gradient(135deg,#eff6ff,#dbeafe 60%)",
    stageTitle: "Questions for the teacher",
    stageRows: [
      { label: "Will this be on the test?", value: 9.5, color: "#2563eb" },
      { label: "Is there a study guide?", value: 7.1, color: "#1d4ed8" },
      { label: "Can we have an example?", value: 5.8, color: "#3b82f6" },
    ],
  },
];

export default function UseCaseTabs() {
  const [audience, setAudience] = useState<Audience>("business");
  const list = audience === "business" ? business : education;
  const [activeIdx, setActiveIdx] = useState(0);
  const active = list[activeIdx];

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="flex justify-center">
        <div className="inline-flex rounded-full p-1" style={{ background: "var(--ink)" }}>
          {(["business", "education"] as Audience[]).map((a) => (
            <button
              key={a}
              onClick={() => {
                setAudience(a);
                setActiveIdx(0);
              }}
              className="rounded-full px-5 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: audience === a ? "var(--white)" : "transparent",
                color: audience === a ? "var(--ink)" : "rgba(255,255,255,0.7)",
              }}
            >
              {a === "business" ? "Business" : "Education"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-14">
        <div>
          <ul className="divide-y" style={{ borderColor: "var(--line)" }}>
            {list.map((u, i) => {
              const isActive = i === activeIdx;
              return (
                <li key={u.title}>
                  <button
                    onClick={() => setActiveIdx(i)}
                    className="flex w-full items-start gap-4 py-5 text-left transition-colors"
                    style={{
                      borderRadius: 16,
                      padding: isActive ? "20px" : "20px 0",
                      border: isActive ? "1.5px solid var(--blue)" : "1.5px solid transparent",
                      background: isActive ? "rgba(0,113,227,0.04)" : "transparent",
                    }}
                  >
                    <u.Icon
                      className="h-7 w-7 flex-none"
                      style={{ color: isActive ? "var(--blue)" : "var(--ink)" }}
                    />
                    <div>
                      <p
                        className="text-xl font-semibold tracking-tight"
                        style={{ color: isActive ? "var(--blue)" : "var(--ink)" }}
                      >
                        {u.title}
                      </p>
                      {isActive && (
                        <p className="mt-2 text-[15px] muted-text">{u.body}</p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-6">
            <Link href={active.href} className="btn-dark inline-flex">
              See templates <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <Stage useCase={active} />
      </div>
    </section>
  );
}

function Stage({ useCase }: { useCase: UseCase }) {
  const animated = useAnimatedRows(useCase);
  const respondents = useAnimatedNumber(28, useCase.stageTitle, 1500);
  const answered = Math.min(respondents, Math.round(respondents * 0.82));

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-6 sm:p-10 transition-[background] duration-700"
      style={{ background: useCase.bg, minHeight: 480 }}
    >
      <FloatingDots />
      <div
        key={useCase.stageTitle}
        className="anim-fade-up mx-auto h-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
        style={{ border: "8px solid #1a1a1f", animationDuration: "0.6s" }}
      >
        <div className="flex items-center justify-between">
          <Sparkles className="h-4 w-4 animate-pulse" style={{ color: "var(--blue)" }} />
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider muted-text">
            <span className="live-dot" /> Klikr · live
          </span>
        </div>
        <h3 className="mt-6 text-xl font-semibold tracking-tight">{useCase.stageTitle}</h3>
        <div className="mt-6 space-y-5">
          {animated.map((row, i) => (
            <div key={row.label} className="anim-fade-up" style={{ animationDelay: `${0.1 + i * 0.12}s`, animationDuration: "0.55s" }}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{row.label}</span>
                <span className="mono text-xs muted-text">{row.displayed.toFixed(1)}</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(0,0,0,0.06)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(row.displayed / 10) * 100}%`,
                    background: row.color,
                    transition: "width 800ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-7 flex items-center justify-between text-[10px] muted-text">
          <span>Don't agree at all</span>
          <span>Very much agree</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px]">
          <span className="muted-text">
            <span className="live-dot mr-1" /> {answered} answered
          </span>
          <span className="rounded-full px-2 py-0.5 mono tabular-nums" style={{ background: "var(--pale)", color: "var(--ink)" }}>
            {answered} / {respondents}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Eases each row's value from 0 → target on mount and re-animates on switch.
 *  After the initial tween, micro-jitters keep the chart feeling alive. */
function useAnimatedRows(useCase: UseCase) {
  type Row = UseCase["stageRows"][number] & { displayed: number };
  const [rows, setRows] = useState<Row[]>(() => useCase.stageRows.map((r) => ({ ...r, displayed: 0 })));
  const targetsRef = useRef(useCase.stageRows);

  useEffect(() => {
    targetsRef.current = useCase.stageRows;
    setRows(useCase.stageRows.map((r) => ({ ...r, displayed: 0 })));
    const start = performance.now();
    const dur = 1200;
    let raf = 0;
    const tween = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setRows(targetsRef.current.map((r) => ({ ...r, displayed: r.value * eased })));
      if (k < 1) raf = requestAnimationFrame(tween);
    };
    raf = requestAnimationFrame(tween);
    return () => cancelAnimationFrame(raf);
  }, [useCase.stageTitle]);

  // Jitter to feel "live"
  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) => prev.map((r, i) => {
        const target = targetsRef.current[i].value;
        const drift = (Math.random() - 0.5) * 0.4;
        const next = Math.max(0.5, Math.min(10, target + drift));
        return { ...r, displayed: next };
      }));
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return rows;
}

/** Counts to a target value on mount and on dependency change. */
function useAnimatedNumber(target: number, depKey: string, durationMs = 1200): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    setVal(0);
    const start = performance.now();
    let raf = 0;
    const tween = (t: number) => {
      const k = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - k, 3);
      setVal(Math.round(target * eased));
      if (k < 1) raf = requestAnimationFrame(tween);
    };
    raf = requestAnimationFrame(tween);
    return () => cancelAnimationFrame(raf);
  }, [target, depKey, durationMs]);
  return val;
}

function FloatingDots() {
  // Subtle dots drifting on the colored canvas
  const dots = useMemo(
    () => Array.from({ length: 14 }).map((_, i) => ({
      cx: 5 + (i * 7.3) % 90,
      cy: 8 + (i * 11.7) % 84,
      r: 1 + (i % 3),
      delay: (i * 137) % 4000,
    })),
    []
  );
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" aria-hidden style={{ position: "absolute" }}>
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={`${d.cx}%`}
          cy={`${d.cy}%`}
          r={d.r}
          fill="rgba(0,0,0,0.18)"
          style={{ animation: `drift 7s ease-in-out ${d.delay}ms infinite alternate` }}
        />
      ))}
    </svg>
  );
}
