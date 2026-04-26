"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Mentimeter-style "Easy to start. Simple to connect." section: a chunky
 * display headline and three illustration-led cards on a warm cream canvas.
 * Each card runs a small infographic animation; the headline accent word
 * cycles through a small phrase set.
 */
export default function EasyToStart({ signedIn = false }: { signedIn?: boolean }) {
  const cards = useMemo(
    () => [
      {
        Illust: TemplatesInfo,
        title: "Customizable templates",
        body: "Pick a template. Then make it your own.",
        cta: "Explore free templates",
        href: "/templates",
      },
      {
        Illust: AIDeckInfo,
        title: "Instant decks",
        body: "Prompt our AI, customize, present. Done.",
        cta: "Try the AI deck builder",
        href: signedIn ? "/dashboard?ai=1" : "/login?next=/dashboard?ai=1",
      },
      {
        Illust: FlowInfo,
        title: "Flexible setups",
        body: "In the room, remote, or both — same code, every screen.",
        cta: "Get started for free",
        href: "/login",
      },
    ],
    [signedIn]
  );

  const accents = ["connect.", "engage.", "spark joy.", "decide together."];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % accents.length), 2800);
    return () => clearInterval(id);
  }, [accents.length]);

  return (
    <section
      className="border-t"
      style={{
        background: "#f5f1eb",
        borderColor: "rgba(0,0,0,0.06)",
      }}
    >
      <div className="mx-auto max-w-6xl px-6 py-24">
        <h2
          className="text-center text-5xl font-extrabold tracking-tight sm:text-6xl"
          style={{ letterSpacing: "-0.04em", lineHeight: 0.96 }}
        >
          Easy to start.
          <br />
          Simple to{" "}
          <span
            key={idx}
            className="inline-block"
            style={{
              color: "#646cff",
              animation: "fadeUp 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both",
            }}
          >
            {accents[idx]}
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-center text-base muted-text">
          Choose a template, build from scratch, or prompt AI. You'll be ready to present and
          interact in no time, no matter where your audience is.
        </p>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <Card key={c.title} index={i} {...c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({
  Illust,
  title,
  body,
  cta,
  href,
  index,
}: {
  Illust: React.FC<{ playing: boolean }>;
  title: string;
  body: string;
  cta: string;
  href: string;
  index: number;
}) {
  const [visible, setVisible] = useState(false);
  const [hover, setHover] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.3 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <article
      ref={ref}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-col rounded-3xl bg-white p-7 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ${index * 0.12}s, transform 0.7s ${index * 0.12}s, box-shadow 0.4s, translate 0.4s`,
      }}
    >
      <div className="flex h-44 items-center justify-center overflow-hidden">
        <Illust playing={visible || hover} />
      </div>
      <h3 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm muted-text">{body}</p>
      <Link
        href={href}
        className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all"
        style={{ background: "#ece6dd", color: "var(--ink)" }}
      >
        {cta}
        <span style={{ display: "inline-block", transition: "transform 0.25s", transform: hover ? "translateX(3px)" : "none" }}>→</span>
      </Link>
    </article>
  );
}

/* ---------------------------------------------------------------- *
 * Animated info-graphic illustrations
 * ---------------------------------------------------------------- */

function TemplatesInfo({ playing }: { playing: boolean }) {
  // Five color-coded "template" tiles slide up; cursor settles on one.
  const tiles = [0, 1, 2, 3, 4];
  const palette = ["#fca5a5", "#fcd34d", "#86efac", "#93c5fd", "#c4b5fd"];
  return (
    <svg viewBox="0 0 200 140" className="h-36 w-auto">
      {tiles.map((i) => (
        <rect
          key={i}
          x={20 + i * 32}
          y={92}
          width={26}
          height={28}
          rx={4}
          fill={palette[i]}
          style={{
            transformOrigin: `${33 + i * 32}px 120px`,
            transformBox: "fill-box",
            animation: playing ? `eatRise 0.55s ${i * 0.1}s both` : undefined,
          }}
        />
      ))}
      {/* cursor */}
      <g
        style={{
          animation: playing ? "eatCursor 1.6s 0.6s both" : undefined,
        }}
      >
        <path d="M0 0 L24 14 L13 16 L18 28 L13 30 L9 19 L0 18 Z" transform="translate(82 56)" fill="white" stroke="#1d1d1f" strokeWidth={2.5} strokeLinejoin="round" />
      </g>
      {/* highlighted selected tile pulse */}
      <rect
        x={84}
        y={92}
        width={26}
        height={28}
        rx={4}
        fill="none"
        stroke="#1d1d1f"
        strokeWidth={2.5}
        style={{ animation: playing ? "eatPulse 1.6s 1.4s ease-out forwards" : undefined, opacity: 0 }}
      />
      <style>{`
        @keyframes eatRise { from { transform: translateY(20px) scale(0.7); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes eatCursor { 0% { transform: translate(-30px,-20px); opacity: 0; } 30% { transform: translate(-10px,-10px); opacity: 1; } 100% { transform: translate(0,0); opacity: 1; } }
        @keyframes eatPulse { 0% { opacity: 0; } 30% { opacity: 1; } 100% { opacity: 1; } }
      `}</style>
    </svg>
  );
}

function AIDeckInfo({ playing }: { playing: boolean }) {
  // Bars grow from 0 → height; sparkle pops; AI sparkle drifts.
  const heights = [22, 38, 60, 86];
  return (
    <svg viewBox="0 0 200 140" className="h-36 w-auto">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={26 + i * 30}
          y={120 - h}
          width={20}
          height={h}
          fill="#1d1d1f"
          rx={2}
          style={{
            transformOrigin: `${36 + i * 30}px 120px`,
            transformBox: "fill-box",
            animation: playing ? `eaiBar 0.7s ${i * 0.13}s cubic-bezier(0.2, 0.8, 0.2, 1) both` : undefined,
          }}
        />
      ))}
      {/* trend arrow */}
      <path
        d="M30 100 L60 80 L90 60 L120 36 L150 22"
        fill="none"
        stroke="#646cff"
        strokeWidth={2.5}
        strokeLinecap="round"
        style={{
          strokeDasharray: 220,
          strokeDashoffset: playing ? 0 : 220,
          transition: "stroke-dashoffset 1.2s 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      />
      {/* sparkle */}
      <g style={{ animation: playing ? "eaiPop 0.55s 1.2s both" : undefined, opacity: 0, transformOrigin: "150px 22px", transformBox: "fill-box" }}>
        <path d="M150 14 l3 6 l6 2 l-6 2 l-3 6 l-3 -6 l-6 -2 l6 -2 z" fill="#646cff" />
      </g>
      {/* tiny dots */}
      <circle cx="170" cy="40" r="2" fill="#646cff" style={{ animation: playing ? "eaiPop 0.5s 1.4s both" : undefined, opacity: 0 }} />
      <circle cx="178" cy="56" r="1.5" fill="#646cff" style={{ animation: playing ? "eaiPop 0.5s 1.55s both" : undefined, opacity: 0 }} />
      <style>{`
        @keyframes eaiBar { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes eaiPop { 0% { opacity: 0; transform: scale(0.4); } 60% { opacity: 1; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </svg>
  );
}

function FlowInfo({ playing }: { playing: boolean }) {
  // Hub-and-spoke with a presenter screen at center and three audience devices
  // pulsing in. Lines draw on after they appear.
  return (
    <svg viewBox="0 0 200 140" className="h-36 w-auto" fill="none" stroke="#1d1d1f" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      {/* dashed connecting lines */}
      <line x1={100} y1={60} x2={50} y2={108} strokeDasharray="3 5" style={{ strokeDashoffset: playing ? 0 : 60, animation: playing ? "efoLine 1s 0.6s both" : undefined }} />
      <line x1={100} y1={60} x2={100} y2={108} strokeDasharray="3 5" style={{ strokeDashoffset: playing ? 0 : 60, animation: playing ? "efoLine 1s 0.75s both" : undefined }} />
      <line x1={100} y1={60} x2={150} y2={108} strokeDasharray="3 5" style={{ strokeDashoffset: playing ? 0 : 60, animation: playing ? "efoLine 1s 0.9s both" : undefined }} />
      {/* center presenter */}
      <g style={{ transformOrigin: "100px 36px", transformBox: "fill-box", animation: playing ? "efoPop 0.55s 0s both" : undefined, opacity: 0 }}>
        <rect x={78} y={18} width={44} height={32} rx={3} fill="white" />
        <rect x={86} y={26} width={28} height={3} fill="#646cff" />
        <rect x={86} y={32} width={20} height={3} fill="#1d1d1f" />
        <rect x={86} y={38} width={24} height={3} fill="#1d1d1f" />
      </g>
      {/* phones */}
      <g style={{ transformOrigin: "35px 122px", transformBox: "fill-box", animation: playing ? "efoPop 0.5s 1s both" : undefined, opacity: 0 }}>
        <rect x={25} y={108} width={20} height={28} rx={3} fill="white" />
        <circle cx={35} cy={120} r={3} fill="#16a34a" />
        <path d="M27 130 q8 -5 16 0" />
      </g>
      <g style={{ transformOrigin: "100px 122px", transformBox: "fill-box", animation: playing ? "efoPop 0.5s 1.15s both" : undefined, opacity: 0 }}>
        <rect x={90} y={108} width={20} height={28} rx={3} fill="white" />
        <circle cx={100} cy={120} r={3} fill="#2563eb" />
        <path d="M92 130 q8 -5 16 0" />
      </g>
      <g style={{ transformOrigin: "165px 122px", transformBox: "fill-box", animation: playing ? "efoPop 0.5s 1.3s both" : undefined, opacity: 0 }}>
        <rect x={155} y={108} width={20} height={28} rx={3} fill="white" />
        <circle cx={165} cy={120} r={3} fill="#f59e0b" />
        <path d="M157 130 q8 -5 16 0" />
      </g>
      <style>{`
        @keyframes efoLine { from { stroke-dashoffset: 60; } to { stroke-dashoffset: 0; } }
        @keyframes efoPop { 0% { opacity: 0; transform: scale(0.4); } 60% { opacity: 1; transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </svg>
  );
}

