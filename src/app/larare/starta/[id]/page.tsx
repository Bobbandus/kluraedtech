"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CoverArt } from "@/components/cover";
import { Icon } from "@/components/icons";
import { EnergyIllu } from "@/components/EnergyIllu";
import { ENERGY, type Energy } from "@/lib/game/engine";
import { CLASSES } from "@/data/people";
import { estimateMinutes } from "@/data/quizzes";
import { useHydrated } from "@/lib/store";
import { useQuiz } from "@/lib/quizzes";
import { newCode, saveLive } from "@/lib/live";

export default function HostSetup() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useHydrated();
  const { quiz } = useQuiz(id);
  const [energy, setEnergy] = useState<Energy>("standard");
  const [longer, setLonger] = useState(false);
  const [randomNames, setRandomNames] = useState(false);
  const [cards, setCards] = useState(true);
  const [cls, setCls] = useState("9a");
  const [starting, setStarting] = useState(false);

  if (!hydrated) return <main className="page" />;
  if (!quiz) {
    return (
      <main className="page" style={{ textAlign: "center" }}>
        <h1>Quizet hittades inte</h1>
        <Link href="/larare" className="btn" style={{ marginTop: 16 }}>
          Till översikten
        </Link>
      </main>
    );
  }

  const start = () => {
    setStarting(true);
    const code = newCode();
    const className = CLASSES.find((c) => c.id === cls)?.name;
    saveLive({ code, quiz, settings: { energy, longerTime: longer, randomNames, cards }, className, createdAt: Date.now() });
    router.push(`/larare/live?kod=${code}&klass=${cls}`);
  };


  return (
    <main id="innehall" className="page" style={{ maxWidth: 1000 }}>
      <div className="row gap-16 wrap">
        <div style={{ width: 120 }}>
          <CoverArt subject={quiz.subject} rounded={14} />
        </div>
        <div className="grow">
          <p className="eyebrow">Starta spel</p>
          <h1 style={{ fontSize: "1.8rem", marginTop: 2 }}>{quiz.title}</h1>
          <p className="muted">
            {quiz.questions.length} frågor · ca {estimateMinutes(quiz)} min
          </p>
        </div>
      </div>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: "1.25rem" }}>Hur mycket energi tål rummet idag?</h2>
        <p className="muted" style={{ marginTop: 2 }}>
          Samma quiz och poängsystem – det som ändras är hur mycket tävling som syns.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 14 }} role="radiogroup" aria-label="Klassrumsenergi">
          {(Object.keys(ENERGY) as Energy[]).map((k) => {
            const e = ENERGY[k];
            const on = energy === k;
            return (
              <button
                key={k}
                role="radio"
                aria-checked={on}
                onClick={() => setEnergy(k)}
                className="card"
                style={{
                  padding: 18,
                  textAlign: "left",
                  borderColor: on ? "var(--ink)" : undefined,
                  boxShadow: on ? "0 4px 0 var(--ink)" : "0 4px 0 var(--line)",
                  transform: on ? "translateY(-2px)" : undefined,
                  transition: "all .15s var(--ease-out)",
                }}
              >
                <div className="row between">
                  <EnergyIllu level={k} size={56} />
                  <span
                    aria-hidden="true"
                    style={{ width: 26, height: 26, borderRadius: 13, border: `2px solid ${on ? "var(--ink)" : "var(--line-2)"}`, background: on ? "var(--ink)" : "transparent", color: "#fff", display: "grid", placeItems: "center" }}
                  >
                    {on && <Icon name="check" size={14} stroke={3.5} />}
                  </span>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.3rem", marginTop: 12 }}>{e.label}</div>
                <div className="muted" style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                  {e.tagline}
                </div>
                <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6, fontSize: "0.9rem" }}>
                  {e.points.map((p) => (
                    <li key={p} className="row gap-8" style={{ alignItems: "flex-start" }}>
                      <Icon name="check" size={15} stroke={3} style={{ color: "var(--brand)", marginTop: 3 }} />
                      {p}
                    </li>
                  ))}
                </ul>
                {k === "standard" && (
                  <span className="chip chip-brand" style={{ marginTop: 12 }}>
                    Rekommenderas
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginTop: 24 }}>
        <section className="card card-pad">
          <h2 style={{ fontSize: "1.1rem", marginBottom: 6 }}>Inställningar</h2>
          <Toggle checked={longer} onChange={setLonger} title="Längre betänketid" text="+50 % tid på varje fråga. Bra för nya begrepp eller elever som läser långsammare." />
          <Toggle checked={cards} onChange={setCards} title="Spelkort mellan etapper" text="Eleverna väljer sköld, medvind, fokus m.m. Påverkar aldrig redan intjänad höjd." />
          <Toggle checked={randomNames} onChange={setRandomNames} title="Slumpade namn" text="Eleverna får namn som ”Klok Kotte”. Stoppar olämpliga smeknamn." />
        </section>
        <section className="card card-pad">
          <h2 style={{ fontSize: "1.1rem" }}>Klass</h2>
          <p className="muted" style={{ fontSize: "0.9rem", marginTop: 2 }}>
            Resultatet sparas på klassen så att du kan följa utvecklingen.
          </p>
          <div className="stack gap-8" style={{ marginTop: 12 }} role="radiogroup" aria-label="Klass">
            {CLASSES.map((c) => (
              <label key={c.id} className="row gap-12" style={{ padding: "10px 12px", borderRadius: 14, border: `2px solid ${cls === c.id ? "var(--brand)" : "var(--line)"}`, background: cls === c.id ? "var(--brand-tint)" : "var(--card)", cursor: "pointer" }}>
                <input type="radio" name="klass" checked={cls === c.id} onChange={() => setCls(c.id)} style={{ accentColor: "var(--brand)", width: 18, height: 18 }} />
                <span className="grow" style={{ fontWeight: 650 }}>
                  {c.name}
                </span>
                <span className="muted" style={{ fontSize: "0.85rem" }}>
                  {c.students} elever
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className="row gap-12 wrap" style={{ marginTop: 24, justifyContent: "flex-end" }}>
        <Link href={`/larare/quiz/${quiz.id}`} className="btn btn-lg">
          Avbryt
        </Link>
        <button className="btn btn-primary btn-lg" onClick={start} disabled={starting}>
          <Icon name="play" size={20} /> {starting ? "Öppnar lobbyn…" : "Öppna lobbyn"}
        </button>
      </div>
    </main>
  );
}

function Toggle({ checked, onChange, title, text }: { checked: boolean; onChange: (v: boolean) => void; title: string; text: string }) {
return (
  <label className="row gap-12" style={{ padding: "14px 0", borderTop: "2px solid var(--line)", cursor: "pointer", alignItems: "flex-start" }}>
    <span className="grow">
      <strong style={{ display: "block" }}>{title}</strong>
      <span className="muted" style={{ fontSize: "0.9rem" }}>
        {text}
      </span>
    </span>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 24, height: 24, accentColor: "var(--brand)", marginTop: 2 }} />
  </label>
);
}
