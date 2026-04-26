import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addEmbedFromUrl } from "./actions";

type Params = Promise<{ id: string }>;

export default async function ImportPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");

  const { data: pres } = await supabase
    .from("presentations")
    .select("id, owner_id, title")
    .eq("id", id)
    .maybeSingle();
  if (!pres || pres.owner_id !== u.user.id) notFound();

  const submit = addEmbedFromUrl.bind(null, id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href={`/edit/${id}`} className="text-xs muted-text hover:text-[var(--ink)]">← Back to editor</Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight">Import a slide deck</h1>
        <p className="mt-2 text-sm muted-text">
          Paste a public Google Slides or PowerPoint Web link. We'll add it as an embedded slide
          in your deck — your audience watches it on the host's screen.
        </p>
      </header>

      <form action={submit} className="panel mt-6 p-6">
        <label className="block text-xs font-medium muted-text">Public URL</label>
        <input
          name="url"
          required
          placeholder="https://docs.google.com/presentation/d/…/embed"
          className="input mt-1"
        />
        <p className="mt-2 text-xs muted-text">
          For Google Slides: <strong>File → Share → Publish to web → Embed</strong> and copy the URL.
        </p>
        <button className="btn-primary mt-5">Add to my deck</button>
      </form>
    </main>
  );
}
