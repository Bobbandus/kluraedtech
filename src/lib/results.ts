import { ranked, simulateMatch, type Energy, type PlayerState } from "@/lib/game/engine";
import { ALL_QUIZZES, type Quiz } from "@/data/quizzes";
import { CLASSES, makeClassmates } from "@/data/people";
import type { Subject } from "@/components/cover";

export interface ResultPlayer {
  id: string;
  name: string;
  skinId: string;
  score: number;
  correct: number;
  answered: number;
  bestStreak: number;
  rank: number;
  answers: (number | null)[];
}

export interface ResultQuestion {
  text: string;
  options: string[];
  correct: number;
  concept?: string;
  explanation?: string;
  distribution: number[];
  unanswered: number;
}

export interface SessionResult {
  id: string;
  quizId: string;
  quizTitle: string;
  subject: Subject;
  className: string;
  date: string;
  energy: Energy;
  players: ResultPlayer[];
  questions: ResultQuestion[];
}

export function buildResult(
  id: string,
  quiz: Quiz,
  className: string,
  date: string,
  energy: Energy,
  players: PlayerState[],
  distribution: number[][],
  unanswered: number[],
): SessionResult {
  const order = ranked(players);
  return {
    id,
    quizId: quiz.id,
    quizTitle: quiz.title,
    subject: quiz.subject,
    className,
    date,
    energy,
    players: order.map((p, i) => ({
      id: p.id,
      name: p.name,
      skinId: p.skinId,
      score: p.score,
      correct: p.correct,
      answered: p.answered,
      bestStreak: p.bestStreak,
      rank: i + 1,
      answers: quiz.questions.map((_, qi) => p.answers.find((a) => a.q === qi)?.option ?? null),
    })),
    questions: quiz.questions.map((q, qi) => ({
      text: q.text,
      options: q.options,
      correct: q.correct,
      concept: q.concept,
      explanation: q.explanation,
      distribution: distribution[qi],
      unanswered: unanswered[qi],
    })),
  };
}

/** Svårighet per fråga för simulerad historik: ger realistiska "missuppfattningar". */
const HARD: Record<string, number> = {
  "stormaktstiden:3": 0.28,
  "stormaktstiden:7": 0.22,
  "stormaktstiden:8": 0.18,
  "algebra-grund:9": 0.3,
  "algebra-grund:4": 0.2,
  "algebra-grund:6": 0.16,
  "kroppen:7": 0.24,
  "kroppen:6": 0.14,
  "periodiska:0": 0.2,
  "procent:4": 0.3,
};

function simulateHistory(id: string, quizId: string, classId: string, date: string, energy: Energy, seed: number): SessionResult {
  const quiz = ALL_QUIZZES.find((q) => q.id === quizId)!;
  const cls = CLASSES.find((c) => c.id === classId)!;
  const mates = makeClassmates(seed, cls.students);
  const metas = quiz.questions.map((q, i) => ({
    options: q.options.length,
    correct: q.correct,
    time: q.time,
    difficulty: HARD[`${quizId}:${i}`] ?? (i % 4 === 0 ? -0.08 : 0),
  }));
  const sim = simulateMatch(seed, mates, metas, energy);
  return buildResult(id, quiz, cls.name, date, energy, sim.players, sim.distribution, sim.unanswered);
}

let cache: SessionResult[] | null = null;

export function seededHistory(): SessionResult[] {
  if (cache) return cache;
  cache = [
    simulateHistory("r-0929-9a", "stormaktstiden", "9a", "2026-09-29T09:10:00", "standard", 41),
    simulateHistory("r-0926-ma9", "algebra-grund", "ma9", "2026-09-26T13:20:00", "lugn", 77),
    simulateHistory("r-0923-8d", "kroppen", "8d", "2026-09-23T10:05:00", "standard", 12),
    simulateHistory("r-0919-8b", "stormaktstiden", "8b", "2026-09-19T08:30:00", "fullfart", 93),
    simulateHistory("r-0916-ma9", "procent", "ma9", "2026-09-16T13:15:00", "lugn", 58),
  ];
  return cache;
}

/* ---------- Analys ---------- */

export function questionAccuracy(q: ResultQuestion, total: number): number {
  return total ? q.distribution[q.correct] / total : 0;
}

export function classAccuracy(r: SessionResult): number {
  const total = r.players.length * r.questions.length;
  const correct = r.players.reduce((s, p) => s + p.correct, 0);
  return total ? correct / total : 0;
}

export function conceptStats(r: SessionResult): { concept: string; accuracy: number; questions: number }[] {
  const map = new Map<string, { c: number; t: number; n: number }>();
  const n = r.players.length;
  for (const q of r.questions) {
    const key = q.concept ?? "Övrigt";
    const m = map.get(key) ?? { c: 0, t: 0, n: 0 };
    m.c += q.distribution[q.correct];
    m.t += n;
    m.n += 1;
    map.set(key, m);
  }
  return [...map.entries()].map(([concept, m]) => ({ concept, accuracy: m.t ? m.c / m.t : 0, questions: m.n })).sort((a, b) => a.accuracy - b.accuracy);
}

/** Vanligaste felsvaret — ofta en missuppfattning värd att prata om. */
export function commonWrong(q: ResultQuestion): { option: number; share: number } | null {
  const total = q.distribution.reduce((a, b) => a + b, 0) + q.unanswered;
  let best = -1;
  let bestN = 0;
  q.distribution.forEach((n, i) => {
    if (i !== q.correct && n > bestN) {
      best = i;
      bestN = n;
    }
  });
  if (best < 0 || !total) return null;
  return { option: best, share: bestN / total };
}

export function formatDate(iso: string, withTime = false): string {
  const d = new Date(iso);
  const s = d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
  if (!withTime) return s;
  return `${s}, ${d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`;
}

export const pct = (x: number) => `${Math.round(x * 100)} %`;
