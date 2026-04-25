import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klikr",
  description: "Real-time audience interaction — polls, word clouds, Q&A, quizzes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
