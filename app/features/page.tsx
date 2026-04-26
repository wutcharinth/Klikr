import Link from "next/link";
import NavBar from "@/components/NavBar";
import {
  BarChart3,
  Cloud,
  MessageSquare,
  Trophy,
  Star,
  HelpCircle,
  PlayCircle,
  Sparkles,
  Palette,
  Users,
  FileText,
  Wand2,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Features — Klikr",
  description: "Slide types, AI, branding, and exports. Everything you can run with Klikr.",
};

type Feature = {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  body: string;
};

const slideTypes: Feature[] = [
  { Icon: BarChart3, title: "Multiple choice polls", body: "Tap an option, watch the bar grow. The classic, instant." },
  { Icon: Cloud, title: "Word clouds", body: "Submit a word — popular ones get bigger. Great for icebreakers and brainstorming." },
  { Icon: MessageSquare, title: "Open Q&A with upvotes", body: "The room asks questions. The best ones float to the top." },
  { Icon: Trophy, title: "Live quizzes", body: "Timed questions, score for speed, top three on the podium with confetti." },
  { Icon: Star, title: "Ratings and NPS", body: "1–5 or 0–10 with custom labels. Take the temperature in seconds." },
  { Icon: HelpCircle, title: "Open-ended responses", body: "Free text answers from anyone. See them stream in live." },
  { Icon: PlayCircle, title: "Embedded slides", body: "Drop a Google Slides or PowerPoint Web URL straight into your deck." },
];

const proExtras: Feature[] = [
  { Icon: Sparkles, title: "AI deck generation", body: "Describe your meeting in one line — your slides land in seconds." },
  { Icon: Wand2, title: "AI option suggestions", body: "Out of ideas? Ask AI to fill the answer choices for any poll or quiz." },
  { Icon: Palette, title: "Custom branding", body: "Add your logo and colors. Audience screens match your brand." },
  { Icon: Users, title: "Co-edit with teammates", body: "Invite colleagues to edit decks. Everyone works on the same slides." },
  { Icon: FileText, title: "Excel + PDF exports", body: "Get a clean spreadsheet or printable report after every session." },
];

export default async function FeaturesPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavBar active="features" />

      <header className="mt-12 max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.18em] muted-text">Features</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Everything you can run with Klikr.
        </h1>
        <p className="mt-3 text-[17px] muted-text">
          Seven slide types your audience can answer in real time, plus the AI and branding
          that turn quick polls into proper presentations.
        </p>
      </header>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">Slide types</h2>
        <p className="mt-1 text-sm muted-text">All free, on every plan.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slideTypes.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-semibold tracking-tight">For paid plans</h2>
        <p className="mt-1 text-sm muted-text">
          Free while we grow to 1,000 hosts —{" "}
          <Link href="/plans" className="underline-offset-4 hover:underline" style={{ color: "var(--blue)" }}>
            see pricing
          </Link>
          .
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {proExtras.map((f) => (
            <FeatureCard key={f.title} {...f} accent />
          ))}
        </div>
      </section>

      <section className="mt-20 panel-soft flex flex-wrap items-center justify-between gap-4 p-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Try it without signing up.</h2>
          <p className="mt-1 max-w-xl text-sm muted-text">
            Walk through a real session — polls, word cloud, quiz, podium — in your browser.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/demo" className="btn-primary">
            See it live <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/templates" className="btn-ghost">Browse templates</Link>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ Icon, title, body, accent }: Feature & { accent?: boolean }) {
  return (
    <div className={accent ? "panel p-5" : "panel-soft p-5"}>
      <Icon className="h-5 w-5" style={{ color: accent ? "var(--blue)" : "var(--ink)" }} />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm muted-text">{body}</p>
    </div>
  );
}
