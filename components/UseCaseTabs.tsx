"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, GraduationCap, Lightbulb, CheckSquare, Image as ImageIcon, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

type Audience = "business" | "education";

type UseCase = {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  body: string;
  href: string;
  bg: string;
  stageTitle: string;
  stageRows: { label: string; value: number; color: string }[];
};

const bizMeta = [
  { Icon: MessageCircle, href: "/templates?category=Surveys", bg: "linear-gradient(135deg,#fff7ed,#fde68a 60%)", values: [7.4, 6.8, 7.0], colors: ["#7c3aed", "#f97316", "#2563eb"] },
  { Icon: CheckSquare, href: "/templates?category=Business", bg: "linear-gradient(135deg,#eff6ff,#dbeafe 60%)", values: [6.0, 9.2, 3.4], colors: ["#2563eb", "#16a34a", "#94a3b8"] },
  { Icon: Lightbulb, href: "/templates?category=Brainstorming", bg: "linear-gradient(135deg,#fdf4ff,#fae8ff 60%)", values: [8.8, 6.5, 5.1], colors: ["#a21caf", "#7c3aed", "#db2777"] },
  { Icon: ImageIcon, href: "/templates?category=Classroom", bg: "linear-gradient(135deg,#ecfeff,#a5f3fc 60%)", values: [9.4, 8.6, 7.7], colors: ["#f59e0b", "#94a3b8", "#d97706"] },
] as const;

const eduMeta = [
  { Icon: GraduationCap, href: "/templates?category=Classroom", bg: "linear-gradient(135deg,#ecfdf5,#bbf7d0 60%)", values: [8.4, 6.7, 2.3], colors: ["#16a34a", "#65a30d", "#94a3b8"] },
  { Icon: Lightbulb, href: "/templates?category=Classroom", bg: "linear-gradient(135deg,#fdf4ff,#fae8ff 60%)", values: [9.0, 6.4, 7.2], colors: ["#a855f7", "#9333ea", "#c026d3"] },
  { Icon: CheckSquare, href: "/templates?category=Classroom", bg: "linear-gradient(135deg,#fef2f2,#fecaca 60%)", values: [9.6, 8.1, 7.4], colors: ["#f59e0b", "#94a3b8", "#d97706"] },
  { Icon: MessageCircle, href: "/templates?category=Classroom", bg: "linear-gradient(135deg,#eff6ff,#dbeafe 60%)", values: [9.5, 7.1, 5.8], colors: ["#2563eb", "#1d4ed8", "#3b82f6"] },
] as const;

type CaseData = { title: string; body: string; stageTitle: string; rows: string[] };

function buildList(meta: typeof bizMeta | typeof eduMeta, data: CaseData[]): UseCase[] {
  return meta.map((m, i) => ({
    Icon: m.Icon,
    title: data[i].title,
    body: data[i].body,
    href: m.href,
    bg: m.bg,
    stageTitle: data[i].stageTitle,
    stageRows: data[i].rows.map((label, j) => ({ label, value: m.values[j], color: m.colors[j] })),
  }));
}

export default function UseCaseTabs() {
  const t = useTranslations("useCases");
  const [audience, setAudience] = useState<Audience>("business");
  const [activeIdx, setActiveIdx] = useState(0);

  const business = useMemo(() => buildList(bizMeta, t.raw("biz") as CaseData[]), [t]);
  const education = useMemo(() => buildList(eduMeta, t.raw("edu") as CaseData[]), [t]);

  const list = audience === "business" ? business : education;
  const active = list[activeIdx];

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="flex justify-center">
        <div
          className="inline-flex rounded-full p-1"
          style={{ background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {(["business", "education"] as Audience[]).map((a) => (
            <button
              key={a}
              onClick={() => {
                setAudience(a);
                setActiveIdx(0);
              }}
              className="rounded-full px-5 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: audience === a ? "#ffffff" : "transparent",
                color: audience === a ? "#1d1d1f" : "rgba(255,255,255,0.75)",
              }}
            >
              {a === "business" ? t("business") : t("education")}
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
              {t("seeTemplates")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <Stage useCase={active} liveLabel={t("live")} answeredFn={(c) => t("answered", { count: c })} agreeMin={t("agreeMin")} agreeMax={t("agreeMax")} />
      </div>
    </section>
  );
}

function Stage({
  useCase,
  liveLabel,
  answeredFn,
  agreeMin,
  agreeMax,
}: {
  useCase: UseCase;
  liveLabel: string;
  answeredFn: (count: number) => string;
  agreeMin: string;
  agreeMax: string;
}) {
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
        style={{ border: "8px solid #1a1a1f", animationDuration: "0.6s", color: "#1d1d1f" }}
      >
        <div className="flex items-center justify-between">
          <Sparkles className="h-4 w-4 animate-pulse" style={{ color: "#0071e3" }} />
          <span
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider"
            style={{ color: "#6e6e73" }}
          >
            <span className="live-dot" /> {liveLabel}
          </span>
        </div>
        <h3 className="mt-6 text-xl font-semibold tracking-tight" style={{ color: "#1d1d1f" }}>
          {useCase.stageTitle}
        </h3>
        <div className="mt-6 space-y-5">
          {animated.map((row, i) => (
            <div key={row.label} className="anim-fade-up" style={{ animationDelay: `${0.1 + i * 0.12}s`, animationDuration: "0.55s" }}>
              <div className="flex items-baseline justify-between text-sm">
                <span style={{ color: "#1d1d1f" }}>{row.label}</span>
                <span className="mono text-xs" style={{ color: "#6e6e73" }}>
                  {row.displayed.toFixed(1)}
                </span>
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
        <div className="mt-7 flex items-center justify-between text-[10px]" style={{ color: "#6e6e73" }}>
          <span>{agreeMin}</span>
          <span>{agreeMax}</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px]">
          <span style={{ color: "#6e6e73" }}>
            <span className="live-dot mr-1" /> {answeredFn(answered)}
          </span>
          <span
            className="rounded-full px-2 py-0.5 mono tabular-nums"
            style={{ background: "#f5f5f7", color: "#1d1d1f" }}
          >
            {answered} / {respondents}
          </span>
        </div>
      </div>
    </div>
  );
}

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
  }, [useCase.stageTitle, useCase.stageRows]);

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
