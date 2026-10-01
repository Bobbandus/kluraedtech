"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CoverArt } from "@/components/cover";
import { Icon } from "@/components/icons";
import { AccuracyRing, MarketCard } from "@/components/teacher-ui";
import { MARKET_QUIZZES } from "@/data/quizzes";
import { useHydrated, useStore } from "@/lib/store";
import { useSessions } from "@/lib/quizzes";
import { classAccuracy, conceptStats, formatDate, pct } from "@/lib/results";
import { classesFrom, recurringWeak, repetitionQuiz } from "@/lib/classes";
import { MODE_INFO } from "@/lib/modes";
import s from "@/components/teacher.module.css";

function greeting() {
  const h = new Date().getHours();
  if (h < 10) return "God morgon";
  if (h < 17) return "Hej";
  return "God kväll";
}

export default function Dashboard() {
  const hydrated = useHydrated();
  const t = useStore((x) => x.teacher);
  const sessions = useSessions();
  const router = useRouter();
  const save = useStore((x) => x.saveQuiz);
  if (!hydrated) return <main className="page" />;

  // Förslag till nästa lektion: svagaste begreppet i klassens senaste lektioner
  const suggestions = classesFrom(sessions)
    .filter((c) => c.sessions.length)
    .map((c) => {
      const recent = c.sessions.slice(-3);
      const w = recurringWeak(recent)[0];
      return w ? { c, w, last: recent[recent.length - 1] } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.last.date.localeCompare(a.last.date))
    .slice(0, 2);

  const ready = t.quizzes.filter((q) => q.status === "klar").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const drafts = t.quizzes.filter((q) => q.status === "utkast");
  const today = new Date().toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <main id="innehall" className="page">
      <div className={s.hello}>
        <div>
          <p className="eyebrow" style={{ textTransform: "none", letterSpacing: 0, fontSize: "0.95rem", fontWeight: 600 }}>
            {today.charAt(0).toUpperCase() + today.slice(1)}
          </p>
          <h1 style={{ marginTop: 4 }}>
            {greeting()}, {t.name.split(" ")[0]}
          </h1>
        </div>
        <div className="row gap-8 wrap">
          <Link href="/larare/upptack" className="btn">
            <Icon name="search" size={18} /> Hitta quiz
          </Link>
          <Link href="/larare/quiz/ny" className="btn btn-primary">
            <Icon name="plus" size={18} /> Skapa quiz
          </Link>
        </div>
      </div>

      <div className={s.grid2}>
        <section className="card card-pad" aria-labelledby="snabbstart">
          <div className={s.sectionHead}>
            <div>
              <h2 id="snabbstart">Starta ett spel</h2>
              <p className="muted" style={{ fontSize: "0.9rem" }}>
                Klart på under en minut.
              </p>
            </div>
            <Link href="/larare/quiz" className={s.more}>
              Alla quiz <Icon name="chevronRight" size={16} />
            </Link>
          </div>
          <div className="stack">
            {ready.slice(0, 4).map((q) => (
              <div key={q.id} className={s.quickRow}>
                <Link href={`/larare/quiz/${q.id}`} className={s.thumb}>
                  <CoverArt subject={q.subject} rounded={12} />
                </Link>
                <div className={s.quickMain}>
                  <Link href={`/larare/quiz/${q.id}`} className={s.qTitle}>
                    {q.title}
                  </Link>
                  <div className={s.meta}>
                    <span>{q.questions.length} frågor</span>
                    <span>{q.level}</span>
                    {q.plays ? <span>Spelat {q.plays} {q.plays === 1 ? "gång" : "gånger"}</span> : <span>Inte spelat än</span>}
                  </div>
                  <div className={s.modePick} role="group" aria-label={`Starta ${q.title} som`}>
                    {(["jakt", "fjall", "topptur"] as const).map((m) => (
                      <Link key={m} href={`/larare/starta/${q.id}?lage=${m}`} className={s.modeBtn} title={MODE_INFO[m].tag}>
                        <Icon name={MODE_INFO[m].icon} size={15} /> {MODE_INFO[m].name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="stack gap-16">
          {suggestions.length > 0 && (
            <section className={`card card-pad ${s.nextCard}`} aria-labelledby="nasta">
              <div className={s.sectionHead}>
                <div>
                  <h2 id="nasta">Till nästa lektion</h2>
                  <p className="muted" style={{ fontSize: "0.9rem" }}>
                    Förslag utifrån vad klasserna haft svårt med.
                  </p>
                </div>
              </div>
              <div className="stack gap-12">
                {suggestions.map(({ c, w }) => {
                  const n = Math.min(6, new Set(w.questions.map((q) => q.text)).size);
                  return (
                    <div key={c.cls.id} className={s.nextRow}>
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700 }}>
                          Repetera <span style={{ color: "var(--brand-dark)" }}>{w.concept}</span> med {c.cls.name}
                        </div>
                        <div className="muted" style={{ fontSize: "0.84rem" }}>
                          {pct(w.accuracy)} rätt senast · {n} {n === 1 ? "fråga" : "frågor"} · ca {Math.max(2, Math.round(n * 0.6))} min
                        </div>
                      </div>
                      <button
                        className="btn btn-accent btn-sm"
                        onClick={() => {
                          const q = repetitionQuiz(`Repetition: ${w.concept}`, c.sessions[c.sessions.length - 1].subject, w.questions, "klar");
                          save(q);
                          router.push(`/larare/starta/${q.id}?lage=topptur&klass=${c.cls.id}`);
                        }}
                      >
                        <Icon name="play" size={15} /> Starta
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          {drafts.length > 0 && (
            <section className="card card-pad" aria-labelledby="utkast">
              <div className={s.sectionHead}>
                <h2 id="utkast">Fortsätt där du var</h2>
              </div>
              {drafts.map((q) => (
                <Link key={q.id} href={`/larare/quiz/${q.id}/redigera`} className={s.quickRow} style={{ padding: 8 }}>
                  <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--sol-tint)", color: "#7a5600", display: "grid", placeItems: "center" }}>
                    <Icon name="edit" size={20} />
                  </span>
                  <span className="grow">
                    <span className={s.qTitle} style={{ display: "block" }}>
                      {q.title}
                    </span>
                    <span className="muted" style={{ fontSize: "0.84rem" }}>
                      Utkast · {q.questions.length} frågor · ändrat {formatDate(q.updatedAt)}
                    </span>
                  </span>
                  <Icon name="chevronRight" size={18} />
                </Link>
              ))}
            </section>
          )}

          <section className="card card-pad" aria-labelledby="senaste">
            <div className={s.sectionHead}>
              <h2 id="senaste">Senaste lektionerna</h2>
              <Link href="/larare/resultat" className={s.more}>
                Alla <Icon name="chevronRight" size={16} />
              </Link>
            </div>
            {sessions.slice(0, 3).map((r) => {
              const weakest = conceptStats(r)[0];
              return (
                <Link key={r.id} href={`/larare/resultat/${r.id}`} className={s.resultRow}>
                  <AccuracyRing value={classAccuracy(r)} />
                  <span className="grow">
                    <span className={s.qTitle} style={{ display: "block" }}>
                      {r.quizTitle}
                    </span>
                    <span className="muted" style={{ fontSize: "0.84rem" }}>
                      {r.className} · {formatDate(r.date)}
                    </span>
                    {weakest && weakest.accuracy < 0.7 && (
                      <span style={{ display: "block", fontSize: "0.84rem", color: "#8a4b05", fontWeight: 600, marginTop: 2 }}>
                        Repetera: {weakest.concept}
                      </span>
                    )}
                  </span>
                  <Icon name="chevronRight" size={18} />
                </Link>
              );
            })}
          </section>
        </div>
      </div>

      <section style={{ marginTop: 36 }} aria-labelledby="tips">
        <div className={s.sectionHead}>
          <div>
            <h2 id="tips">Populärt bland andra lärare</h2>
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              Färdiga quiz du kan köra direkt eller göra till dina egna.
            </p>
          </div>
          <Link href="/larare/upptack" className={s.more}>
            Upptäck <Icon name="chevronRight" size={16} />
          </Link>
        </div>
        <div className={s.mcards}>
          {MARKET_QUIZZES.filter((q) => q.featured).slice(0, 4).map((q) => (
            <MarketCard key={q.id} quiz={q} />
          ))}
        </div>
      </section>
    </main>
  );
}
