import Link from "next/link";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main
      className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-20"
      style={{
        backgroundImage:
          "radial-gradient(900px 500px at 50% -10%, rgba(0,113,227,0.07), transparent 60%)",
      }}
    >
      <div className="anim-fade-up relative z-10">
        <Link href="/" className="text-xs muted-text hover:text-[var(--fg)]">
          ← Klikr
        </Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm muted-text">Use your Google account to host a session.</p>
      </div>

      <div className="anim-fade-up delay-200 relative z-10 mt-10">
        <GoogleSignInButton />
      </div>

      {error && (
        <p className="anim-fade-in mt-4 text-xs" style={{ color: "var(--danger)" }}>
          {decodeURIComponent(error)}
        </p>
      )}
    </main>
  );
}
