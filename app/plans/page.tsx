import Link from "next/link";
import { Check, Sparkles, X } from "lucide-react";
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "Plans — Klikr",
  description: "Free for everyone while we grow. No card. No expiry.",
};

type Tier = {
  id: "free" | "basic" | "pro";
  name: string;
  tagline: string;
  regularPrice: string;
  cadence: string;
  cta: { label: string; href: string };
  highlight?: boolean;
  features: { label: string; included: boolean }[];
  vs?: string;
};

const tiers: Tier[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Try Klikr forever. Great for one-off meetings and demos.",
    regularPrice: "$0",
    cadence: "forever",
    cta: { label: "Start free", href: "/login" },
    features: [
      { included: true, label: "Up to 100 audience members per month" },
      { included: true, label: "Up to 5 slides per presentation" },
      { included: true, label: "All slide types — polls, word clouds, Q&A, ratings, quizzes" },
      { included: true, label: "Live results streamed to every screen" },
      { included: true, label: "CSV export" },
      { included: false, label: "Custom logo and brand colors" },
      { included: false, label: "Templates, co-editing, embeds" },
      { included: false, label: "AI features" },
    ],
  },
  {
    id: "basic",
    name: "Basic",
    tagline: "For presenters who run sessions every week. No walls, no caps.",
    regularPrice: "$1.99",
    cadence: "/ month",
    vs: "vs $11.99 on Mentimeter",
    cta: { label: "Start free", href: "/login" },
    features: [
      { included: true, label: "Everything in Free" },
      { included: true, label: "Unlimited audience — no monthly cap" },
      { included: true, label: "Unlimited slides per presentation" },
      { included: true, label: "Custom logo + brand colors (Klikr branding off)" },
      { included: true, label: "Templates — use, save, and share with your team" },
      { included: true, label: "Co-edit decks with teammates" },
      { included: true, label: "Embed Google Slides + PowerPoint" },
      { included: true, label: "Kahoot-style quizzes with podium" },
      { included: true, label: "PDF + Excel export" },
      { included: true, label: "Moderate Q&A before it's shown" },
      { included: true, label: "10 AI credits / month — taste of Pro" },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Most popular. Basic + AI that does the heavy lifting.",
    regularPrice: "$4.99",
    cadence: "/ month",
    vs: "vs $24.99 on Mentimeter",
    highlight: true,
    cta: { label: "Start free", href: "/login" },
    features: [
      { included: true, label: "Everything in Basic" },
      { included: true, label: "200 AI credits / month" },
      { included: true, label: "✨ Generate full decks from one line" },
      { included: true, label: "✨ AI suggests poll and quiz options" },
      { included: true, label: "✨ AI summarises open-ended answers" },
      { included: true, label: "✨ AI cleans up word clouds (synonym merge)" },
      { included: true, label: "✨ AI recommends the right template" },
      { included: true, label: "Top-up credits anytime" },
      { included: true, label: "Advanced per-slide analytics" },
      { included: true, label: "Priority support" },
    ],
  },
];

const CREDIT_COSTS = [
  { route: "Generate a full deck", cost: 5 },
  { route: "Suggest poll/quiz options", cost: 1 },
  { route: "Summarise open responses", cost: 3 },
  { route: "Clean up a word cloud", cost: 2 },
  { route: "Recommend a template", cost: 1 },
];

export default async function PlansPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavBar active="plans" />
      <PromoBanner />

      <section className="mt-10 max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight">Pick the plan that fits your room.</h1>
        <p className="mt-3 text-[17px] text-[var(--neutral)]">
          Up to a hundred people in the room? Free covers it. Bigger crowds, branding, AI? Basic or Pro.
          Everything is $0 right now — no card, no card-on-file games.
        </p>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {tiers.map((t) => (
          <TierCard key={t.id} tier={t} />
        ))}
      </section>

      <CreditsExplainer />

      <Compare />

      <FAQ />

      <footer className="mt-20 mb-10 text-center text-sm text-[var(--neutral)]">
        Free for the first 1,000 hosts. Then we'll let you know — and grandfather everyone in.
      </footer>
    </main>
  );
}

function PromoBanner() {
  return (
    <>
      <div
        className="mt-6 flex items-center justify-between gap-4 rounded-2xl px-5 py-3 text-sm"
        style={{ background: "linear-gradient(90deg,#fff7e0,#ffeec5)", border: "1px solid #f3d99a" }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color: "#a06f00" }} />
          <span style={{ color: "#5a3f00" }}>
            <strong>100% off — every plan is $0</strong> until we reach 1,000 hosts. No card. No expiry.
          </span>
        </div>
        <Link href="/login" className="btn-dark text-xs" style={{ padding: "6px 14px" }}>
          Start free
        </Link>
      </div>
    </>
  );
}

function TierCard({ tier }: { tier: Tier }) {
  const isPaid = tier.regularPrice !== "$0";
  return (
    <div
      className={tier.highlight ? "panel relative p-6" : "panel-soft p-6"}
      style={
        tier.highlight
          ? { borderColor: "var(--blue)", boxShadow: "0 8px 32px rgba(0,113,227,0.15)" }
          : { border: "1px solid var(--line)" }
      }
    >
      {tier.highlight && (
        <span
          className="absolute -top-3 left-6 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: "var(--blue)", color: "var(--white)" }}
        >
          Most popular
        </span>
      )}
      <h3 className="text-lg font-semibold">{tier.name}</h3>
      <p className="mt-1 text-sm muted-text">{tier.tagline}</p>

      <div className="mt-5">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight">$0</span>
          {isPaid && (
            <>
              <span
                className="text-base muted-text"
                style={{ textDecoration: "line-through", textDecorationColor: "rgba(0,0,0,0.4)" }}
              >
                {tier.regularPrice}
              </span>
              <span className="text-xs muted-text">{tier.cadence}</span>
            </>
          )}
          {!isPaid && <span className="text-xs muted-text">{tier.cadence}</span>}
        </div>
        {isPaid && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: "#e8f5e9", color: "#1b5e20" }}
            >
              Save 100% — early-access discount
            </span>
            {tier.vs && <span className="text-[11px] muted-text">{tier.vs}</span>}
          </div>
        )}
      </div>

      <Link
        href={tier.cta.href}
        className={tier.highlight ? "btn-primary mt-5 w-full" : "btn-ghost mt-5 w-full"}
        style={tier.highlight ? {} : { border: "1px solid var(--line)" }}
      >
        {tier.cta.label}
      </Link>

      <ul className="mt-6 space-y-2.5 text-sm">
        {tier.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            {f.included ? (
              <Check className="mt-0.5 h-4 w-4 flex-none" style={{ color: "var(--blue)" }} />
            ) : (
              <X className="mt-0.5 h-4 w-4 flex-none muted-text" />
            )}
            <span className={f.included ? "" : "muted-text"}>{f.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CreditsExplainer() {
  return (
    <section className="mt-20">
      <h2 className="text-2xl font-semibold tracking-tight">What you can do with AI credits</h2>
      <p className="mt-2 max-w-2xl text-sm muted-text">
        Pro gives you 200 credits a month — enough for ~40 full deck generations, or hundreds of
        smaller AI lifts. Run out? Top up any time.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {CREDIT_COSTS.map((c) => (
          <div key={c.route} className="panel-soft p-4">
            <p className="text-2xl font-semibold tracking-tight">{c.cost}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wider muted-text">credits</p>
            <p className="mt-2 text-sm">{c.route}</p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Link href="/credits" className="text-sm" style={{ color: "var(--blue)" }}>
          See top-up packages →
        </Link>
      </div>
    </section>
  );
}

function Compare() {
  const rows: { feature: string; values: [string | boolean, string | boolean, string | boolean] }[] = [
    { feature: "Audience per month", values: ["100", "Unlimited", "Unlimited"] },
    { feature: "Slides per presentation", values: ["5", "Unlimited", "Unlimited"] },
    { feature: "All slide types", values: [true, true, true] },
    { feature: "CSV export", values: [true, true, true] },
    { feature: "PDF + Excel export", values: [false, true, true] },
    { feature: "Custom branding (logo + colors)", values: [false, true, true] },
    { feature: "Templates: save and share", values: [false, true, true] },
    { feature: "Co-edit with teammates", values: [false, true, true] },
    { feature: "Embed Google Slides / PowerPoint", values: [false, true, true] },
    { feature: "Kahoot-style quiz mode", values: [false, true, true] },
    { feature: "Moderate Q&A", values: [false, true, true] },
    { feature: "AI: deck generation", values: [false, false, true] },
    { feature: "AI: option suggestions", values: [false, false, true] },
    { feature: "AI: response summaries", values: [false, false, true] },
    { feature: "AI: word cloud cleanup", values: [false, false, true] },
    { feature: "Monthly AI credits", values: ["—", "10", "200"] },
  ];

  return (
    <section className="mt-20">
      <h2 className="text-2xl font-semibold tracking-tight">Compare features</h2>
      <div className="panel mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ background: "var(--pale)" }}>
            <tr>
              <th className="px-5 py-3 text-left font-medium muted-text">Feature</th>
              <th className="px-5 py-3 text-center font-semibold">Free</th>
              <th className="px-5 py-3 text-center font-semibold">Basic</th>
              <th className="px-5 py-3 text-center font-semibold" style={{ color: "var(--blue)" }}>Pro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.feature} style={{ borderTop: "1px solid var(--line)" }}>
                <td className="px-5 py-3">{r.feature}</td>
                {r.values.map((v, j) => (
                  <td key={j} className="px-5 py-3 text-center">
                    {typeof v === "boolean" ? (
                      v ? (
                        <Check className="mx-auto h-4 w-4" style={{ color: "var(--blue)" }} />
                      ) : (
                        <X className="mx-auto h-4 w-4 muted-text" />
                      )
                    ) : (
                      <span className={v === "—" ? "muted-text" : ""}>{v}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FAQ() {
  const items = [
    {
      q: "Why is everything free right now?",
      a: "Because we're early. While we grow to 1,000 hosts, every paid feature is unlocked for everyone. When that changes, we'll tell you first and grandfather everyone who joined.",
    },
    {
      q: "How does Klikr compare to Mentimeter or Slido?",
      a: "Same slide types, same live results, same templates. Pro is $4.99 vs Mentimeter Pro at $24.99. We undercut on price by being smaller and AI-first.",
    },
    {
      q: "What can I do with one Pro AI credit?",
      a: "Suggest options for one quiz question, or recommend templates from a one-line description. Bigger AI tasks (full deck generation) cost 5 credits.",
    },
    {
      q: "Can I cancel?",
      a: "There's nothing to cancel — we don't take a card. When we start charging, you'll be able to cancel any time.",
    },
    {
      q: "What does 'Pro' get me that Basic doesn't?",
      a: "AI. Pro is the only tier that can generate decks from prompts, suggest options, summarise responses, and clean up word clouds.",
    },
    {
      q: "Is my audience anonymous?",
      a: "Yes. Audience members are identified only by the nickname they choose. Hosts can export results to CSV, Excel, or PDF whenever they want.",
    },
  ];
  return (
    <section className="mt-20">
      <h2 className="text-2xl font-semibold tracking-tight">Common questions</h2>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {items.map((it) => (
          <div key={it.q} className="panel-soft p-5">
            <p className="font-medium">{it.q}</p>
            <p className="mt-2 text-sm muted-text">{it.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
