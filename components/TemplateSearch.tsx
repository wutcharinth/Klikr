"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { Template } from "@/lib/types";

const CATEGORIES = ["All", "Icebreakers", "Brainstorming", "Classroom", "Business", "Workshops", "Surveys"];

function scoreTemplate(t: Template, words: string[]): number {
  if (words.length === 0) return 1; // show all when no query
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
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const words = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query]
  );

  const results = useMemo(() => {
    let pool = category === "All" ? templates : templates.filter((t) => t.category === category);
    if (words.length === 0) return pool;
    return pool
      .map((t) => ({ t, s: scoreTemplate(t, words) }))
      .filter(({ s }) => s > 0)
      .sort((a, b) => b.s - a.s)
      .map(({ t }) => t);
  }, [templates, category, words]);

  return (
    <>
      {/* Search bar */}
      <div className="mt-6 flex max-w-2xl items-center gap-2 rounded-2xl px-4" style={{ background: "var(--white)", border: "1px solid var(--line)" }}>
        <Search className="h-4 w-4 flex-none muted-text" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe your meeting — results update instantly"
          className="h-12 w-full bg-transparent text-[15px] outline-none"
          autoComplete="off"
        />
        {query && (
          <button onClick={() => setQuery("")} className="flex-none muted-text hover:text-[var(--ink)]">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category pills */}
      <nav className="mt-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="rounded-full px-4 py-1.5 text-sm transition-colors"
            style={
              category === c
                ? { background: "var(--ink)", color: "var(--white)" }
                : { background: "transparent", color: "var(--neutral)", border: "1px solid var(--line)" }
            }
          >
            {c}
          </button>
        ))}
      </nav>

      {/* Results count hint when searching */}
      {words.length > 0 && (
        <p className="mt-4 text-xs muted-text">
          {results.length === 0 ? "No matches" : `${results.length} template${results.length !== 1 ? "s" : ""}`}
        </p>
      )}

      {/* Grid */}
      {results.length === 0 ? (
        <div className="panel-soft mt-8 p-8 text-center text-sm muted-text">
          No templates found{query ? ` for "${query}"` : ""}. Try a different category or clear the search.
        </div>
      ) : (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((t) => (
            <TemplateCard key={t.id} t={t} highlight={words} />
          ))}
        </section>
      )}
    </>
  );
}

function TemplateCard({ t, highlight }: { t: Template; highlight: string[] }) {
  return (
    <Link
      href={`/templates/${t.slug}`}
      className="group panel block overflow-hidden p-0 transition-transform hover:-translate-y-0.5"
    >
      <div
        className="flex h-36 items-center justify-center text-2xl font-semibold tracking-tight"
        style={{ background: cardGradient(t.category), color: "var(--white)" }}
      >
        <span className="px-6 text-center">{t.title}</span>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider muted-text">
          <span>{t.category}</span>
          <span>·</span>
          <span>{t.usage_count > 0 ? `${t.usage_count} uses` : "New"}</span>
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
    Business: "linear-gradient(135deg,#0071E3,#00C2FF)",
    Workshops: "linear-gradient(135deg,#11998E,#38EF7D)",
    Surveys: "linear-gradient(135deg,#F2994A,#F2C94C)",
  };
  return map[category] ?? "linear-gradient(135deg,#1d1d1f,#3a3a3c)";
}
