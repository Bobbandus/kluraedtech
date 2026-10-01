"use client";

import Link from "next/link";
import { CoverArt, SUBJECTS } from "./cover";
import { Avatar } from "./avatar";
import { Icon } from "./icons";
import { creatorById, estimateMinutes, type Quiz } from "@/data/quizzes";
import { useStore } from "@/lib/store";
import s from "./teacher.module.css";

export function AccuracyRing({ value, size = 48, stroke = 6 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 0.75 ? "var(--ok)" : value >= 0.55 ? "var(--hjortron)" : "var(--lingon)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={s.ring} role="img" aria-label={`${Math.round(value * 100)} procent rätt`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--paper-2)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * value} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize={size * 0.27} fill="var(--ink)">
        {Math.round(value * 100)}
      </text>
    </svg>
  );
}

export function fmtPlays(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(".", ",")} tn` : String(n);
}

export function MarketCard({ quiz }: { quiz: Quiz }) {
  const fav = useStore((x) => x.teacher.favorites.includes(quiz.id));
  const toggle = useStore((x) => x.toggleFavorite);
  const c = creatorById(quiz.creatorId);
  const mine = quiz.creatorId === "sara";
  return (
    <div className={s.mcard}>
      <Link href={`/larare/quiz/${quiz.id}`} style={{ display: "contents" }}>
        <CoverArt subject={quiz.subject} motif={quiz.cover} />
        <div className={s.mcardBody}>
          <div className="row gap-8 wrap">
            <span className="chip" style={{ background: SUBJECTS[quiz.subject].bg, color: SUBJECTS[quiz.subject].fg }}>
              {SUBJECTS[quiz.subject].label}
            </span>
            <span className="chip">{quiz.level}</span>
            {mine && <span className="chip chip-brand">Ditt quiz</span>}
          </div>
          <div className={s.mcardTitle}>{quiz.title}</div>
          <div className={s.meta}>
            <span>
              <Icon name="grid" size={14} /> {quiz.questions.length} frågor
            </span>
            <span>
              <Icon name="clock" size={14} /> ca {estimateMinutes(quiz)} min
            </span>
            {quiz.plays ? (
              <span>
                <Icon name="play" size={14} /> {fmtPlays(quiz.plays)}
              </span>
            ) : null}
          </div>
          <div className={s.creator}>
            <Avatar skin={c.skin} size={22} />
            {c.name}
            {c.verified && (
              <span title="Verifierad skapare" style={{ color: "var(--fjall)" }}>
                <Icon name="check" size={14} stroke={3} />
              </span>
            )}
          </div>
        </div>
      </Link>
      {!mine && (
      <button className={s.fav} aria-pressed={fav} aria-label={fav ? "Ta bort från sparade" : "Spara quiz"} onClick={() => toggle(quiz.id)}>
        <Icon name="bookmark" size={18} />
      </button>
      )}
    </div>
  );
}
