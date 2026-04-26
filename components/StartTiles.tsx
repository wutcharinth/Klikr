import Link from "next/link";
import { LayoutTemplate, Sparkles, Plus } from "lucide-react";

/**
 * Visitor-facing "3 ways to start" panel. Routes through /login so any
 * action ends with the user on /welcome and then in the right place. For
 * already-signed-in users the same tiles link directly to the destinations.
 */
export default function StartTiles({ signedIn = false }: { signedIn?: boolean }) {
  const tiles = [
    {
      Icon: LayoutTemplate,
      title: "An icebreaker, retro, or quiz",
      body: "Open a ready-made template, change a couple of words, share the code.",
      href: "/templates",
      cta: "Browse templates",
    },
    {
      Icon: Sparkles,
      title: "Something tailored",
      body: "Describe the meeting — the slides arrive in a few seconds.",
      href: signedIn ? "/dashboard?ai=1" : "/login?next=/dashboard?ai=1",
      cta: "Try AI",
    },
    {
      Icon: Plus,
      title: "I know what I want",
      body: "Start a blank deck and build it your way — polls, word clouds, quizzes, Q&A, ratings.",
      href: signedIn ? "/dashboard" : "/login",
      cta: signedIn ? "Open dashboard" : "Sign in",
    },
  ];
  return (
    <section className="mx-auto max-w-5xl px-6 pb-20">
      <h2 className="text-center text-3xl font-semibold tracking-tight">What do you want to run?</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm muted-text">
        Pick a starting point. You can always change your mind.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.title} href={t.href} className="panel p-6 transition-transform hover:-translate-y-0.5">
            <t.Icon className="h-6 w-6" style={{ color: "var(--blue)" }} />
            <p className="mt-3 font-medium">{t.title}</p>
            <p className="mt-1 text-xs muted-text">{t.body}</p>
            <span className="mt-4 inline-flex text-sm" style={{ color: "var(--blue)" }}>
              {t.cta} →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
