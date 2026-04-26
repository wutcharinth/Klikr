import Link from "next/link";
import { LayoutTemplate, Sparkles, Plus } from "lucide-react";

export default function EmptyDashboard() {
  const tiles = [
    {
      href: "/templates",
      Icon: LayoutTemplate,
      title: "Start from a template",
      body: "Hundreds of ready-to-go decks across icebreakers, quizzes, retros, and more.",
    },
    {
      href: "/dashboard?ai=1",
      Icon: Sparkles,
      title: "Generate with AI",
      body: "Describe your meeting in one line. We'll build the slides for you.",
    },
    {
      href: "#create",
      Icon: Plus,
      title: "Build from scratch",
      body: "Use the form above to start with a blank deck.",
    },
  ];
  return (
    <li className="panel-soft p-8">
      <h3 className="text-base font-semibold">Pick how you want to start</h3>
      <p className="mt-1 text-sm muted-text">Three quick ways into your first session.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.title} href={t.href} className="panel p-4 transition-transform hover:-translate-y-0.5">
            <t.Icon className="h-5 w-5" style={{ color: "var(--blue)" }} />
            <p className="mt-2 font-medium">{t.title}</p>
            <p className="mt-1 text-xs muted-text">{t.body}</p>
          </Link>
        ))}
      </div>
    </li>
  );
}
