"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { Sparkline, Trend } from "@/components/charts";
import { useEffect, useState } from "react";
import { useHydrated, useStore, useClasses } from "@/lib/store";
import { checkText } from "@/lib/moderation";
import { useSessions } from "@/lib/quizzes";
import { classesFrom, recurringWeak } from "@/lib/classes";
import { classAccuracy, formatDate, pct } from "@/lib/results";

export default function Classes() {
  const hydrated = useHydrated();
  const sessions = useSessions();
  const all = useClasses();
  const customRaw = useStore((x) => x.teacher.classes);
  const custom = customRaw ?? [];
  const removeClass = useStore((x) => x.removeClass);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("ny")) setCreating(true);
  }, []);
  if (!hydrated) return <main className="page" />;
  const classes = classesFrom(sessions, all);
  return (
    <main id="innehall" className="page" style={{ maxWidth: 1000 }}>
      <div className="row between wrap gap-12">
        <div>
          <h1>Klasser</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Hur det går över tid – och vad som behöver repeteras.
          </p>
        </div>
        {!creating && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={18} /> Skapa klass
          </button>
        )}
      </div>
      {creating && <NewClass onDone={() => setCreating(false)} />}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginTop: 20 }}>
        {classes.map(({ cls, sessions: list, latest, trend }) => {
          const weak = recurringWeak(list)[0];
          return (
            <Link key={cls.id} href={`/larare/klasser/${cls.id}`} className="card card-pad card-link stack gap-12">
              <div className="row between">
                <div>
                  <h2 style={{ fontSize: "1.35rem" }}>{cls.name}</h2>
                  <span className="muted" style={{ fontSize: "0.88rem" }}>
                    {cls.subject} · {cls.students} elever
                  </span>
                </div>
                <Icon name="chevronRight" size={20} style={{ color: "var(--ink-4)" }} />
              </div>
              {list.length ? (
                <>
                  <div className="row gap-12" style={{ alignItems: "flex-end" }}>
                    <div>
                      <div className="num" style={{ fontSize: "2rem", lineHeight: 1 }}>
                        {pct(latest ?? 0)}
                      </div>
                      <div className="muted" style={{ fontSize: "0.82rem" }}>
                        rätt senaste lektionen
                      </div>
                    </div>
                    <span className="grow" />
                    <Sparkline values={list.map(classAccuracy)} width={110} height={36} />
                  </div>
                  <div className="row gap-8 wrap">
                    <Trend value={trend} />
                    <span className="chip">
                      {list.length} {list.length === 1 ? "lektion" : "lektioner"}
                    </span>
                  </div>
                  {weak && (
                    <p style={{ fontSize: "0.88rem", color: "#8a4b05", fontWeight: 600 }}>
                      Återkommer som svårt: {weak.concept}
                    </p>
                  )}
                  <p className="muted" style={{ fontSize: "0.8rem" }}>
                    Senast {formatDate(list[list.length - 1].date)}
                  </p>
                </>
              ) : (
                <div className="stack gap-8">
                  <p className="muted">Inga lektioner än. Välj klassen när du startar ett spel så sparas resultaten här.</p>
                  {custom.some((c) => c.id === cls.id) && (
                    <button
                      className="btn btn-sm btn-ghost"
                      style={{ alignSelf: "flex-start" }}
                      onClick={(e) => {
                        e.preventDefault();
                        if (window.confirm(`Ta bort ${cls.name}?`)) removeClass(cls.id);
                      }}
                    >
                      <Icon name="trash" size={15} /> Ta bort
                    </button>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}

const SUBJECTS = ["SO", "NO", "Matematik", "Svenska", "Engelska", "Slöjd", "Moderna språk", "Övrigt"];

function NewClass({ onDone }: { onDone: () => void }) {
  const addClass = useStore((x) => x.addClass);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("SO");
  const [students, setStudents] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError("Ge klassen ett namn, till exempel 7C.");
    const c = checkText(n);
    if (!c.ok) return setError("Välj ett annat namn.");
    addClass({ name: n.slice(0, 40), subject, students: Math.max(1, Math.min(60, students)) });
    onDone();
  };
  return (
    <form className="card card-pad" onSubmit={submit} style={{ marginTop: 18, display: "grid", gap: 14 }} aria-label="Skapa klass">
      <h2 style={{ fontSize: "1.2rem" }}>Ny klass</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <label className="field">
          <span className="label">Namn</span>
          <input className="input" value={name} autoFocus placeholder="T.ex. 7C" maxLength={40} onChange={(e) => (setName(e.target.value), setError(null))} />
        </label>
        <label className="field">
          <span className="label">Ämne</span>
          <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Antal elever</span>
          <input className="input" type="number" min={1} max={60} value={students} onChange={(e) => setStudents(Number(e.target.value) || 1)} />
        </label>
      </div>
      {error && (
        <p role="alert" style={{ color: "var(--lingon-dark)", fontWeight: 600 }}>
          {error}
        </p>
      )}
      <div className="row gap-8" style={{ justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={onDone}>
          Avbryt
        </button>
        <button type="submit" className="btn btn-primary">
          <Icon name="check" size={18} /> Skapa klass
        </button>
      </div>
    </form>
  );
}
