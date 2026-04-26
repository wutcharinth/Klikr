import Link from "next/link";
import { ArrowLeft, ExternalLink, Play } from "lucide-react";
import { getTranslations } from "next-intl/server";
import NavBar from "@/components/NavBar";

export async function generateMetadata() {
  const t = await getTranslations("demo");
  return {
    title: t("metaTitle"),
    description: t("intro"),
  };
}

const PREVIEW_IMAGES = [
  "/showcase/11-demo-mcq.png",
  "/showcase/12-demo-wordcloud.png",
  "/showcase/13-demo-open.png",
  "/showcase/14-demo-quiz.png",
];

export default async function DemoPage() {
  const t = await getTranslations("demo");
  const previews = t.raw("previews") as { title: string; body: string }[];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <NavBar />

      <header className="mt-10 max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.18em] muted-text">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 text-[15px] sm:text-[17px] muted-text">{t("intro")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="/demo.html" className="btn-primary">
            <Play className="h-4 w-4" /> {t("startDemo")}
          </a>
          <Link href="/templates" className="btn-ghost">{t("orPickTemplate")}</Link>
        </div>
      </header>

      {/* Mobile: vertical preview cards. Desktop: iframe. */}
      <section className="mt-10 sm:hidden">
        <h2 className="text-xs font-medium uppercase tracking-wider muted-text">{t("previewTitle")}</h2>
        <p className="mt-1 text-sm muted-text">{t("previewIntro")}</p>
        <div className="mt-5 space-y-4">
          {previews.map((p, i) => (
            <article key={p.title} className="panel overflow-hidden p-0">
              <div
                className="overflow-hidden"
                style={{ background: "#0b0b0c", aspectRatio: "16 / 10" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={PREVIEW_IMAGES[i]}
                  alt={p.title}
                  className="block h-full w-full"
                  style={{ objectFit: "contain", padding: "3%" }}
                />
              </div>
              <div className="p-4">
                <p className="text-base font-semibold tracking-tight">{p.title}</p>
                <p className="mt-1 text-sm muted-text">{p.body}</p>
              </div>
            </article>
          ))}
        </div>
        <a
          href="/demo.html"
          className="btn-primary mt-6 w-full"
          style={{ paddingTop: 14, paddingBottom: 14 }}
        >
          <ExternalLink className="h-4 w-4" /> {t("openFullDemo")}
        </a>
      </section>

      <section className="mt-12 hidden panel overflow-hidden sm:block" style={{ aspectRatio: "16 / 10" }}>
        <iframe
          src="/demo.html"
          title="Klikr interactive demo"
          className="h-full w-full"
          style={{ border: "none" }}
        />
      </section>

      <section className="mt-16 grid gap-3 sm:grid-cols-2">
        <Link href="/templates" className="panel-soft p-5 hover:border-[var(--blue)]">
          <p className="font-medium">{t("readyTitle")}</p>
          <p className="mt-1 text-sm muted-text">{t("readyBody")}</p>
          <span className="mt-3 inline-flex text-sm" style={{ color: "var(--blue)" }}>{t("browseTemplates")}</span>
        </Link>
        <Link href="/login" className="panel-soft p-5 hover:border-[var(--blue)]">
          <p className="font-medium">{t("tryTitle")}</p>
          <p className="mt-1 text-sm muted-text">{t("tryBody")}</p>
          <span className="mt-3 inline-flex text-sm" style={{ color: "var(--blue)" }}>{t("signIn")}</span>
        </Link>
      </section>

      <p className="mt-12 muted-text text-xs">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-[var(--ink)]">
          <ArrowLeft className="h-3 w-3" /> {t("backHome")}
        </Link>
      </p>
    </main>
  );
}
