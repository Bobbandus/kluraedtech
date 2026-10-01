import { Avatar } from "./avatar";

/** Stigen uppför fjället, i viewBox 0 0 400 300. */
const PATH: [number, number][] = [
  [40, 268],
  [120, 250],
  [92, 214],
  [176, 196],
  [148, 158],
  [222, 140],
  [196, 106],
  [246, 84],
  [262, 52],
];

export function pointOnTrail(t: number): [number, number] {
  const c = Math.min(1, Math.max(0, t));
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < PATH.length; i++) {
    const l = Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]);
    lens.push(l);
    total += l;
  }
  let d = c * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) {
      const k = d / lens[i];
      return [PATH[i][0] + (PATH[i + 1][0] - PATH[i][0]) * k, PATH[i][1] + (PATH[i + 1][1] - PATH[i][1]) * k];
    }
    d -= lens[i];
  }
  return PATH[PATH.length - 1];
}

export interface Climber {
  id: string;
  skin: string;
  t: number;
  highlight?: boolean;
  label?: string;
}

/** Fjällscen. Används på startsidan, i lobbyn och som progressionsvy. */
export function MountainScene({ climbers = [], className, night = false }: { climbers?: Climber[]; className?: string; night?: boolean }) {
  const trail = PATH.map((p) => p.join(",")).join(" ");
  return (
    <svg viewBox="0 0 400 300" className={className} style={{ width: "100%", height: "auto", overflow: "visible" }} aria-hidden="true">
      <defs>
        <clipPath id="ms-clip">
          <rect x="0" y="0" width="400" height="300" rx="28" />
        </clipPath>
      </defs>
      <g clipPath="url(#ms-clip)">
        <rect width="400" height="300" fill={night ? "#173a33" : "#dcefe7"} />
        <circle cx="330" cy="62" r="26" fill={night ? "#f8f5ef" : "#ffc93c"} opacity={night ? 0.9 : 1} />
        {/* bakre fjäll */}
        <path d="M-10 230 L70 140 L120 190 L190 110 L250 170 L330 100 L420 200 V300 H-10 Z" fill={night ? "#1f4d43" : "#b5dccb"} />
        {/* huvudfjället */}
        <path d="M0 300 L0 270 L150 150 L262 40 L300 78 L330 66 L410 160 L410 300 Z" fill={night ? "#2a6455" : "#7cc2a3"} />
        <path d="M262 40 L300 78 L330 66 L352 92 L318 100 L296 118 L272 96 L240 110 L226 88 Z" fill="#f8f5ef" />
        <path d="M0 300 L0 270 L150 150 L262 40 L226 88 L200 130 L150 190 L60 260 Z" fill={night ? "#245a4c" : "#6ab595"} />
        {/* skog */}
        {[18, 44, 70, 300, 326, 352, 378].map((x, i) => (
          <path key={x} d={`M${x} ${282 - (i % 3) * 6} l12 -30 l12 30 z`} fill={night ? "#123b31" : "#12735a"} />
        ))}
        {/* stig */}
        <polyline points={trail} fill="none" stroke="#fff" strokeWidth="5" strokeDasharray="2 10" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
        {/* toppflagga */}
        <path d="M262 52 V20" stroke="#1b2422" strokeWidth="3" strokeLinecap="round" />
        <path d="M263.5 20 L284 27 L263.5 34 Z" fill="#ff9b21" />
        <rect x="0" y="286" width="400" height="14" fill={night ? "#123b31" : "#5aa585"} />
      </g>
      {climbers.map((c) => {
        const [x, y] = pointOnTrail(c.t);
        const size = c.highlight ? 44 : 32;
        return (
          <g key={c.id} style={{ transition: "transform 0.9s cubic-bezier(.2,.8,.2,1)" }} transform={`translate(${x - size / 2} ${y - size + 4})`}>
            {c.highlight && <circle cx={size / 2} cy={size / 2 + 2} r={size / 2 + 4} fill="#fff" stroke="#ff9b21" strokeWidth="3" />}
            <Avatar skin={c.skin} size={size} />
            {c.label && (
              <text x={size / 2} y={-6} textAnchor="middle" fontSize="12" fontWeight="800" fill="#1b2422" stroke="#fff" strokeWidth="4" paintOrder="stroke" fontFamily="var(--font-display)">
                {c.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
