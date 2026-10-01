import { CLASSES, type ClassGroup } from "@/data/people";
import type { Question, Quiz } from "@/data/quizzes";
import { classAccuracy, conceptStats, playerAccuracy, questionAccuracy, type ResultQuestion, type SessionResult } from "@/lib/results";

/**
 * Uppföljning per klass över tid. Allt räknas fram ur lektionsresultaten,
 * så samma funktioner fungerar när resultaten senare kommer från en databas.
 */

export interface ClassStats {
  cls: ClassGroup;
  sessions: SessionResult[]; // äldst först
  latest: number | null;
  trend: number | null; // senaste minus snittet av de tidigare
}

export function classesFrom(sessions: SessionResult[]): ClassStats[] {
  return CLASSES.map((cls) => {
    const list = sessions.filter((r) => r.className === cls.name).sort((a, b) => a.date.localeCompare(b.date));
    const accs = list.map(classAccuracy);
    const latest = accs.length ? accs[accs.length - 1] : null;
    const prev = accs.slice(0, -1);
    const trend = latest !== null && prev.length ? latest - prev.reduce((a, b) => a + b, 0) / prev.length : null;
    return { cls, sessions: list, latest, trend };
  });
}

export interface WeakConcept {
  concept: string;
  accuracy: number;
  lessons: number;
  questions: ResultQuestion[];
}

/** Begrepp som återkommer som svåra över flera lektioner. */
export function recurringWeak(sessions: SessionResult[]): WeakConcept[] {
  const map = new Map<string, { c: number; t: number; lessons: Set<string>; qs: ResultQuestion[] }>();
  for (const r of sessions) {
    for (const st of conceptStats(r)) {
      if (st.concept === "Övrigt") continue;
      const m = map.get(st.concept) ?? { c: 0, t: 0, lessons: new Set<string>(), qs: [] };
      m.c += st.accuracy * st.questions;
      m.t += st.questions;
      m.lessons.add(r.id);
      for (const q of r.questions) if ((q.concept ?? "") === st.concept) m.qs.push(q);
      map.set(st.concept, m);
    }
  }
  return [...map.entries()]
    .map(([concept, m]) => ({ concept, accuracy: m.t ? m.c / m.t : 0, lessons: m.lessons.size, questions: m.qs }))
    // Minst två olika frågor – en enstaka fråga säger för lite om ett begrepp
    .filter((w) => w.accuracy < 0.75 && new Set(w.questions.map((q) => q.text)).size >= 2)
    .sort((a, b) => a.accuracy - b.accuracy || b.lessons - a.lessons);
}

export interface StudentTrend {
  name: string;
  skinId: string;
  points: (number | null)[]; // träffsäkerhet per lektion (null = frånvarande)
  latest: number | null;
  change: number | null;
}

export function studentTrends(sessions: SessionResult[]): StudentTrend[] {
  const names = new Map<string, string>();
  for (const r of sessions) for (const p of r.players) if (!names.has(p.name)) names.set(p.name, p.skinId);
  return [...names.entries()]
    .map(([name, skinId]) => {
      const points = sessions.map((r) => {
        const p = r.players.find((x) => x.name === name);
        return p ? playerAccuracy(p, r.questions.length) : null;
      });
      const present = points.filter((x): x is number => x !== null);
      const half = Math.max(1, Math.floor(present.length / 2));
      const early = present.slice(0, half);
      const late = present.slice(-half);
      const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
      return {
        name,
        skinId,
        points,
        latest: present.length ? present[present.length - 1] : null,
        change: present.length >= 2 ? avg(late) - avg(early) : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "sv"));
}

/** Bygger ett repetitionsquiz av de svåraste frågorna om ett begrepp. */
export function repetitionQuiz(title: string, subject: Quiz["subject"], questions: ResultQuestion[], status: Quiz["status"], max = 6): Quiz {
  const seen = new Set<string>();
  const picked = questions
    .map((q) => ({ q, acc: questionAccuracy(q, 1) }))
    .sort((a, b) => a.acc - b.acc)
    .filter(({ q }) => (seen.has(q.text) ? false : (seen.add(q.text), true)))
    .slice(0, max);
  const stamp = Date.now().toString(36);
  const qs: Question[] = picked.map(({ q }, i) => ({ id: `rep-${stamp}-${i}`, text: q.text, options: q.options, correct: q.correct, time: 30, explanation: q.explanation, concept: q.concept }));
  return {
    id: `repetition-${stamp}`,
    title,
    description: "Frågor som klassen tyckte var svåra – bra som uppstart eller avslutning på lektionen.",
    subject,
    level: "Åk 7–9",
    questions: qs,
    creatorId: "sara",
    updatedAt: new Date().toISOString().slice(0, 10),
    status,
  };
}
