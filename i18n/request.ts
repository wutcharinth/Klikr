import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["en", "th"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

async function detectLocale(): Promise<Locale> {
  const c = await cookies();
  const fromCookie = c.get("NEXT_LOCALE")?.value;
  if (fromCookie && (LOCALES as readonly string[]).includes(fromCookie)) {
    return fromCookie as Locale;
  }
  const h = await headers();
  const accept = h.get("accept-language") ?? "";
  if (accept.toLowerCase().startsWith("th")) return "th";
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await detectLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
