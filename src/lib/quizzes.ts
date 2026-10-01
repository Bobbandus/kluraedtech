"use client";

import { MARKET_QUIZZES, type Quiz } from "@/data/quizzes";
import { useStore } from "@/lib/store";
import { seededHistory, type SessionResult } from "@/lib/results";

export function useQuiz(id: string): { quiz: Quiz | undefined; mine: boolean } {
  const mineList = useStore((x) => x.teacher.quizzes);
  const mine = mineList.find((q) => q.id === id);
  if (mine) return { quiz: mine, mine: true };
  return { quiz: MARKET_QUIZZES.find((q) => q.id === id), mine: false };
}

export function useSessions(): SessionResult[] {
  const local = useStore((x) => x.teacher.sessions);
  return [...local, ...seededHistory()];
}
