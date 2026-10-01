import type { Energy } from "@/lib/game/engine";
import { ALL_QUIZZES, type Quiz } from "@/data/quizzes";

/**
 * Livesessioner. Idag lever de i webbläsaren; senare ersätts detta av en
 * realtidstjänst där koden slås upp på servern. Elev- och lärarvy pratar
 * bara med den här modulen, så bytet blir lokalt.
 */

export interface LiveSettings {
  energy: Energy;
  longerTime: boolean;
  randomNames: boolean;
  cards: boolean;
}

export interface LiveSession {
  code: string;
  quiz: Quiz;
  settings: LiveSettings;
  className?: string;
  createdAt: number;
}

const KEY = "klura-live";
const ROTATION = ["stormaktstiden", "kroppen", "procent", "vikingatiden", "periodiska", "kallkritik", "irregular-verbs", "sveriges-landskap", "demokrati"];

export function newCode(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}

export function saveLive(s: LiveSession) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* privat läge */
  }
}

export function findLive(code: string): LiveSession {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as LiveSession;
      if (s.code === code && Date.now() - s.createdAt < 1000 * 60 * 60 * 3) return s;
    }
  } catch {
    /* ignorera */
  }
  const n = code.split("").reduce((a, c) => a + Number(c), 0);
  const quiz = ALL_QUIZZES.find((q) => q.id === ROTATION[n % ROTATION.length])!;
  return {
    code,
    quiz,
    settings: { energy: "standard", longerTime: false, randomNames: false, cards: true },
    createdAt: Date.now(),
  };
}
