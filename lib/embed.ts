// Allowlist of hosts we'll let users embed in an `embed` slide. Keep this
// tight — iframes are powerful and we serve them in the presenter view.

const EMBED_HOST_ALLOWLIST = [
  "docs.google.com",
  "drive.google.com",
  "onedrive.live.com",
  "office.com",
  "office.live.com",
  "1drv.ms",
];

export function isAllowedEmbedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    return EMBED_HOST_ALLOWLIST.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
