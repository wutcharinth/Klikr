import Link from "next/link";
import { getTranslations } from "next-intl/server";
import NavBar from "@/components/NavBar";
import { Reveal } from "@/components/Reveal";
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
import { PollMotion } from "@/components/remotion/PollMotion";
import { WordCloudMotion } from "@/components/remotion/WordCloudMotion";
import { QAMotion } from "@/components/remotion/QAMotion";
import { QuizMotion } from "@/components/remotion/QuizMotion";
import { AIDeckGenerationMotion } from "@/components/remotion/AIDeckGenerationMotion";
import { HowItWorksMotion } from "@/components/remotion/HowItWorksMotion";

export async function generateMetadata() {
  const t = await getTranslations("features");
  return {
    title: t("metaTitle"),
    description: t("intro"),
  };
}

const slideTypeIcons = [BarChart3, Cloud, MessageSquare, Trophy, Star, HelpCircle, PlayCircle];
const proExtraIcons = [Sparkles, Wand2, Palette, Users, FileText];

export default async function FeaturesPage() {
  const t = await getTranslations("features");
  const slideTypes = t.raw("slideTypes") as { title: string; body: string }[];
  const proExtras = t.raw("proExtras") as { title: string; body: string }[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavBar active="features" />

      <header className="mt-12 max-w-3xl">
        <p className="anim-fade-up text-[11px] uppercase tracking-[0.18em] muted-text">{t("eyebrow")}</p>
        <h1 className="anim-fade-up delay-100 mt-2 text-4xl font-semibold tracking-tight">
          <span className="headline-shine">{t("title")}</span>
        </h1>
        <p className="anim-fade-up delay-300 mt-3 text-[17px] muted-text">{t("intro")}</p>
      </header>

      {/* Animated feature cards — premium SaaS feel hero strip */}
      <section className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <PollMotion />
        <WordCloudMotion />
        <QAMotion />
        <QuizMotion />
        <AIDeckGenerationMotion />
      </section>

      <section className="mt-16">
        <Reveal>
          <h2 className="text-2xl font-semibold tracking-tight">{t("slideTypesTitle")}</h2>
          <p className="mt-1 text-sm muted-text">{t("slideTypesNote")}</p>
        </Reveal>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slideTypes.map((f, i) => {
            const Icon = slideTypeIcons[i];
            const d = ((i % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
            return (
              <Reveal key={f.title} delay={d}>
                <div className="tilt panel-soft p-5">
                  <Icon className="h-5 w-5" style={{ color: "var(--ink)" }} />
                  <p className="mt-3 font-medium">{f.title}</p>
                  <p className="mt-1 text-sm muted-text">{f.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="mt-20">
        <Reveal>
          <h2 className="text-2xl font-semibold tracking-tight">{t("paidTitle")}</h2>
          <p className="mt-1 text-sm muted-text">
            {t("paidNoteBefore")}
            <Link href="/plans" className="underline-offset-4 hover:underline" style={{ color: "var(--blue)" }}>
              {t("paidNoteLink")}
            </Link>
            {t("paidNoteAfter")}
          </p>
        </Reveal>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {proExtras.map((f, i) => {
            const Icon = proExtraIcons[i];
            const d = ((i % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
            return (
              <Reveal key={f.title} delay={d}>
                <div className="tilt panel p-5">
                  <Icon className="h-5 w-5" style={{ color: "var(--blue)" }} />
                  <p className="mt-3 font-medium">{f.title}</p>
                  <p className="mt-1 text-sm muted-text">{f.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <Reveal>
        <section className="mt-20 panel-soft flex flex-wrap items-center justify-between gap-4 p-8">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{t("ctaTitle")}</h2>
            <p className="mt-1 max-w-xl text-sm muted-text">{t("ctaBody")}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/demo" className="btn-primary sheen">
              {t("seeLive")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/templates" className="btn-ghost">{t("browseTemplates")}</Link>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
