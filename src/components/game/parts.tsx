import { useEffect, useRef, useState } from "react";

export const OPT_COLORS = ["var(--opt-a)", "var(--opt-b)", "var(--opt-c)", "var(--opt-d)", "var(--ljung)", "var(--ink-2)"];
export const OPT_KEYS = ["A", "B", "C", "D", "E", "F"];

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
