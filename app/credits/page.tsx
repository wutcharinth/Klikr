import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { TOPUP_PACKAGES, MONTHLY_CREDITS, CREDIT_COSTS, refreshAndGetBalance } from "@/lib/credits";
import type { PlanTier } from "@/lib/types";
import NavBar from "@/components/NavBar";

export async function generateMetadata() {
  const t = await getTranslations("credits");
  return { title: t("metaTitle") };
}

export default async function CreditsPage() {
  const t = await getTranslations("credits");
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login?next=/credits");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", u.user.id)
    .maybeSingle();
  const tier = (profile?.plan_tier as PlanTier) ?? "pro";
  const balance = await refreshAndGetBalance(u.user.id);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <NavBar active="credits" />

      <header className="mt-10">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-[15px] muted-text">{t("intro")}</p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="panel p-6">
          <p className="text-[11px] uppercase tracking-wider muted-text">{t("yourBalance")}</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight" style={{ color: "var(--blue)" }}>
            {balance.toLocaleString()}
          </p>
          <p className="mt-1 text-xs muted-text">{t("credits")}</p>
        </div>
        <div className="panel-soft p-6">
          <p className="text-[11px] uppercase tracking-wider muted-text">{t("yourPlan")}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight capitalize">{tier}</p>
          <p className="mt-1 text-xs muted-text">{MONTHLY_CREDITS[tier]} {t("perMonth")}</p>
        </div>
        <div className="panel-soft p-6">
          <p className="text-[11px] uppercase tracking-wider muted-text">{t("wantMore")}</p>
          <Link href="/plans" className="btn-primary mt-3 inline-flex">{t("upgrade")}</Link>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">{t("topupTitle")}</h2>
        <p className="mt-1 text-sm muted-text">{t("topupIntro")}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {TOPUP_PACKAGES.map((p, i) => (
            <div key={p.id} className={i === 1 ? "panel p-6" : "panel-soft p-6"} style={i === 1 ? { borderColor: "var(--blue)" } : { border: "1px solid var(--line)" }}>
              <p className="text-sm font-medium">{p.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {p.credits.toLocaleString()} <span className="text-xs muted-text font-normal">{t("credits")}</span>
              </p>
              <p className="mt-1 text-sm muted-text">${p.usd.toFixed(2)}</p>
              <button className="btn-primary mt-5 w-full" disabled>
                {t("topupComingSoon")}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs muted-text">{t("topupNote")}</p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">{t("costsTitle")}</h2>
        <div className="panel mt-6 divide-y" style={{ background: "var(--white)" }}>
          {Object.entries(CREDIT_COSTS).map(([route, cost]) => (
            <div key={route} className="flex items-center justify-between p-4 text-sm">
              <span className="flex items-center gap-2">
                {route.startsWith("generate") ? (
                  <Sparkles className="h-4 w-4" style={{ color: "var(--blue)" }} />
                ) : (
                  <Zap className="h-4 w-4 muted-text" />
                )}
                {t(`routes.${route}` as `routes.${"generate-presentation" | "suggest-options" | "summarize-responses" | "cluster-wordcloud" | "recommend-templates"}`)}
              </span>
              <span className="mono">{cost} {t("credits")}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
