import Link from "next/link";
import { Plus, QrCode, Sparkles, Zap, ArrowRight } from "lucide-react";

const steps = [
  {
    n: "1",
    title: "Pick a template or generate one",
    Icon: Plus,
    body:
      "Start from one of our ready-to-go templates — icebreakers, retros, classroom quizzes — or describe your meeting and let AI build the deck.",
  },
  {
    n: "2",
    title: "Share the code",
    Icon: QrCode,
    body:
      "Klikr makes a six-character code and a QR. Your audience joins from any phone — no app, no signup, just a nickname.",
  },
  {
    n: "3",
    title: "Watch reactions roll in",
    Icon: Sparkles,
    body:
      "Bars grow, words tumble in, the leaderboard reranks — every answer hits the screen the moment it's tapped.",
  },
];

const faqs = [
  {
    q: "Is Klikr really free?",
    a: "Yes — every plan is $0 right now while we grow to 1,000 hosts. No card. No expiry. We'll tell you first when that changes and grandfather everyone in.",
  },
  {
    q: "Do my audience need to install anything?",
    a: "No. They open klikr.app on any phone, type the code (or scan the QR), pick a nickname, and they're in. No accounts. No app store.",
  },
  {
    q: "What slide types are there?",
    a: "Polls, word clouds, open-ended responses, Q&A with upvotes, ratings (1–5 or NPS 0–10), Kahoot-style quizzes with a podium, and embedded Google Slides / PowerPoint.",
  },
  {
    q: "Can AI build my deck for me?",
    a: "Yes. Describe your meeting in one line — 'Q4 retro for engineering' — and Klikr generates a 3–6 slide deck you can edit, share, or present right away.",
  },
  {
    q: "How does Klikr compare to Mentimeter or Slido?",
    a: "Same slide types, same live results, same templates. Pro is $4.99 vs Mentimeter Pro at $24.99 — and right now, both are $0.",
  },
  {
    q: "Is my audience anonymous?",
    a: "Yes. Audience members are identified only by the nickname they choose. Hosts can export results to CSV, Excel, or PDF whenever they want.",
  },
  {
    q: "Can I see a demo before I sign in?",
    a: (
      <>
        Yes — the{" "}
        <Link href="/demo" className="underline" style={{ color: "var(--blue)" }}>
          interactive demo
        </Link>{" "}
        walks through every slide format with sample audience activity. No signup needed.
      </>
    ),
  },
];

function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -top-20 -left-16 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(0,113,227,0.20), transparent 65%)", animation: "drift 12s ease-in-out infinite alternate" }}
      />
      <div
        className="absolute top-1/2 -right-24 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(124,138,255,0.18), transparent 65%)", animation: "drift 16s ease-in-out -3s infinite alternate-reverse" }}
      />
    </div>
  );
}

export function HomeLanding() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: faqs.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: typeof a === "string" ? a : "See site for details." },
        })),
      },
      {
        "@type": "HowTo",
        name: "How to run a Klikr session",
        description: "Run a real-time poll, word cloud, Q&A, or quiz with any audience.",
        step: steps.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.title,
          text: s.body,
        })),
      },
      {
        "@type": "SoftwareApplication",
        name: "Klikr",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS Safari, Android Chrome",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
    ],
  };

  return (
    <section
      aria-labelledby="home-landing-heading"
      className="relative overflow-hidden border-t py-20 sm:py-28"
      style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.4)" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FloatingOrbs />

      <div className="relative mx-auto max-w-4xl px-6">
        <div className="text-center">
          <div className="anim-fade-up inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
               style={{ background: "rgba(0,113,227,0.08)", border: "1px solid rgba(0,113,227,0.25)", color: "var(--blue)" }}>
            <Zap size={12} strokeWidth={2.5} />
            Free for everyone — no card, no expiry
          </div>
          <h1
            id="home-landing-heading"
            className="anim-fade-up delay-100 mt-5 text-4xl font-semibold tracking-tight sm:text-5xl"
            style={{ letterSpacing: "-0.025em" }}
          >
            Live answers{" "}
            <span style={{ background: "linear-gradient(120deg, var(--blue) 0%, #7c8aff 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              from every phone
            </span>{" "}
            in the room.
          </h1>
          <p className="anim-fade-up delay-200 mx-auto mt-4 max-w-2xl text-base sm:text-lg muted-text">
            Run a poll, ask a question, score a quiz — your audience answers from any phone. No apps, no signups, no waiting.
          </p>
          <div className="anim-fade-up delay-300 mt-7 flex items-center justify-center gap-2.5">
            <Link href="/login" className="btn-primary press">
              Host a session
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
            <Link href="/templates" className="btn-ghost press">
              Browse templates
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20">
          <h2 className="text-2xl font-semibold tracking-tight text-center">How it works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li
                key={s.n}
                className="group relative anim-fade-up panel p-6 transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${400 + i * 150}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white transition-transform duration-300 group-hover:scale-110"
                    style={{ background: "linear-gradient(135deg, var(--blue) 0%, #7c8aff 100%)" }}
                  >
                    <s.Icon size={18} strokeWidth={2.5} />
                  </span>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] muted-text">Step {s.n}</div>
                    <div className="font-semibold leading-tight">{s.title}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed muted-text">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* FAQ */}
        <div className="mt-24">
          <h2 className="text-2xl font-semibold tracking-tight text-center">Common questions</h2>
          <div className="mt-8 space-y-2">
            {faqs.map(({ q, a }, i) => (
              <details
                key={q}
                className="group anim-fade-up panel transition-colors hover:border-[var(--line-strong)]"
                style={{ animationDelay: `${100 + i * 60}ms` }}
              >
                <summary className="cursor-pointer list-none p-5 flex items-center justify-between gap-4">
                  <span className="font-medium">{q}</span>
                  <span className="muted-text transition-transform group-open:rotate-45" aria-hidden>
                    <Plus size={16} strokeWidth={2.5} />
                  </span>
                </summary>
                <div className="px-5 pb-5 text-sm leading-relaxed muted-text">{a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-24 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Your next meeting, but better.</h2>
          <p className="mt-2 text-sm muted-text">Sign in with Google. You're hosting in 30 seconds.</p>
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <Link href="/login" className="btn-primary press">
              Start hosting
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
            <Link href="/about" className="btn-ghost press">
              About Klikr
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
