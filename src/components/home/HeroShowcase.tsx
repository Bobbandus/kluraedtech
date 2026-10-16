"use client";

import { useEffect, useState } from "react";
import ChasePreview from "@/components/game/chase/ChasePreview";
import PenaltyPreview from "@/components/game/penalty/PenaltyPreview";
import SlalomPreview from "@/components/game/slalom/SlalomPreview";
import FishPreview from "@/components/game/fishing/FishPreview";
import DefensePreview from "@/components/game/defense/DefensePreview";
import { MountainScene } from "@/components/scene";
import { Icon } from "@/components/icons";
import { MODE_INFO } from "@/lib/modes";
import type { GameMode } from "@/lib/rooms/types";
import s from "./hero.module.css";

const SLIDES: { mode: GameMode; card: string }[] = [
  { mode: "jakt", card: "Rätt svar – ×1,5 i poäng" },
  { mode: "straff", card: "Rätt svar – straff! MÅL +150" },
  { mode: "slalom", card: "Kunskapsport: rätt! ×3" },
  { mode: "fiske", card: "Rätt svar – längre lina" },
  { mode: "fjall", card: "Rätt svar – +20 virke" },
  { mode: "topptur", card: "Rätt! +118 m" },
];

function Preview({ mode }: { mode: GameMode }) {
  if (mode === "jakt") return <ChasePreview />;
  if (mode === "straff") return <PenaltyPreview />;
  if (mode === "slalom") return <SlalomPreview />;
  if (mode === "fiske") return <FishPreview />;
  if (mode === "fjall") return <DefensePreview />;
  return (
    <div style={{ aspectRatio: "3 / 2", background: "#dcefe7" }}>
      <MountainScene
        climbers={[
          { id: "a", skin: "kassetten", t: 0.08 },
          { id: "b", skin: "flugis", t: 0.27 },
          { id: "c", skin: "mosse", t: 0.46, highlight: true },
          { id: "d", skin: "raven", t: 0.66 },
          { id: "e", skin: "isbiten", t: 0.84 },
        ]}
      />
    </div>
  );
}

/** Startsidans bild: växlar mellan spellägena med en levande förhandsvisning. */
export default function HeroShowcase() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setI((n) => (n + 1) % SLIDES.length), 6000);
    return () => clearTimeout(t);
  }, [i, paused]);
  const slide = SLIDES[i];
  return (
    <div className={s.wrap} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className={s.frame}>
        <div key={slide.mode} className={s.slide}>
          <Preview mode={slide.mode} />
        </div>
        <div key={`c-${slide.mode}`} className={s.card}>
          <span className={s.check}>
            <Icon name="check" size={16} stroke={3} />
          </span>
          {slide.card}
        </div>
      </div>
      <div className={s.tabs} role="tablist" aria-label="Spellägen">
        {SLIDES.map((x, k) => (
          <button key={x.mode} role="tab" aria-selected={k === i} aria-label={MODE_INFO[x.mode].name} title={MODE_INFO[x.mode].name} className={s.tab} onClick={() => setI(k)}>
            <Icon name={MODE_INFO[x.mode].icon} size={15} />
            <span>{MODE_INFO[x.mode].name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
