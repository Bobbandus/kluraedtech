"use client";

import { useEffect, useState } from "react";
import { Avatar } from "./avatar";
import { GnistaIcon } from "./brand";
import { useHydrated, useStore } from "@/lib/store";
import s from "./alpha-gift.module.css";

/**
 * Visas en gång för alla som spelar under early alpha:
 * de får den exklusiva figuren Pionjären.
 */
export function AlphaGift() {
  const hydrated = useHydrated();
  const seen = useStore((x) => x.student.alphaGiftSeen);
  const dismiss = useStore((x) => x.dismissAlphaGift);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hydrated || seen) return;
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, [hydrated, seen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss(false);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!open) return null;
  const close = (equip: boolean) => {
    dismiss(equip);
    setOpen(false);
  };

  return (
    <div className="backdrop" onClick={() => close(false)}>
      <div className={s.card} role="dialog" aria-modal="true" aria-labelledby="alpha-title" onClick={(e) => e.stopPropagation()}>
        <div className={s.stage}>
          <div className={s.rays} aria-hidden="true" />
          <div className={s.burst} aria-hidden="true">
            {Array.from({ length: 14 }, (_, i) => {
              const a = (i / 14) * Math.PI * 2;
              return (
                <span key={i} style={{ ["--x" as string]: `${Math.cos(a) * 150}px`, ["--y" as string]: `${Math.sin(a) * 110}px`, animationDelay: `${0.3 + (i % 3) * 0.08}s` }}>
                  <GnistaIcon size={18} />
                </span>
              );
            })}
          </div>
          <Avatar skin="pionjar" size={190} className={`${s.hero} avatar-hero`} title="Pionjären" />
        </div>
        <div className={s.body}>
          <span className={s.badge}>Early alpha · exklusiv</span>
          <h2 id="alpha-title" className={s.title}>
            Tack för att du är med från början
          </h2>
          <p className={s.text}>
            Du får <strong>Pionjären</strong> – en figur som bara de första spelarna någonsin kommer att ha. Den går inte att köpa och kommer aldrig tillbaka.
          </p>
          <div className={s.actions}>
            <button className="btn btn-accent btn-lg btn-block" onClick={() => close(true)} autoFocus>
              Använd Pionjären
            </button>
            <button className={s.later} onClick={() => close(false)}>
              Kanske senare
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
