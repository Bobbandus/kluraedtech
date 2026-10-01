import type { Energy } from "@/lib/game/engine";

/** Små illustrationer för klassrumsenergi: vågor som blir högre. */
export function EnergyIllu({ level, size = 64 }: { level: Energy; size?: number }) {
  const amp = level === "lugn" ? 4 : level === "standard" ? 9 : 15;
  const color = level === "lugn" ? "#2f6cc9" : level === "standard" ? "#12735a" : "#e0533f";
  const bg = level === "lugn" ? "#e5eefb" : level === "standard" ? "#e2f1ea" : "#fdeae7";
  const wave = (y: number) => `M6 ${y} q 9 ${-amp} 18 0 t 18 0 t 18 0 t 18 0`;
  return (
    <svg width={size} height={size} viewBox="0 0 84 84" aria-hidden="true">
      <rect width="84" height="84" rx="22" fill={bg} />
      <path d={wave(36)} stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d={wave(54)} stroke={color} strokeWidth="5" fill="none" strokeLinecap="round" opacity=".45" />
    </svg>
  );
}
