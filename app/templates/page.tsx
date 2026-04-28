import { Sparkles } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { Template } from "@/lib/types";
import NavBar from "@/components/NavBar";
import TemplateSearch from "@/components/TemplateSearch";
import { QuizMotion } from "@/components/remotion/QuizMotion";
import { PollMotion } from "@/components/remotion/PollMotion";

export async function generateMetadata() {
  const t = await getTranslations("templates");
  return {
    title: t("metaTitle"),
    description: t("intro"),
  };
}

export default async function TemplatesPage() {
  const t = await getTranslations("templates");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("visibility", "public")
    .order("usage_count", { ascending: false });

  const templates = (data ?? []) as Template[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavBar active="templates" />

      <header className="mt-10 max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-3 text-[17px] text-[var(--neutral)]">{t("intro")}</p>
      </header>

      <section className="mt-10 grid gap-5 sm:grid-cols-2">
        <QuizMotion />
        <PollMotion />
      </section>

      {error ? (
        <div className="panel-soft mt-8 p-6 text-sm">
          <p className="font-medium">{t("errorTitle")}</p>
          <p className="mt-1 muted-text">
            {t("errorBody1")}
            <code className="mono">npm run migrate</code>
            {t("errorBody2")}
            <code className="mono">DATABASE_URL</code>
            {t("errorBody3")}
          </p>
          <p className="mt-2 muted-text text-xs">{t("errorDetail", { message: error.message })}</p>
        </div>
      ) : (
        <TemplateSearch templates={templates} />
      )}

      <section className="mt-16 panel-soft flex flex-wrap items-center justify-between gap-4 p-8">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("ctaTitle")}</h2>
          <p className="mt-2 max-w-xl text-sm muted-text">{t("ctaBody")}</p>
        </div>
        <Link href="/dashboard?ai=1" className="btn-primary">
          <Sparkles className="h-4 w-4" /> {t("ctaButton")}
        </Link>
      </section>
    </main>
  );
}
