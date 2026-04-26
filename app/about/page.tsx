import Link from "next/link";
import { getTranslations } from "next-intl/server";
import NavBar from "@/components/NavBar";
import { ArrowRight, Sparkles, Zap, Shield, MessageCircle } from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("about");
  return {
    title: t("metaTitle"),
    description: t("subtitle"),
  };
}

const beliefIcons = [Zap, Sparkles, Shield, MessageCircle];
const shotImages = [
  "/showcase/10-demo-howitworks.png",
  "/showcase/11-demo-mcq.png",
  "/showcase/12-demo-wordcloud.png",
  "/showcase/14-demo-quiz.png",
];

export default async function AboutPage() {
  const t = await getTranslations("about");
  const beliefs = t.raw("beliefs") as { title: string; body: string }[];
  const doItems = t.raw("doItems") as [string, string][];
  const shots = t.raw("shots") as { title: string; body: string }[];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <NavBar />

      <header className="mt-10 max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.18em] muted-text">{t("eyebrow")}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-4 text-[17px] muted-text">{t("subtitle")}</p>
      </header>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">{t("whatYouGet")}</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {beliefs.map((b, i) => {
            const Icon = beliefIcons[i];
            return (
              <div key={b.title} className="panel p-5">
                <Icon className="h-5 w-5" style={{ color: "var(--blue)" }} />
                <p className="mt-3 font-medium">{b.title}</p>
                <p className="mt-1 text-sm muted-text">{b.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">{t("whatYouCanDo")}</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {doItems.map(([title, body]) => (
            <li key={title} className="panel-soft p-4">
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-sm muted-text">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">{t("audienceSeesTitle")}</h2>
        <p className="mt-2 text-sm muted-text">{t("audienceSeesIntro")}</p>
        <div className="mt-8 space-y-10">
          {shots.map((s, i) => (
            <figure key={s.title} className="space-y-3">
              <div className="overflow-hidden rounded-2xl" style={{ background: "#0b0b0c", border: "1px solid var(--line)", aspectRatio: "16 / 10" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={shotImages[i]} alt={s.title} className="block h-full w-full" style={{ objectFit: "contain", padding: "3%" }} />
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
        <h2 className="text-2xl font-semibold tracking-tight">{t("compareTitle")}</h2>
        <p className="mt-2 text-sm muted-text">{t("compareIntro")}</p>
        <div className="mt-6 overflow-hidden rounded-xl" style={{ border: "1px solid var(--line)" }}>
          <table className="w-full text-sm">
            <thead style={{ background: "var(--pale)" }}>
              <tr>
                <th className="px-4 py-3 text-left font-medium muted-text">{t("compareTool")}</th>
                <th className="px-4 py-3 text-right font-medium muted-text">{t("comparePro")}</th>
                <th className="px-4 py-3 text-right font-medium muted-text">{t("compareCap")}</th>
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
          <h2 className="text-2xl font-semibold tracking-tight">{t("ctaTitle")}</h2>
          <p className="mt-1 text-sm muted-text">{t("ctaBody")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/demo" className="btn-primary">
            {t("seeLive")} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/templates" className="btn-ghost">{t("browseTemplates")}</Link>
        </div>
      </section>
    </main>
  );
}
