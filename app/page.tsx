import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JoinForm } from "@/components/JoinForm";
import { ArrowRight } from "lucide-react";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";
import { LiveHeroDemo } from "@/components/LiveHeroDemo";
import { Reveal } from "@/components/Reveal";

async function joinAction(formData: FormData) {
  "use server";
  const raw = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!raw) return;
  redirect(`/play/${encodeURIComponent(raw)}`);
}

export default async function Landing() {
  const t = await getTranslations("landing");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Klikr",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Real-time audience interaction — polls, word clouds, quizzes, Q&A, ratings, rankings — running in any browser with no app install.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    url: "https://klikrapp.com",
    aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", ratingCount: "120" },
  };

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto w-full max-w-6xl flex-none px-6 pt-6">
        <NavBar />
      </div>

      <div className="absolute inset-0 -z-10">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-14">
        <div className="text-center lg:text-left">
          <div className="anim-fade-up inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] muted-text">
            <span className="live-dot pulse-ring" /> {t("joiningBadge")}
          </div>

          <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
            <span className="headline-shine">{t("headline")}</span>
          </h1>
          <p className="anim-fade-up delay-300 mt-4 max-w-md text-base muted-text mx-auto lg:mx-0">
            {t("subhead")}<span className="whitespace-nowrap">{t("subheadNoSignup")}</span>
          </p>

          <div className="anim-fade-up delay-500 flex justify-center lg:justify-start">
            <JoinForm action={joinAction} />
          </div>

          <p className="anim-fade-up delay-700 mt-5 text-xs muted-text">
            {t("tip")}
          </p>
        </div>

        <div className="anim-fade-up delay-300 flex justify-center lg:justify-end">
          <LiveHeroDemo />
        </div>
      </div>

      <section className="mx-auto mb-12 w-full max-w-3xl flex-none px-6">
        <Reveal>
          <Link
            href={signedIn ? "/dashboard" : "/host"}
            className="tilt panel block p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] muted-text">{t("forHosts")}</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  {t("hostCardTitle")}
                </h2>
                <p className="mt-1 text-sm muted-text">
                  {t("hostCardBody")}
                </p>
              </div>
              <span className="btn-primary sheen">
                {signedIn ? t("openDashboard") : t("getStarted")}
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </Reveal>

        <Reveal delay={1}>
          <p className="mt-4 text-center text-xs muted-text">
            {t("curiousFirst")}
            <Link href="/demo" className="hover:text-[var(--ink)] underline-offset-4 hover:underline">
              {t("seeDemo")}
            </Link>{" "}
            ·{" "}
            <Link href="/about" className="hover:text-[var(--ink)] underline-offset-4 hover:underline">
              {t("aboutKlikr")}
            </Link>
          </p>
        </Reveal>
      </section>
    </main>
  );
}
