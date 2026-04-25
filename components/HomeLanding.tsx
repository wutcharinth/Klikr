import Link from "next/link";
import { Plus, QrCode, Sparkles, Zap, ArrowRight } from "lucide-react";

const steps = [
  {
    n: "1",
    title: "Build a deck",
    Icon: Plus,
    body:
      "Create a presentation, add slides — multiple choice, word cloud, open Q&A, or a timed quiz with leaderboard. Drop in an image too.",
  },
  {
    n: "2",
    title: "Share the code",
    Icon: QrCode,
    body:
      "Klikr generates a six-character room code and a QR. Audience joins from any phone — no app, no signup, just a nickname.",
  },
  {
    n: "3",
    title: "Watch it live",
    Icon: Sparkles,
    body:
      "Every answer broadcasts in under 200 ms. Bar charts grow, words tumble in, the leaderboard reranks — all in real time.",
  },
];

const faqs = [
  {
    q: "Is Klikr free?",
    a: "Free for the audience — they only need a phone and the code. Hosting a session requires a Google sign-in. No payment, no plans, no quotas at this stage.",
  },
  {
    q: "Do my audience need to install anything?",
    a: "No. They open klikr.app in any mobile browser, type the code (or scan the QR), pick a nickname, and they're in. No accounts, no app downloads.",
  },
  {
    q: "What slide formats are supported?",
    a: "Four: multiple-choice polls, word clouds, open-ended Q&A, and timed quizzes with a live leaderboard. Each slide can include an image as context.",
  },
  {
    q: "How fast is realtime, really?",
    a: "Klikr uses Supabase Realtime over WebSockets. Median end-to-end response broadcast in our QA was well under 500 ms. Your network conditions vary, of course.",
  },
  {
    q: "How is quiz scoring calculated?",
    a: "round(1000 × (1 − response_time / time_limit)) for correct answers, zero otherwise. Faster correct answers earn more points; the leaderboard sorts by total.",
  },
  {
    q: "Is the audience anonymous?",
    a: "Yes. Audience members are identified only by their chosen nickname plus a session-local id stored in their browser. There is no email, no IP logging beyond what Supabase keeps for rate limiting.",
  },
  {
    q: "Can I see a demo before I sign in?",
    a: (
      <>
        Yes — the{" "}
        <Link href="/demo.html" className="underline" style={{ color: "var(--blue)" }}>
          interactive demo
        </Link>{" "}
        walks through every slide format with phantom audience activity. No signup needed.
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
            Live · realtime · free
          </div>
          <h1
            id="home-landing-heading"
            className="anim-fade-up delay-100 mt-5 text-4xl font-semibold tracking-tight sm:text-5xl"
            style={{ letterSpacing: "-0.025em" }}
          >
            Run a poll{" "}
            <span style={{ background: "linear-gradient(120deg, var(--blue) 0%, #7c8aff 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              fairly
            </span>{" "}
            with any audience.
          </h1>
          <p className="anim-fade-up delay-200 mx-auto mt-4 max-w-2xl text-base sm:text-lg muted-text">
            Klikr turns any room into a live conversation — polls, word clouds, Q&amp;A, and timed quizzes. No app downloads. Under 200 ms updates.
          </p>
          <div className="anim-fade-up delay-300 mt-7 flex items-center justify-center gap-2.5">
            <Link href="/login" className="btn-primary press">
              Host a session
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
            <Link href="/demo.html" className="btn-ghost press">
              Watch the demo
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
          <h2 className="text-2xl font-semibold tracking-tight">Ready when you are.</h2>
          <p className="mt-2 text-sm muted-text">No setup, no quotas. Sign in with Google and you're hosting in 30 seconds.</p>
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <Link href="/login" className="btn-primary press">
              Open Klikr
              <ArrowRight size={14} strokeWidth={2.5} />
            </Link>
            <Link href="/showcase.html" className="btn-ghost press">
              See the showcase
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
