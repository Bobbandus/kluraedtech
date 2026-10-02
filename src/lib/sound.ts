"use client";

import { useStore } from "@/lib/store";

/**
 * Ljudeffekter syntetiserade med Web Audio – inga ljudfiler.
 * Respekterar inställningen prefs.sound och tystas helt om den är av.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const lastPlayed = new Map<string, number>();

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!useStore.getState().prefs.sound) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; at?: number; vol?: number; slide?: number; attack?: number } = {}) {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + (opts.at ?? 0);
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(freq, t);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * opts.slide), t + dur);
  const v = opts.vol ?? 0.5;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + (opts.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, opts: { at?: number; vol?: number; freq?: number; q?: number; type?: BiquadFilterType } = {}) {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + (opts.at ?? 0);
  const len = Math.ceil(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = opts.type ?? "bandpass";
  f.frequency.value = opts.freq ?? 1200;
  f.Q.value = opts.q ?? 0.8;
  const g = a.createGain();
  g.gain.value = opts.vol ?? 0.4;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export type Sfx =
  | "coin"
  | "correct"
  | "wrong"
  | "build"
  | "upgrade"
  | "wave"
  | "boss"
  | "leak"
  | "kill"
  | "star"
  | "crash"
  | "shot"
  | "hit"
  | "busted"
  | "ghost"
  | "escape"
  | "tick"
  | "go"
  | "click";

/** Minsta tid mellan två likadana ljud (ms) så att det inte blir kakofoni. */
const GAP: Partial<Record<Sfx, number>> = { kill: 70, hit: 90, shot: 80, crash: 160, coin: 60, leak: 200 };

export function sfx(name: Sfx) {
  const now = performance.now();
  const gap = GAP[name] ?? 30;
  if (now - (lastPlayed.get(name) ?? 0) < gap) return;
  lastPlayed.set(name, now);
  switch (name) {
    case "coin":
      tone(988, 0.08, { type: "square", vol: 0.18 });
      tone(1319, 0.16, { type: "square", vol: 0.18, at: 0.07 });
      break;
    case "correct":
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: "triangle", vol: 0.35, at: i * 0.06 }));
      break;
    case "wrong":
      tone(220, 0.22, { type: "sawtooth", vol: 0.16, slide: 0.7 });
      tone(165, 0.3, { type: "sawtooth", vol: 0.14, at: 0.12, slide: 0.7 });
      break;
    case "build":
      noise(0.12, { freq: 300, vol: 0.5, type: "lowpass" });
      tone(180, 0.1, { type: "square", vol: 0.15, at: 0.02 });
      tone(660, 0.09, { type: "triangle", vol: 0.25, at: 0.1 });
      break;
    case "upgrade":
      [440, 554, 659, 880].forEach((f, i) => tone(f, 0.12, { type: "square", vol: 0.12, at: i * 0.05 }));
      break;
    case "wave":
      tone(392, 0.25, { type: "sawtooth", vol: 0.12, attack: 0.04 });
      tone(523, 0.4, { type: "sawtooth", vol: 0.12, at: 0.18, attack: 0.04 });
      break;
    case "boss":
      tone(98, 0.6, { type: "sawtooth", vol: 0.25, slide: 0.8 });
      noise(0.5, { freq: 120, vol: 0.5, type: "lowpass" });
      break;
    case "leak":
      tone(140, 0.2, { type: "square", vol: 0.16, slide: 0.6 });
      break;
    case "kill":
      tone(700 + Math.random() * 200, 0.06, { type: "triangle", vol: 0.12, slide: 1.6 });
      break;
    case "star":
      [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, { type: "triangle", vol: 0.3, at: i * 0.05 }));
      tone(2093, 0.4, { type: "sine", vol: 0.15, at: 0.22 });
      break;
    case "crash":
      noise(0.25, { freq: 500, vol: 0.6, type: "lowpass" });
      tone(90, 0.18, { type: "square", vol: 0.12, slide: 0.6 });
      break;
    case "shot":
      noise(0.07, { freq: 2600, vol: 0.35, q: 0.6 });
      tone(320, 0.06, { type: "square", vol: 0.06, slide: 0.4 });
      break;
    case "hit":
      tone(260, 0.08, { type: "square", vol: 0.1, slide: 0.5 });
      break;
    case "busted":
      tone(880, 0.25, { type: "square", vol: 0.12 });
      tone(660, 0.25, { type: "square", vol: 0.12, at: 0.25 });
      tone(880, 0.25, { type: "square", vol: 0.12, at: 0.5 });
      tone(660, 0.35, { type: "square", vol: 0.12, at: 0.75 });
      break;
    case "ghost":
      tone(300, 0.5, { type: "sine", vol: 0.25, slide: 3, attack: 0.08 });
      noise(0.4, { freq: 1800, vol: 0.15, q: 2 });
      break;
    case "escape":
      [523, 784, 1047].forEach((f, i) => tone(f, 0.25, { type: "triangle", vol: 0.28, at: i * 0.09 }));
      break;
    case "tick":
      tone(880, 0.09, { type: "square", vol: 0.14 });
      break;
    case "go":
      tone(1320, 0.3, { type: "square", vol: 0.16 });
      break;
    case "click":
      tone(1200, 0.03, { type: "square", vol: 0.08 });
      break;
  }
}

/** Liten ljudknapp till spelens HUD. */
export function useSound(): [boolean, () => void] {
  const on = useStore((x) => x.prefs.sound);
  const setPrefs = useStore((x) => x.setPrefs);
  return [on, () => setPrefs({ sound: !on })];
}
