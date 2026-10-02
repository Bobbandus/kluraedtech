/**
 * Balans för Biljakt: hur många stjärnor får olika elevtyper på 8 minuter?
 * Körskicklighet simuleras med autopiloten. Kör: npm run balans:jakt
 */
import { mulberry32 } from "../src/lib/game/engine.ts";
import { answer, autopilot, createChase, resume, step, FEEDBACK_CORRECT, FEEDBACK_WRONG } from "../src/lib/game/chase.ts";

const MINUTES = 8;
const DT = 1 / 30;
const RUNS = 10;

const TYPES = [
  { id: "A kan svaren, kör bra", acc: 0.9, skill: 0.9, read: 5 },
  { id: "B kan svaren, kör dåligt", acc: 0.9, skill: 0.2, read: 5 },
  { id: "C gissar, kör bra", acc: 0.35, skill: 0.9, read: 2 },
  { id: "D medel", acc: 0.65, skill: 0.5, read: 6 },
  { id: "E långsam men säker", acc: 0.9, skill: 0.5, read: 12 },
  { id: "F gissar, kör medel", acc: 0.35, skill: 0.5, read: 2 },
];

for (const ty of TYPES) {
  let stars = 0;
  let qs = 0;
  let busts = 0;
  for (let run = 0; run < RUNS; run++) {
    const rng = mulberry32(run * 97 + 1);
    const s = createChase(run * 13 + 5, "standard", 777 + run);
    let wait = 0;
    let pending: boolean | null = null;
    for (let t = 0; t < MINUTES * 60; t += DT) {
      if (s.phase === "question") {
        if (pending === null) {
          pending = rng() < ty.acc;
          wait = ty.read + rng() * 2;
        }
        wait -= DT;
        if (wait <= 0 && pending !== null) {
          answer(s, pending);
          qs++;
          // Återkopplingstid i slowmotion
          const fb = pending ? FEEDBACK_CORRECT : FEEDBACK_WRONG;
          for (let k = 0; k < fb / DT; k++) step(s, DT);
          t += fb;
          resume(s);
          pending = null;
        }
      } else {
        autopilot(s, ty.skill);
        // Sämre förare reagerar sent: ibland ingen styrning alls
        if (rng() > 0.4 + ty.skill * 0.6) s.input.steer = 0;
      }
      step(s, DT);
    }
    stars += s.score;
    busts += s.busts;
  }
  console.log(`${ty.id.padEnd(28)} poäng ${(stars / RUNS).toFixed(0).padStart(6)}   frågor ${(qs / RUNS).toFixed(1).padStart(5)}   fast ${(busts / RUNS).toFixed(1).padStart(4)}`);
}
