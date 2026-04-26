import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBar from "@/components/NavBar";
import { ArrowLeft, KeyRound } from "lucide-react";
import { createApiKey, revokeApiKey } from "./actions";
import { CopySecretBanner } from "./CopySecretBanner";

type SearchParams = Promise<{ new?: string }>;

export default async function ApiKeysPage({ searchParams }: { searchParams?: SearchParams }) {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");

  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, label, prefix, last_used_at, revoked_at, created_at")
    .order("created_at", { ascending: false });

  const sp = (await searchParams) ?? {};
  const newKey = sp.new ?? null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <NavBar />
      <Link href="/dashboard" className="mt-6 inline-flex items-center gap-1 text-xs muted-text hover:text-[var(--ink)]">
        <ArrowLeft className="h-3 w-3" /> Dashboard
      </Link>

      <header className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
        <p className="mt-2 text-sm muted-text">
          Authenticate calls to <code className="mono">/api/v1/*</code> with{" "}
          <code className="mono">Authorization: Bearer &lt;key&gt;</code>. See the{" "}
          <Link href="/api/openapi.json" className="underline-offset-4 hover:underline" style={{ color: "var(--blue)" }}>
            OpenAPI spec
          </Link>{" "}
          for the full surface.
        </p>
      </header>

      {newKey && <CopySecretBanner secret={newKey} />}

      <section className="mt-8">
        <form action={createApiKey} className="panel flex gap-2 p-2">
          <input
            name="label"
            placeholder="Label (e.g. Zapier integration)"
            className="input flex-1 border-0 bg-transparent focus:bg-transparent"
            maxLength={80}
          />
          <button className="btn-primary"><KeyRound className="h-4 w-4" /> Generate</button>
        </form>
      </section>

      <section className="mt-6 space-y-2">
        {keys?.length === 0 && (
          <p className="text-sm muted-text">No keys yet.</p>
        )}
        {keys?.map((k) => (
          <div key={k.id} className="panel flex items-center justify-between p-4">
            <div className="min-w-0">
              <p className="font-medium">{k.label}</p>
              <p className="mt-0.5 mono text-xs muted-text">
                {k.prefix}…
                <span className="ml-3">
                  {k.revoked_at
                    ? "revoked"
                    : k.last_used_at
                    ? `last used ${formatRelative(k.last_used_at)}`
                    : "never used"}
                </span>
              </p>
            </div>
            {!k.revoked_at && (
              <form action={revokeApiKey}>
                <input type="hidden" name="id" value={k.id} />
                <button className="btn-ghost text-xs" style={{ color: "var(--danger, #b91c1c)" }}>
                  Revoke
                </button>
              </form>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
