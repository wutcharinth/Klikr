import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";
import { getTranslations } from "next-intl/server";
import NavBar from "@/components/NavBar";

export async function generateMetadata() {
  const t = await getTranslations("demo");
  return {
    title: t("metaTitle"),
    description: t("intro"),
  };
}

export default async function DemoPage() {
  const t = await getTranslations("demo");

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <NavBar />

      <header className="mt-10 max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.18em] muted-text">{t("eyebrow")}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-[17px] muted-text">{t("intro")}</p>
        <div className="mt-6 flex gap-3">
          <a href="/demo.html" className="btn-primary">
            <Play className="h-4 w-4" /> {t("startDemo")}
          </a>
          <Link href="/templates" className="btn-ghost">{t("orPickTemplate")}</Link>
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
