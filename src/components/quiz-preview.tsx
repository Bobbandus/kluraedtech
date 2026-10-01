"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { OPT_COLORS, OPT_KEYS } from "./game/parts";
import type { Question } from "@/data/quizzes";

/** Förhandsvisning: så här ser frågan ut på elevens skärm. */
export function QuizPreview({ title, questions, onClose }: { title: string; questions: Question[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = questions[i];
  if (!q) return null;
  const go = (d: number) => {
    setI((x) => Math.min(questions.length - 1, Math.max(0, x + d)));
    setPicked(null);
  };
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="pv-t" style={{ width: "min(720px, 100%)", background: "var(--paper)" }} onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ padding: "16px 20px", borderBottom: "2px solid var(--line)" }}>
          <div>
            <div className="eyebrow">Förhandsvisning · elevens skärm</div>
            <div id="pv-t" style={{ fontWeight: 700 }}>
              {title}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Stäng" autoFocus>
            <Icon name="x" size={20} />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <div className="row between" style={{ fontWeight: 650, fontSize: "0.9rem" }}>
            <span className="chip">
              Fråga {i + 1} av {questions.length}
            </span>
            <span className="chip">
              <Icon name="clock" size={14} /> {q.time} s
            </span>
          </div>
          <div className="card" style={{ marginTop: 14, padding: "22px 18px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 850, fontSize: "1.35rem", lineHeight: 1.25 }}>{q.text || "Frågan saknar text"}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginTop: 12 }}>
            {q.options.map((o, k) => {
              const right = picked !== null && k === q.correct;
              const wrong = picked === k && k !== q.correct;
              return (
                <button
                  key={k}
                  onClick={() => setPicked(k)}
                  disabled={picked !== null}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minHeight: 60,
                    padding: "10px 12px",
                    borderRadius: 16,
                    border: `2px solid ${right ? "var(--ok)" : wrong ? "var(--lingon)" : "var(--line-2)"}`,
                    background: right ? "var(--ok-tint)" : wrong ? "var(--lingon-tint)" : "var(--card)",
                    textAlign: "left",
                    fontWeight: 600,
                  }}
                >
                  <span style={{ width: 36, height: 36, flex: "none", borderRadius: 10, background: OPT_COLORS[k], color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 900 }}>{OPT_KEYS[k]}</span>
                  {o || <em className="muted">Tomt alternativ</em>}
                </button>
              );
            })}
          </div>
          <p className="muted" style={{ minHeight: 48, marginTop: 12, fontSize: "0.92rem" }} aria-live="polite">
            {picked !== null ? (q.explanation ? `Förklaring: ${q.explanation}` : "Ingen förklaring – lägg gärna till en, eleverna ser den efter svaret.") : "Klicka på ett alternativ för att se feedbacken."}
          </p>
          <div className="row between">
            <button className="btn" onClick={() => go(-1)} disabled={i === 0}>
              <Icon name="arrowLeft" size={18} /> Föregående
            </button>
            <button className="btn btn-primary" onClick={() => go(1)} disabled={i === questions.length - 1}>
              Nästa <Icon name="arrowRight" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
