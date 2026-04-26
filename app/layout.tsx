import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klikr",
  description: "Real-time audience interaction — polls, word clouds, Q&A, quizzes.",
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
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
