import { useEffect, useRef, useState } from "react";
import type { CardId } from "@/lib/game/engine";
import { Icon, type IconName } from "@/components/icons";

export const OPT_COLORS = ["var(--opt-a)", "var(--opt-b)", "var(--opt-c)", "var(--opt-d)", "var(--ljung)", "var(--ink-2)"];
export const OPT_KEYS = ["A", "B", "C", "D", "E", "F"];

export const CARD_STYLE: Record<CardId, { icon: IconName; bg: string; fg: string }> = {
  skold: { icon: "shield", bg: "var(--fjall-tint)", fg: "var(--fjall-dark)" },
  medvind: { icon: "wind", bg: "var(--brand-tint)", fg: "var(--brand-dark)" },
  fokus: { icon: "focus", bg: "var(--ljung-tint)", fg: "var(--ljung)" },
  andrum: { icon: "hourglass", bg: "var(--sol-tint)", fg: "#7a5600" },
  duell: { icon: "duel", bg: "var(--hjortron-tint)", fg: "#9a530a" },
  kapa: { icon: "hook", bg: "var(--lingon-tint)", fg: "var(--lingon-dark)" },
};

export function CardIcon({ id, size = 60, className }: { id: CardId; size?: number; className?: string }) {
  const st = CARD_STYLE[id];
  return (
    <span className={className} style={{ width: size, height: size, borderRadius: size * 0.3, background: st.bg, color: st.fg, display: "grid", placeItems: "center", flex: "none" }}>
      <Icon name={st.icon} size={size * 0.5} />
    </span>
  );
}

/** Räknar mjukt upp till ett nytt värde. */
export function CountUp({ value, duration = 700 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const reduce = typeof window !== "undefined" && (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduced");
    if (reduce || a === value) {
      setShown(value);
      from.current = value;
      return;
    }
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(a + (value - a) * e));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, duration]);
  return <>{shown.toLocaleString("sv-SE")}</>;
}
