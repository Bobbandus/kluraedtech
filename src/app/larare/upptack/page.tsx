"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { MarketCard } from "@/components/teacher-ui";
import { SUBJECTS, type Subject } from "@/components/cover";
import { MARKET_QUIZZES as BASE_MARKET, creatorById, type Level } from "@/data/quizzes";
import { useHydrated, useStore } from "@/lib/store";
import s from "@/components/teacher.module.css";

const LEVELS: (Level | "alla")[] = ["alla", "Åk 4–6", "Åk 7–9", "Gymnasiet"];

export default function Discover() {
  useHydrated();
  const favorites = useStore((x) => x.teacher.favorites);
  const myQuizzes = useStore((x) => x.teacher.quizzes);
  const published = useStore((x) => x.teacher.published ?? []);
  const MARKET_QUIZZES = useMemo(() => [...myQuizzes.filter((q) => published.includes(q.id) && q.status === "klar"), ...BASE_MARKET], [myQuizzes, published]);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<Subject | "alla" | "sparade">("alla");
  const [level, setLevel] = useState<Level | "alla">("alla");
  const [sort, setSort] = useState<"popular" | "nytt">("popular");

  const filtering = q.trim() !== "" || subject !== "alla" || level !== "alla";
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = MARKET_QUIZZES.filter((x) => {
      if (subject === "sparade" && !favorites.includes(x.id)) return false;
      if (subject !== "alla" && subject !== "sparade" && x.subject !== subject) return false;
      if (level !== "alla" && x.level !== level) return false;
      if (!term) return true;
      const hay = [x.title, x.description, SUBJECTS[x.subject].label, creatorById(x.creatorId).name, ...(x.tags ?? []), ...x.questions.map((qq) => qq.text)].join(" ").toLowerCase();
      return hay.includes(term);
    });
    list = list.sort((a, b) => (sort === "popular" ? (b.plays ?? 0) - (a.plays ?? 0) : b.updatedAt.localeCompare(a.updatedAt)));
    return list;
  }, [q, subject, level, sort, favorites, MARKET_QUIZZES]);

  const subjectsInUse = Array.from(new Set(MARKET_QUIZZES.map((x) => x.subject)));

  return (
    <main id="innehall" className="page">
      <h1>Upptäck</h1>
      <p className="muted" style={{ marginTop: 4 }}>
        Quiz från lärare över hela Sverige – kör direkt eller gör en egen kopia.
      </p>

      <div className={s.toolbar} style={{ marginTop: 20 }}>
        <div className={s.search}>
          <Icon name="search" size={20} />
          <label htmlFor="sok" className="sr-only">
            Sök quiz
          </label>
          <input id="sok" className="input" placeholder="Sök på ämne, begrepp eller fråga – t.ex. ”fotosyntes”" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="sr-only" htmlFor="niva">
          Årskurs
        </label>
        <select id="niva" className="select" style={{ width: "auto" }} value={level} onChange={(e) => setLevel(e.target.value as Level | "alla")}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l === "alla" ? "Alla årskurser" : l}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="sort">
          Sortering
        </label>
        <select id="sort" className="select" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value as "popular" | "nytt")}>
          <option value="popular">Mest spelade</option>
          <option value="nytt">Senast uppdaterade</option>
        </select>
      </div>

      <div className={s.chips} style={{ marginTop: 14 }} role="group" aria-label="Ämnen">
        <button className="chip chip-btn" aria-pressed={subject === "alla"} onClick={() => setSubject("alla")}>
          Alla ämnen
        </button>
        <button className="chip chip-btn" aria-pressed={subject === "sparade"} onClick={() => setSubject("sparade")}>
          <Icon name="bookmark" size={14} /> Sparade ({favorites.length})
        </button>
        {subjectsInUse.map((k) => (
          <button key={k} className="chip chip-btn" aria-pressed={subject === k} onClick={() => setSubject(k)}>
            {SUBJECTS[k].label}
          </button>
        ))}
      </div>

      {!filtering ? (
        <>
          <section style={{ marginTop: 28 }}>
            <div className={s.sectionHead}>
              <div>
                <h2>Utvalt den här veckan</h2>
                <p className="muted" style={{ fontSize: "0.9rem" }}>
                  Granskade quiz med bra förklaringar.
                </p>
              </div>
            </div>
            <div className={s.mcards}>
              {MARKET_QUIZZES.filter((x) => x.featured).map((x) => (
                <MarketCard key={x.id} quiz={x} />
              ))}
            </div>
          </section>
          <section style={{ marginTop: 36 }}>
            <div className={s.sectionHead}>
              <h2>{sort === "popular" ? "Mest spelade" : "Nyligen uppdaterade"}</h2>
            </div>
            <div className={s.mcards}>
              {results
                .filter((x) => !x.featured)
                .map((x) => (
                  <MarketCard key={x.id} quiz={x} />
                ))}
            </div>
          </section>
        </>
      ) : (
        <section style={{ marginTop: 24 }} aria-live="polite">
          <p className="muted" style={{ marginBottom: 12, fontWeight: 600 }}>
            {results.length} {results.length === 1 ? "quiz" : "quiz"}
          </p>
          {results.length ? (
            <div className={s.mcards}>
              {results.map((x) => (
                <MarketCard key={x.id} quiz={x} />
              ))}
            </div>
          ) : (
            <div className={s.empty}>
              <Icon name="search" size={32} style={{ margin: "0 auto", color: "var(--ink-4)" }} />
              <h3 style={{ marginTop: 12 }}>{subject === "sparade" ? "Inga sparade quiz än" : "Inga quiz matchar"}</h3>
              <p className="muted" style={{ marginTop: 4 }}>
                {subject === "sparade" ? "Tryck på bokmärket på ett quiz för att spara det här." : "Testa ett bredare sökord eller ta bort ett filter."}
              </p>
              <button
                className="btn"
                style={{ marginTop: 16 }}
                onClick={() => {
                  setQ("");
                  setSubject("alla");
                  setLevel("alla");
                }}
              >
                Rensa filter
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
