import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import NavBar from "@/components/NavBar";
import StartTiles from "@/components/StartTiles";
import { HomeLanding } from "@/components/HomeLanding";
import UseCaseTabs from "@/components/UseCaseTabs";
import EasyToStart from "@/components/EasyToStart";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("host");
  return {
    title: t("metaTitle"),
    description: t("intro"),
  };
}

export default async function HostPage() {
  const t = await getTranslations("host");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1100px]">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-6">
        <NavBar />
      </div>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-12 text-center">
        <div className="anim-fade-up flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] muted-text">
          <span className="live-dot" /> {t("forHosts")}
        </div>
        <h1 className="anim-fade-up delay-100 mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="anim-fade-up delay-200 mx-auto mt-4 max-w-2xl text-base sm:text-lg muted-text">
          {t("intro")}
        </p>
        <div className="anim-fade-up delay-300 mt-8 flex items-center justify-center gap-3">
          <Link href={signedIn ? "/dashboard" : "/login"} className="btn-primary press">
            {signedIn ? t("openDashboard") : t("startHosting")}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/demo" className="btn-ghost press">{t("watchDemo")}</Link>
        </div>
        <p className="mt-3 text-xs muted-text">
          {t("audienceJoining")}
          <Link href="/" className="underline-offset-4 hover:underline">{t("enterCode")}</Link>
        </p>
      </section>

      <StartTiles signedIn={signedIn} />

      <UseCaseTabs />

      <EasyToStart signedIn={signedIn} />

      <HomeLanding />
    </main>
  );
}
