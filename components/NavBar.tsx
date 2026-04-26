import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import LocaleSwitcher from "./LocaleSwitcher";
import ThemeToggle from "./ThemeToggle";

export default async function NavBar({
  active,
}: {
  active?: "features" | "templates" | "plans" | "credits" | "dashboard" | "admin" | "demo" | "about";
}) {
  const t = await getTranslations("nav");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);
  const homeHref = signedIn ? "/dashboard" : "/";

  const link = (href: string, label: string, key: typeof active) => (
    <Link
      key={key}
      href={href}
      className={`text-sm transition-colors ${
        active === key ? "text-[var(--ink)] font-medium" : "muted-text hover:text-[var(--ink)]"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="flex items-center justify-between gap-2 sm:gap-6">
      <div className="flex shrink-0 items-center gap-3 sm:gap-6">
        <Link href={homeHref} className="group inline-flex shrink-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/klikr-logo.png"
            alt=""
            aria-hidden
            className="h-8 w-8 rounded-[10px] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-[-4deg]"
            style={{ boxShadow: "0 6px 18px -8px rgba(99, 102, 241, 0.6)" }}
          />
          <span className="text-xl font-semibold tracking-tight">Klikr</span>
        </Link>
        <div className="hidden items-center gap-5 md:flex">
          {link("/features", t("features"), "features")}
          {link("/templates", t("templates"), "templates")}
          {link("/plans", t("pricing"), "plans")}
          <ResourcesMenu activeDemo={active === "demo"} activeAbout={active === "about"} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 text-sm">
        <LocaleSwitcher />
        <ThemeToggle />
        {signedIn ? (
          <>
            <Link href="/credits" className={`hidden sm:inline-block text-sm transition-colors ${active === "credits" ? "text-[var(--ink)] font-medium" : "muted-text hover:text-[var(--ink)]"}`}>{t("credits")}</Link>
            <Link href="/dashboard" className="btn-primary text-xs sm:text-sm" style={{ padding: "8px 14px" }}>{t("myDashboard")}</Link>
          </>
        ) : (
          <>
            <Link href="/login" className="hidden sm:inline-block muted-text hover:text-[var(--ink)]">{t("login")}</Link>
            <Link href="/login" className="btn-primary text-xs sm:text-sm" style={{ padding: "8px 14px" }}>
              <span className="sm:hidden">{t("signupShort")}</span>
              <span className="hidden sm:inline">{t("signupFree")}</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

async function ResourcesMenu({ activeDemo, activeAbout }: { activeDemo: boolean; activeAbout: boolean }) {
  const t = await getTranslations("nav");
  const active = activeDemo || activeAbout;
  return (
    <details className="group relative">
      <summary
        className={`cursor-pointer list-none text-sm transition-colors ${
          active ? "text-[var(--ink)] font-medium" : "muted-text hover:text-[var(--ink)]"
        }`}
      >
        {t("resources")} <span className="ml-0.5 text-[10px]">▾</span>
      </summary>
      <div className="panel absolute left-0 top-7 z-30 w-56 p-2 shadow-xl">
        <Link href="/demo" className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--pale)]">
          <p className="font-medium">{t("demo")}</p>
          <p className="muted-text text-xs">{t("demoBlurb")}</p>
        </Link>
        <Link href="/about" className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--pale)]">
          <p className="font-medium">{t("about")}</p>
          <p className="muted-text text-xs">{t("aboutBlurb")}</p>
        </Link>
        <Link href="/host" className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--pale)]">
          <p className="font-medium">{t("forHosts")}</p>
          <p className="muted-text text-xs">{t("forHostsBlurb")}</p>
        </Link>
      </div>
    </details>
  );
}
