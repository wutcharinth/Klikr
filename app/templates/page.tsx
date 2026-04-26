import { Sparkles } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Template } from "@/lib/types";
import NavBar from "@/components/NavBar";
import TemplateSearch from "@/components/TemplateSearch";

export const metadata = {
  title: "Free presentation templates — Klikr",
  description: "Hundreds of ready-to-go templates. Pick one and you're presenting in seconds.",
};

export default async function TemplatesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("visibility", "public")
    .order("usage_count", { ascending: false });

  const templates = (data ?? []) as Template[];

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

      {error ? (
        <ErrorPanel message={error.message} />
      ) : (
        <TemplateSearch templates={templates} />
      )}

      <CTA />
    </main>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="panel-soft mt-8 p-6 text-sm">
      <p className="font-medium">Templates aren't ready yet.</p>
      <p className="mt-1 muted-text">
        Run <code className="mono">npm run migrate</code> with{" "}
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
