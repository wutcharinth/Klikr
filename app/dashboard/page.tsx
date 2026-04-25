import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPresentation, deletePresentation } from "./actions";
import { logout } from "../(auth)/actions";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: presentations } = await supabase
    .from("presentations")
    .select("id, title, code, state, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="flex items-center justify-between">
        <div>
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Klikr
          </Link>
          <p className="mt-1 text-xs muted-text">{userData.user.email}</p>
        </div>
        <form action={logout}>
          <button className="text-xs muted-text hover:text-[var(--fg)]">Sign out</button>
        </form>
      </header>

      <section className="mt-10">
        <h1 className="text-2xl font-semibold tracking-tight">Your presentations</h1>
        <form action={createPresentation} className="mt-6 panel p-2 flex gap-2">
          <input
            name="title"
            placeholder="New presentation title…"
            className="input flex-1 border-0 bg-transparent focus:bg-transparent"
            required
          />
          <button className="btn-primary">+ Create</button>
        </form>
      </section>

      <ul className="mt-8 space-y-3">
        {presentations?.length === 0 && (
          <li className="panel-soft p-10 text-center text-sm muted-text">
            No presentations yet. Create your first one above.
          </li>
        )}
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
              <Link href={`/present/${p.id}`} className="btn-primary">
                Present
              </Link>
              <form
                action={async () => {
                  "use server";
                  await deletePresentation(p.id);
                }}
              >
                <button className="btn-ghost text-xs muted-text" aria-label="Delete">
                  Delete
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

function StatePill({ state }: { state: string }) {
  const map: Record<string, { label: string; color: string }> = {
    lobby: { label: "Lobby", color: "rgba(255,255,255,.04)" },
    active: { label: "Live", color: "rgba(110,231,183,.12)" },
    closed: { label: "Closed", color: "rgba(255,255,255,.02)" },
  };
  const v = map[state] ?? { label: state, color: "rgba(255,255,255,.04)" };
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.14em]"
      style={{ background: v.color, border: "1px solid var(--line)" }}
    >
      {v.label}
    </span>
  );
}
