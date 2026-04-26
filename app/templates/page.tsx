import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Template } from "@/lib/types";
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "Free presentation templates — Klikr",
  description: "Hundreds of ready-to-go templates. Pick one and you're presenting in seconds.",
};

const CATEGORIES = [
  "All",
  "Icebreakers",
  "Brainstorming",
  "Classroom",
  "Business",
  "Workshops",
  "Surveys",
];

type SearchParams = Promise<{ category?: string; q?: string }>;

export default async function TemplatesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const category = sp.category && CATEGORIES.includes(sp.category) ? sp.category : "All";
  const q = (sp.q ?? "").trim();

  const supabase = await createClient();
  let query = supabase
    .from("templates")
    .select("*")
    .eq("visibility", "public")
    .order("usage_count", { ascending: false });
  if (category !== "All") query = query.eq("category", category);

  const { data, error } = await query;
  let templates = (data ?? []) as Template[];
  if (q) {
    const needle = q.toLowerCase();
    templates = templates.filter((t) =>
      t.title.toLowerCase().includes(needle) ||
      t.description.toLowerCase().includes(needle) ||
      (t.tags ?? []).some((tag) => tag.toLowerCase().includes(needle))
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavBar active="templates" />

      <header className="mt-10 max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight">
          Find a template for your meeting.
        </h1>
        <p className="mt-3 text-[17px] text-[var(--neutral)]">
          Filter by what you're running — a retro, a quiz, an icebreaker — then change a few
          words. Most of these are 1–6 slides, ready in under a minute.
        </p>
      </header>

      <SearchBar q={q} category={category} />

      <nav className="mt-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const href = c === "All" ? "/templates" : `/templates?category=${encodeURIComponent(c)}`;
          const active = c === category;
          return (
            <Link
              key={c}
              href={href}
              className="rounded-full px-4 py-1.5 text-sm transition-colors"
              style={
                active
                  ? { background: "var(--ink)", color: "var(--white)" }
                  : { background: "transparent", color: "var(--neutral)", border: "1px solid var(--line)" }
              }
            >
              {c}
            </Link>
          );
        })}
      </nav>

      {error ? (
        <ErrorPanel message={error.message} />
      ) : templates.length === 0 ? (
        <div className="panel-soft mt-8 p-8 text-center text-sm muted-text">
          No templates found{q ? ` for "${q}"` : ""}. Try a different category or clear the search.
        </div>
      ) : (
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard key={t.id} t={t} />
          ))}
        </section>
      )}

      <CTA />
    </main>
  );
}

function SearchBar({ q, category }: { q: string; category: string }) {
  return (
    <form action="/templates" method="get" className="mt-6 flex max-w-2xl items-center gap-2 rounded-2xl px-4" style={{ background: "var(--white)", border: "1px solid var(--line)" }}>
      <Search className="h-4 w-4 muted-text" />
      <input
        type="text"
        name="q"
        defaultValue={q}
        placeholder="Describe your meeting — we'll find the closest template"
        className="h-12 w-full bg-transparent text-[15px] outline-none"
      />
      {category !== "All" && <input type="hidden" name="category" value={category} />}
      <button className="btn-primary text-xs" style={{ padding: "6px 14px" }}>Search</button>
    </form>
  );
}

function TemplateCard({ t }: { t: Template }) {
  return (
    <Link
      href={`/templates/${t.slug}`}
      className="group panel block overflow-hidden p-0 transition-transform hover:-translate-y-0.5"
    >
      <div
        className="flex h-36 items-center justify-center text-2xl font-semibold tracking-tight"
        style={{
          background: cardGradient(t.category),
          color: "var(--white)",
        }}
      >
        <span className="px-6 text-center">{t.title}</span>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider muted-text">
          <span>{t.category}</span>
          <span>·</span>
          <span>{t.usage_count > 0 ? `${t.usage_count} uses` : "New"}</span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm">{t.description}</p>
      </div>
    </Link>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="panel-soft mt-8 p-6 text-sm">
      <p className="font-medium">Templates aren't ready yet.</p>
      <p className="mt-1 muted-text">
        The templates table doesn't exist on this database. Run <code className="mono">npm run migrate</code> with{" "}
        <code className="mono">DATABASE_URL</code> set, then refresh.
      </p>
      <p className="mt-2 muted-text text-xs">Detail: {message}</p>
    </div>
  );
}

function CTA() {
  return (
    <section className="mt-16 panel-soft flex flex-wrap items-center justify-between gap-4 p-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Nothing fits? Make one.</h2>
        <p className="mt-2 max-w-xl text-sm muted-text">
          Tell us what your meeting is about. Your slides will be ready in seconds.
        </p>
      </div>
      <Link href="/dashboard?ai=1" className="btn-primary">
        <Sparkles className="h-4 w-4" /> Generate with AI
      </Link>
    </section>
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
