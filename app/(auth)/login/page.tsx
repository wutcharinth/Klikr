import Link from "next/link";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-20">
      <Link href="/" className="text-xs muted-text hover:text-[var(--fg)]">
        ← Klikr
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm muted-text">Use your Google account to host a session.</p>

      <div className="mt-10">
        <GoogleSignInButton />
      </div>

      {error && (
        <p className="mt-4 text-xs" style={{ color: "var(--blue-link)" }}>
          {decodeURIComponent(error)}
        </p>
      )}
    </main>
  );
}
