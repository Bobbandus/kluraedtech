"use client";

import { useState } from "react";
import QuizBuilder, { emptyQuiz } from "@/components/QuizBuilder";

export default function NewQuiz() {
  const [q] = useState(emptyQuiz);
  return <QuizBuilder initial={q} isNew />;
}
