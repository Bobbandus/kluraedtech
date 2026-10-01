"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import QuizBuilder from "@/components/QuizBuilder";
import { useHydrated } from "@/lib/store";
import { useQuiz } from "@/lib/quizzes";

export default function EditQuiz() {
  const { id } = useParams<{ id: string }>();
  const hydrated = useHydrated();
  const { quiz, mine } = useQuiz(id);
  if (!hydrated) return <main className="page" />;
  if (!quiz || !mine) {
    return (
      <main className="page" style={{ textAlign: "center" }}>
        <h1>Det här quizet kan du inte redigera</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Gör en kopia från quizsidan så blir det ditt eget.
        </p>
        <Link href={`/larare/quiz/${id}`} className="btn" style={{ marginTop: 16 }}>
          Till quizet
        </Link>
      </main>
    );
  }
  return <QuizBuilder key={quiz.id} initial={quiz} isNew={false} />;
}
