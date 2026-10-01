"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CoverArt, SUBJECTS, type Subject } from "./cover";
import { Icon } from "./icons";
import { PlusBadge } from "./brand";
import { QuizPreview } from "./quiz-preview";
import { OPT_COLORS, OPT_KEYS } from "./game/parts";
import type { Level, Question, Quiz } from "@/data/quizzes";
import { useStore } from "@/lib/store";
import s from "./builder.module.css";

const TIMES = [10, 15, 20, 30, 45, 60];
const LEVELS: Level[] = ["Åk 4–6", "Åk 7–9", "Gymnasiet"];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function blankQuestion(): Question {
  return { id: uid(), text: "", options: ["", "", "", ""], correct: 0, time: 20, explanation: "", concept: "" };
}

export function emptyQuiz(): Quiz {
  return {
    id: `quiz-${uid()}`,
    title: "",
    description: "",
    subject: "historia",
    level: "Åk 7–9",
    questions: [blankQuestion()],
    creatorId: "sara",
    updatedAt: new Date().toISOString().slice(0, 10),
    status: "utkast",
  };
}

type Errors = { title?: string; q: Record<string, string> };

function validate(q: Quiz): Errors {
  const e: Errors = { q: {} };
  if (!q.title.trim()) e.title = "Ge quizet en titel.";
  for (const x of q.questions) {
    const filled = x.options.filter((o) => o.trim());
    if (!x.text.trim()) e.q[x.id] = "Frågan saknar text.";
    else if (filled.length < 2) e.q[x.id] = "Minst två svarsalternativ behövs.";
    else if (!x.options[x.correct]?.trim()) e.q[x.id] = "Markera ett ifyllt alternativ som rätt svar.";
  }
  return e;
}

export default function QuizBuilder({ initial, isNew }: { initial: Quiz; isNew: boolean }) {
  const router = useRouter();
  const save = useStore((x) => x.saveQuiz);
  const [quiz, setQuiz] = useState<Quiz>(initial);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors | null>(null);
  const [preview, setPreview] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const lastAdded = useRef<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (lastAdded.current) {
      document.getElementById(`qt-${lastAdded.current}`)?.focus();
      lastAdded.current = null;
    }
  }, [quiz.questions.length]);

  const patch = (p: Partial<Quiz>) => {
    setQuiz((q) => ({ ...q, ...p }));
    setDirty(true);
  };
  const patchQ = (id: string, p: Partial<Question>) => {
    setQuiz((q) => ({ ...q, questions: q.questions.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
    setDirty(true);
  };
  const move = (i: number, d: number) => {
    setQuiz((q) => {
      const arr = q.questions.slice();
      const j = i + d;
      if (j < 0 || j >= arr.length) return q;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...q, questions: arr };
    });
    setDirty(true);
  };

  const doSave = (status: Quiz["status"]) => {
    const cleaned: Quiz = {
      ...quiz,
      status,
      updatedAt: new Date().toISOString().slice(0, 10),
      questions: quiz.questions.map((x) => {
        const opts = x.options.map((o) => o.trim());
        return { ...x, text: x.text.trim(), options: opts };
      }),
    };
    if (status === "klar") {
      const e = validate(cleaned);
      if (e.title || Object.keys(e.q).length) {
        setErrors(e);
        setToast("Några saker behöver fixas innan quizet är klart.");
        return;
      }
      // Ta bort tomma alternativ och flytta rätt-index
      cleaned.questions = cleaned.questions.map((x) => {
        const keep = x.options.map((o, i) => ({ o, i })).filter((y) => y.o);
        return { ...x, options: keep.map((y) => y.o), correct: Math.max(0, keep.findIndex((y) => y.i === x.correct)) };
      });
    }
    if (!cleaned.title.trim()) cleaned.title = "Namnlöst quiz";
    save(cleaned);
    setQuiz(cleaned);
    setErrors(null);
    setDirty(false);
    setSavedAt(new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }));
    if (status === "klar") router.push(`/larare/quiz/${cleaned.id}`);
    else {
      setToast("Utkastet är sparat");
      if (isNew) router.replace(`/larare/quiz/${cleaned.id}/redigera`);
    }
  };

  return (
    <>
      <div className={s.top}>
        <div className={s.topInner}>
          <Link href="/larare/quiz" className="btn btn-ghost btn-sm">
            <Icon name="arrowLeft" size={16} /> Mina quiz
          </Link>
          <span className={s.status} aria-live="polite">
            {dirty ? (
              <>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--hjortron)" }} /> Osparade ändringar
              </>
            ) : savedAt ? (
              <>
                <Icon name="check" size={14} stroke={3} /> Sparat {savedAt}
              </>
            ) : isNew ? (
              "Nytt quiz"
            ) : (
              "Inga ändringar"
            )}
          </span>
          <div className="row gap-8" style={{ marginLeft: "auto" }}>
            <button className="btn btn-sm" onClick={() => setPreview(true)} disabled={!quiz.questions.length}>
              <Icon name="eye" size={16} /> Förhandsvisa
            </button>
            <button className="btn btn-sm" onClick={() => doSave("utkast")}>
              Spara utkast
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => doSave("klar")}>
              <Icon name="check" size={16} /> Spara och klar
            </button>
          </div>
        </div>
      </div>

      <main id="innehall" className={s.layout}>
        <aside className={`${s.side} card card-pad stack gap-16`} aria-label="Quizinställningar">
          <CoverArt subject={quiz.subject} rounded={14} />
          <div className="field">
            <label className="label" htmlFor="b-title">
              Titel
            </label>
            <input id="b-title" className="input" value={quiz.title} placeholder="T.ex. Fotosyntesen" onChange={(e) => patch({ title: e.target.value })} aria-invalid={!!errors?.title} />
            {errors?.title && <span className={s.err}>{errors.title}</span>}
          </div>
          <div className="field">
            <label className="label" htmlFor="b-desc">
              Beskrivning
            </label>
            <textarea id="b-desc" className="textarea" value={quiz.description} placeholder="Vad handlar quizet om? Syns för dig och andra lärare." onChange={(e) => patch({ description: e.target.value })} />
          </div>
          <div className="row gap-8">
            <div className="field grow">
              <label className="label" htmlFor="b-sub">
                Ämne
              </label>
              <select id="b-sub" className="select" value={quiz.subject} onChange={(e) => patch({ subject: e.target.value as Subject })}>
                {(Object.keys(SUBJECTS) as Subject[]).map((k) => (
                  <option key={k} value={k}>
                    {SUBJECTS[k].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field grow">
              <label className="label" htmlFor="b-lvl">
                Nivå
              </label>
              <select id="b-lvl" className="select" value={quiz.level} onChange={(e) => patch({ level: e.target.value as Level })}>
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <span className="label">Omslag</span>
            <div className={s.coverPick} role="group" aria-label="Välj omslag">
              {(Object.keys(SUBJECTS) as Subject[]).map((k) => (
                <button key={k} className={s.coverBtn} aria-pressed={quiz.subject === k} aria-label={SUBJECTS[k].label} onClick={() => patch({ subject: k })}>
                  <CoverArt subject={k} rounded={8} />
                </button>
              ))}
            </div>
          </div>
          <div className={s.aiBox}>
            <Icon name="sparkle" size={20} style={{ color: "var(--ljung)", marginTop: 2 }} />
            <div>
              <div className="row gap-8">
                <strong>Generera frågor från text</strong>
                <PlusBadge small />
              </div>
              <p className="muted" style={{ marginTop: 2 }}>
                Klistra in ett avsnitt ur läroboken och få förslag på frågor att granska.
              </p>
            </div>
          </div>
        </aside>

        <section aria-label="Frågor">
          <div className="row between" style={{ marginBottom: 12 }}>
            <h1 style={{ fontSize: "1.5rem" }}>{quiz.questions.length} {quiz.questions.length === 1 ? "fråga" : "frågor"}</h1>
            <span className="muted" style={{ fontSize: "0.9rem" }}>
              Tips: 10–15 frågor ger tre bra etapper.
            </span>
          </div>
          {quiz.questions.map((q, i) => {
            const err = errors?.q[q.id];
            return (
              <div key={q.id} className={`${s.qcard} ${err ? s.qcardErr : ""}`}>
                <div className="row gap-12" style={{ alignItems: "flex-start" }}>
                  <span className={s.qnum}>{i + 1}</span>
                  <div className="grow stack gap-12">
                    <div className="field">
                      <label className="sr-only" htmlFor={`qt-${q.id}`}>
                        Fråga {i + 1}
                      </label>
                      <textarea id={`qt-${q.id}`} className="textarea" style={{ minHeight: 64, fontWeight: 600, fontSize: "1.05rem" }} placeholder="Skriv frågan här" value={q.text} onChange={(e) => patchQ(q.id, { text: e.target.value })} />
                    </div>
                    <div className="stack gap-8" role="radiogroup" aria-label="Svarsalternativ – markera rätt svar">
                      {q.options.map((o, k) => (
                        <div key={k} className={s.optRow}>
                          <span style={{ width: 32, height: 32, borderRadius: 9, background: OPT_COLORS[k], color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 900, flex: "none" }}>{OPT_KEYS[k]}</span>
                          <input
                            className="input"
                            value={o}
                            placeholder={k < 2 ? `Alternativ ${OPT_KEYS[k]}` : `Alternativ ${OPT_KEYS[k]} (valfritt)`}
                            onChange={(e) => {
                              const opts = q.options.slice();
                              opts[k] = e.target.value;
                              patchQ(q.id, { options: opts });
                            }}
                            aria-label={`Alternativ ${OPT_KEYS[k]}`}
                          />
                          <button role="radio" aria-checked={q.correct === k} className={s.correctBtn} onClick={() => patchQ(q.id, { correct: k })} aria-label={`Markera ${OPT_KEYS[k]} som rätt svar`} title="Rätt svar">
                            <Icon name="check" size={20} stroke={3} />
                          </button>
                          {q.options.length > 2 && (
                            <button
                              className="btn btn-ghost btn-icon"
                              aria-label={`Ta bort alternativ ${OPT_KEYS[k]}`}
                              onClick={() => {
                                const opts = q.options.filter((_, j) => j !== k);
                                const correct = q.correct === k ? 0 : q.correct > k ? q.correct - 1 : q.correct;
                                patchQ(q.id, { options: opts, correct });
                              }}
                            >
                              <Icon name="x" size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      {q.options.length < 6 && (
                        <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => patchQ(q.id, { options: [...q.options, ""] })}>
                          <Icon name="plus" size={16} /> Lägg till alternativ
                        </button>
                      )}
                    </div>
                    <div className="row gap-8 wrap">
                      <div className="field" style={{ width: 130 }}>
                        <label className="label" htmlFor={`tm-${q.id}`}>
                          Tid
                        </label>
                        <select id={`tm-${q.id}`} className="select" value={q.time} onChange={(e) => patchQ(q.id, { time: Number(e.target.value) })}>
                          {TIMES.map((t) => (
                            <option key={t} value={t}>
                              {t} sekunder
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field grow" style={{ minWidth: 160 }}>
                        <label className="label" htmlFor={`cc-${q.id}`}>
                          Begrepp <span className="muted">(för resultatanalys)</span>
                        </label>
                        <input id={`cc-${q.id}`} className="input" value={q.concept ?? ""} placeholder="T.ex. Ekvationer" onChange={(e) => patchQ(q.id, { concept: e.target.value })} />
                      </div>
                    </div>
                    <div className="field">
                      <label className="label" htmlFor={`ex-${q.id}`}>
                        Förklaring efter svaret <span className="muted">(valfritt)</span>
                      </label>
                      <input id={`ex-${q.id}`} className="input" value={q.explanation ?? ""} placeholder="En mening som hjälper den som svarade fel" onChange={(e) => patchQ(q.id, { explanation: e.target.value })} />
                    </div>
                    {err && <span className={s.err}>{err}</span>}
                  </div>
                  <div className="stack gap-4">
                    <button className="btn btn-ghost btn-icon" aria-label="Flytta upp" onClick={() => move(i, -1)} disabled={i === 0}>
                      <Icon name="chevronUp" size={18} />
                    </button>
                    <button className="btn btn-ghost btn-icon" aria-label="Flytta ned" onClick={() => move(i, 1)} disabled={i === quiz.questions.length - 1}>
                      <Icon name="chevronDown" size={18} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon"
                      aria-label="Duplicera fråga"
                      onClick={() => {
                        const c = { ...q, id: uid(), options: q.options.slice() };
                        setQuiz((x) => ({ ...x, questions: [...x.questions.slice(0, i + 1), c, ...x.questions.slice(i + 1)] }));
                        setDirty(true);
                      }}
                    >
                      <Icon name="copy" size={18} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon"
                      aria-label="Ta bort fråga"
                      disabled={quiz.questions.length === 1}
                      onClick={() => {
                        setQuiz((x) => ({ ...x, questions: x.questions.filter((y) => y.id !== q.id) }));
                        setDirty(true);
                      }}
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <button
            className={s.addQ}
            onClick={() => {
              const nq = blankQuestion();
              lastAdded.current = nq.id;
              setQuiz((x) => ({ ...x, questions: [...x.questions, nq] }));
              setDirty(true);
            }}
          >
            <Icon name="plus" size={20} /> Lägg till fråga
          </button>
        </section>
      </main>
      {preview && <QuizPreview title={quiz.title || "Namnlöst quiz"} questions={quiz.questions} onClose={() => setPreview(false)} />}
      {toast && (
        <div className="toast" role="status">
          <Icon name="info" size={18} /> {toast}
        </div>
      )}
    </>
  );
}
