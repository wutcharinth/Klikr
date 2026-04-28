import React from "react";

// Initials avatar — deterministic color from the name so the same nickname
// always renders the same chip across runs.
const PALETTE = [
  "#0071e3",
  "#22c55e",
  "#a855f7",
  "#fb923c",
  "#ef4444",
  "#0ea5e9",
  "#facc15",
  "#10b981",
];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  size = 40,
  ring = false,
}: {
  name: string;
  size?: number;
  ring?: boolean;
}) {
  const color = colorFor(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: color,
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: ring ? `0 0 0 4px ${color}33` : "none",
        letterSpacing: "0.02em",
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
