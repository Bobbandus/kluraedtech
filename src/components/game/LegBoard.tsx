"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { CountUp } from "./parts";
import s from "./host.module.css";

export interface LegRow {
  id: string;
  name: string;
  skinId: string;
  score: number;
}

/**
 * Topplista i Kahoot-stil: raderna börjar på förra placeringen och glider
 * sedan till den nya. Pilar visar hur många steg man gått upp eller ner
 * och tonar bort när raden stannat.
 */
export default function LegBoard({ rows, prev, unit = "m", show = 5 }: { rows: LegRow[]; prev: Map<string, { rank: number; score: number }>; unit?: string; show?: number }) {
  const top = rows.slice(0, show);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 650);
    return () => clearTimeout(t);
  }, []);
  const ROW = 70;
  return (
    <ol className={s.legBoard} style={{ height: show * ROW }} aria-label="Topplista">
      {top.map((r, i) => {
        const before = prev.get(r.id);
        const from = before ? Math.min(before.rank, show + 0.6) : show + 0.6;
        const idx = settled ? i : from;
        const delta = before ? before.rank - i : 0;
        const medal = i === 0 ? s.gold : i === 1 ? s.silver : i === 2 ? s.bronze : "";
        return (
          <li key={r.id} className={s.legRow} style={{ transform: `translateY(${idx * ROW}px)`, opacity: settled || before ? 1 : 0, zIndex: show - i }}>
            <span className={`${s.legRank} ${medal}`}>{i + 1}</span>
            <Avatar skin={r.skinId} size={42} />
            <span className={s.legName}>{r.name}</span>
            {settled && delta !== 0 && (
              <span className={`${s.legDelta} ${delta > 0 ? s.up : s.down}`} aria-label={delta > 0 ? `Upp ${delta}` : `Ner ${-delta}`}>
                {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
              </span>
            )}
            <span className={s.legScore}>
              {settled ? <CountUp value={r.score} duration={900} /> : (before?.score ?? 0).toLocaleString("sv-SE")} {unit}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
