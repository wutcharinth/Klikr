import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, FilePlus2, LayoutTemplate, Pin, PinOff, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  createPresentation,
  deletePresentation,
  duplicatePresentation,
  setPinned,
} from "./actions";
import { logout } from "../(auth)/actions";
import SaveAsTemplateButton from "@/components/SaveAsTemplateButton";
import AIGenerateButton from "@/components/AIGenerateButton";
import EmptyDashboard from "@/components/EmptyDashboard";
import NavBar from "@/components/NavBar";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { AI_ENABLED } from "@/lib/featureFlags";

type SearchParams = Promise<{ ai?: string }>;
type DashboardPresentation = {
  id: string;
  title: string;
  code: string;
  state: string;
  created_at: string;
  last_started_at: string | null;
  pinned: boolean | null;
  is_owner: boolean;
};

export default async function Dashboard({ searchParams }: { searchParams?: SearchParams }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  // Onboarding gate: only redirect to /welcome if the row exists and the user
  // really hasn't finished onboarding. If the lookup errors (e.g. profiles
  // table missing because migrations haven't run), let them into the dashboard
  // — never trap them in a /welcome ↔ /dashboard loop.
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profileErr && profile && !profile.onboarded_at) redirect("/welcome");

  const sp = (await searchParams) ?? {};

  const [ownedResult, editorResult] = await Promise.all([
    supabase
      .from("presentations")
      .select("id, title, code, state, created_at, last_started_at, pinned")
      .eq("owner_id", userData.user.id),
    supabase
      .from("presentation_editors")
      .select("presentations(id, title, code, state, created_at, last_started_at, pinned)")
      .eq("user_id", userData.user.id),
  ]);

  const presentationsErr = ownedResult.error ?? editorResult.error;
  if (presentationsErr) {
    // Don't trap the user in a blank screen — surface the failure and log it.
    console.error("dashboard: presentations query failed", presentationsErr);
  }
  const ownedRows = ((ownedResult.data ?? []) as Omit<DashboardPresentation, "is_owner">[])
    .map((p) => ({ ...p, is_owner: true }));
  const editorRows = ((editorResult.data ?? []) as { presentations: Omit<DashboardPresentation, "is_owner"> | Omit<DashboardPresentation, "is_owner">[] | null }[])
    .flatMap((row) => {
      const pres = row.presentations;
      if (!pres) return [];
      return Array.isArray(pres) ? pres : [pres];
    })
    .map((p) => ({ ...p, is_owner: false }));
  const rows = [...ownedRows, ...editorRows]
    .filter((p, idx, all) => all.findIndex((x) => x.id === p.id) === idx)
    .sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      const aStarted = a.last_started_at ? new Date(a.last_started_at).getTime() : 0;
      const bStarted = b.last_started_at ? new Date(b.last_started_at).getTime() : 0;
      if (aStarted !== bStarted) return bStarted - aStarted;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <NavBar active="dashboard" />
      <div className="mt-1 flex items-center gap-2 text-xs muted-text">
        <span>{userData.user.email}</span>
        <span>·</span>
        <Link href="/dashboard/api-keys" className="hover:text-[var(--ink)]">API keys</Link>
        <span>·</span>
        <form action={logout}>
          <button className="hover:text-[var(--ink)]">Sign out</button>
        </form>
      </div>

      <section className="mt-10">
        <h1 className="text-2xl font-semibold tracking-tight">Your presentations</h1>
        <div className={`mt-6 grid gap-3 ${AI_ENABLED ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <form action={createPresentation}>
            <input type="hidden" name="title" value="Untitled" />
            <button className="panel flex w-full items-center gap-3 p-4 text-left transition hover:border-[var(--ink)]">
              <FilePlus2 className="h-5 w-5 shrink-0" style={{ color: "var(--blue)" }} />
              <span className="min-w-0">
                <span className="block font-medium">Start from blank</span>
                <span className="block text-xs muted-text">Empty deck, name it later</span>
              </span>
            </button>
          </form>
          <Link
            href="/templates"
            className="panel flex w-full items-center gap-3 p-4 transition hover:border-[var(--ink)]"
          >
            <LayoutTemplate className="h-5 w-5 shrink-0" style={{ color: "var(--blue)" }} />
            <span className="min-w-0">
              <span className="block font-medium">Browse templates</span>
              <span className="block text-xs muted-text">Polls, quizzes, icebreakers</span>
            </span>
          </Link>
          {AI_ENABLED && <AIGenerateButton autoOpen={sp?.ai === "1"} />}
        </div>
      </section>

      {presentationsErr && (
        <div
          className="mt-6 rounded-xl border p-4 text-sm"
          style={{
            background: "rgba(239,68,68,0.08)",
            borderColor: "rgba(239,68,68,0.35)",
            color: "#fca5a5",
          }}
        >
          <p className="font-medium">Couldn't load your presentations.</p>
          <p className="mt-1 text-xs opacity-80">
            {presentationsErr.message ?? "Database query failed."}
          </p>
        </div>
      )}

      <ul className="mt-8 space-y-3">
        {!presentationsErr && rows.length === 0 && <EmptyDashboard />}
        {rows.map((p) => (
          <li
            key={p.id}
            className="panel p-5 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                {p.pinned && (
                  <Pin
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: "var(--blue)", fill: "var(--blue)" }}
                    aria-label="Pinned"
                  />
                )}
                <Link href={`/edit/${p.id}`} className="font-medium hover:underline truncate">
                  {p.title}
                </Link>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs muted-text">
                <span className="mono">{p.code}</span>
                <span>·</span>
                <StatePill state={p.state} />
                <span>·</span>
                <span title={`Created ${new Date(p.created_at).toLocaleString()}`}>
                  Created {formatRelative(p.created_at)}
                </span>
                {p.last_started_at && (
                  <>
                    <span>·</span>
                    <span title={`Last presented ${new Date(p.last_started_at).toLocaleString()}`}>
                      Last presented {formatRelative(p.last_started_at)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/analytics/${p.id}`} className="btn-ghost text-xs muted-text" title="Analytics">
                <BarChart3 className="h-3.5 w-3.5" />
              </Link>
              <Link href={`/present/${p.id}`} className="btn-primary">Present</Link>
              {p.is_owner ? (
                <>
                  <form
                    action={async () => {
                      "use server";
                      await setPinned(p.id, !p.pinned);
                    }}
                  >
                    <button
                      className="btn-ghost text-xs muted-text"
                      title={p.pinned ? "Unpin" : "Pin to top"}
                      aria-label={p.pinned ? "Unpin" : "Pin"}
                    >
                      {p.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await duplicatePresentation(p.id);
                    }}
                  >
                    <button
                      className="btn-ghost text-xs muted-text"
                      title="Duplicate"
                      aria-label="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </form>
                  <a href={`/api/export/${p.id}`} download className="btn-ghost text-xs muted-text" title="Export CSV">CSV</a>
                  <a href={`/api/export/${p.id}?format=xlsx`} className="btn-ghost text-xs muted-text" title="Export Excel">XLSX</a>
                  <a href={`/api/export/${p.id}?format=pdf`} className="btn-ghost text-xs muted-text" title="Export PDF">PDF</a>
                  <SaveAsTemplateButton presentationId={p.id} presentationTitle={p.title} />
                  <form
                    action={async () => {
                      "use server";
                      await deletePresentation(p.id);
                    }}
                  >
                    <button className="btn-ghost text-xs muted-text" aria-label="Delete">Delete</button>
                  </form>
                </>
              ) : (
                <span className="rounded-full border border-[var(--line)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] muted-text">
                  Editor
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <FeedbackWidget persona="host" />
    </main>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 14) return `${diffDay}d ago`;
  // For older entries, show the calendar date — relative units stop being useful.
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function StatePill({ state }: { state: string }) {
  const map: Record<string, { label: string; color: string }> = {
    lobby: { label: "Lobby", color: "rgba(0,0,0,.04)" },
    active: { label: "Live", color: "rgba(110,231,183,.18)" },
    closed: { label: "Closed", color: "rgba(0,0,0,.02)" },
  };
  const v = map[state] ?? { label: state, color: "rgba(0,0,0,.04)" };
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
      style={{ background: v.color, border: "1px solid var(--line)" }}
    >
      {v.label}
    </span>
  );
}
