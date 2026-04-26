import Link from "next/link";
import { redirect } from "next/navigation";
import { JoinForm } from "@/components/JoinForm";
import { ArrowRight } from "lucide-react";
import NavBar from "@/components/NavBar";
import { createClient } from "@/lib/supabase/server";

async function joinAction(formData: FormData) {
  "use server";
  const raw = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!raw) return;
  redirect(`/play/${encodeURIComponent(raw)}`);
}

/**
 * Audience-first homepage. Most visitors arrive here to join a session — the
 * giant join code field is the whole point. A small "Hosting?" link in the
 * top-right and a card at the bottom send hosts to /host.
 */
export default async function Landing() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const signedIn = Boolean(data.user);

  return (
    <main className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <NavBar />
      </div>

      <div className="absolute inset-0 -z-10">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <div className="mx-auto flex min-h-[78vh] max-w-2xl flex-col items-center justify-center px-6 pt-8 pb-12 text-center">
        <div className="anim-fade-up flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] muted-text">
          <span className="live-dot" /> Joining a session?
        </div>

        <h1 className="mt-8 text-5xl font-semibold tracking-tight sm:text-6xl">
          Got a code? Drop it in.
        </h1>
        <p className="anim-fade-up delay-300 mt-4 max-w-md text-base muted-text">
          Type the six letters your host shared and you're in. No app, no signup.
        </p>

        <JoinForm action={joinAction} />

        <p className="anim-fade-up delay-700 mt-6 text-xs muted-text">
          Tip — your host can also share a QR. Just point your camera at it.
        </p>
      </div>

      {/* Host CTA — visible but secondary */}
      <section className="mx-auto mb-20 max-w-3xl px-6">
        <Link
          href={signedIn ? "/dashboard" : "/host"}
          className="panel block p-6 transition-transform hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] muted-text">For hosts</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                Run your own poll, quiz, or Q&amp;A.
              </h2>
              <p className="mt-1 text-sm muted-text">
                Build a deck in seconds, share a code, and watch live answers roll in.
              </p>
            </div>
            <span className="btn-primary">
              {signedIn ? "Open dashboard" : "Get started"}
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>

        <p className="mt-4 text-center text-xs muted-text">
          Curious first?{" "}
          <Link href="/demo" className="hover:text-[var(--ink)] underline-offset-4 hover:underline">
            See a live demo
          </Link>{" "}
          ·{" "}
          <Link href="/about" className="hover:text-[var(--ink)] underline-offset-4 hover:underline">
            About Klikr
          </Link>
        </p>
      </section>
    </main>
  );
}
