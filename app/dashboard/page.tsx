import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createPresentation, deletePresentation } from "./actions";
import { logout } from "../(auth)/actions";
import SaveAsTemplateButton from "@/components/SaveAsTemplateButton";
import AIGenerateButton from "@/components/AIGenerateButton";
import EmptyDashboard from "@/components/EmptyDashboard";
import NavBar from "@/components/NavBar";
import { AI_ENABLED } from "@/lib/featureFlags";

type SearchParams = Promise<{ ai?: string }>;

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

  const { data: presentations } = await supabase
    .from("editable_presentations")
    .select("id, title, code, state, created_at, is_owner")
    .order("created_at", { ascending: false });

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
        <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
          <form action={createPresentation} className="panel p-2 flex gap-2">
            <input
              name="title"
              placeholder="New presentation title…"
              className="input flex-1 border-0 bg-transparent focus:bg-transparent"
              required
            />
            <button className="btn-primary">+ Create</button>
          </form>
          {AI_ENABLED && <AIGenerateButton autoOpen={sp?.ai === "1"} />}
        </div>
      </section>

      <ul className="mt-8 space-y-3">
        {presentations?.length === 0 && <EmptyDashboard />}
        {presentations?.map((p) => (
          <li key={p.id} className="panel p-5 flex items-center justify-between">
            <div className="min-w-0">
              <Link href={`/edit/${p.id}`} className="font-medium hover:underline truncate">
                {p.title}
              </Link>
              <div className="mt-1 flex items-center gap-3 text-xs muted-text">
                <span className="mono">{p.code}</span>
                <span>·</span>
                <StatePill state={p.state} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/analytics/${p.id}`} className="btn-ghost text-xs muted-text" title="Analytics">
                <BarChart3 className="h-3.5 w-3.5" />
              </Link>
              <Link href={`/present/${p.id}`} className="btn-primary">Present</Link>
              {p.is_owner ? (
                <>
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
    </main>
  );
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
