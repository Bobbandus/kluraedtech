"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { Sparkline, Trend } from "@/components/charts";
import { useHydrated } from "@/lib/store";
import { useSessions } from "@/lib/quizzes";
import { classesFrom, recurringWeak } from "@/lib/classes";
import { classAccuracy, formatDate, pct } from "@/lib/results";

export default function Classes() {
  const hydrated = useHydrated();
  const sessions = useSessions();
  if (!hydrated) return <main className="page" />;
  const classes = classesFrom(sessions);
  return (
    <main id="innehall" className="page" style={{ maxWidth: 1000 }}>
      <h1>Klasser</h1>
      <p className="muted" style={{ marginTop: 4 }}>
        Hur det går över tid – och vad som behöver repeteras.
      </p>
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
                <p className="muted">Inga lektioner än.</p>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
