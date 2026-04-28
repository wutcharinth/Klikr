"use client";

import { useState } from "react";

export function JoinForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [code, setCode] = useState("");
  const ready = code.trim().length >= 4;

  return (
    <form
      action={action}
      className="anim-fade-up delay-500 mt-10 panel mx-auto p-2 transition-shadow"
      style={{
        boxShadow: ready ? "0 0 0 4px rgba(0, 113, 227, 0.15)" : "0 0 0 0 transparent",
        width: "fit-content",
        maxWidth: "100%",
      }}
    >
      <div className="flex items-center gap-2">
        <input
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          autoComplete="off"
          maxLength={6}
          size={6}
          className="input mono border-0 bg-transparent text-center text-2xl uppercase tracking-[0.3em] focus:bg-transparent focus:shadow-none"
          style={{ height: 56, fontWeight: 600, width: "11ch", padding: "0 12px" }}
          required
        />
        <button
          type="submit"
          disabled={!ready}
          className="btn-primary press"
          style={{ height: 52, padding: "0 20px" }}
        >
          Join
          <span style={{ display: "inline-block", transition: "transform 0.2s", transform: ready ? "translateX(2px)" : "translateX(0)" }}>→</span>
        </button>
      </div>
    </form>
  );
}
