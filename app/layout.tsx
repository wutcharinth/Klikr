import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { PageViewBeacon } from "@/components/PageViewBeacon";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://klikrapp.com"),
  title: { default: "Klikr — Live audience polls, quizzes, and Q&A", template: "%s — Klikr" },
  description:
    "Run real-time polls, word clouds, quizzes, Q&A, and rankings with your audience. No app install — they join with a 6-letter code. Free to start.",
  keywords: [
    "live polls",
    "audience response system",
    "Mentimeter alternative",
    "Slido alternative",
    "Kahoot alternative",
    "word cloud",
    "live Q&A",
    "live quiz",
    "interactive presentation",
  ],
  openGraph: {
    type: "website",
    siteName: "Klikr",
    title: "Klikr — Live audience polls, quizzes, and Q&A",
    description: "Real-time audience interaction. No app install. 6-letter join code.",
    url: "https://klikrapp.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Klikr — Live audience polls, quizzes, and Q&A",
    description: "Live audience polls, quizzes, and Q&A. No app install.",
  },
  alternates: { canonical: "https://klikrapp.com" },
  robots: { index: true, follow: true },
};

const themeInitScript = `
(function(){try{
  var stored = localStorage.getItem('klikr-theme');
  var prefers = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  var theme = stored === 'light' || stored === 'dark' ? stored : (stored === 'system' ? prefers : prefers);
  if(!stored) localStorage.setItem('klikr-theme','system');
  document.documentElement.setAttribute('data-theme', theme);
}catch(e){}})();
`.trim();

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <PageViewBeacon />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
