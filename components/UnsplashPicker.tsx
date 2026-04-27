"use client";

import { useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import type { ImageCredit } from "@/lib/types";

type Photo = {
  id: string;
  alt: string;
  thumb: string;
  regular: string;
  download_location: string;
  photographer: string;
  photographer_url: string;
};

export function UnsplashPicker({
  onPick,
  onClose,
}: {
  onPick: (image_url: string, credit: ImageCredit) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/unsplash/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setPhotos(data.photos as Photo[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function pick(p: Photo) {
    fetch("/api/unsplash/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ download_location: p.download_location }),
    }).catch(() => {});
    onPick(p.regular, {
      source: "unsplash",
      photographer: p.photographer,
      photographer_url: p.photographer_url,
    });
  }

  return (
    <div
      className="mt-2 rounded-xl p-3"
      style={{ border: "1px solid var(--line)", background: "var(--panel-2, var(--panel))" }}
    >
      <div className="flex items-center justify-between gap-2">
        <form onSubmit={search} className="flex flex-1 items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Unsplash (e.g. 'team meeting', 'mountains')"
            className="input text-sm flex-1"
            autoFocus
          />
          <button type="submit" disabled={busy || !query.trim()} className="btn-ghost text-sm">
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
            Search
          </button>
        </form>
        <button type="button" onClick={onClose} className="btn-ghost text-sm" aria-label="Close">
          <X className="h-3 w-3" />
        </button>
      </div>

      {error && <p className="mt-2 text-xs" style={{ color: "#b91c1c" }}>{error}</p>}

      {photos && photos.length === 0 && !busy && (
        <p className="mt-3 text-xs muted-text">No results — try a different query.</p>
      )}

      {photos && photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              className="group relative aspect-square overflow-hidden rounded-md"
              style={{ border: "1px solid var(--line)" }}
              title={`Photo by ${p.photographer} on Unsplash`}
            >
              <img
                src={p.thumb}
                alt={p.alt}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              <span
                className="absolute bottom-0 left-0 right-0 truncate px-1.5 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,.7), transparent)" }}
              >
                {p.photographer}
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] muted-text">
        Photos via{" "}
        <a
          href="https://unsplash.com/?utm_source=klikr&utm_medium=referral"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--blue-link)" }}
        >
          Unsplash
        </a>
      </p>
    </div>
  );
}
