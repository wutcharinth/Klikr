import Link from "next/link";
import { login } from "../actions";
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
      <p className="mt-2 text-sm muted-text">Continue with Google or your email.</p>

      <div className="mt-8">
        <GoogleSignInButton />
      </div>

      <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] muted-text">
        <span className="h-px flex-1 bg-[var(--line)]" />
        <span>or with email</span>
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <form action={login} className="space-y-4">
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
        <button className="btn-primary mt-2 w-full">Sign in</button>
      </form>
    </main>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs muted-text">{label}</span>
      <input {...props} className="input" />
    </label>
  );
}
