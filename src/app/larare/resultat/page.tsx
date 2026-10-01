"use client";

import Link from "next/link";
import { CoverArt } from "@/components/cover";
import { Icon } from "@/components/icons";
import { AccuracyRing } from "@/components/teacher-ui";
import { ENERGY } from "@/lib/game/engine";
import { useHydrated } from "@/lib/store";
import { useSessions } from "@/lib/quizzes";
import { classAccuracy, conceptStats, formatDate } from "@/lib/results";
import s from "@/components/teacher.module.css";

export default function Results() {
  const hydrated = useHydrated();
  const sessions = useSessions();
  if (!hydrated) return <main className="page" />;
  return (
    <main id="innehall" className="page" style={{ maxWidth: 1000 }}>
      <h1>Resultat</h1>
      <p className="muted" style={{ marginTop: 4 }}>
        Varje lektion sparas med vad klassen kunde – och vad som behöver repeteras.
      </p>
      <div style={{ marginTop: 20 }}>
        {sessions.map((r) => {
          const weak = conceptStats(r).filter((c) => c.accuracy < 0.7).slice(0, 2);
          return (
            <Link key={r.id} href={`/larare/resultat/${r.id}`} className={`${s.listRow} card-link`} style={{ gridTemplateColumns: "96px 1fr auto" }}>
              <div className={s.thumb} style={{ width: "100%" }}>
                <CoverArt subject={r.subject} rounded={12} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className={s.qTitle}>{r.quizTitle}</div>
                <div className={s.meta}>
                  <span>
                    <Icon name="users" size={14} /> {r.className} · {r.players.length} elever
                  </span>
                  <span>{formatDate(r.date, true)}</span>
                  <span>{ENERGY[r.energy].label}</span>
                </div>
                {weak.length > 0 && (
                  <div className="row gap-8 wrap" style={{ marginTop: 6 }}>
                    {weak.map((w) => (
                      <span key={w.concept} className="chip chip-warn">
                        Repetera: {w.concept}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <AccuracyRing value={classAccuracy(r)} size={56} />
            </Link>
          );
        })}
      </div>
    </main>
  );
}
