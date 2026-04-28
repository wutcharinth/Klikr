"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Template } from "@/lib/types";

const CATEGORY_KEYS = [
  { key: "All", label: "categoryAll" },
  { key: "Icebreakers", label: "categoryIcebreakers" },
  { key: "Brainstorming", label: "categoryBrainstorming" },
  { key: "Recognition", label: "categoryRecognition" },
  { key: "Classroom", label: "categoryClassroom" },
  { key: "Quiz", label: "categoryQuiz" },
  { key: "Business", label: "categoryBusiness" },
  { key: "Workshops", label: "categoryWorkshops" },
  { key: "Surveys", label: "categorySurveys" },
] as const;

function scoreTemplate(t: Template, words: string[]): number {
  if (words.length === 0) return 1;
  const title = t.title.toLowerCase();
  const desc = t.description.toLowerCase();
  const tags = t.tags.map((x) => x.toLowerCase()).join(" ");
  const cat = t.category.toLowerCase();
  let s = 0;
  for (const w of words) {
    if (title.includes(w)) s += title.startsWith(w) ? 40 : 20;
    if (tags.includes(w)) s += 15;
    if (cat.includes(w)) s += 10;
    if (desc.includes(w)) s += 5;
  }
  return s;
}

export default function TemplateSearch({ templates }: { templates: Template[] }) {
  const t = useTranslations("templates");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const words = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query]
  );

  const results = useMemo(() => {
    const pool = category === "All" ? templates : templates.filter((tpl) => tpl.category === category);
    if (words.length === 0) return pool;
    return pool
      .map((tpl) => ({ tpl, s: scoreTemplate(tpl, words) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ tpl }) => tpl);
  }, [templates, category, words]);

  return (
    <>
      <div className="mt-6 flex max-w-2xl items-center gap-2 rounded-2xl px-4" style={{ background: "var(--white)", border: "1px solid var(--line)" }}>
        <Search className="h-4 w-4 flex-none muted-text" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-12 w-full bg-transparent text-[15px] outline-none"
          autoComplete="off"
        />
        {query && (
          <button onClick={() => setQuery("")} className="flex-none muted-text hover:text-[var(--ink)]" aria-label="Clear">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="mt-6 flex flex-wrap gap-2">
        {CATEGORY_KEYS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className="rounded-full px-4 py-1.5 text-sm transition-colors"
            style={
              category === key
                ? { background: "var(--ink)", color: "var(--white)" }
                : { background: "transparent", color: "var(--neutral)", border: "1px solid var(--line)" }
            }
          >
            {t(label)}
          </button>
        ))}
      </nav>

      {words.length > 0 && (
        <p className="mt-4 text-xs muted-text">
          {t("resultCount", { count: results.length })}
        </p>
      )}

      {results.length === 0 ? (
        <div className="panel-soft mt-8 p-8 text-center text-sm muted-text">
          {query ? t("noTemplatesFor", { query }) : t("noTemplates")}
        </div>
      ) : (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((tpl) => (
            <TemplateCard key={tpl.id} t={tpl} highlight={words} usesLabel={(c: number) => t("uses", { count: c })} />
          ))}
        </section>
      )}
    </>
  );
}

function TemplateCard({
  t,
  highlight,
  usesLabel,
}: {
  t: Template;
  highlight: string[];
  usesLabel: (count: number) => string;
}) {
  return (
    <Link
      href={`/templates/${t.slug}`}
      className="group panel block overflow-hidden p-0 transition-transform hover:-translate-y-0.5"
    >
      <div
        className="flex h-36 items-center justify-center text-2xl font-semibold tracking-tight"
        style={{ background: cardGradient(t.category), color: "var(--white-fixed)" }}
      >
        <span className="px-6 text-center">{t.title}</span>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider muted-text">
          <span>{t.category}</span>
          <span>·</span>
          <span>{usesLabel(t.usage_count)}</span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm">
          <Highlighted text={t.description} words={highlight} />
        </p>
      </div>
    </Link>
  );
}

function Highlighted({ text, words }: { text: string; words: string[] }) {
  if (words.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = text.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark key={i} style={{ background: "rgba(0,113,227,0.12)", color: "inherit", borderRadius: 2 }}>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function cardGradient(category: string): string {
  const map: Record<string, string> = {
    Icebreakers: "linear-gradient(135deg,#FF7B7B,#FF4E50)",
    Brainstorming: "linear-gradient(135deg,#36D1DC,#5B86E5)",
    Classroom: "linear-gradient(135deg,#7F7FD5,#86A8E7)",
    Quiz: "linear-gradient(135deg,#ec4899,#f43f5e)",
    Business: "linear-gradient(135deg,#0071E3,#00C2FF)",
    Workshops: "linear-gradient(135deg,#11998E,#38EF7D)",
    Surveys: "linear-gradient(135deg,#F2994A,#F2C94C)",
    Recognition: "linear-gradient(135deg,#A855F7,#EC4899)",
  };
  return map[category] ?? "linear-gradient(135deg,#1d1d1f,#3a3a3c)";
}
