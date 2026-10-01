"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { LineChart, Sparkline, Trend } from "@/components/charts";
import { AccuracyRing } from "@/components/teacher-ui";
import { useHydrated, useStore } from "@/lib/store";
import { useSessions } from "@/lib/quizzes";
import { classesFrom, recurringWeak, repetitionQuiz, studentTrends } from "@/lib/classes";
import { classAccuracy, formatDate, pct } from "@/lib/results";
import { ENERGY } from "@/lib/game/engine";

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useHydrated();
  const sessions = useSessions();
  const save = useStore((x) => x.saveQuiz);
  const [showStudents, setShowStudents] = useState(false);
  if (!hydrated) return <main className="page" />;
  const stats = classesFrom(sessions).find((c) => c.cls.id === id);
  if (!stats) {
    return (
      <main className="page" style={{ textAlign: "center" }}>
        <h1>Klassen hittades inte</h1>
        <Link href="/larare/klasser" className="btn" style={{ marginTop: 16 }}>
          Alla klasser
        </Link>
      </main>
    );
  }
  const { cls, sessions: list, latest, trend } = stats;
  const weak = recurringWeak(list);
  const students = studentTrends(list);
  const improved = students.filter((s) => (s.change ?? 0) > 0.08).sort((a, b) => (b.change ?? 0) - (a.change ?? 0)).slice(0, 3);
  const avg = list.length ? list.map(classAccuracy).reduce((a, b) => a + b, 0) / list.length : 0;

  const makeRep = (concept: string) => {
    const w = weak.find((x) => x.concept === concept)!;
    const q = repetitionQuiz(`Repetition: ${concept} (${cls.name})`, list[list.length - 1].subject, w.questions, "utkast");
    save(q);
    router.push(`/larare/quiz/${q.id}/redigera`);
  };

  return (
    <main id="innehall" className="page" style={{ maxWidth: 1080 }}>
      <Link href="/larare/klasser" className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }}>
        <Icon name="arrowLeft" size={16} /> Alla klasser
      </Link>
      <div className="row between wrap gap-12">
        <div>
          <p className="eyebrow">
            {cls.subject} · {cls.students} elever
          </p>
          <h1 style={{ marginTop: 4 }}>{cls.name}</h1>
        </div>
        <Trend value={trend} />
      </div>

      {list.length === 0 ? (
        <div className="card card-pad" style={{ marginTop: 20, textAlign: "center" }}>
          <p className="muted">Kör en första lektion med klassen så dyker statistiken upp här.</p>
        </div>
      ) : (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 20 }}>
            <div className="card card-pad row gap-16">
              <AccuracyRing value={latest ?? 0} size={64} stroke={7} />
              <div>
                <div style={{ fontWeight: 700 }}>Senaste lektionen</div>
                <div className="muted" style={{ fontSize: "0.88rem" }}>
                  {formatDate(list[list.length - 1].date)}
                </div>
              </div>
            </div>
            <div className="card card-pad">
              <div className="num" style={{ fontSize: "2rem" }}>
                {pct(avg)}
              </div>
              <div className="muted" style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                snitt över {list.length} lektioner
              </div>
            </div>
            <div className="card card-pad">
              <div className="num" style={{ fontSize: "2rem" }}>
                {weak.length}
              </div>
              <div className="muted" style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                begrepp under 75 % rätt
              </div>
            </div>
          </section>

          <section className="card card-pad" style={{ marginTop: 16 }} aria-labelledby="trend-t">
            <h2 id="trend-t" style={{ fontSize: "1.2rem" }}>
              Klassens träffsäkerhet per lektion
            </h2>
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              Andel rätta svar. Peka på en punkt för detaljer.
            </p>
            <div style={{ marginTop: 12 }}>
              <LineChart
                ariaLabel={`Träffsäkerhet för ${cls.name} över ${list.length} lektioner, senast ${pct(latest ?? 0)}`}
                points={list.map((r) => ({ label: formatDate(r.date), value: classAccuracy(r), detail: `${r.quizTitle} · ${ENERGY[r.energy].label}` }))}
              />
            </div>
            <details style={{ marginTop: 10 }}>
              <summary className="muted" style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
                Visa som tabell
              </summary>
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8, fontSize: "0.92rem" }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--ink-3)", fontSize: "0.82rem" }}>
                    <th style={{ padding: 6 }}>Datum</th>
                    <th style={{ padding: 6 }}>Quiz</th>
                    <th style={{ padding: 6, textAlign: "right" }}>Rätt</th>
                  </tr>
                </thead>
                <tbody>
                  {list
                    .slice()
                    .reverse()
                    .map((r) => (
                      <tr key={r.id} style={{ borderTop: "2px solid var(--line)" }}>
                        <td style={{ padding: 6 }}>{formatDate(r.date)}</td>
                        <td style={{ padding: 6 }}>
                          <Link href={`/larare/resultat/${r.id}`} style={{ textDecoration: "underline" }}>
                            {r.quizTitle}
                          </Link>
                        </td>
                        <td style={{ padding: 6, textAlign: "right", fontWeight: 700 }}>{pct(classAccuracy(r))}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </details>
          </section>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginTop: 16, alignItems: "start" }}>
            <section className="card card-pad" aria-labelledby="weak-t">
              <h2 id="weak-t" style={{ fontSize: "1.2rem" }}>
                Återkommer som svårt
              </h2>
              <p className="muted" style={{ fontSize: "0.9rem" }}>
                Begrepp under 75 % rätt, sammanvägt över alla lektioner.
              </p>
              {weak.length === 0 ? (
                <p className="muted" style={{ marginTop: 12 }}>
                  Inga begrepp under 75 % – snyggt!
                </p>
              ) : (
                <div className="stack gap-12" style={{ marginTop: 14 }}>
                  {weak.slice(0, 6).map((w) => (
                    <div key={w.concept} style={{ padding: 12, borderRadius: 14, background: "var(--paper)" }}>
                      <div className="row between gap-8">
                        <strong>{w.concept}</strong>
                        <span className={`chip ${w.accuracy < 0.55 ? "chip-err" : "chip-warn"}`}>{pct(w.accuracy)} rätt</span>
                      </div>
                      <div className="bar" style={{ marginTop: 8, height: 8 }}>
                        <span style={{ width: `${w.accuracy * 100}%`, background: "var(--hjortron)" }} />
                      </div>
                      <div className="row between wrap gap-8" style={{ marginTop: 8 }}>
                        <span className="muted" style={{ fontSize: "0.84rem" }}>
                          {w.lessons} {w.lessons === 1 ? "lektion" : "lektioner"} · {new Set(w.questions.map((q) => q.text)).size} frågor
                        </span>
                        <button className="btn btn-sm" onClick={() => makeRep(w.concept)}>
                          <Icon name="repeat" size={15} /> Repetitionsquiz
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card card-pad" aria-labelledby="stud-t">
              <h2 id="stud-t" style={{ fontSize: "1.2rem" }}>
                Elever
              </h2>
              {improved.length > 0 && (
                <div style={{ marginTop: 10, padding: 12, borderRadius: 14, background: "var(--ok-tint)" }}>
                  <strong style={{ color: "var(--ok-dark)" }}>Har förbättrats mest:</strong> {improved.map((s) => s.name).join(", ")}
                  <div className="muted" style={{ fontSize: "0.84rem", marginTop: 2 }}>
                    Bra att ge beröm för – utan att visa siffror för klassen.
                  </div>
                </div>
              )}
              <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={() => setShowStudents((x) => !x)} aria-expanded={showStudents}>
                <Icon name={showStudents ? "eyeOff" : "eye"} size={16} /> {showStudents ? "Dölj elevdetaljer" : "Visa elevdetaljer"}
              </button>
              {!showStudents ? (
                <p className="muted" style={{ marginTop: 8, fontSize: "0.88rem" }}>
                  Dolt så att det inte syns om skärmen delas.
                </p>
              ) : (
                <div style={{ overflowX: "auto", marginTop: 12 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.92rem", minWidth: 380 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "var(--ink-3)", fontSize: "0.82rem" }}>
                        <th style={{ padding: 6 }}>Elev</th>
                        <th style={{ padding: 6 }}>Över tid</th>
                        <th style={{ padding: 6, textAlign: "right" }}>Senast</th>
                        <th style={{ padding: 6, textAlign: "right" }}>Förändring</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.name} style={{ borderTop: "2px solid var(--line)" }}>
                          <td style={{ padding: 6 }}>
                            <span className="row gap-8">
                              <Avatar skin={s.skinId} size={26} /> {s.name}
                            </span>
                          </td>
                          <td style={{ padding: 6 }}>
                            <Sparkline values={s.points} />
                          </td>
                          <td style={{ padding: 6, textAlign: "right", fontWeight: 700 }}>{s.latest !== null ? pct(s.latest) : "–"}</td>
                          <td style={{ padding: 6, textAlign: "right" }}>
                            {s.change === null ? "–" : `${s.change >= 0 ? "+" : "−"}${Math.abs(Math.round(s.change * 100))}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}
