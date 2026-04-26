import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AI_MONTHLY_CAP_USD, monthlyUsdSpend } from "@/lib/ai";
import { Users, Activity, Sparkles, Coins } from "lucide-react";
import NavBar from "@/components/NavBar";

const SIGNUP_THRESHOLD = 1000;

export const metadata = { title: "Admin — Klikr" };

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", u.user.id).maybeSingle();
  if (!me?.is_admin) notFound();

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: signups },
    { count: presentations },
    { count: responses },
    { count: participants },
    { count: dau },
    { count: mauApprox },
    { count: aiCalls },
    monthlyUsd,
    { data: topTemplates },
    { data: tierBreakdown },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("presentations").select("id", { count: "exact", head: true }),
    supabase.from("responses").select("id", { count: "exact", head: true }),
    supabase.from("participants").select("id", { count: "exact", head: true }),
    supabase
      .from("presentations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", dayAgo),
    supabase
      .from("presentations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthAgo),
    supabase.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", monthAgo),
    monthlyUsdSpend(),
    supabase.from("templates").select("slug, title, usage_count").order("usage_count", { ascending: false }).limit(10),
    supabase.from("profiles").select("plan_tier"),
  ]);

  const breakdown: Record<string, number> = { free: 0, basic: 0, pro: 0 };
  for (const row of (tierBreakdown ?? []) as { plan_tier: string }[]) {
    breakdown[row.plan_tier] = (breakdown[row.plan_tier] ?? 0) + 1;
  }

  const usedCount = signups ?? 0;
  const pct = Math.min(100, (usedCount / SIGNUP_THRESHOLD) * 100);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <NavBar active="admin" />
      <p className="mt-2 text-[11px] uppercase tracking-wider muted-text">Admin</p>

      <header className="mt-6 panel p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider muted-text">Free-for-all milestone</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {usedCount.toLocaleString()} <span className="muted-text text-base">/ {SIGNUP_THRESHOLD.toLocaleString()} hosts</span>
            </p>
            <p className="mt-1 text-sm muted-text">When this hits 1,000, set <code className="mono">FREE_FOR_ALL=false</code> on Railway.</p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: pct < 80 ? "#e8f5e9" : pct < 100 ? "#fff3e0" : "#ffebee",
              color: pct < 80 ? "#1b5e20" : pct < 100 ? "#7a4a00" : "#b71c1c",
            }}
          >
            {pct.toFixed(0)}%
          </span>
        </div>
        <div className="mt-4 h-2 w-full rounded-full" style={{ background: "var(--pale)" }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--blue)" }} />
        </div>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-4">
        <Stat Icon={Users} label="DAU (signups today)" value={dau ?? 0} />
        <Stat Icon={Activity} label="MAU (signups 30d)" value={mauApprox ?? 0} />
        <Stat Icon={Sparkles} label="AI calls (30d)" value={aiCalls ?? 0} />
        <Stat Icon={Coins} label="AI spend (this month)" value={`$${(monthlyUsd ?? 0).toFixed(2)} / $${AI_MONTHLY_CAP_USD}`} />
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="panel-soft p-5">
          <p className="text-[11px] uppercase tracking-wider muted-text">Total presentations</p>
          <p className="mt-2 text-2xl font-semibold">{(presentations ?? 0).toLocaleString()}</p>
        </div>
        <div className="panel-soft p-5">
          <p className="text-[11px] uppercase tracking-wider muted-text">Total responses</p>
          <p className="mt-2 text-2xl font-semibold">{(responses ?? 0).toLocaleString()}</p>
        </div>
        <div className="panel-soft p-5">
          <p className="text-[11px] uppercase tracking-wider muted-text">Total participants</p>
          <p className="mt-2 text-2xl font-semibold">{(participants ?? 0).toLocaleString()}</p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Plan breakdown</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(["free", "basic", "pro"] as const).map((t) => (
            <div key={t} className="panel-soft p-4">
              <p className="text-xs muted-text capitalize">{t}</p>
              <p className="mt-1 text-2xl font-semibold">{breakdown[t]?.toLocaleString() ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Top templates</h2>
        <div className="panel mt-4 divide-y" style={{ background: "var(--white)" }}>
          {(topTemplates ?? []).length === 0 ? (
            <p className="p-4 text-sm muted-text">No templates yet.</p>
          ) : (
            (topTemplates ?? []).map((t, i) => (
              <Link key={t.slug} href={`/templates/${t.slug}`} className="flex items-center justify-between p-4 text-sm hover:bg-[var(--pale)]">
                <span><span className="muted-text mono mr-3">{i + 1}.</span>{t.title}</span>
                <span className="mono muted-text">{t.usage_count} uses</span>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ Icon, label, value }: { Icon: React.ComponentType<{ className?: string }>; label: string; value: number | string }) {
  return (
    <div className="panel p-4">
      <Icon className="h-4 w-4 muted-text" />
      <p className="mt-2 text-[11px] uppercase tracking-wider muted-text">{label}</p>
      <p className="mt-1 text-xl font-semibold">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );
}
