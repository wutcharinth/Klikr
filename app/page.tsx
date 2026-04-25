import Link from "next/link";
import { redirect } from "next/navigation";

async function joinAction(formData: FormData) {
  "use server";
  const raw = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!raw) return;
  redirect(`/play/${encodeURIComponent(raw)}`);
}

export default function Landing() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
      <div className="pill">
        <span className="live-dot" /> Realtime audience interaction
      </div>

      <h1 className="mt-10 text-[7rem] leading-none font-bold tracking-tighter sm:text-[9rem]">
        Klikr
      </h1>

      <p className="mt-6 max-w-md text-base muted-text">
        A minimal, fast platform for polls, word clouds, Q&amp;A, and quizzes.
      </p>

      <form action={joinAction} className="mt-14 w-full panel p-5">
        <label className="mono text-[10px] uppercase tracking-[0.18em] muted-text">
          Join with code
        </label>
        <div className="mt-3 flex gap-2">
          <input
            name="code"
            placeholder="ABC123"
            autoComplete="off"
            maxLength={8}
            className="input mono flex-1 text-lg uppercase tracking-[0.3em]"
            required
          />
          <button type="submit" className="btn-primary">
            Join
          </button>
        </div>
      </form>

      <div className="mt-12 text-xs muted-text">
        Hosting a session?{" "}
        <Link href="/login" className="text-[var(--fg)] underline-offset-4 hover:underline">
          Sign in to present
        </Link>
      </div>
    </main>
  );
}
