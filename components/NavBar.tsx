import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * Top nav modeled after Mentimeter's: a horizontal list of marketing links
 * (Features · Templates · Pricing · Resources) on the left of the right-side
 * Log in / Sign up cluster.
 *
 * Logo links to:
 *   - /dashboard if the user is signed in
 *   - /          for visitors (homepage = audience join)
 */
export default async function NavBar({
  active,
}: {
  active?: "features" | "templates" | "plans" | "credits" | "dashboard" | "admin" | "demo" | "about";
}) {
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
    <nav className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-6">
        <Link href={homeHref} className="group inline-flex items-center gap-2.5">
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
          {link("/features", "Features", "features")}
          {link("/templates", "Templates", "templates")}
          {link("/plans", "Pricing", "plans")}
          <ResourcesMenu activeDemo={active === "demo"} activeAbout={active === "about"} />
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {signedIn ? (
          <>
            {link("/credits", "Credits", "credits")}
            <Link href="/dashboard" className="btn-primary">My dashboard</Link>
          </>
        ) : (
          <>
            <Link href="/login" className="muted-text hover:text-[var(--ink)]">Log in</Link>
            <Link href="/login" className="btn-primary">Sign up free</Link>
          </>
        )}
      </div>
    </nav>
  );
}

function ResourcesMenu({ activeDemo, activeAbout }: { activeDemo: boolean; activeAbout: boolean }) {
  const active = activeDemo || activeAbout;
  return (
    <details className="group relative">
      <summary
        className={`cursor-pointer list-none text-sm transition-colors ${
          active ? "text-[var(--ink)] font-medium" : "muted-text hover:text-[var(--ink)]"
        }`}
      >
        Resources <span className="ml-0.5 text-[10px]">▾</span>
      </summary>
      <div className="panel absolute left-0 top-7 z-30 w-56 p-2 shadow-xl">
        <Link href="/demo" className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--pale)]">
          <p className="font-medium">Live demo</p>
          <p className="muted-text text-xs">Try a session, no signup.</p>
        </Link>
        <Link href="/about" className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--pale)]">
          <p className="font-medium">About Klikr</p>
          <p className="muted-text text-xs">What we do and why.</p>
        </Link>
        <Link href="/host" className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--pale)]">
          <p className="font-medium">For hosts</p>
          <p className="muted-text text-xs">Everything you can build.</p>
        </Link>
      </div>
    </details>
  );
}
