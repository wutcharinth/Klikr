"use client";

import { useState } from "react";

export function JoinForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [code, setCode] = useState("");
  const ready = code.trim().length >= 4;

  return (
    <form
      action={action}
      className="anim-fade-up delay-500 mt-14 w-full panel p-2 transition-shadow"
      style={{
        boxShadow: ready ? "0 0 0 4px rgba(0, 113, 227, 0.15)" : "0 0 0 0 transparent",
      }}
    >
      <div className="flex items-center gap-2">
        <input
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          autoComplete="off"
          maxLength={8}
          className="input mono flex-1 border-0 bg-transparent text-2xl uppercase tracking-[0.3em] focus:bg-transparent focus:shadow-none"
          style={{ height: 56, fontWeight: 600 }}
          required
        />
        <button
          type="submit"
          disabled={!ready}
          className="btn-primary press"
          style={{ height: 48, padding: "0 24px" }}
        >
          Join
          <span style={{ display: "inline-block", transition: "transform 0.2s", transform: ready ? "translateX(2px)" : "translateX(0)" }}>→</span>
        </button>
      </div>
    </form>
  );
}
