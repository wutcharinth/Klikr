"use client";

// Sound effects for the audience phone (and the big screen's countdown),
// synthesized with WebAudio: zero bytes to download. These used to point at
// full-length music tracks (4.7 MB / 6.1 MB MP3s) — every phone in the room
// pulled megabytes over venue Wi-Fi just to play a blip.

const STORAGE_KEY = "klikr:audio:on";
const PRESENTER_KEY = "klikr-presenter-music";

export function isAudioOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAudioOn(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {}
  if (on) void unlock();
}

/** The presenter's sound preference (shared with the music toggle). */
export function isPresenterSoundOn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PRESENTER_KEY) === "on";
  } catch {
    return false;
  }
}

type Clip = "submit" | "correct" | "wrong" | "tick" | "reveal" | "whoosh" | "go";

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Resume the context inside a user gesture (iOS starts it suspended). */
export async function unlock() {
  const c = audioContext();
  if (c && c.state === "suspended") {
    try {
      await c.resume();
    } catch {}
  }
}

function tone(
  c: AudioContext,
  { freq, to, start = 0, dur, type = "sine", gain = 0.18 }: {
    freq: number;
    to?: number;
    start?: number;
    dur: number;
    type?: OscillatorType;
    gain?: number;
  },
) {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(c: AudioContext, { start = 0, dur, gain = 0.08, from = 800, to = 3000 }: {
  start?: number; dur: number; gain?: number; from?: number; to?: number;
}) {
  const t0 = c.currentTime + start;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function play(c: AudioContext, name: Clip) {
  switch (name) {
    case "submit":
      tone(c, { freq: 660, to: 990, dur: 0.12, type: "triangle" });
      tone(c, { freq: 990, start: 0.07, dur: 0.14, type: "triangle", gain: 0.12 });
      break;
    case "correct":
      // Rising major arpeggio.
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(c, { freq: f, start: i * 0.08, dur: 0.22, type: "triangle", gain: 0.16 }),
      );
      break;
    case "wrong":
      tone(c, { freq: 220, to: 150, dur: 0.32, type: "sawtooth", gain: 0.07 });
      tone(c, { freq: 233, to: 155, dur: 0.32, type: "square", gain: 0.04 });
      break;
    case "tick":
      tone(c, { freq: 1200, dur: 0.05, type: "square", gain: 0.05 });
      break;
    case "go":
      tone(c, { freq: 880, dur: 0.09, type: "triangle", gain: 0.14 });
      tone(c, { freq: 1318.5, start: 0.08, dur: 0.18, type: "triangle", gain: 0.14 });
      break;
    case "reveal":
      noise(c, { dur: 0.35, gain: 0.06, from: 600, to: 4000 });
      tone(c, { freq: 392, start: 0.12, dur: 0.3, type: "triangle", gain: 0.12 });
      tone(c, { freq: 587.33, start: 0.2, dur: 0.35, type: "triangle", gain: 0.12 });
      break;
    case "whoosh":
      noise(c, { dur: 0.45, gain: 0.07, from: 300, to: 2400 });
      break;
  }
}

function playIf(name: Clip, enabled: boolean) {
  if (!enabled) return;
  const c = audioContext();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => {});
  try {
    play(c, name);
  } catch {
    /* unsupported — ignore */
  }
}

/** Audience phone SFX (respects the phone's sound toggle). */
export function playClip(name: Clip) {
  playIf(name, isAudioOn());
}

/** Big-screen SFX (respects the presenter's sound toggle). */
export function playPresenterClip(name: Clip) {
  playIf(name, isPresenterSoundOn());
}

export function vibrate(pattern: number | number[] = 50) {
  if (!isAudioOn()) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* permission denied — ignore */
    }
  }
}
