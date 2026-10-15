/**
 * Straffar – spelmotor (ren TS).
 *
 * Rätt svar ger en straffspark. Man siktar i två steg (sida, sedan höjd)
 * med en markör som pendlar. Hörnen är omöjliga för målvakten men lätta
 * att missa. Rätt svar i rad höjer multiplikatorn.
 */

import type { Energy } from "./engine";

export const READ_LOCK = 0.8;
export const FEEDBACK_CORRECT = 0.6;
export const FEEDBACK_WRONG = 3.4;

export type ShotResult = "goal" | "save" | "post" | "wide" | "over";

export interface Shot {
  /** Sida: -1 vänster stolpe … 1 höger stolpe (utanför = bredvid) */
  u: number;
  /** Höjd: 0 marken … 1 ribban (över = över) */
  v: number;
  /** Målvaktens dykriktning */
  keeper: -1 | 0 | 1;
  result: ShotResult;
  points: number;
}

export const multiplier = (streak: number) => 1 + Math.min(8, streak) * 0.25;

/** Markörens fart (varv per sekund) */
export function sweepSpeed(energy: Energy, axis: "u" | "v") {
  const base = energy === "lugn" ? 0.5 : energy === "fullfart" ? 0.85 : 0.66;
  return axis === "u" ? base : base * 1.15;
}

/** Var markören är vid tiden t (s) */
export function sweep(t: number, energy: Energy, axis: "u" | "v") {
  const s = Math.sin(t * Math.PI * 2 * sweepSpeed(energy, axis));
  return axis === "u" ? s * 1.22 : (s + 1) / 2 * 1.2;
}

export function isTopCorner(u: number, v: number) {
  return Math.abs(u) > 0.62 && v > 0.62 && Math.abs(u) <= 1 && v <= 1;
}

/** Avgör skottet. rng ger 0..1. */
export function shoot(u: number, v: number, streak: number, rng: () => number, energy: Energy = "standard", tendency = 0): Shot {
  // Målvakten gissar – oftast åt ett hörn, och läser av den som alltid skjuter åt samma håll
  const t = energy === "lugn" ? 0 : Math.max(-1, Math.min(1, tendency));
  const pl = 0.4 - 0.3 * t;
  const pr = 0.4 + 0.3 * t;
  const r = rng();
  const keeper: -1 | 0 | 1 = r < pl ? -1 : r < pl + pr ? 1 : 0;
  let result: ShotResult = "goal";
  if (Math.abs(u) > 1.04) result = "wide";
  else if (v > 1.04) result = "over";
  else if ((Math.abs(u) > 0.94 || v > 0.94) && rng() < 0.45) result = "post";
  else {
    const kx = keeper * 0.62;
    const reach = energy === "lugn" ? 0.36 : 0.42;
    const inReach = Math.abs(u - kx) < reach && !(isTopCorner(u, v) && keeper !== 0 && Math.abs(u) > 0.7);
    // Mitt i mål: målvakten som står kvar tar allt lågt och mitt
    const centreSave = keeper === 0 && Math.abs(u) < 0.34 && v < 0.85;
    if ((keeper !== 0 && inReach && v < 0.92) || centreSave) result = "save";
  }
  const base = result === "goal" ? (isTopCorner(u, v) ? 150 : 100) : 0;
  return { u, v, keeper, result, points: Math.round(base * multiplier(streak)) };
}

export const RESULT_TEXT: Record<ShotResult, string> = {
  goal: "MÅL!",
  save: "Räddning!",
  post: "I stolpen!",
  wide: "Utanför!",
  over: "Över!",
};

/** Bottar: ungefärlig träffprocent */
export function botGoalChance(skill: number) {
  return 0.45 + skill * 0.3;
}

export function scoreCap(correct: number) {
  return correct * 150 * multiplier(8) + 100;
}
