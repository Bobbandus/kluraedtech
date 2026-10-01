"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CoverArt, SUBJECTS } from "@/components/cover";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { QuizPreview } from "@/components/quiz-preview";
import { fmtPlays } from "@/components/teacher-ui";
import { OPT_KEYS } from "@/components/game/parts";
import { creatorById, estimateMinutes, type Level, type Quiz } from "@/data/quizzes";
import { checkText } from "@/lib/moderation";
import { useHydrated, useStore } from "@/lib/store";
import { useQuiz } from "@/lib/quizzes";
import { formatDate } from "@/lib/results";

export default function QuizDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useHydrated();
  const { quiz, mine } = useQuiz(id);
  const fav = useStore((x) => x.teacher.favorites.includes(id));
  const toggle = useStore((x) => x.toggleFavorite);
  const save = useStore((x) => x.saveQuiz);
  const [showAnswers, setShowAnswers] = useState(false);
  const [preview, setPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const published = useStore((x) => (x.teacher.published ?? []).includes(id));
  const setPublished = useStore((x) => x.setPublished);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (!hydrated) return <main className="page" />;
  if (!quiz) {
    return (
      <main className="page" style={{ textAlign: "center" }}>
        <h1>Quizet hittades inte</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Det kan ha tagits bort.
        </p>
        <Link href="/larare/quiz" className="btn" style={{ marginTop: 16 }}>
          Till Mina quiz
        </Link>
      </main>
    );
  }
  const c = creatorById(quiz.creatorId);
  const concepts = Array.from(new Set(quiz.questions.map((q) => q.concept).filter(Boolean))) as string[];

  const copy = () => {
    const nid = `${quiz.id}-kopia-${Date.now().toString(36)}`;
    save({ ...quiz, id: nid, creatorId: "sara", status: "klar", plays: 0, saves: 0, featured: false, updatedAt: new Date().toISOString().slice(0, 10), title: quiz.title });
    router.push(`/larare/quiz/${nid}/redigera`);
  };

  return (
    <main id="innehall" className="page" style={{ maxWidth: 1000 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => router.back()} style={{ marginBottom: 12 }}>
        <Icon name="arrowLeft" size={16} /> Tillbaka
      </button>
      <section className="card" style={{ padding: 16, borderRadius: 28, display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 24 }} data-detail>
        <CoverArt subject={quiz.subject} rounded={20} />
        <div className="stack gap-8" style={{ padding: "6px 4px" }}>
          <div className="row gap-8 wrap">
            <span className="chip" style={{ background: SUBJECTS[quiz.subject].bg, color: SUBJECTS[quiz.subject].fg }}>
              {SUBJECTS[quiz.subject].label}
            </span>
            <span className="chip">{quiz.level}</span>
            {quiz.status === "utkast" && <span className="chip chip-warn">Utkast</span>}
          </div>
          <h1 style={{ fontSize: "1.9rem" }}>{quiz.title}</h1>
          <p className="muted">{quiz.description}</p>
          <div className="row gap-16 wrap" style={{ fontSize: "0.9rem", color: "var(--ink-2)", fontWeight: 600 }}>
            <span className="row gap-4">
              <Icon name="grid" size={16} /> {quiz.questions.length} frågor
            </span>
            <span className="row gap-4">
              <Icon name="clock" size={16} /> ca {estimateMinutes(quiz)} min
            </span>
            {!mine && quiz.plays ? (
              <span className="row gap-4">
                <Icon name="play" size={16} /> Spelat {fmtPlays(quiz.plays)} gånger
              </span>
            ) : null}
          </div>
          <div className="row gap-8" style={{ fontSize: "0.9rem" }}>
            <Avatar skin={c.skin} size={26} />
            <span>
              <strong>{mine ? "Du" : c.name}</strong> <span className="muted">· {mine ? `ändrat ${formatDate(quiz.updatedAt)}` : c.school}</span>
            </span>
          </div>
          <div className="row gap-8 wrap" style={{ marginTop: "auto", paddingTop: 10 }}>
            {quiz.status === "klar" ? (
              <Link href={`/larare/starta/${quiz.id}`} className="btn btn-primary btn-lg">
                <Icon name="play" size={18} /> Starta spel
              </Link>
            ) : (
              <Link href={`/larare/quiz/${quiz.id}/redigera`} className="btn btn-primary btn-lg">
                <Icon name="edit" size={18} /> Gör klart
              </Link>
            )}
            <button className="btn btn-lg" onClick={() => setPreview(true)}>
              <Icon name="eye" size={18} /> Förhandsvisa
            </button>
            {mine ? (
              <>
                <Link href={`/larare/quiz/${quiz.id}/redigera`} className="btn btn-lg">
                  <Icon name="edit" size={18} /> Redigera
                </Link>
                <button
                  className="btn btn-lg"
                  onClick={async () => {
                    const url = `${window.location.origin}/larare/quiz/${quiz.id}`;
                    try {
                      await navigator.clipboard.writeText(url);
                      setToast("Länken är kopierad");
                    } catch {
                      setToast(url);
                    }
                  }}
                >
                  <Icon name="external" size={18} /> Dela länk
                </button>
                {quiz.status === "klar" &&
                  (published ? (
                    <button
                      className="btn btn-lg"
                      onClick={() => {
                        setPublished(quiz.id, false);
                        setToast("Quizet är inte längre publicerat");
                      }}
                    >
                      <Icon name="eyeOff" size={18} /> Avpublicera
                    </button>
                  ) : (
                    <button className="btn btn-lg" onClick={() => setPublishing(true)}>
                      <Icon name="upload" size={18} /> Publicera i Upptäck
                    </button>
                  ))}
              </>
            ) : (
              <>
                <button className="btn btn-lg" onClick={copy}>
                  <Icon name="copy" size={18} /> Gör en kopia
                </button>
                <button className="btn btn-lg btn-icon" style={{ width: 56 }} aria-pressed={fav} aria-label={fav ? "Ta bort från sparade" : "Spara"} onClick={() => toggle(quiz.id)}>
                  <Icon name="bookmark" size={20} style={fav ? { fill: "var(--hjortron)", color: "var(--hjortron-dark)" } : undefined} />
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {concepts.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <div className="eyebrow">Begrepp som tränas</div>
          <div className="row gap-8 wrap" style={{ marginTop: 8 }}>
            {concepts.map((x) => (
              <span key={x} className="chip chip-brand">
                {x}
              </span>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: 24 }}>
        <div className="row between wrap gap-8" style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: "1.25rem" }}>Frågor</h2>
          <label className="row gap-8" style={{ fontWeight: 600, cursor: "pointer" }}>
            <input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} style={{ width: 20, height: 20, accentColor: "var(--brand)" }} />
            Visa rätt svar
          </label>
        </div>
        <ol className="stack gap-8" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {quiz.questions.map((q, i) => (
            <li key={q.id} className="card" style={{ padding: "14px 16px" }}>
              <div className="row gap-12" style={{ alignItems: "flex-start" }}>
                <span className="num" style={{ color: "var(--ink-3)", minWidth: 24 }}>
                  {i + 1}
                </span>
                <div className="grow">
                  <div style={{ fontWeight: 650 }}>{q.text}</div>
                  <div className="row gap-8 wrap" style={{ marginTop: 8 }}>
                    {q.options.map((o, k) => (
                      <span key={k} className={`chip ${showAnswers && k === q.correct ? "chip-ok" : ""}`}>
                        {showAnswers && k === q.correct ? <Icon name="check" size={13} stroke={3} /> : <strong>{OPT_KEYS[k]}</strong>} {o}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="chip" style={{ flex: "none" }}>
                  {q.time} s
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>
      {preview && <QuizPreview title={quiz.title} questions={quiz.questions} onClose={() => setPreview(false)} />}
      {publishing && (
        <PublishDialog
          quiz={quiz}
          onClose={() => setPublishing(false)}
          onPublish={(tags, level) => {
            save({ ...quiz, tags, level });
            setPublished(quiz.id, true);
            setPublishing(false);
            setToast("Publicerat i Upptäck!");
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Icon name="info" size={18} /> {toast}
        </div>
      )}
      <style>{`@media (max-width: 720px){ [data-detail]{ grid-template-columns: 1fr !important; } }`}</style>
    </main>
  );
}

function PublishDialog({ quiz, onClose, onPublish }: { quiz: Quiz; onClose: () => void; onPublish: (tags: string[], level: Level) => void }) {
  const [tags, setTags] = useState((quiz.tags ?? []).join(", "));
  const [level, setLevel] = useState<Level>(quiz.level);
  const content = [quiz.title, quiz.description, tags, ...quiz.questions.flatMap((q) => [q.text, ...q.options, q.explanation ?? ""])].join(" \n ");
  const ok = checkText(content).ok;
  const missingExpl = quiz.questions.filter((q) => !q.explanation?.trim()).length;
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="pub-t" style={{ padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <h2 id="pub-t" style={{ fontSize: "1.35rem" }}>
          Publicera ”{quiz.title}”
        </h2>
        <p className="muted" style={{ marginTop: 6 }}>
          Andra lärare kan hitta, spela och kopiera quizet i Upptäck. Ditt namn och din skola visas som skapare.
        </p>
        <div className="stack gap-12" style={{ marginTop: 16 }}>
          <div className="field">
            <label className="label" htmlFor="pub-tags">
              Taggar <span className="muted">(kommaseparerade)</span>
            </label>
            <input id="pub-tags" className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="T.ex. 1600-talet, Krig" />
          </div>
          <div className="field">
            <label className="label" htmlFor="pub-lvl">
              Nivå
            </label>
            <select id="pub-lvl" className="select" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
              {(["Åk 4–6", "Åk 7–9", "Gymnasiet"] as Level[]).map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          {missingExpl > 0 && (
            <p className="chip chip-info" style={{ height: "auto", padding: "8px 12px" }}>
              {missingExpl} {missingExpl === 1 ? "fråga saknar" : "frågor saknar"} förklaring. Quiz med förklaringar rekommenderas oftare.
            </p>
          )}
          {!ok && (
            <p role="alert" style={{ color: "var(--lingon-dark)", fontWeight: 600 }}>
              Quizet innehåller ord som inte är tillåtna i Upptäck. Ändra texten och försök igen.
            </p>
          )}
        </div>
        <div className="row gap-8" style={{ marginTop: 20, justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose}>
            Avbryt
          </button>
          <button
            className="btn btn-primary"
            disabled={!ok}
            onClick={() =>
              onPublish(
                tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .slice(0, 6),
                level,
              )
            }
          >
            <Icon name="upload" size={16} /> Publicera
          </button>
        </div>
      </div>
    </div>
  );
}
