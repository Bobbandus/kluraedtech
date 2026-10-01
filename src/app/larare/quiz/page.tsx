"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CoverArt, SUBJECTS } from "@/components/cover";
import { Icon } from "@/components/icons";
import { useHydrated, useStore } from "@/lib/store";
import { formatDate } from "@/lib/results";
import { estimateMinutes } from "@/data/quizzes";
import s from "@/components/teacher.module.css";

type F = "alla" | "klar" | "utkast";

export default function MyQuizzes() {
  const hydrated = useHydrated();
  const quizzes = useStore((x) => x.teacher.quizzes);
  const del = useStore((x) => x.deleteQuiz);
  const [q, setQ] = useState("");
  const [f, setF] = useState<F>("alla");
  const [confirm, setConfirm] = useState<string | null>(null);

  const list = useMemo(
    () =>
      quizzes
        .filter((x) => (f === "alla" ? true : x.status === f))
        .filter((x) => x.title.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [quizzes, f, q],
  );

  if (!hydrated) return <main className="page" />;
  const toDelete = quizzes.find((x) => x.id === confirm);

  return (
    <main id="innehall" className="page">
      <div className={s.hello}>
        <div>
          <h1>Mina quiz</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {quizzes.length} quiz · {quizzes.filter((x) => x.status === "utkast").length} utkast
          </p>
        </div>
        <Link href="/larare/quiz/ny" className="btn btn-primary">
          <Icon name="plus" size={18} /> Skapa quiz
        </Link>
      </div>

      <div className={s.toolbar} style={{ marginTop: 20 }}>
        <div className={s.search}>
          <Icon name="search" size={20} />
          <label className="sr-only" htmlFor="s1">
            Sök bland dina quiz
          </label>
          <input id="s1" className="input" placeholder="Sök bland dina quiz" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="row gap-8" role="group" aria-label="Filter">
          {(
            [
              ["alla", "Alla"],
              ["klar", "Klara"],
              ["utkast", "Utkast"],
            ] as [F, string][]
          ).map(([k, l]) => (
            <button key={k} className="chip chip-btn" aria-pressed={f === k} onClick={() => setF(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        {list.length === 0 ? (
          <div className={s.empty}>
            <h3>{q ? "Inget quiz matchar sökningen" : "Här är det tomt än"}</h3>
            <p className="muted" style={{ marginTop: 4 }}>
              Skapa ett eget quiz eller hämta ett färdigt från Upptäck.
            </p>
            <div className="row gap-8 center" style={{ marginTop: 16 }}>
              <Link href="/larare/quiz/ny" className="btn btn-primary">
                Skapa quiz
              </Link>
              <Link href="/larare/upptack" className="btn">
                Till Upptäck
              </Link>
            </div>
          </div>
        ) : (
          list.map((x) => (
            <div key={x.id} className={s.listRow}>
              <Link href={`/larare/quiz/${x.id}`} className={s.thumb} style={{ width: "100%" }}>
                <CoverArt subject={x.subject} rounded={12} />
              </Link>
              <Link href={`/larare/quiz/${x.id}`} style={{ minWidth: 0 }}>
                <div className="row gap-8 wrap">
                  <span className={s.qTitle}>{x.title}</span>
                  {x.status === "utkast" && <span className="chip chip-warn">Utkast</span>}
                </div>
                <div className={s.meta}>
                  <span>{SUBJECTS[x.subject].label}</span>
                  <span>{x.level}</span>
                  <span>{x.questions.length} frågor</span>
                  <span>ca {estimateMinutes(x)} min</span>
                  <span>Ändrat {formatDate(x.updatedAt)}</span>
                </div>
              </Link>
              <div className={`row gap-8 ${s.listActions}`}>
                <Link href={`/larare/quiz/${x.id}/redigera`} className="btn btn-sm">
                  <Icon name="edit" size={16} /> Redigera
                </Link>
                <button className="btn btn-sm btn-ghost btn-icon" aria-label={`Ta bort ${x.title}`} onClick={() => setConfirm(x.id)}>
                  <Icon name="trash" size={18} />
                </button>
                {x.status === "klar" ? (
                  <Link href={`/larare/starta/${x.id}`} className="btn btn-primary btn-sm">
                    <Icon name="play" size={16} /> Starta
                  </Link>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {toDelete && (
        <div className="backdrop" onClick={() => setConfirm(null)}>
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="del-t" style={{ padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <h2 id="del-t" style={{ fontSize: "1.3rem" }}>
              Ta bort ”{toDelete.title}”?
            </h2>
            <p className="muted" style={{ marginTop: 8 }}>
              Quizet försvinner från ditt bibliotek. Tidigare resultat finns kvar.
            </p>
            <div className="row gap-8" style={{ marginTop: 20, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setConfirm(null)} autoFocus>
                Avbryt
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  del(toDelete.id);
                  setConfirm(null);
                }}
              >
                Ta bort
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
