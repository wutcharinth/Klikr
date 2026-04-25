import Link from "next/link";
import { redirect } from "next/navigation";
import { JoinForm } from "@/components/JoinForm";
import { HomeLanding } from "@/components/HomeLanding";

async function joinAction(formData: FormData) {
  "use server";
  const raw = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!raw) return;
  redirect(`/play/${encodeURIComponent(raw)}`);
}

export default function Landing() {
  return (
    <>
      <main className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
        </div>

        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-20 text-center">
          <div className="anim-fade-up flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] muted-text">
            <span className="live-dot" /> Realtime audience interaction
          </div>

          <h1 className="mt-10 text-[6.5rem] leading-[0.95] font-semibold tracking-[-0.04em] sm:text-[10rem]">
            <span className="reveal-word" style={{ animationDelay: "0.05s" }}>K</span>
            <span className="reveal-word" style={{ animationDelay: "0.15s" }}>l</span>
            <span className="reveal-word" style={{ animationDelay: "0.25s" }}>i</span>
            <span className="reveal-word" style={{ animationDelay: "0.35s" }}>k</span>
            <span className="reveal-word" style={{ animationDelay: "0.45s" }}>r</span>
          </h1>

          <p className="anim-fade-up delay-500 mt-6 max-w-md text-base muted-text">
            A minimal, fast platform for live polls, word clouds, Q&amp;A and quizzes.
          </p>

          <JoinForm action={joinAction} />

          <div className="anim-fade-up delay-700 mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs muted-text">
            <Link href="/demo.html" className="text-[var(--fg)] underline-offset-4 hover:underline">
              Watch the interactive demo →
            </Link>
            <span aria-hidden>·</span>
            <Link href="/login" className="text-[var(--fg)] underline-offset-4 hover:underline">
              Sign in to present
            </Link>
            <span aria-hidden>·</span>
            <Link href="/showcase.html" className="text-[var(--fg)] underline-offset-4 hover:underline">
              See the showcase
            </Link>
          </div>
        </div>
      </main>

      <HomeLanding />
    </>
  );
}
