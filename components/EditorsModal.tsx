"use client";

import { useState, useTransition } from "react";
import { Users, X, Loader2 } from "lucide-react";
import { addEditorByEmail, removeEditor } from "@/app/edit/[id]/actions";

export type Editor = { user_id: string; display_name: string | null };

export default function EditorsModal({
  presentationId,
  initial,
}: {
  presentationId: string;
  initial: Editor[];
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [editors, setEditors] = useState<Editor[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      try {
        await addEditorByEmail(presentationId, email);
        setEmail("");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function remove(userId: string) {
    start(async () => {
      await removeEditor(presentationId, userId);
      setEditors((prev) => prev.filter((e) => e.user_id !== userId));
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost text-sm">
        <Users className="h-4 w-4" /> Editors {editors.length > 0 && <span className="muted-text">({editors.length})</span>}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setOpen(false)}>
      <div onClick={(e) => e.stopPropagation()} className="panel w-full max-w-md p-6">
        <h3 className="text-lg font-semibold tracking-tight">Co-edit this presentation</h3>
        <p className="mt-1 text-sm muted-text">Editors can add, edit, and reorder slides — but can't delete the deck.</p>

        <div className="mt-5 flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="display name or email"
            className="input flex-1"
          />
          <button onClick={submit} disabled={pending || !email.trim()} className="btn-primary text-sm">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs" style={{ color: "#b91c1c" }}>{error}</p>}

        {editors.length > 0 && (
          <ul className="mt-5 space-y-2">
            {editors.map((e) => (
              <li key={e.user_id} className="panel-soft flex items-center justify-between p-3 text-sm">
                <span>{e.display_name ?? e.user_id.slice(0, 8)}</span>
                <button onClick={() => remove(e.user_id)} className="muted-text hover:text-[var(--ink)]">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={() => setOpen(false)} className="btn-ghost text-sm">Done</button>
        </div>
      </div>
    </div>
  );
}
