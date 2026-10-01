"use client";

import type { Quiz } from "@/data/quizzes";
import type { SessionResult } from "@/lib/results";
import { useStore } from "@/lib/store";

/**
 * Datalager för quiz, resultat och elevprofil.
 *
 * Idag: lokala implementationer ovanpå zustand-storen (localStorage).
 * Senare: fjärrimplementationer mot ett API/en databas. Vyerna ska bara
 * prata med dessa gränssnitt när de flyttas över.
 */

export interface QuizRepository {
  list(): Promise<Quiz[]>;
  get(id: string): Promise<Quiz | undefined>;
  save(q: Quiz): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface ResultRepository {
  list(): Promise<SessionResult[]>;
  add(r: SessionResult): Promise<void>;
}

export interface ProfileRepository {
  get(): Promise<{ nickname: string; skinId: string; gnistor: number; xp: number }>;
  setSkin(id: string): Promise<void>;
}

const s = () => useStore.getState();

export const localQuizzes: QuizRepository = {
  async list() {
    return s().teacher.quizzes;
  },
  async get(id) {
    return s().teacher.quizzes.find((q) => q.id === id);
  },
  async save(q) {
    s().saveQuiz(q);
  },
  async remove(id) {
    s().deleteQuiz(id);
  },
};

export const localResults: ResultRepository = {
  async list() {
    return s().teacher.sessions;
  },
  async add(r) {
    s().addSession(r);
  },
};

export const localProfile: ProfileRepository = {
  async get() {
    const st = s().student;
    return { nickname: st.nickname, skinId: st.skinId, gnistor: st.gnistor, xp: st.xp };
  },
  async setSkin(id) {
    s().equip(id);
  },
};

// TODO: fjärrimplementationer (GET/POST /api/quizzes, /api/results, /api/profile)
export function getRepos() {
  return { quizzes: localQuizzes, results: localResults, profile: localProfile };
}
