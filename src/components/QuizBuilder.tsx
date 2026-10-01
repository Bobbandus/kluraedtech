"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CoverArt, SUBJECTS, type Subject } from "./cover";
import { Icon } from "./icons";
import { PlusBadge } from "./brand";
import { QuizPreview } from "./quiz-preview";
import { OPT_COLORS, OPT_KEYS } from "./game/parts";
import type { Level, Question, Quiz } from "@/data/quizzes";
import { useStore } from "@/lib/store";
import { parseQuestions, type ParseResult } from "@/lib/quiz-import";
import s from "./builder.module.css";

const TIMES = [10, 15, 20, 30, 45, 60];
const LEVELS: Level[] = ["Åk 4–6", "Åk 7–9", "Gymnasiet"];
const AUTOSAVE_MS = 3000;

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function blankQuestion(): Question {
  return { id: uid(), text: "", options: ["", "", "", ""], correct: 0, time: 20, explanation: "", concept: "" };
}

function trueFalse(): Question {
  return { id: uid(), text: "", options: ["Sant", "Falskt"], correct: 0, time: 15, explanation: "", concept: "" };
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

/** Små tips som gör frågan bättre – blockerar aldrig. */
function tips(q: Question): string[] {
  const out: string[] = [];
  const filled = q.options.map((o) => o.trim()).filter(Boolean);
  if (!q.text.trim() || filled.length < 2) return out;
  const lower = filled.map((o) => o.toLowerCase());
  if (new Set(lower).size !== lower.length) out.push("Två alternativ är likadana.");
  const lens = filled.map((o) => o.length);
  const right = q.options[q.correct]?.trim().length ?? 0;
  if (filled.length >= 3 && right > 0 && right === Math.max(...lens) && right > 2 * (lens.reduce((a, b) => a + b, 0) - right) / (lens.length - 1)) {
    out.push("Rätt svar är mycket längre än de andra – det kan avslöja svaret.");
  }
  if (!q.explanation?.trim()) out.push("Lägg gärna till en förklaring – eleverna ser den när de svarat fel.");
  if (q.text.trim().length > 160 && q.time < 20) out.push("Lång fråga – överväg mer tid.");
  return out;
}

/** Läser in en bild och komprimerar den till JPEG i max 960 px. */
async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Filen är ingen bild.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Bilden är för stor (max 15 MB).");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Bilden gick inte att läsa."));
      i.src = url;
    });
    const scale = Math.min(1, 960 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    let quality = 0.82;
    let data = c.toDataURL("image/jpeg", quality);
    while (data.length > 330_000 && quality > 0.45) {
      quality -= 0.1;
      data = c.toDataURL("image/jpeg", quality);
    }
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function QuizBuilder({ initial, isNew }: { initial: Quiz; isNew: boolean }) {
  const router = useRouter();
  const save = useStore((x) => x.saveQuiz);
  const [quiz, setQuiz] = useState<Quiz>(initial);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors | null>(null);
  const [preview, setPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const lastAdded = useRef<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const quizRef = useRef(quiz);
  quizRef.current = quiz;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty && quizRef.current.status === "klar") e.preventDefault();
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

  // Autosparning av utkast
  useEffect(() => {
    if (!dirty || quiz.status !== "utkast") return;
    const t = setTimeout(() => {
      const q = quizRef.current;
      save({ ...q, title: q.title.trim() || "Namnlöst quiz", updatedAt: new Date().toISOString().slice(0, 10) });
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }));
      if (isNew && !window.location.pathname.includes(q.id)) window.history.replaceState(null, "", `/larare/quiz/${q.id}/redigera`);
    }, AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [quiz, dirty, save, isNew]);

  const patch = (p: Partial<Quiz>) => {
    setQuiz((q) => ({ ...q, ...p }));
    setDirty(true);
  };
  const patchQ = useCallback((id: string, p: Partial<Question>) => {
    setQuiz((q) => ({ ...q, questions: q.questions.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
    setDirty(true);
  }, []);
  const moveTo = (from: number, to: number) => {
    if (from === to) return;
    setQuiz((q) => {
      const arr = q.questions.slice();
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
      return { ...q, questions: arr };
    });
    setDirty(true);
  };
  const addQuestion = (q: Question) => {
    lastAdded.current = q.id;
    setQuiz((x) => ({ ...x, questions: [...x.questions, q] }));
    setDirty(true);
  };

  /* ---------- Dra och släpp ---------- */
  const dragRef = useRef<{ from: number; over: number } | null>(null);
  const startDrag = (index: number, e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = { from: index, over: index };
    setDrag(dragRef.current);
    const ids = quizRef.current.questions.map((q) => q.id);
    const onMove = (ev: PointerEvent) => {
      let over = ids.length - 1;
      for (let i = 0; i < ids.length; i++) {
        const el = cardRefs.current.get(ids[i]);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (ev.clientY < r.top + r.height / 2) {
          over = i;
          break;
        }
      }
      if (dragRef.current && dragRef.current.over !== over) {
        dragRef.current = { ...dragRef.current, over };
        setDrag(dragRef.current);
      }
      if (ev.clientY < 80) window.scrollBy(0, -12);
      else if (ev.clientY > window.innerHeight - 80) window.scrollBy(0, 12);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (d) moveTo(d.from, d.over);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const doSave = (status: Quiz["status"]) => {
    const cleaned: Quiz = {
      ...quiz,
      status,
      updatedAt: new Date().toISOString().slice(0, 10),
      questions: quiz.questions.map((x) => ({ ...x, text: x.text.trim(), options: x.options.map((o) => o.trim()) })),
    };
    if (status === "klar") {
      const e = validate(cleaned);
      if (e.title || Object.keys(e.q).length) {
        setErrors(e);
        setToast("Några saker behöver fixas innan quizet är klart.");
        return;
      }
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
      if (isNew) window.history.replaceState(null, "", `/larare/quiz/${cleaned.id}/redigera`);
    }
  };

  const onImport = (r: ParseResult) => {
    const qs: Question[] = r.questions.map((p) => ({ id: uid(), text: p.text, options: p.options, correct: p.correct, time: 20, explanation: p.explanation ?? "", concept: "" }));
    setQuiz((x) => {
      // Ersätt en ensam tom startfråga
      const keep = x.questions.filter((q) => q.text.trim() || q.options.some((o) => o.trim()));
      return { ...x, questions: [...keep, ...qs] };
    });
    setDirty(true);
    setImporting(false);
    setToast(`${qs.length} ${qs.length === 1 ? "fråga" : "frågor"} tillagda`);
  };

  const order = quiz.questions.map((_, i) => i);
  if (drag) {
    const [it] = order.splice(drag.from, 1);
    order.splice(drag.over, 0, it);
  }

  return (
    <>
      <div className={s.top}>
        <div className={s.topInner}>
          <Link href="/larare/quiz" className="btn btn-ghost btn-sm">
            <Icon name="arrowLeft" size={16} /> Mina quiz
          </Link>
          <span className={s.status} aria-live="polite">
            {dirty ? (
              quiz.status === "utkast" ? (
                <>
                  <span className={s.saving} /> Sparar …
                </>
              ) : (
                <>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--hjortron)" }} /> Osparade ändringar
                </>
              )
            ) : savedAt ? (
              <>
                <Icon name="check" size={14} stroke={3} /> Sparat {savedAt}
              </>
            ) : isNew ? (
              "Nytt quiz · sparas automatiskt"
            ) : quiz.status === "utkast" ? (
              "Utkast · sparas automatiskt"
            ) : (
              "Inga ändringar"
            )}
          </span>
          <div className="row gap-8" style={{ marginLeft: "auto" }}>
            <button className="btn btn-sm" onClick={() => setPreview(true)} disabled={!quiz.questions.length}>
              <Icon name="eye" size={16} /> Förhandsvisa
            </button>
            {quiz.status === "klar" && (
              <button className="btn btn-sm" onClick={() => doSave("utkast")}>
                Gör till utkast
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => doSave("klar")}>
              <Icon name="check" size={16} /> {quiz.status === "klar" ? "Spara" : "Spara och klar"}
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
          <button className={s.importBtn} onClick={() => setImporting(true)}>
            <Icon name="copy" size={20} />
            <span>
              <strong>Klistra in frågor</strong>
              <span className="muted" style={{ display: "block", fontSize: "0.86rem" }}>
                Från ett dokument eller kalkylark
              </span>
            </span>
          </button>
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
            <h1 style={{ fontSize: "1.5rem" }}>
              {quiz.questions.length} {quiz.questions.length === 1 ? "fråga" : "frågor"}
            </h1>
            <span className="muted" style={{ fontSize: "0.9rem" }}>
              Tips: 10–15 frågor ger tre bra etapper.
            </span>
          </div>
          {order.map((qi, pos) => {
            const q = quiz.questions[qi];
            return (
              <QuestionCard
                key={q.id}
                q={q}
                index={pos}
                total={quiz.questions.length}
                error={errors?.q[q.id]}
                dragging={drag?.from === qi}
                cardRef={(el) => {
                  if (el) cardRefs.current.set(q.id, el);
                  else cardRefs.current.delete(q.id);
                }}
                onPatch={(p) => patchQ(q.id, p)}
                onMove={(d) => moveTo(qi, Math.max(0, Math.min(quiz.questions.length - 1, qi + d)))}
                onDragStart={(e) => startDrag(qi, e)}
                onDuplicate={() => {
                  const c = { ...q, id: uid(), options: q.options.slice() };
                  setQuiz((x) => ({ ...x, questions: [...x.questions.slice(0, qi + 1), c, ...x.questions.slice(qi + 1)] }));
                  setDirty(true);
                }}
                onRemove={() => {
                  setQuiz((x) => ({ ...x, questions: x.questions.filter((y) => y.id !== q.id) }));
                  setDirty(true);
                }}
                onToast={setToast}
              />
            );
          })}
          <div className={s.addRow}>
            <button className={s.addQ} onClick={() => addQuestion(blankQuestion())}>
              <Icon name="plus" size={20} /> Flervalsfråga
            </button>
            <button className={s.addQ} onClick={() => addQuestion(trueFalse())}>
              <Icon name="check" size={20} /> Sant eller falskt
            </button>
            <button className={s.addQ} onClick={() => setImporting(true)}>
              <Icon name="copy" size={20} /> Klistra in
            </button>
          </div>
        </section>
      </main>
      {preview && <QuizPreview title={quiz.title || "Namnlöst quiz"} questions={quiz.questions} onClose={() => setPreview(false)} />}
      {importing && <ImportDialog onClose={() => setImporting(false)} onImport={onImport} />}
      {toast && (
        <div className="toast" role="status">
          <Icon name="info" size={18} /> {toast}
        </div>
      )}
    </>
  );
}

/* ---------- En fråga ---------- */

function QuestionCard({
  q,
  index,
  total,
  error,
  dragging,
  cardRef,
  onPatch,
  onMove,
  onDragStart,
  onDuplicate,
  onRemove,
  onToast,
}: {
  q: Question;
  index: number;
  total: number;
  error?: string;
  dragging: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
  onPatch: (p: Partial<Question>) => void;
  onMove: (d: number) => void;
  onDragStart: (e: React.PointerEvent) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onToast: (t: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dropping, setDropping] = useState(false);
  const isTF = q.options.length === 2 && q.options[0] === "Sant" && q.options[1] === "Falskt";
  const hint = tips(q);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      onPatch({ image: await compressImage(file) });
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Bilden gick inte att lägga till.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`${s.qcard} ${error ? s.qcardErr : ""} ${dragging ? s.dragging : ""} ${dropping ? s.dropping : ""}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDropping(true);
        }
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDropping(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <div className="row gap-12" style={{ alignItems: "flex-start" }}>
        <div className="stack gap-4" style={{ alignItems: "center" }}>
          <span className={s.qnum}>{index + 1}</span>
          <button className={s.handle} onPointerDown={onDragStart} aria-label={`Dra för att flytta fråga ${index + 1}`} title="Dra för att flytta">
            <Icon name="drag" size={18} />
          </button>
        </div>
        <div className="grow stack gap-12" style={{ minWidth: 0 }}>
          {isTF && <span className="chip chip-info" style={{ alignSelf: "flex-start" }}>Sant eller falskt</span>}
          <div className="field">
            <label className="sr-only" htmlFor={`qt-${q.id}`}>
              Fråga {index + 1}
            </label>
            <textarea
              id={`qt-${q.id}`}
              className="textarea"
              style={{ minHeight: 64, fontWeight: 600, fontSize: "1.05rem" }}
              placeholder={isTF ? "Skriv ett påstående – t.ex. ”Solen är en stjärna.”" : "Skriv frågan här"}
              value={q.text}
              onChange={(e) => onPatch({ text: e.target.value })}
            />
          </div>

          {q.image ? (
            <div className={s.imageWrap}>
              <img src={q.image} alt="Bild till frågan" className={s.image} />
              <div className={s.imageActions}>
                <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
                  <Icon name="image" size={16} /> Byt
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => onPatch({ image: undefined })}>
                  <Icon name="trash" size={16} /> Ta bort
                </button>
              </div>
            </div>
          ) : (
            <button className={s.imageAdd} onClick={() => fileRef.current?.click()} disabled={busy}>
              <Icon name="image" size={18} /> {busy ? "Förbereder bild …" : dropping ? "Släpp bilden här" : "Lägg till bild"}
              <span className="muted" style={{ fontWeight: 500 }}>
                {busy ? "" : "eller dra in en fil"}
              </span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }} />

          <div className="stack gap-8" role="radiogroup" aria-label="Svarsalternativ – markera rätt svar">
            {q.options.map((o, k) => (
              <div key={k} className={s.optRow}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: OPT_COLORS[k], color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 900, flex: "none" }}>{OPT_KEYS[k]}</span>
                <input
                  className="input"
                  value={o}
                  readOnly={isTF}
                  placeholder={k < 2 ? `Alternativ ${OPT_KEYS[k]}` : `Alternativ ${OPT_KEYS[k]} (valfritt)`}
                  onChange={(e) => {
                    const opts = q.options.slice();
                    opts[k] = e.target.value;
                    onPatch({ options: opts });
                  }}
                  aria-label={`Alternativ ${OPT_KEYS[k]}`}
                />
                <button role="radio" aria-checked={q.correct === k} className={s.correctBtn} onClick={() => onPatch({ correct: k })} aria-label={`Markera ${OPT_KEYS[k]} som rätt svar`} title="Rätt svar">
                  <Icon name="check" size={20} stroke={3} />
                </button>
                {!isTF && q.options.length > 2 && (
                  <button
                    className="btn btn-ghost btn-icon"
                    aria-label={`Ta bort alternativ ${OPT_KEYS[k]}`}
                    onClick={() => {
                      const opts = q.options.filter((_, j) => j !== k);
                      const correct = q.correct === k ? 0 : q.correct > k ? q.correct - 1 : q.correct;
                      onPatch({ options: opts, correct });
                    }}
                  >
                    <Icon name="x" size={16} />
                  </button>
                )}
              </div>
            ))}
            {!isTF && q.options.length < 6 && (
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => onPatch({ options: [...q.options, ""] })}>
                <Icon name="plus" size={16} /> Lägg till alternativ
              </button>
            )}
          </div>
          <div className="row gap-8 wrap">
            <div className="field" style={{ width: 140 }}>
              <label className="label" htmlFor={`tm-${q.id}`}>
                Tid
              </label>
              <select id={`tm-${q.id}`} className="select" value={q.time} onChange={(e) => onPatch({ time: Number(e.target.value) })}>
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
              <input id={`cc-${q.id}`} className="input" value={q.concept ?? ""} placeholder="T.ex. Ekvationer" onChange={(e) => onPatch({ concept: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor={`ex-${q.id}`}>
              Förklaring efter svaret <span className="muted">(valfritt)</span>
            </label>
            <input id={`ex-${q.id}`} className="input" value={q.explanation ?? ""} placeholder="En mening som hjälper den som svarade fel" onChange={(e) => onPatch({ explanation: e.target.value })} />
          </div>
          {error && <span className={s.err}>{error}</span>}
          {!error && hint.length > 0 && (
            <ul className={s.tips}>
              {hint.map((h) => (
                <li key={h}>
                  <Icon name="info" size={14} /> {h}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="stack gap-4">
          <button className="btn btn-ghost btn-icon" aria-label="Flytta upp" onClick={() => onMove(-1)} disabled={index === 0}>
            <Icon name="chevronUp" size={18} />
          </button>
          <button className="btn btn-ghost btn-icon" aria-label="Flytta ned" onClick={() => onMove(1)} disabled={index === total - 1}>
            <Icon name="chevronDown" size={18} />
          </button>
          <button className="btn btn-ghost btn-icon" aria-label="Duplicera fråga" onClick={onDuplicate}>
            <Icon name="copy" size={18} />
          </button>
          <button className="btn btn-ghost btn-icon" aria-label="Ta bort fråga" disabled={total === 1} onClick={onRemove}>
            <Icon name="trash" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Klistra in ---------- */

const EXAMPLE = `Vilket år blev Gustav Vasa kung?
*1523
1611
1397

Vad heter Sveriges längsta älv?
Dalälven
*Klarälven–Göta älv
Torneälven
Förklaring: Klarälven och Göta älv räknas ihop.`;

function ImportDialog({ onClose, onImport }: { onClose: () => void; onImport: (r: ParseResult) => void }) {
  const [text, setText] = useState("");
  const result = text.trim() ? parseQuestions(text) : null;
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="imp-t" style={{ width: "min(860px, 100%)" }} onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ padding: "16px 20px", borderBottom: "2px solid var(--line)" }}>
          <h2 id="imp-t" style={{ fontSize: "1.25rem" }}>
            Klistra in frågor
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Stäng">
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className={s.importGrid}>
          <div className="stack gap-8">
            <label className="label" htmlFor="imp-text">
              En fråga per stycke. Sätt <strong>*</strong> framför rätt svar.
            </label>
            <textarea id="imp-text" className="textarea" style={{ minHeight: 300, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.9rem" }} placeholder={EXAMPLE} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
            <span className="hint">Fungerar också med rader från ett kalkylark: fråga, rätt svar, fel svar … (tab- eller semikolonseparerat).</span>
            {!text && (
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setText(EXAMPLE)}>
                Visa ett exempel
              </button>
            )}
          </div>
          <div className={s.importPreview} aria-live="polite">
            {!result ? (
              <p className="muted">Förhandsvisningen visas här.</p>
            ) : (
              <>
                <p style={{ fontWeight: 700 }}>
                  {result.questions.length} {result.questions.length === 1 ? "fråga" : "frågor"} hittade
                  {result.errors.length > 0 && <span style={{ color: "var(--lingon-dark)" }}> · {result.errors.length} kunde inte läsas</span>}
                </p>
                <ol className={s.importList}>
                  {result.questions.map((q, i) => (
                    <li key={i}>
                      <strong>{q.text}</strong>
                      <span className="row gap-4 wrap" style={{ marginTop: 4 }}>
                        {q.options.map((o, k) => (
                          <span key={k} className={`chip ${k === q.correct ? "chip-ok" : ""}`}>
                            {k === q.correct && <Icon name="check" size={12} stroke={3} />} {o}
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ol>
                {result.errors.map((e) => (
                  <p key={e.block} className={s.importErr}>
                    <strong>Stycke {e.block}</strong> ”{e.text}” – {e.reason}
                  </p>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="row gap-8" style={{ padding: "14px 20px", borderTop: "2px solid var(--line)", justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>
            Avbryt
          </button>
          <button className="btn btn-primary" disabled={!result?.questions.length} onClick={() => result && onImport(result)}>
            Lägg till {result?.questions.length || ""} {result?.questions.length === 1 ? "fråga" : "frågor"}
          </button>
        </div>
      </div>
    </div>
  );
}
