import Link from "next/link";
import { ArrowRight } from "lucide-react";
import NavBar from "@/components/NavBar";
import StartTiles from "@/components/StartTiles";
import { HomeLanding } from "@/components/HomeLanding";
import UseCaseTabs from "@/components/UseCaseTabs";
import EasyToStart from "@/components/EasyToStart";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Host with Klikr — polls, quizzes, Q&A",
  description: "Run live polls, word clouds, Q&A, ratings, and quizzes. Free while we grow.",
};

/**
 * Host-facing landing page — the marketing surface for people who want to
 * *create* sessions, separated from the audience-first homepage.
 */
export default async function HostPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);

  return (
    <>
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <NavBar />
      </div>

      <main className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
        </div>

        <section className="mx-auto max-w-3xl px-6 pt-16 pb-12 text-center">
          <div className="anim-fade-up flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] muted-text">
            <span className="live-dot" /> For hosts
          </div>
          <h1 className="anim-fade-up delay-100 mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
            Live answers from every phone in the room.
          </h1>
          <p className="anim-fade-up delay-200 mx-auto mt-4 max-w-2xl text-base sm:text-lg muted-text">
            Run a poll, ask a question, score a quiz — your audience answers from any phone. No apps, no signups, no waiting.
          </p>
          <div className="anim-fade-up delay-300 mt-8 flex items-center justify-center gap-3">
            <Link href={signedIn ? "/dashboard" : "/login"} className="btn-primary press">
              {signedIn ? "Open dashboard" : "Start hosting — free"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/demo" className="btn-ghost press">Watch the demo</Link>
          </div>
          <p className="mt-3 text-xs muted-text">
            Audience joining a session?{" "}
            <Link href="/" className="underline-offset-4 hover:underline">Enter your code →</Link>
          </p>
        </section>
      </main>

      <StartTiles signedIn={signedIn} />

      <UseCaseTabs />

      <EasyToStart signedIn={signedIn} />

      <HomeLanding />
    </>
  );
}
