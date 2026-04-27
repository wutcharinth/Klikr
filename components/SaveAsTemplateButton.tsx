"use client";

import { useState } from "react";
import { saveAsTemplate } from "@/app/templates/actions";

const CATEGORIES = ["Business", "Classroom", "Workshops", "Icebreakers", "Brainstorming", "Surveys", "Recognition"];

export default function SaveAsTemplateButton({ presentationId, presentationTitle }: { presentationId: string; presentationTitle: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost text-xs muted-text" title="Save as template">
        Save
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={() => setOpen(false)}
    >
      <form
        action={saveAsTemplate}
        onClick={(e) => e.stopPropagation()}
        className="panel w-full max-w-md p-6"
      >
        <h3 className="text-lg font-semibold tracking-tight">Save as template</h3>
        <p className="mt-1 text-sm muted-text">Reuse this deck or share it with your team.</p>

        <input type="hidden" name="presentation_id" value={presentationId} />

        <label className="mt-5 block text-xs font-medium muted-text">Title</label>
        <input name="title" required defaultValue={presentationTitle} className="input mt-1" />

        <label className="mt-4 block text-xs font-medium muted-text">Description</label>
        <textarea name="description" rows={2} className="input mt-1 py-2" style={{ height: "auto" }} placeholder="One line about what this template helps with" />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium muted-text">Category</label>
            <select name="category" defaultValue="Business" className="input mt-1">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium muted-text">Visibility</label>
            <select name="visibility" defaultValue="private" className="input mt-1">
              <option value="private">Just me</option>
              <option value="team">My team</option>
              <option value="public">Public</option>
            </select>
          </div>
        </div>

        <label className="mt-4 block text-xs font-medium muted-text">Tags (comma separated)</label>
        <input name="tags" placeholder="retro, agile, sprint" className="input mt-1" />

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">Cancel</button>
          <button type="submit" className="btn-primary text-sm">Save template</button>
        </div>
      </form>
    </div>
  );
}
