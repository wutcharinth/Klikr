"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutTemplate, Sparkles, Plus, QrCode, ArrowRight, PartyPopper } from "lucide-react";
import { completeOnboarding } from "@/app/(auth)/actions";

const STEPS = ["start", "audience", "promise"] as const;
type Step = typeof STEPS[number];

export default function WelcomeFlow() {
  const [step, setStep] = useState<Step>("start");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
      <Progress current={STEPS.indexOf(step)} />

      <section className="anim-fade-up panel mt-10 p-10">
        {step === "start" && (
          <Start onPick={() => setStep("audience")} />
        )}
        {step === "audience" && (
          <Audience onNext={() => setStep("promise")} />
        )}
        {step === "promise" && (
          <Promise />
        )}
      </section>

      <div className="mt-6 flex justify-center">
        <form action={completeOnboarding}>
          <button className="text-xs muted-text hover:text-[var(--ink)]">
            Skip the tour →
          </button>
        </form>
      </div>
    </main>
  );
}

function Progress({ current }: { current: number }) {
  return (
    <div className="flex justify-center gap-2">
      {STEPS.map((_, i) => (
        <span
          key={i}
          className="h-1 rounded-full transition-all"
          style={{
            width: i === current ? 32 : 16,
            background: i <= current ? "var(--blue)" : "var(--line)",
          }}
        />
      ))}
    </div>
  );
}

function Start({ onPick }: { onPick: () => void }) {
  const tiles = [
    { href: "/templates", Icon: LayoutTemplate, title: "An icebreaker, retro, or quiz", body: "Open a ready-made template — change a few words and you're set." },
    { href: "/dashboard?ai=1", Icon: Sparkles, title: "Something tailored", body: "Describe the meeting — your slides land in a few seconds." },
    { href: "/dashboard", Icon: Plus, title: "I know what I want", body: "Start a blank deck and build it your way." },
  ];
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Welcome. What do you want to run?</h1>
      <p className="mt-2 text-[15px] muted-text">Pick a starting point. You can always change your mind.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.title} href={t.href} className="panel-soft p-5 transition-transform hover:-translate-y-0.5">
            <t.Icon className="h-6 w-6" style={{ color: "var(--blue)" }} />
            <p className="mt-3 font-medium">{t.title}</p>
            <p className="mt-1 text-xs muted-text">{t.body}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8 flex justify-end">
        <button onClick={onPick} className="btn-ghost">
          Next <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

function Audience({ onNext }: { onNext: () => void }) {
  return (
    <div className="grid items-center gap-8 sm:grid-cols-[1fr_auto]">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Joining is just a code on a phone.</h1>
        <p className="mt-3 text-[15px] muted-text">
          Anyone in the room scans your QR or types the code. No app store. No account. Their answers
          show up the moment they hit submit.
        </p>
      </div>
      <div
        className="flex h-44 w-44 flex-col items-center justify-center rounded-2xl"
        style={{
          background: "linear-gradient(135deg,#0071E3,#00C2FF)",
          color: "var(--white)",
        }}
      >
        <QrCode className="h-12 w-12" />
        <p className="mt-3 mono text-2xl tracking-widest">A4F2 9K</p>
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <button onClick={onNext} className="btn-ghost">
          Next <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Promise() {
  return (
    <>
      <PartyPopper className="h-8 w-8" style={{ color: "var(--blue)" }} />
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Use everything. No card.</h1>
      <p className="mt-3 text-[15px] muted-text">
        Custom branding, AI deck generation, unlimited audiences, exports — yours from day one.
        When we eventually charge, you'll be on the list of people who joined early and stay free.
      </p>
      <div className="mt-8 flex justify-end">
        <form action={completeOnboarding}>
          <button className="btn-primary">
            Take me to my dashboard <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );
}
