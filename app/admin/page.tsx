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
    adminSupabase.from("profiles").select("id, plan_tier, onboarded_at, created_at"),
    adminSupabase.from("slides").select("type"),
    adminSupabase
      .from("app_feedback")
      .select("id, user_id, rating, comment, persona, page_path, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    adminSupabase.from("app_feedback").select("id", { count: "exact", head: true }),
    adminSupabase.from("app_feedback").select("rating").gte("created_at", since),
  ]);

  // Host emails per tier — service role can read auth.users via admin API.
  const { data: usersList } = await adminSupabase.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map<string, string>();
  for (const u of usersList?.users ?? []) {
    if (u.email) emailById.set(u.id, u.email);
  }
  const hostsByTier: Record<string, { id: string; email: string }[]> = { free: [], basic: [], pro: [] };
  const profileRows = (tierBreakdown ?? []) as { id?: string; plan_tier: string; created_at?: string; onboarded_at?: string | null }[];
  for (const row of profileRows) {
    const tier = row.plan_tier ?? "free";
    if (!hostsByTier[tier]) hostsByTier[tier] = [];
    if (row.id) {
      hostsByTier[tier].push({ id: row.id, email: emailById.get(row.id) ?? "(no email)" });
    }
  }

  const [
    { data: recentMembersRaw },
    { data: recentDecksRaw },
    { data: apiKeyRowsRaw },
    { data: participantRowsRaw },
  ] = await Promise.all([
    adminSupabase
      .from("profiles")
      .select("id, plan_tier, onboarded_at, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    adminSupabase
      .from("presentations")
      .select("id, owner_id, title, code, state, created_at, last_started_at")
      .order("created_at", { ascending: false })
      .limit(25),
    adminSupabase
      .from("api_keys")
      .select("id, user_id, label, prefix, created_at, last_used_at, revoked_at")
      .order("created_at", { ascending: false })
      .limit(200),
    adminSupabase
      .from("participants")
      .select("id, presentation_id, created_at")
      .gte("created_at", since),
  ]);

  const recentMembers = ((recentMembersRaw ?? []) as AdminMember[]).map((member) => {
    const authUser = usersList?.users?.find((user) => user.id === member.id);
    return {
      ...member,
      email: emailById.get(member.id) ?? "(no email)",
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
    };
  });
  const recentDecks = (recentDecksRaw ?? []) as AdminDeck[];
  const apiKeyRows = (apiKeyRowsRaw ?? []) as AdminApiKey[];
  const participantRows = (participantRowsRaw ?? []) as { id: string; presentation_id: string; created_at: string }[];

  const ownerDeckCounts: Record<string, number> = {};
  const ownerStartedCounts: Record<string, number> = {};
  for (const deck of recentDecks) {
    ownerDeckCounts[deck.owner_id] = (ownerDeckCounts[deck.owner_id] ?? 0) + 1;
    if (deck.last_started_at) ownerStartedCounts[deck.owner_id] = (ownerStartedCounts[deck.owner_id] ?? 0) + 1;
  }
  const activeApiKeys = apiKeyRows.filter((key) => !key.revoked_at);
  const usedApiKeys = activeApiKeys.filter((key) => key.last_used_at);
  const participantByDeck: Record<string, number> = {};
  for (const row of participantRows) {
    participantByDeck[row.presentation_id] = (participantByDeck[row.presentation_id] ?? 0) + 1;
  }
  const activeDecksInWindow = Object.keys(participantByDeck).length;
  const onboardedMembers = profileRows.filter((row) => row.onboarded_at).length;
  const startedHosts = Object.values(ownerStartedCounts).filter((count) => count > 0).length;

  // Page views in the window
  const { count: pageViewsTotal } = await adminSupabase
    .from("page_views")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  const { data: pageViewRows } = await adminSupabase
    .from("page_views")
    .select("path")
    .gte("created_at", since);
  const pageViewCounts: Record<string, number> = {};
  for (const r of (pageViewRows ?? []) as { path: string }[]) {
    pageViewCounts[r.path] = (pageViewCounts[r.path] ?? 0) + 1;
  }
  const topPages = Object.entries(pageViewCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

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
        <Kpi title="Onboarded users" value={onboardedMembers} subtitle={`${pct(onboardedMembers, signups)} of all users`} />
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
        <Kpi title={`Active decks · ${days}d`} value={activeDecksInWindow} subtitle="with participants" />
        <Kpi title="Activated hosts" value={startedHosts} subtitle={`${pct(startedHosts, signups)} started a deck`} />
        <Kpi title="API keys active" value={activeApiKeys.length} subtitle={`${usedApiKeys.length} used at least once`} />
        <Kpi title="Avg slides / deck" value={ratio(slidesAll, presentations)} />
        <Kpi title="Avg responses / deck" value={ratio(responses, presentations)} />
        <Kpi title={`Participants / active deck`} value={ratio(participantRows.length, activeDecksInWindow)} />
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
        <Kpi title={`Page views · ${days}d`} value={pageViewsTotal ?? 0} />
      </section>

      {/* Members + development signals */}
      <section className="mt-10 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="text-sm uppercase tracking-[0.18em] muted-text">Recent signups</h2>
          <div className="panel mt-3 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.16em] muted-text">
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Onboarded</th>
                  <th className="px-4 py-3 font-medium">Last sign-in</th>
                </tr>
              </thead>
              <tbody>
                {recentMembers.map((member) => (
                  <tr key={member.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td className="max-w-[18rem] truncate px-4 py-3" title={member.email}>
                      {member.email}
                    </td>
                    <td className="px-4 py-3 capitalize muted-text">{member.plan_tier ?? "free"}</td>
                    <td className="px-4 py-3 muted-text">{member.onboarded_at ? "Yes" : "No"}</td>
                    <td className="px-4 py-3 muted-text">
                      {member.last_sign_in_at ? formatRelative(member.last_sign_in_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm uppercase tracking-[0.18em] muted-text">Developer signals</h2>
          <div className="mt-3 grid gap-3">
            <DevSignal label="Signup → onboarded" value={pct(onboardedMembers, signups)} hint={`${onboardedMembers}/${signups ?? 0} users`} />
            <DevSignal label="Signup → started deck" value={pct(startedHosts, signups)} hint={`${startedHosts}/${signups ?? 0} users`} />
            <DevSignal label="API key adoption" value={pct(activeApiKeys.length, signups)} hint={`${activeApiKeys.length} active keys`} />
            <DevSignal label="Feedback average" value={fbAvg !== null ? `${fbAvg.toFixed(1)} / 5` : "—"} hint={`${feedbackPeriod?.length ?? 0} ratings in window`} />
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-sm uppercase tracking-[0.18em] muted-text">Recent decks</h2>
          <div className="panel mt-3 divide-y" style={{ background: "var(--white)" }}>
            {recentDecks.slice(0, 12).map((deck) => (
              <div key={deck.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{deck.title}</p>
                  <p className="mt-1 text-[11px] muted-text">
                    {emailById.get(deck.owner_id) ?? deck.owner_id} · {deck.code} · {deck.state}
                  </p>
                </div>
                <div className="shrink-0 text-right text-[11px] muted-text">
                  <p>{formatRelative(deck.created_at)}</p>
                  <p>{participantByDeck[deck.id] ?? 0} participants</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm uppercase tracking-[0.18em] muted-text">API key usage</h2>
          <div className="panel mt-3 divide-y" style={{ background: "var(--white)" }}>
            {apiKeyRows.slice(0, 12).length === 0 ? (
              <p className="p-4 text-sm muted-text">No API keys yet.</p>
            ) : (
              apiKeyRows.slice(0, 12).map((key) => (
                <div key={key.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{key.label}</p>
                    <p className="mt-1 text-[11px] muted-text">
                      {emailById.get(key.user_id) ?? key.user_id} · {key.prefix}…
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-[11px] muted-text">
                    <p>{key.revoked_at ? "Revoked" : "Active"}</p>
                    <p>{key.last_used_at ? `Used ${formatRelative(key.last_used_at)}` : "Never used"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
            {(["free", "basic", "pro"] as const).map((t) => {
              const list = hostsByTier[t] ?? [];
              return (
                <details key={t} className="panel-soft p-4">
                  <summary className="cursor-pointer list-none">
                    <p className="text-xs muted-text capitalize">{t}</p>
                    <p className="mt-1 text-2xl font-semibold">{breakdown[t]?.toLocaleString() ?? 0}</p>
                    <p className="mt-1 text-[11px] muted-text">click to expand emails</p>
                  </summary>
                  <ul className="mt-3 max-h-72 space-y-1 overflow-auto pr-1 text-[11px]">
                    {list.length === 0 ? (
                      <li className="muted-text">No users.</li>
                    ) : (
                      list.map((u) => (
                        <li key={u.id} className="truncate" title={u.email}>
                          {u.email}
                        </li>
                      ))
                    )}
                  </ul>
                </details>
              );
            })}
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

      {/* Top pages */}
      <section className="mt-10">
        <h2 className="text-sm uppercase tracking-[0.18em] muted-text">
          Top pages · last {days} days
        </h2>
        {topPages.length === 0 ? (
          <p className="mt-3 text-sm muted-text">No page views yet.</p>
        ) : (
          <div className="panel mt-3 divide-y" style={{ background: "var(--white)" }}>
            {topPages.map(([path, count], i) => (
              <div key={path} className="flex items-center justify-between p-3 text-sm">
                <span className="truncate">
                  <span className="muted-text mono mr-3">{i + 1}.</span>
                  {path}
                </span>
                <span className="mono muted-text shrink-0 ml-4">{count.toLocaleString()} views</span>
              </div>
            ))}
          </div>
        )}
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
                    {emailById.get(f.user_id ?? "") ?? "anonymous"} · {f.persona} · {f.page_path ?? ""} · {new Date(f.created_at).toLocaleString()}
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
  user_id: string | null;
  rating: number;
  comment: string;
  persona: string;
  page_path: string | null;
  created_at: string;
};

type AdminMember = {
  id: string;
  email: string;
  plan_tier: string;
  onboarded_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

type AdminDeck = {
  id: string;
  owner_id: string;
  title: string;
  code: string;
  state: string;
  created_at: string;
  last_started_at: string | null;
};

type AdminApiKey = {
  id: string;
  user_id: string;
  label: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
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

function DevSignal({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="panel-soft p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] muted-text">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-[11px] muted-text">{hint}</p>
    </div>
  );
}

function ratio(a: number | null | undefined, b: number | null | undefined): string {
  if (!a || !b) return "—";
  return (a / b).toFixed(1);
}

function pct(a: number | null | undefined, b: number | null | undefined): string {
  if (!a || !b) return "0%";
  return `${Math.round((a / b) * 100)}%`;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 14) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
