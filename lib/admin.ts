// Admin allowlist. Comma-separated emails in ADMIN_EMAILS, lowercased on read.
// Defaults to wutcharin.th@gmail.com so the app is usable even if the env
// var is missing (e.g. local dev). Server-only — never bundle into the client.

const DEFAULT_ADMINS = ["wutcharin.th@gmail.com"];

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return DEFAULT_ADMINS;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
