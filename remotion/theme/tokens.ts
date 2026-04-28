export type RemotionTheme = {
  accent: string;
  ink: string;
  bg: string;
  bgSoft: string;
  mutedBg: string;
  line: string;
  fontFamily: string;
};

export const defaultTheme: RemotionTheme = {
  accent: "#0071e3",
  ink: "#1d1d1f",
  bg: "#ffffff",
  bgSoft: "#f5f5f7",
  mutedBg: "rgba(0,0,0,0.04)",
  line: "#d2d2d7",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif",
};

// Read live CSS variables from the document root so a Remotion composition
// renders in the same brand color the rest of the app is using. Falls back
// to the static defaults during SSR or before hydration.
export function tokensFromCss(): RemotionTheme {
  if (typeof window === "undefined") return defaultTheme;
  const root = window.getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => {
    const v = root.getPropertyValue(name).trim();
    return v.length > 0 ? v : fallback;
  };
  return {
    accent: get("--accent", defaultTheme.accent) || get("--blue", defaultTheme.accent),
    ink: get("--ink", defaultTheme.ink) || get("--fg", defaultTheme.ink),
    bg: get("--bg", defaultTheme.bg),
    bgSoft: get("--bg-soft", defaultTheme.bgSoft) || get("--pale", defaultTheme.bgSoft),
    mutedBg: "rgba(0,0,0,0.04)",
    line: get("--line", defaultTheme.line) || get("--border-soft", defaultTheme.line),
    fontFamily: defaultTheme.fontFamily,
  };
}
