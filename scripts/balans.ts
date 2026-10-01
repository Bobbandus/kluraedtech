/**
 * Balanssimulering för Topptur.
 * Kör: npm run balans
 *
 * A: 92 % rätt, ganska snabb
 * B: 73 % rätt, klickar extremt snabbt
 * C: 88 % rätt, långsam men noggrann
 * D: 55 % rätt (tur med gissningar kan ge enstaka bra matcher)
 * + 24 klasskamrater med spridd nivå.
 */
import {
  mulberry32,
  simulateMatch,
  ranked,
  type Energy,
  type QuestionMeta,
  type SimPlayer,
} from "../src/lib/game/engine.ts";

const RUNS = 3000;
const energies: Energy[] = ["lugn", "standard", "fullfart"];

function makeClass(seed: number): SimPlayer[] {
  const rng = mulberry32(seed);
  const core: SimPlayer[] = [
    { id: "A", name: "A", skinId: "", profile: { accuracy: 0.92, pace: 0.3, jitter: 0.3 } },
    { id: "B", name: "B", skinId: "", profile: { accuracy: 0.73, pace: 0.1, jitter: 0.25 } },
    { id: "C", name: "C", skinId: "", profile: { accuracy: 0.88, pace: 0.55, jitter: 0.25 } },
    { id: "D", name: "D", skinId: "", profile: { accuracy: 0.55, pace: 0.4, jitter: 0.35 } },
  ];
  for (let i = 0; i < 24; i++) {
    core.push({
      id: `k${i}`,
      name: `k${i}`,
      skinId: "",
      profile: { accuracy: 0.5 + rng() * 0.35, pace: 0.3 + rng() * 0.35, jitter: 0.3 },
    });
  }
  return core;
}

function makeQuiz(seed: number): QuestionMeta[] {
  const rng = mulberry32(seed);
  return Array.from({ length: 15 }, () => ({
    options: 4,
    correct: Math.floor(rng() * 4),
    time: 20,
    difficulty: (rng() - 0.5) * 0.3,
  }));
}

for (const energy of energies) {
  const wins: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, övriga: 0 };
  const avgRank: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  let winnerHadMostCorrect = 0;
  let winnerWithinOne = 0;
  for (let r = 0; r < RUNS; r++) {
    const res = simulateMatch(1000 + r, makeClass(r), makeQuiz(5000 + r), energy);
    const order = ranked(res.players);
    const w = order[0].id;
    const maxCorrect = Math.max(...order.map((p) => p.correct));
    if (order[0].correct === maxCorrect) winnerHadMostCorrect++;
    if (order[0].correct >= maxCorrect - 1) winnerWithinOne++;
    wins[w in wins ? w : "övriga"]++;
    for (const k of Object.keys(avgRank)) avgRank[k] += order.findIndex((p) => p.id === k) + 1;
  }
  console.log(`\n${energy.toUpperCase()} (${RUNS} matcher, 28 spelare)`);
  for (const k of Object.keys(wins)) {
    const pct = ((wins[k] / RUNS) * 100).toFixed(1).padStart(5);
    const rank = k in avgRank ? `  snittplacering ${(avgRank[k] / RUNS).toFixed(1)}` : "";
    console.log(`  ${k.padEnd(7)} vinner ${pct} %${rank}`);
  }
  console.log(`  Vinnaren hade flest rätt (eller delat):  ${((winnerHadMostCorrect / RUNS) * 100).toFixed(1)} %`);
  console.log(`  Vinnaren högst 1 rätt från bästa:        ${((winnerWithinOne / RUNS) * 100).toFixed(1)} %`);
}

// Huvud mot huvud: bara A–D i samma match.
console.log("\nENDAST A–D (standard)");
const h2h: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
for (let r = 0; r < RUNS; r++) {
  const res = simulateMatch(9000 + r, makeClass(r).slice(0, 4), makeQuiz(7000 + r), "standard");
  h2h[ranked(res.players)[0].id]++;
}
for (const k of Object.keys(h2h)) console.log(`  ${k} vinner ${((h2h[k] / RUNS) * 100).toFixed(1).padStart(5)} %`);
