import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/admin";
import { AI_MONTHLY_CAP_USD, monthlyUsdSpend } from "@/lib/ai";
import { Users, Activity, Sparkles, Coins } from "lucide-react";
import NavBar from "@/components/NavBar";
import { AdminTrendsCharts } from "@/components/AdminTrendsCharts";
import { FeedbackWidget } from "@/components/FeedbackWidget";

const SIGNUP_THRESHOLD = 1000;

export const metadata = { title: "Admin — Klikr" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string }>;

export default async function AdminPage({ searchParams }: { searchParams?: SearchParams }) {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");

  // Two parallel admin paths: profiles.is_admin (existing) OR ADMIN_EMAILS env
  // allowlist (new). Either one grants access; setup is via DB or env.
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", u.user.id).maybeSingle();
  if (!me?.is_admin && !isAdminEmail(u.user.email)) notFound();

  const sp = (await searchParams) ?? {};
  const days = sp.days === "7" ? 7 : sp.days === "90" ? 90 : 30;

  const adminSupabase = createServiceClient();
  const now = new Date();
  const since = new Date(now.getTime() - days * 86400_000).toISOString();
  const prevSince = new Date(now.getTime() - days * 2 * 86400_000).toISOString();
  const dayAgo = new Date(now.getTime() - 86400_000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 86400_000).toISOString();

  const [
    { count: signups },
    { count: signupsPeriod },
    { count: signupsPrev },
    { count: presentations },
    { count: presPeriod },
    { count: presPrev },
    { count: presStartedPeriod },
    { count: presStartedPrev },
    { count: presLive },
    { count: presClosed },
    { count: slidesAll },
    { count: responses },
    { count: responsesPeriod },
    { count: responsesPrev },
    { count: participants },
    { count: participants24h },
    { count: dau },
    { count: mauApprox },
    { count: aiCalls },
    monthlyUsd,
    { data: topTemplates },
    { data: tierBreakdown },
    { data: slideTypeRows },
    { data: feedbackRecent },
    { count: feedbackTotal },
    { data: feedbackPeriod },
  ] = await Promise.all([
    adminSupabase.from("profiles").select("id", { count: "exact", head: true }),
    adminSupabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
    adminSupabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", prevSince)
      .lt("created_at", since),
    adminSupabase.from("presentations").select("id", { count: "exact", head: true }),
    adminSupabase.from("presentations").select("id", { count: "exact", head: true }).gte("created_at", since),
    adminSupabase
      .from("presentations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", prevSince)
      .lt("created_at", since),
    adminSupabase
      .from("presentations")
      .select("id", { count: "exact", head: true })
      .not("last_started_at", "is", null)
      .gte("last_started_at", since),
    adminSupabase
      .from("presentations")
      .select("id", { count: "exact", head: true })
      .not("last_started_at", "is", null)
      .gte("last_started_at", prevSince)
      .lt("last_started_at", since),
    adminSupabase.from("presentations").select("id", { count: "exact", head: true }).eq("state", "active"),
    adminSupabase.from("presentations").select("id", { count: "exact", head: true }).eq("state", "closed"),
    adminSupabase.from("slides").select("id", { count: "exact", head: true }),
    adminSupabase.from("responses").select("id", { count: "exact", head: true }),
    adminSupabase.from("responses").select("id", { count: "exact", head: true }).gte("created_at", since),
    adminSupabase
      .from("responses")
      .select("id", { count: "exact", head: true })
      .gte("created_at", prevSince)
      .lt("created_at", since),
    adminSupabase.from("participants").select("id", { count: "exact", head: true }),
    adminSupabase.from("participants").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
    adminSupabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
    adminSupabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthAgo),
    adminSupabase.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", monthAgo),
    monthlyUsdSpend(),
    adminSupabase
      .from("templates")
      .select("slug, title, usage_count")
      .order("usage_count", { ascending: false })
      .limit(10),
    adminSupabase.from("profiles").select("plan_tier"),
    adminSupabase.from("slides").select("type"),
    adminSupabase
      .from("app_feedback")
      .select("id, rating, comment, persona, page_path, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    adminSupabase.from("app_feedback").select("id", { count: "exact", head: true }),
    adminSupabase.from("app_feedback").select("rating").gte("created_at", since),
  ]);

  // Plan breakdown
  const breakdown: Record<string, number> = { free: 0, basic: 0, pro: 0 };
  for (const row of (tierBreakdown ?? []) as { plan_tier: string }[]) {
    breakdown[row.plan_tier] = (breakdown[row.plan_tier] ?? 0) + 1;
  }

  // Top slide type
  const slideTypeCounts: Record<string, number> = {};
  for (const r of (slideTypeRows ?? []) as { type: string }[]) {
    slideTypeCounts[r.type] = (slideTypeCounts[r.type] ?? 0) + 1;
  }
  const topSlideType = Object.entries(slideTypeCounts).sort((a, b) => b[1] - a[1])[0];

  // Feedback avg rating in window
  const fbAvg =
    feedbackPeriod && feedbackPeriod.length > 0
      ? (feedbackPeriod as { rating: number }[]).reduce((a, b) => a + b.rating, 0) / feedbackPeriod.length
      : null;

  // Daily trend buckets
  const [signupsAll, startsAll, respAll] = await Promise.all([
    adminSupabase.from("profiles").select("created_at").gte("created_at", since),
    adminSupabase.from("presentations").select("last_started_at").gte("last_started_at", since),
    adminSupabase.from("responses").select("created_at").gte("created_at", since),
  ]);
  const trends = buildDailyTrends(days, [
    { key: "signups", rows: signupsAll.data ?? [], col: "created_at" },
    { key: "started", rows: startsAll.data ?? [], col: "last_started_at" },
    { key: "responses", rows: respAll.data ?? [], col: "created_at" },
  ]);

  const usedCount = signups ?? 0;
  const milestonePct = Math.min(100, (usedCount / SIGNUP_THRESHOLD) * 100);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <NavBar active="admin" />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-wider muted-text">Admin · usage analytics</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Window: last {days} days <span className="muted-text text-sm">vs. previous {days} days</span>
          </h1>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/admin?days=${d}`}
              className={`rounded-full px-3 py-1 ${
                d === days
                  ? "bg-[var(--blue)] text-white"
                  : "border border-[var(--line)] muted-text hover:text-[var(--ink)]"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </div>

      {/* Free-for-all milestone */}
      <header className="mt-6 panel p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider muted-text">Free-for-all milestone</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {usedCount.toLocaleString()}{" "}
              <span className="muted-text text-base">/ {SIGNUP_THRESHOLD.toLocaleString()} hosts</span>
            </p>
            <p className="mt-1 text-xs muted-text">
              When this hits {SIGNUP_THRESHOLD.toLocaleString()}, set <code className="mono">FREE_FOR_ALL=false</code> on Railway.
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: milestonePct < 80 ? "#e8f5e9" : milestonePct < 100 ? "#fff3e0" : "#ffebee",
              color: milestonePct < 80 ? "#1b5e20" : milestonePct < 100 ? "#7a4a00" : "#b71c1c",
            }}
          >
            {milestonePct.toFixed(0)}%
          </span>
        </div>
        <div className="mt-4 h-2 w-full rounded-full" style={{ background: "var(--pale)" }}>
          <div className="h-full rounded-full" style={{ width: `${milestonePct}%`, background: "var(--blue)" }} />
        </div>
      </header>

      {/* AI strip */}
      <section className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat Icon={Users} label="DAU (signups today)" value={dau ?? 0} />
        <Stat Icon={Activity} label="MAU (signups 30d)" value={mauApprox ?? 0} />
        <Stat Icon={Sparkles} label="AI calls (30d)" value={aiCalls ?? 0} />
        <Stat
          Icon={Coins}
          label="AI spend (this month)"
          value={`$${(monthlyUsd ?? 0).toFixed(2)} / $${AI_MONTHLY_CAP_USD}`}
        />
      </section>

      {/* KPI grid (period-aware) */}
      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Kpi title="Total users" value={signups ?? 0} />
        <Kpi
          title={`Signups · ${days}d`}
          value={signupsPeriod ?? 0}
          delta={delta(signupsPeriod, signupsPrev)}
        />
        <Kpi title="Total presentations" value={presentations ?? 0} />
        <Kpi
          title={`Created · ${days}d`}
          value={presPeriod ?? 0}
          delta={delta(presPeriod, presPrev)}
        />
        <Kpi
          title={`Started · ${days}d`}
          value={presStartedPeriod ?? 0}
          delta={delta(presStartedPeriod, presStartedPrev)}
        />
        <Kpi title="Currently live" value={presLive ?? 0} />
        <Kpi title="Closed all-time" value={presClosed ?? 0} />
        <Kpi title="Total slides" value={slidesAll ?? 0} />
        <Kpi title="Total responses" value={responses ?? 0} />
        <Kpi
          title={`Responses · ${days}d`}
          value={responsesPeriod ?? 0}
          delta={delta(responsesPeriod, responsesPrev)}
        />
        <Kpi title="Total participants" value={participants ?? 0} />
        <Kpi title="Joined · 24h" value={participants24h ?? 0} />
        <Kpi title="Avg slides / deck" value={ratio(slidesAll, presentations)} />
        <Kpi title="Avg responses / deck" value={ratio(responses, presentations)} />
        <Kpi
          title="Top slide type"
          value={topSlideType ? `${topSlideType[0]}` : "—"}
          subtitle={topSlideType ? `${topSlideType[1]} slides` : undefined}
        />
        <Kpi
          title="Feedback received"
          value={feedbackTotal ?? 0}
          subtitle={fbAvg !== null ? `${fbAvg.toFixed(1)}★ in ${days}d` : undefined}
        />
      </section>

      {/* Trends */}
      <section className="mt-10">
        <h2 className="text-sm uppercase tracking-[0.18em] muted-text">Trends · last {days} days</h2>
        <div className="mt-3 panel p-4">
          <AdminTrendsCharts data={trends} />
        </div>
      </section>

      {/* Plan breakdown + Top templates */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-sm uppercase tracking-[0.18em] muted-text">Plan breakdown</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(["free", "basic", "pro"] as const).map((t) => (
              <div key={t} className="panel-soft p-4">
                <p className="text-xs muted-text capitalize">{t}</p>
                <p className="mt-1 text-2xl font-semibold">{breakdown[t]?.toLocaleString() ?? 0}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm uppercase tracking-[0.18em] muted-text">Top templates</h2>
          <div className="panel mt-3 divide-y" style={{ background: "var(--white)" }}>
            {(topTemplates ?? []).length === 0 ? (
              <p className="p-4 text-sm muted-text">No templates yet.</p>
            ) : (
              (topTemplates ?? []).map((t, i) => (
                <Link
                  key={t.slug}
                  href={`/templates/${t.slug}`}
                  className="flex items-center justify-between p-4 text-sm hover:bg-[var(--pale)]"
                >
                  <span>
                    <span className="muted-text mono mr-3">{i + 1}.</span>
                    {t.title}
                  </span>
                  <span className="mono muted-text">{t.usage_count} uses</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Recent feedback */}
      <section className="mt-10">
        <h2 className="text-sm uppercase tracking-[0.18em] muted-text">Recent feedback</h2>
        {feedbackRecent && feedbackRecent.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {(feedbackRecent as RecentFeedback[]).map((f) => (
              <li key={f.id} className="panel flex items-start gap-4 p-4">
                <div className="shrink-0 text-amber-500">{"★".repeat(f.rating) + "☆".repeat(5 - f.rating)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    {f.comment || <span className="muted-text">(no comment)</span>}
                  </p>
                  <p className="mt-1 text-[11px] muted-text">
                    {f.persona} · {f.page_path ?? ""} · {new Date(f.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm muted-text">No feedback yet.</p>
        )}
      </section>

      <FeedbackWidget persona="admin" />
    </main>
  );
}

type RecentFeedback = {
  id: string;
  rating: number;
  comment: string;
  persona: string;
  page_path: string | null;
  created_at: string;
};

// ---------- helpers ----------

function Stat({
  Icon,
  label,
  value,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="panel p-4">
      <Icon className="h-4 w-4 muted-text" />
      <p className="mt-2 text-[11px] uppercase tracking-wider muted-text">{label}</p>
      <p className="mt-1 text-xl font-semibold">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );
}

function Kpi({
  title,
  value,
  subtitle,
  delta,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  delta?: { dir: "up" | "down" | "flat"; pct: number } | null;
}) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] muted-text">{title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {(subtitle || delta) && (
        <p className="mt-1 text-[11px] muted-text">
          {delta && delta.dir !== "flat" && (
            <span style={{ color: delta.dir === "up" ? "#22c55e" : "#ef4444" }}>
              {delta.dir === "up" ? "▲" : "▼"} {delta.pct.toFixed(0)}%
            </span>
          )}
          {delta && subtitle ? " · " : ""}
          {subtitle}
        </p>
      )}
    </div>
  );
}

function ratio(a: number | null | undefined, b: number | null | undefined): string {
  if (!a || !b) return "—";
  return (a / b).toFixed(1);
}

function delta(curr: number | null | undefined, prev: number | null | undefined) {
  const c = curr ?? 0;
  const p = prev ?? 0;
  if (p === 0 && c === 0) return { dir: "flat" as const, pct: 0 };
  if (p === 0) return { dir: "up" as const, pct: 100 };
  const change = ((c - p) / p) * 100;
  if (Math.abs(change) < 1) return { dir: "flat" as const, pct: 0 };
  return { dir: change > 0 ? ("up" as const) : ("down" as const), pct: Math.abs(change) };
}

function buildDailyTrends(
  days: number,
  series: { key: string; rows: unknown[]; col: string }[],
): { day: string; signups: number; started: number; responses: number }[] {
  const buckets: Record<string, { signups: number; started: number; responses: number }> = {};
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400_000).toISOString().slice(0, 10);
    buckets[d] = { signups: 0, started: 0, responses: 0 };
  }
  for (const s of series) {
    for (const row of s.rows) {
      const v = (row as Record<string, string | null>)[s.col];
      if (!v) continue;
      const day = v.slice(0, 10);
      if (buckets[day]) {
        (buckets[day] as Record<string, number>)[s.key] =
          ((buckets[day] as Record<string, number>)[s.key] ?? 0) + 1;
      }
    }
  }
  return Object.entries(buckets).map(([day, v]) => ({ day, ...v }));
}
