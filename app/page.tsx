import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JoinForm } from "@/components/JoinForm";
import { ArrowRight } from "lucide-react";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";

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

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="mx-auto w-full max-w-6xl flex-none px-6 pt-6">
        <NavBar />
      </div>

      <div className="absolute inset-0 -z-10">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-8 text-center">
        <div className="anim-fade-up flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] muted-text">
          <span className="live-dot" /> {t("joiningBadge")}
        </div>

        <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">
          {t("headline")}
        </h1>
        <p className="anim-fade-up delay-300 mt-4 max-w-md text-base muted-text">
          {t("subhead")}<span className="whitespace-nowrap">{t("subheadNoSignup")}</span>
        </p>

        <JoinForm action={joinAction} />

        <p className="anim-fade-up delay-700 mt-5 text-xs muted-text">
          {t("tip")}
        </p>
      </div>

      <section className="mx-auto mb-8 w-full max-w-3xl flex-none px-6">
        <Link
          href={signedIn ? "/dashboard" : "/host"}
          className="panel block p-6 transition-transform hover:-translate-y-0.5"
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
            <span className="btn-primary">
              {signedIn ? t("openDashboard") : t("getStarted")}
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>

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
      </section>
    </main>
  );
}
