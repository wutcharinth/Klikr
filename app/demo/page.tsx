import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "See Klikr in action — Klikr",
  description: "Walk through every slide format with sample audience activity. No signup needed.",
};

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <NavBar />

      <header className="mt-10 max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.18em] muted-text">Try Klikr · no signup</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Run a real session right here.</h1>
        <p className="mt-3 text-[17px] muted-text">
          A poll, a word cloud, a quick Q&amp;A, and a quiz with a podium. Tap through it like you're hosting one — sample answers come in so the room feels alive.
        </p>
        <div className="mt-6 flex gap-3">
          <a href="/demo.html" className="btn-primary">
            <Play className="h-4 w-4" /> Start the demo
          </a>
          <Link href="/templates" className="btn-ghost">Or pick a template</Link>
        </div>
      </header>

      <section className="mt-12 panel overflow-hidden" style={{ aspectRatio: "16 / 10" }}>
        <iframe
          src="/demo.html"
          title="Klikr interactive demo"
          className="h-full w-full"
          style={{ border: "none" }}
        />
      </section>

      <section className="mt-16 grid gap-3 sm:grid-cols-2">
        <Link href="/templates" className="panel-soft p-5 hover:border-[var(--blue)]">
          <p className="font-medium">Ready to host your own?</p>
          <p className="mt-1 text-sm muted-text">Pick a template — you'll be presenting in under a minute.</p>
          <span className="mt-3 inline-flex text-sm" style={{ color: "var(--blue)" }}>Browse templates →</span>
        </Link>
        <Link href="/login" className="panel-soft p-5 hover:border-[var(--blue)]">
          <p className="font-medium">Got it. Let me try.</p>
          <p className="mt-1 text-sm muted-text">Sign in with Google. Free, no card, ready in 30 seconds.</p>
          <span className="mt-3 inline-flex text-sm" style={{ color: "var(--blue)" }}>Sign in →</span>
        </Link>
      </section>

      <p className="mt-12 muted-text text-xs">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-[var(--ink)]">
          <ArrowLeft className="h-3 w-3" /> Back home
        </Link>
      </p>
    </main>
  );
}
