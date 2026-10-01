"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { AccuracyRing } from "@/components/teacher-ui";
import { OPT_COLORS, OPT_KEYS } from "@/components/game/parts";
import { ENERGY } from "@/lib/game/engine";
import { useHydrated, useStore } from "@/lib/store";
import { useSessions } from "@/lib/quizzes";
import { ALL_QUIZZES, type Quiz } from "@/data/quizzes";
import { classAccuracy, commonWrong, conceptStats, formatDate, pct, playerAccuracy, questionAccuracy } from "@/lib/results";

type Sort = "rank" | "acc" | "name";

export default function ResultDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useHydrated();
  const sessions = useSessions();
  const myQuizzes = useStore((x) => x.teacher.quizzes);
  const save = useStore((x) => x.saveQuiz);
  const [sort, setSort] = useState<Sort>("rank");
  const [openQ, setOpenQ] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const r = sessions.find((x) => x.id === id);

  const players = useMemo(() => {
    if (!r) return [];
    const list = r.players.slice();
    if (sort === "acc") list.sort((a, b) => playerAccuracy(b, r.questions.length) - playerAccuracy(a, r.questions.length));
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "sv"));
    return list;
  }, [r, sort]);

  if (!hydrated) return <main className="page" />;
  if (!r) {
    return (
      <main className="page" style={{ textAlign: "center" }}>
        <h1>Resultatet hittades inte</h1>
        <Link href="/larare/resultat" className="btn" style={{ marginTop: 16 }}>
          Alla resultat
        </Link>
      </main>
    );
  }

  const total = r.players.length;
  const acc = classAccuracy(r);
  const concepts = conceptStats(r);
  const ordered = r.questions.map((q, i) => ({ q, i, a: questionAccuracy(q, total) }));
  const hardest = ordered.slice().sort((a, b) => a.a - b.a).slice(0, 3);
  const support = r.players.filter((p) => playerAccuracy(p, r.questions.length) < 0.5);
  const avgStreak = Math.round(r.players.reduce((a, p) => a + p.bestStreak, 0) / total);

  const makeRepetition = () => {
    const src: Quiz | undefined = myQuizzes.find((q) => q.id === r.quizId) ?? ALL_QUIZZES.find((q) => q.id === r.quizId);
    const qs = hardest.map((h) => ({ id: `rep-${h.i}-${Date.now().toString(36)}`, text: h.q.text, options: h.q.options, correct: h.q.correct, time: 30, explanation: h.q.explanation, concept: h.q.concept }));
    const nid = `repetition-${Date.now().toString(36)}`;
    save({
      id: nid,
      title: `Repetition: ${r.quizTitle}`,
      description: `De frågor ${r.className} tyckte var svårast ${formatDate(r.date)}.`,
      subject: r.subject,
      level: src?.level ?? "Åk 7–9",
      questions: qs,
      creatorId: "sara",
      updatedAt: new Date().toISOString().slice(0, 10),
      status: "utkast",
    });
    router.push(`/larare/quiz/${nid}/redigera`);
  };

  return (
    <main id="innehall" className="page" style={{ maxWidth: 1080 }}>
      <Link href="/larare/resultat" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
        <Icon name="arrowLeft" size={16} /> Alla resultat
      </Link>
      <div className="row between wrap gap-16">
        <div>
          <p className="eyebrow">
            {r.className} · {formatDate(r.date, true)} · {ENERGY[r.energy].label}
          </p>
          <h1 style={{ marginTop: 4 }}>{r.quizTitle}</h1>
        </div>
        <div className="row gap-8 wrap">
          <button className="btn" onClick={makeRepetition}>
            <Icon name="repeat" size={18} /> Skapa repetitionsquiz
          </button>
          <Link href={`/larare/starta/${r.quizId}`} className="btn btn-primary">
            <Icon name="play" size={18} /> Kör igen
          </Link>
        </div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 20 }}>
        <div className="card card-pad row gap-16">
          <AccuracyRing value={acc} size={72} stroke={8} />
          <div>
            <div style={{ fontWeight: 700 }}>Klassens träffsäkerhet</div>
            <div className="muted" style={{ fontSize: "0.88rem" }}>
              {r.players.reduce((a, p) => a + p.correct, 0)} av {r.players.reduce((a, p) => a + (p.answered || r.questions.length), 0)} svar rätt
            </div>
          </div>
        </div>
        <div className="card card-pad">
          <div className="num" style={{ fontSize: "2rem" }}>
            {total}
          </div>
          <div className="muted" style={{ fontWeight: 600, fontSize: "0.9rem" }}>
            elever deltog
          </div>
        </div>
        <div className="card card-pad">
          <div className="num" style={{ fontSize: "2rem" }}>
            {avgStreak}
          </div>
          <div className="muted" style={{ fontWeight: 600, fontSize: "0.9rem" }}>
            rätt i rad i snitt (längsta)
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginTop: 16, alignItems: "start" }}>
        <section className="card card-pad" aria-labelledby="repetera">
          <h2 id="repetera" style={{ fontSize: "1.2rem" }}>
            Att ta upp på nästa lektion
          </h2>
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            Frågorna flest missade – och det vanligaste felsvaret.
          </p>
          <ol className="stack gap-12" style={{ listStyle: "none", padding: 0, margin: "14px 0 0" }}>
            {hardest.map(({ q, a }) => {
              const w = commonWrong(q);
              return (
                <li key={q.text} style={{ padding: 14, borderRadius: 16, background: "var(--paper)" }}>
                  <div className="row between gap-12" style={{ alignItems: "flex-start" }}>
                    <strong>{q.text}</strong>
                    <span className={`chip ${a < 0.5 ? "chip-err" : "chip-warn"}`} style={{ flex: "none" }}>
                      {pct(a)} rätt
                    </span>
                  </div>
                  <div className="stack gap-4" style={{ marginTop: 8, fontSize: "0.92rem" }}>
                    <span className="row gap-8">
                      <Icon name="check" size={15} stroke={3} style={{ color: "var(--ok)" }} /> {q.options[q.correct]}
                    </span>
                    {w && w.share > 0.12 && (
                      <span className="row gap-8" style={{ color: "var(--lingon-dark)" }}>
                        <Icon name="info" size={15} /> {pct(w.share)} svarade ”{q.options[w.option]}” – möjlig missuppfattning
                      </span>
                    )}
                    {q.concept && <span className="muted">Begrepp: {q.concept}</span>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="card card-pad" aria-labelledby="begrepp">
          <h2 id="begrepp" style={{ fontSize: "1.2rem" }}>
            Begrepp
          </h2>
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            Andel rätt per begrepp, svagast först.
          </p>
          <div className="stack gap-12" style={{ marginTop: 14 }}>
            {concepts.map((c) => (
              <div key={c.concept}>
                <div className="row between" style={{ fontSize: "0.94rem" }}>
                  <span style={{ fontWeight: 650 }}>{c.concept}</span>
                  <span className="muted">
                    {pct(c.accuracy)} · {c.questions} {c.questions === 1 ? "fråga" : "frågor"}
                  </span>
                </div>
                <div className="bar" style={{ marginTop: 6, height: 10 }}>
                  <span style={{ width: `${c.accuracy * 100}%`, background: c.accuracy >= 0.75 ? "var(--ok)" : c.accuracy >= 0.55 ? "var(--hjortron)" : "var(--lingon)" }} />
                </div>
              </div>
            ))}
          </div>
          {support.length > 0 && (
            <div style={{ marginTop: 18, padding: 14, borderRadius: 16, background: "var(--fjall-tint)", fontSize: "0.92rem" }}>
              <button onClick={() => setShowSupport((x) => !x)} aria-expanded={showSupport} className="row gap-8" style={{ background: "none", border: 0, padding: 0, fontWeight: 700, color: "var(--fjall-dark)" }}>
                <Icon name={showSupport ? "eyeOff" : "eye"} size={16} /> {support.length} {support.length === 1 ? "elev" : "elever"} kan behöva extra stöd
              </button>
              {showSupport ? (
                <p style={{ marginTop: 6 }}>{support.map((p) => p.name).join(", ")} hade under hälften rätt.</p>
              ) : (
                <p className="muted" style={{ marginTop: 4 }}>Dolt så att det inte syns om skärmen delas.</p>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="card card-pad" style={{ marginTop: 16 }} aria-labelledby="fragor">
        <h2 id="fragor" style={{ fontSize: "1.2rem" }}>
          Alla frågor
        </h2>
        <div className="stack" style={{ marginTop: 10 }}>
          {ordered.map(({ q, i, a }) => (
            <div key={i} style={{ borderTop: i ? "2px solid var(--line)" : undefined }}>
              <button onClick={() => setOpenQ(openQ === i ? null : i)} aria-expanded={openQ === i} className="row gap-12" style={{ width: "100%", padding: "12px 0", background: "none", border: 0, textAlign: "left" }}>
                <span className="num" style={{ width: 24, color: "var(--ink-3)" }}>
                  {i + 1}
                </span>
                <span className="grow" style={{ fontWeight: 600 }}>
                  {q.text}
                </span>
                <span style={{ width: 120, flex: "none" }} className="bar" aria-hidden="true">
                  <span style={{ width: `${a * 100}%`, background: a >= 0.75 ? "var(--ok)" : a >= 0.55 ? "var(--hjortron)" : "var(--lingon)" }} />
                </span>
                <span style={{ width: 48, textAlign: "right", fontWeight: 700 }}>{pct(a)}</span>
                <Icon name={openQ === i ? "chevronUp" : "chevronDown"} size={18} />
              </button>
              {openQ === i && (
                <div className="stack gap-8" style={{ padding: "0 0 16px 36px" }}>
                  {q.options.map((o, k) => {
                    const answers = q.distribution.reduce((a, b) => a + b, 0) + q.unanswered;
                    const share = answers ? q.distribution[k] / answers : 0;
                    return (
                      <div key={k} className="row gap-8" style={{ fontSize: "0.92rem" }}>
                        <span style={{ width: 26, height: 26, borderRadius: 8, background: OPT_COLORS[k], color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, flex: "none" }}>{OPT_KEYS[k]}</span>
                        <span className="grow" style={{ fontWeight: k === q.correct ? 700 : 500 }}>
                          {o} {k === q.correct && <Icon name="check" size={14} stroke={3} style={{ display: "inline", color: "var(--ok)" }} />}
                        </span>
                        <span className="bar" style={{ width: 140, height: 10, flex: "none" }}>
                          <span style={{ width: `${share * 100}%`, background: k === q.correct ? "var(--ok)" : "var(--ink-4)" }} />
                        </span>
                        <span style={{ width: 30, textAlign: "right" }}>{q.distribution[k]}</span>
                      </div>
                    );
                  })}
                  {q.unanswered > 0 && <span className="muted" style={{ fontSize: "0.88rem" }}>{q.unanswered} hann inte svara</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card card-pad" style={{ marginTop: 16 }} aria-labelledby="elever">
        <div className="row between wrap gap-8">
          <h2 id="elever" style={{ fontSize: "1.2rem" }}>
            Elever
          </h2>
          <div className="row gap-8" role="group" aria-label="Sortera">
            {(
              [
                ["rank", "Placering"],
                ["acc", "Rätt svar"],
                ["name", "Namn"],
              ] as [Sort, string][]
            ).map(([k, l]) => (
              <button key={k} className="chip chip-btn" aria-pressed={sort === k} onClick={() => setSort(k)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.94rem", minWidth: 520 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--ink-3)", fontSize: "0.82rem" }}>
                <th style={{ padding: "8px 6px" }}>#</th>
                <th style={{ padding: "8px 6px" }}>Elev</th>
                <th style={{ padding: "8px 6px" }}>Rätt</th>
                <th style={{ padding: "8px 6px" }}>Längsta rad</th>
                <th style={{ padding: "8px 6px", textAlign: "right" }}>Höjd</th>
              </tr>
            </thead>
            <tbody>
              {(showAll ? players : players.slice(0, 10)).map((p) => (
                <tr key={p.id} style={{ borderTop: "2px solid var(--line)" }}>
                  <td style={{ padding: "8px 6px", color: "var(--ink-3)", fontWeight: 700 }}>{p.rank}</td>
                  <td style={{ padding: "8px 6px" }}>
                    <span className="row gap-8">
                      <Avatar skin={p.skinId} size={28} /> {p.name}
                    </span>
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    {p.correct}/{p.answered || r.questions.length} <span className="muted">({pct(playerAccuracy(p, r.questions.length))})</span>
                  </td>
                  <td style={{ padding: "8px 6px" }}>{p.bestStreak}</td>
                  <td style={{ padding: "8px 6px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{p.score.toLocaleString("sv-SE")} m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {players.length > 10 && (
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setShowAll((x) => !x)}>
            {showAll ? "Visa färre" : `Visa alla ${players.length}`}
          </button>
        )}
      </section>
    </main>
  );
}
