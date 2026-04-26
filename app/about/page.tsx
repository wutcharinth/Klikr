import Link from "next/link";
import NavBar from "@/components/NavBar";
import { ArrowRight, Sparkles, Zap, Shield, MessageCircle } from "lucide-react";

export const metadata = {
  title: "About Klikr",
  description: "Why Klikr exists, what we believe, and what makes it different.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <NavBar />

      <header className="mt-10 max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.18em] muted-text">About Klikr</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Live audience engagement for a fraction of the price.
        </h1>
        <p className="mt-4 text-[17px] muted-text">
          The same polls, word clouds, Q&amp;A, and quizzes you'd run on Mentimeter — for $4.99 instead
          of $24.99. Right now everything is free while we grow.
        </p>
      </header>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">What you get</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Belief
            Icon={Zap}
            title="Audiences join in seconds"
            body="A six-letter code or a QR scan. No app store, no account creation, no email collection. Just a nickname and they're in."
          />
          <Belief
            Icon={Sparkles}
            title="AI builds your decks"
            body="Type one line — 'Q4 retro for engineering' — and your slides are ready. Edit them or present as-is."
          />
          <Belief
            Icon={Shield}
            title="No card while we grow"
            body="Every feature is unlocked until we hit 1,000 hosts. After that, $1.99 or $4.99 a month — and you'll be grandfathered in."
          />
          <Belief
            Icon={MessageCircle}
            title="Designed for the room"
            body="The host's screen and the audience's phones stay out of each other's way. Your content takes the stage."
          />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">What you can do with Klikr</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            ["Live polls and word clouds", "Tap once, watch the room think."],
            ["Open Q&A with upvotes", "The best questions float to the top."],
            ["Kahoot-style quizzes", "Timed, scored, with a real podium at the end."],
            ["Ratings and NPS", "5-point and 0–10 with custom labels."],
            ["Embedded slides", "Bring your Google Slides or PowerPoint right into the deck."],
            ["AI deck generation", "Describe your meeting in one line. We'll build it."],
          ].map(([t, body]) => (
            <li key={t} className="panel-soft p-4">
              <p className="font-medium">{t}</p>
              <p className="mt-1 text-sm muted-text">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">What your audience sees</h2>
        <p className="mt-2 text-sm muted-text">From scanning the QR to seeing live results — exactly what shows up on every screen.</p>
        <div className="mt-8 space-y-10">
          {[
            { src: "/showcase/10-demo-howitworks.png", title: "Joining a session", body: "Your audience scans a QR or types a six-letter code. They pick a nickname. They're in." },
            { src: "/showcase/11-demo-mcq.png", title: "Live multiple choice", body: "Tap an option on a phone — the bar grows on the host's screen the moment it's tapped." },
            { src: "/showcase/12-demo-wordcloud.png", title: "Word clouds that breathe", body: "Words submitted from the room arrive in real time. The most popular grow biggest." },
            { src: "/showcase/14-demo-quiz.png", title: "Quizzes with a podium", body: "Timed questions, score for speed, top three revealed at the end with confetti." },
          ].map((s) => (
            <figure key={s.src} className="space-y-3">
              <div className="overflow-hidden rounded-2xl" style={{ background: "#0b0b0c", border: "1px solid var(--line)", aspectRatio: "16 / 10" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt={s.title} className="block h-full w-full" style={{ objectFit: "contain", padding: "3%" }} />
              </div>
              <figcaption>
                <p className="text-lg font-medium">{s.title}</p>
                <p className="mt-1 text-sm muted-text">{s.body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mt-16 panel p-8">
        <h2 className="text-2xl font-semibold tracking-tight">How does it compare?</h2>
        <p className="mt-2 text-sm muted-text">
          Same slide types, same live results, same template gallery. We undercut by being smaller
          and AI-first.
        </p>
        <div className="mt-6 overflow-hidden rounded-xl" style={{ border: "1px solid var(--line)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--pale)" }}>
              <tr>
                <th className="px-4 py-3 text-left font-medium muted-text">Tool</th>
                <th className="px-4 py-3 text-right font-medium muted-text">Pro</th>
                <th className="px-4 py-3 text-right font-medium muted-text">Audience cap (free)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: "1px solid var(--line)" }}>
                <td className="px-4 py-3 font-semibold" style={{ color: "var(--blue)" }}>Klikr</td>
                <td className="px-4 py-3 text-right">$4.99 / mo</td>
                <td className="px-4 py-3 text-right">100 / mo</td>
              </tr>
              <tr style={{ borderTop: "1px solid var(--line)" }}>
                <td className="px-4 py-3">Mentimeter</td>
                <td className="px-4 py-3 text-right muted-text">$24.99 / mo</td>
                <td className="px-4 py-3 text-right muted-text">50 / mo</td>
              </tr>
              <tr style={{ borderTop: "1px solid var(--line)" }}>
                <td className="px-4 py-3">Slido</td>
                <td className="px-4 py-3 text-right muted-text">$16 / mo</td>
                <td className="px-4 py-3 text-right muted-text">100 / event</td>
              </tr>
              <tr style={{ borderTop: "1px solid var(--line)" }}>
                <td className="px-4 py-3">Polls Everywhere</td>
                <td className="px-4 py-3 text-right muted-text">$34 / mo</td>
                <td className="px-4 py-3 text-right muted-text">25 / event</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16 flex flex-wrap items-center justify-between gap-4 panel-soft p-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Want to see it work?</h2>
          <p className="mt-1 text-sm muted-text">Run the live demo — no signup needed.</p>
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

function Belief({ Icon, title, body }: { Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; title: string; body: string }) {
  return (
    <div className="panel p-5">
      <Icon className="h-5 w-5" style={{ color: "var(--blue)" }} />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm muted-text">{body}</p>
    </div>
  );
}
