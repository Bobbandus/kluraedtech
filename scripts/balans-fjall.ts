/**
 * Balans för Fjällförsvar: hur långt kommer olika elevtyper på 8 minuter?
 * Kör: npm run balans:fjall
 */
import { mulberry32, gaussian } from "../src/lib/game/engine.ts";
import { createDefense, step, onCorrect, botSpend, bestSpots, finalScore, FEEDBACK_CORRECT, FEEDBACK_WRONG, READ_LOCK } from "../src/lib/game/defense.ts";

const MINUTES = 8;
const DT = 0.1;

const TYPES = [
  { id: "A noggrann & van", acc: 0.92, read: 6 },
  { id: "B snabbklickare", acc: 0.5, read: 1.6 },
  { id: "C långsam men säker", acc: 0.88, read: 10 },
  { id: "E medel", acc: 0.7, read: 5 },
  { id: "D svarar aldrig", acc: 0, read: 9999 },
];

const spots = bestSpots();
for (const ty of TYPES) {
  let waves = 0;
  let score = 0;
  let downs = 0;
  const RUNS = 60;
  for (let r = 0; r < RUNS; r++) {
    const rng = mulberry32(100 + r);
    const s = createDefense(r);
    let next = ty.read;
    let streak = 0;
    let correct = 0;
    let wasDown = false;
    while (s.t < MINUTES * 60) {
      step(s, DT);
      if (s.downed && !wasDown) downs++;
      wasDown = s.downed;
      if (s.t >= next) {
        const ok = rng() < ty.acc;
        if (ok) {
          streak++;
          correct++;
          onCorrect(s, streak);
        } else streak = 0;
        next = s.t + Math.max(READ_LOCK + 0.6, ty.read * Math.exp(gaussian(rng) * 0.25)) + (ok ? FEEDBACK_CORRECT : FEEDBACK_WRONG);
        botSpend(s, rng, spots);
      }
    }
    waves += s.wavesCleared;
    score += finalScore(s, correct);
  }
  console.log(`${ty.id.padEnd(22)} vågor ${(waves / RUNS).toFixed(1).padStart(5)}   poäng ${Math.round(score / RUNS).toString().padStart(6)}   stugan föll ${(downs / RUNS).toFixed(2)} ggr/match`);
}
