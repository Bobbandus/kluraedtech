"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StudentNav } from "@/components/nav";
import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icons";
import { GnistaIcon } from "@/components/brand";
import { CountUp } from "@/components/game/parts";
import { useHydrated, useStore, levelFromXp } from "@/lib/store";

export default function StudentResult() {
  const hydrated = useHydrated();
  const st = useStore((x) => x.student);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!hydrated) return;
    const ts = [setTimeout(() => setStep(1), 500), setTimeout(() => setStep(2), 1300), setTimeout(() => setStep(3), 2000)];
    return () => ts.forEach(clearTimeout);
  }, [hydrated]);

  if (!hydrated) return <StudentNav />;
  const m = st.lastMatch;
  if (!m) {
    return (
      <>
        <StudentNav />
        <main id="innehall" className="page page-narrow" style={{ textAlign: "center" }}>
          <Avatar skin={st.skinId} size={96} style={{ margin: "40px auto 0" }} />
          <h1 style={{ marginTop: 16 }}>Inga resultat än</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            När du har spelat en match hamnar resultatet här.
          </p>
          <Link href="/spela" className="btn btn-primary btn-lg" style={{ marginTop: 20 }}>
            Gå med i ett spel
          </Link>
        </main>
      </>
    );
  }
  const acc = m.questions ? Math.round((m.correct / m.questions) * 100) : 0;
  const total = m.earned.reduce((a, b) => a + b.amount, 0);
  const lvl = levelFromXp(st.xp);

  return (
    <>
      <StudentNav />
      <main id="innehall" className="page page-narrow" style={{ paddingBottom: 120 }}>
        <section className="card anim-pop" style={{ padding: "32px 22px", borderRadius: 28, textAlign: "center", overflow: "hidden", position: "relative" }}>
          <div style={{ width: 120, height: 120, margin: "0 auto", borderRadius: 34, background: m.reachedSummit ? "var(--sol-tint)" : "var(--brand-tint)", display: "grid", placeItems: "center" }}>
            <Avatar skin={st.skinId} size={96} className="anim-bob" />
          </div>
          <p className="eyebrow" style={{ marginTop: 16 }}>
            {m.quizTitle}
          </p>
          <h1 style={{ marginTop: 6 }}>
            {m.mode === "jakt" ? ((m.stars ?? 0) >= 5 ? "Polisen hängde inte med!" : m.personalBest ? "Nytt personbästa!" : "Bra kört!") : m.mode === "fjall" ? (acc >= 75 ? "Stugan stod pall!" : m.personalBest ? "Nytt personbästa!" : "Bra försvarat!") : m.reachedSummit ? "Du nådde toppen!" : acc >= 70 ? "Starkt klättrat!" : m.personalBest ? "Nytt personbästa!" : "Bra kämpat!"}
          </h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {m.mode === "jakt"
              ? `${m.rank <= m.total / 2 ? `Plats ${m.rank} av ${m.total} · ` : ""}${m.score.toLocaleString("sv-SE")} poäng · ★ ${m.stars ?? 0}`
              : m.mode === "fjall"
              ? `${m.rank <= m.total / 2 ? `Plats ${m.rank} av ${m.total} · ` : ""}${m.wave ?? 0} vågor · ${m.score.toLocaleString("sv-SE")} poäng`
              : m.rank <= m.total / 2
                ? `Plats ${m.rank} av ${m.total} · ${m.score.toLocaleString("sv-SE")} m`
                : `Du klättrade ${m.score.toLocaleString("sv-SE")} m`}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 22 }}>
            {[
              { v: m.mode === "fjall" || m.mode === "jakt" ? String(m.correct) : `${m.correct}/${m.questions}`, l: "rätt svar" },
              { v: `${acc} %`, l: "träffsäkerhet" },
              { v: String(m.bestStreak), l: "längsta rad" },
            ].map((x) => (
              <div key={x.l} style={{ padding: "14px 8px", borderRadius: 18, background: "var(--paper)" }}>
                <div className="num" style={{ fontSize: "1.6rem" }}>
                  {x.v}
                </div>
                <div className="muted" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                  {x.l}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card card-pad" style={{ marginTop: 14, opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? "none" : "translateY(10px)", transition: "all .4s var(--ease-out)" }}>
          <div className="row between">
            <h2 style={{ fontSize: "1.15rem" }}>Intjänat</h2>
            <span className="row gap-4 num" style={{ fontSize: "1.5rem", color: "var(--hjortron-dark)" }}>
              +<CountUp value={step >= 1 ? total : 0} duration={900} />
              <GnistaIcon size={24} />
            </span>
          </div>
          <div className="stack gap-8" style={{ marginTop: 12 }}>
            {m.earned.map((e) => (
              <div key={e.label} className="row between" style={{ fontSize: "0.95rem" }}>
                <span className="muted">{e.label}</span>
                <span style={{ fontWeight: 650 }}>+{e.amount}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="row between" style={{ fontSize: "0.9rem" }}>
              <strong>Nivå {lvl.level}</strong>
              <span className="muted">+{m.xp} XP</span>
            </div>
            <div className="bar" style={{ marginTop: 6 }}>
              <span style={{ width: step >= 2 ? `${(lvl.into / lvl.need) * 100}%` : "0%", background: "var(--fjall)" }} />
            </div>
          </div>
        </section>

        {m.missed.length > 0 && (
          <section className="card card-pad" style={{ marginTop: 14, opacity: step >= 3 ? 1 : 0, transition: "opacity .4s" }}>
            <h2 style={{ fontSize: "1.15rem" }}>Värt att kolla igen</h2>
            <p className="muted" style={{ fontSize: "0.92rem", marginTop: 2 }}>
              Frågorna du missade, med rätt svar.
            </p>
            <div className="stack gap-12" style={{ marginTop: 14 }}>
              {m.missed.slice(0, 5).map((x) => (
                <div key={x.text} style={{ padding: 14, borderRadius: 16, background: "var(--paper)" }}>
                  <div style={{ fontWeight: 650 }}>{x.text}</div>
                  <div className="row gap-8 wrap" style={{ marginTop: 8 }}>
                    <span className="chip chip-ok">
                      <Icon name="check" size={14} stroke={3} /> {x.answer}
                    </span>
                    {x.yours && (
                      <span className="chip chip-err">
                        <Icon name="x" size={14} stroke={3} /> {x.yours}
                      </span>
                    )}
                    {!x.yours && <span className="chip">Inget svar</span>}
                  </div>
                  {x.explanation && (
                    <p className="muted" style={{ marginTop: 8, fontSize: "0.92rem" }}>
                      {x.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="row gap-12 wrap" style={{ marginTop: 20 }}>
          <Link href={`/spela/${m.code}`} className="btn btn-primary btn-lg grow">
            <Icon name="repeat" size={20} /> Spela igen
          </Link>
          <Link href="/butik" className="btn btn-lg grow">
            <GnistaIcon size={20} /> Till butiken
          </Link>
        </div>
      </main>
    </>
  );
}
