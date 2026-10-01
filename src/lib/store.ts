"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MY_QUIZZES, type Quiz } from "@/data/quizzes";
import { STARTER_SKINS } from "@/data/skins";
import type { SessionResult } from "@/lib/results";

/**
 * Lokal state. Allt här motsvarar framtida servertabeller:
 *  - student: elevkonto/profil (idag anonymt per enhet)
 *  - teacher: lärarkonto, quiz, favoriter, sessioner
 * Formen är gjord för att kunna bytas mot API-anrop utan att ändra vyerna.
 */

export interface Quest {
  id: string;
  title: string;
  goal: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export interface LastMatch {
  code: string;
  quizTitle: string;
  mode?: "topptur" | "fjall";
  wave?: number;
  rank: number;
  total: number;
  correct: number;
  questions: number;
  bestStreak: number;
  score: number;
  earned: { label: string; amount: number }[];
  xp: number;
  personalBest: boolean;
  reachedSummit: boolean;
  energy: string;
  missed: { text: string; answer: string; yours: string | null; explanation?: string }[];
  at: string;
}

interface StudentState {
  nickname: string;
  skinId: string;
  owned: string[];
  gnistor: number;
  xp: number;
  matches: number;
  totalCorrect: number;
  totalAnswered: number;
  bestStreak: number;
  bestAccuracy: number;
  summits: number;
  quests: Quest[];
  lastMatch: LastMatch | null;
  /** Framtid: koppling till konto/skola/klass */
  accountId: string | null;
}

interface TeacherState {
  loggedIn: boolean;
  name: string;
  school: string;
  quizzes: Quiz[];
  favorites: string[];
  sessions: SessionResult[];
}

interface Prefs {
  reducedMotion: boolean;
  sound: boolean;
}

interface Actions {
  setNickname: (n: string) => void;
  equip: (id: string) => void;
  buy: (id: string, price: number) => boolean;
  addGnistor: (n: number) => void;
  recordMatch: (m: LastMatch, stats: { correct: number; answered: number; bestStreak: number }) => void;
  claimQuest: (id: string) => void;
  login: (profile?: { name: string; school?: string }) => void;
  logout: () => void;
  saveQuiz: (q: Quiz) => void;
  deleteQuiz: (id: string) => void;
  toggleFavorite: (id: string) => void;
  addSession: (r: SessionResult) => void;
  setPrefs: (p: Partial<Prefs>) => void;
}

export type Store = { student: StudentState; teacher: TeacherState; prefs: Prefs } & Actions;

const START_QUESTS: Quest[] = [
  { id: "rattsvar", title: "Svara rätt på 20 frågor", goal: 20, progress: 7, reward: 40, claimed: false },
  { id: "rad5", title: "Få 5 rätt i rad", goal: 5, progress: 3, reward: 30, claimed: false },
  { id: "matcher", title: "Spela 3 matcher", goal: 3, progress: 1, reward: 50, claimed: false },
];

export function levelFromXp(xp: number) {
  let level = 1;
  let need = 200;
  let rest = xp;
  while (rest >= need) {
    rest -= need;
    level += 1;
    need = 200 + (level - 1) * 60;
  }
  return { level, into: rest, need };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      student: {
        nickname: "",
        skinId: "mosse",
        owned: [...STARTER_SKINS],
        gnistor: 420,
        xp: 1340,
        matches: 9,
        totalCorrect: 87,
        totalAnswered: 118,
        bestStreak: 6,
        bestAccuracy: 0.86,
        summits: 2,
        quests: START_QUESTS,
        lastMatch: null,
        accountId: null,
      },
      teacher: {
        loggedIn: false,
        name: "Sara Lindqvist",
        school: "Kvarnbackaskolan",
        quizzes: MY_QUIZZES,
        favorites: ["procent", "kallkritik"],
        sessions: [],
      },
      prefs: { reducedMotion: false, sound: true },

      setNickname: (n) => set((s) => ({ student: { ...s.student, nickname: n } })),
      equip: (id) => set((s) => ({ student: { ...s.student, skinId: id } })),
      buy: (id, price) => {
        const s = get().student;
        if (s.owned.includes(id) || s.gnistor < price) return false;
        set({ student: { ...s, gnistor: s.gnistor - price, owned: [...s.owned, id] } });
        return true;
      },
      addGnistor: (n) => set((s) => ({ student: { ...s.student, gnistor: s.student.gnistor + n } })),
      recordMatch: (m, stats) =>
        set((s) => {
          const st = s.student;
          const earned = m.earned.reduce((a, b) => a + b.amount, 0);
          const acc = stats.answered ? stats.correct / stats.answered : 0;
          return {
            student: {
              ...st,
              lastMatch: m,
              gnistor: st.gnistor + earned,
              xp: st.xp + m.xp,
              matches: st.matches + 1,
              totalCorrect: st.totalCorrect + stats.correct,
              totalAnswered: st.totalAnswered + stats.answered,
              bestStreak: Math.max(st.bestStreak, stats.bestStreak),
              bestAccuracy: Math.max(st.bestAccuracy, acc),
              summits: st.summits + (m.reachedSummit ? 1 : 0),
              quests: st.quests.map((q) => {
                if (q.claimed) return q;
                const add = q.id === "rattsvar" ? stats.correct : q.id === "matcher" ? 1 : 0;
                const progress = q.id === "rad5" ? Math.max(q.progress, stats.bestStreak) : q.progress + add;
                return { ...q, progress: Math.min(q.goal, progress) };
              }),
            },
          };
        }),
      claimQuest: (id) =>
        set((s) => {
          const q = s.student.quests.find((x) => x.id === id);
          if (!q || q.claimed || q.progress < q.goal) return s;
          return {
            student: {
              ...s.student,
              gnistor: s.student.gnistor + q.reward,
              quests: s.student.quests.map((x) => (x.id === id ? { ...x, claimed: true } : x)),
            },
          };
        }),
      login: (profile) =>
        set((s) => ({
          teacher: { ...s.teacher, loggedIn: true, ...(profile ? { name: profile.name, school: profile.school || s.teacher.school } : {}) },
        })),
      logout: () => set((s) => ({ teacher: { ...s.teacher, loggedIn: false } })),
      saveQuiz: (q) =>
        set((s) => {
          const exists = s.teacher.quizzes.some((x) => x.id === q.id);
          const quizzes = exists ? s.teacher.quizzes.map((x) => (x.id === q.id ? q : x)) : [q, ...s.teacher.quizzes];
          return { teacher: { ...s.teacher, quizzes } };
        }),
      deleteQuiz: (id) => set((s) => ({ teacher: { ...s.teacher, quizzes: s.teacher.quizzes.filter((x) => x.id !== id) } })),
      toggleFavorite: (id) =>
        set((s) => {
          const f = s.teacher.favorites;
          return { teacher: { ...s.teacher, favorites: f.includes(id) ? f.filter((x) => x !== id) : [...f, id] } };
        }),
      addSession: (r) => set((s) => ({ teacher: { ...s.teacher, sessions: [r, ...s.teacher.sessions.filter((x) => x.id !== r.id)] } })),
      setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
    }),
    {
      name: "klura-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

/** Returnerar true när lokalt sparad state är inläst (undviker hydreringsfel). */
export function useHydrated(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const p = useStore.persist;
    if (p.hasHydrated()) {
      setOk(true);
      return;
    }
    const unsub = p.onFinishHydration(() => setOk(true));
    p.rehydrate();
    return unsub;
  }, []);
  return ok;
}
