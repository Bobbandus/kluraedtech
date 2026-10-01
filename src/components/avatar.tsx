import { useId, type ReactNode } from "react";

/**
 * Klurisar – Kluras egna figurer.
 *
 * Gemensamt formspråk:
 *  - tunn mörk kontur runt hela silhuetten (läsbar även i 30 px)
 *  - innerskugga nedtill till höger + smalt kantljus uppe till vänster
 *  - stora ögon med kant, två glansprickar och ibland rosiga kinder
 *  - mjuk markskugga med gradient
 *
 * Allt är ren SVG i viewBox 0 0 100 100 utan externa resurser, så samma
 * markup kan renderas till data-URI för canvas (se ClimbScene).
 */

type U = (s: string) => string;

interface Tone {
  fill: string;
  shade: string;
  light: string;
  line: string;
}

const T: Record<string, Tone> = {
  stone: { fill: "#a3aeaa", shade: "#73807c", light: "#d6dedb", line: "#47524f" },
  moss: { fill: "#55b067", shade: "#2f8046", light: "#9be0a5", line: "#1d5530" },
  cone: { fill: "#a86d3c", shade: "#77461f", light: "#dda56c", line: "#45270f" },
  bun: { fill: "#e1a15a", shade: "#b06f2e", light: "#f8d19a", line: "#6b3d12" },
  ice: { fill: "#aee2f5", shade: "#6fb6d8", light: "#f1fcff", line: "#3a7fa2" },
  cloud: { fill: "#f2f7fd", shade: "#bcd0ea", light: "#ffffff", line: "#7891b3" },
  cactus: { fill: "#4aa765", shade: "#2b7744", light: "#8ad79a", line: "#1a4f2d" },
  pot: { fill: "#d2734a", shade: "#a04e2b", light: "#f0a07a", line: "#5e2a12" },
  shroom: { fill: "#df4b3f", shade: "#a52c24", light: "#ff8a7a", line: "#5e1712" },
  stem: { fill: "#f6eddb", shade: "#d8c6a4", light: "#ffffff", line: "#7a6545" },
  tape: { fill: "#34423f", shade: "#1d2725", light: "#5c6e69", line: "#101614" },
  lantern: { fill: "#2f3b38", shade: "#1a2220", light: "#55665f", line: "#0e1412" },
  moth: { fill: "#cdbb9f", shade: "#a08a6c", light: "#efe3cd", line: "#5a4a35" },
  mothBody: { fill: "#efe4d0", shade: "#cbb898", light: "#ffffff", line: "#5a4a35" },
  octo: { fill: "#9c76e2", shade: "#6c47b5", light: "#cdb5ff", line: "#3a2373" },
  fox: { fill: "#ec7a33", shade: "#b9531a", light: "#ffb07a", line: "#5a2508" },
  gem: { fill: "#5ccbc4", shade: "#2f9c96", light: "#c8f6f2", line: "#145e5a" },
  dala: { fill: "#cf3b2f", shade: "#9b241b", light: "#f2745f", line: "#4f0f0a" },
  comet: { fill: "#ffa02b", shade: "#d06f0b", light: "#ffd88c", line: "#6e3500" },
  sun: { fill: "#ffa425", shade: "#da770b", light: "#ffde8a", line: "#6e3a00" },
  yeti: { fill: "#f4f1ea", shade: "#cfc8b8", light: "#ffffff", line: "#5e584c" },
  night: { fill: "#25386f", shade: "#16244c", light: "#4a63a8", line: "#0b1430" },
  gnomeHat: { fill: "#d8463a", shade: "#a42c22", light: "#ff8173", line: "#57130d" },
  beard: { fill: "#fbf7ef", shade: "#ddd3c1", light: "#ffffff", line: "#776b58" },
  pion: { fill: "#233a63", shade: "#142445", light: "#4f6fa8", line: "#0a1428" },
};

const INK = "#1b2422";

/** Kropp med kontur, innerskugga och kantljus. `d` kan innehålla flera delbanor. */
function Body({ u, k, d, t, sx = -3, sy = -5, rim = 2.6, children }: { u: U; k: string; d: string; t: Tone; sx?: number; sy?: number; rim?: number; children?: ReactNode }) {
  const clip = u(`c-${k}`);
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={t.line} stroke={t.line} strokeWidth={5} strokeLinejoin="round" />
      <g clipPath={`url(#${clip})`}>
        <rect x="-10" y="-10" width="120" height="120" fill={t.shade} />
        <path d={d} fill={t.fill} transform={`translate(${sx} ${sy})`} />
        <path d={d} fill="none" stroke={t.light} strokeWidth={rim} opacity={0.75} transform={`translate(${-sx * 0.55} ${-sy * 0.55})`} />
        {children}
      </g>
    </g>
  );
}

function Ground({ u, y = 92, w = 30 }: { u: U; y?: number; w?: number }) {
  const id = u("g");
  return (
    <g>
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor="#1b2422" stopOpacity="0.28" />
          <stop offset="1" stopColor="#1b2422" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy={y} rx={w} ry={5} fill={`url(#${id})`} />
    </g>
  );
}

function Eye({ x, y, r = 7.5, look = 0.9, line = INK, sclera = "#fff", pupil = INK }: { x: number; y: number; r?: number; look?: number; line?: string; sclera?: string; pupil?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={sclera} stroke={line} strokeWidth={1.6} />
      <circle cx={x + look} cy={y + r * 0.12} r={r * 0.56} fill={pupil} />
      <circle cx={x + look + r * 0.2} cy={y - r * 0.15} r={r * 0.2} fill="#fff" />
      <circle cx={x + look - r * 0.2} cy={y + r * 0.3} r={r * 0.09} fill="#fff" opacity={0.85} />
    </g>
  );
}

function Eyes({ y = 50, gap = 15, cx = 50, r = 7.5, look = 0.9, line = INK }: { y?: number; gap?: number; cx?: number; r?: number; look?: number; line?: string }) {
  return (
    <g>
      <Eye x={cx - gap} y={y} r={r} look={look} line={line} />
      <Eye x={cx + gap} y={y} r={r} look={look} line={line} />
    </g>
  );
}

function Cheeks({ y, gap, cx = 50, r = 4.5, color = "#ff8f8a" }: { y: number; gap: number; cx?: number; r?: number; color?: string }) {
  return (
    <g opacity={0.55}>
      <ellipse cx={cx - gap} cy={y} rx={r} ry={r * 0.6} fill={color} />
      <ellipse cx={cx + gap} cy={y} rx={r} ry={r * 0.6} fill={color} />
    </g>
  );
}

function Smile({ x = 50, y = 62, w = 6, color = INK, open = false }: { x?: number; y?: number; w?: number; color?: string; open?: boolean }) {
  if (open)
    return (
      <g>
        <path d={`M${x - w} ${y} q${w} ${w * 1.3} ${w * 2} 0 z`} fill="#6b1d1d" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
        <path d={`M${x - w * 0.45} ${y + w * 0.62} q${w * 0.45} -${w * 0.35} ${w * 0.9} 0`} fill="#ff8a8a" />
      </g>
    );
  return <path d={`M${x - w} ${y} q${w} ${w * 0.85} ${w * 2} 0`} stroke={color} strokeWidth={2.8} strokeLinecap="round" fill="none" />;
}

function Sparkle({ x, y, s = 4, color = "#fff", opacity = 1 }: { x: number; y: number; s?: number; color?: string; opacity?: number }) {
  return <path d={`M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z`} fill={color} opacity={opacity} />;
}

const ell = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;

/* ======================================================================
   Figurerna
   ====================================================================== */

const SKINS: Record<string, (u: U) => ReactNode> = {
  kisel: (u) => (
    <>
      <Ground u={u} />
      <Body u={u} k="b" t={T.stone} d="M14 70C11 50 26 31 50 30C75 29 89 46 87 66C86 82 72 90 50 90C28 90 16 84 14 70Z">
        <g fill="#73807c" opacity={0.55}>
          <circle cx="30" cy="44" r="2.2" />
          <circle cx="70" cy="40" r="1.6" />
          <circle cx="76" cy="66" r="2.4" />
          <circle cx="24" cy="74" r="1.5" />
        </g>
        <path d="M62 34l-4 7 5 3-3 6" stroke="#73807c" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Body>
      <path d="M40 31c1-5 5-8 9-7-2 2-3 4-3 7z" fill="#6ec27f" stroke="#1d5530" strokeWidth="1.5" strokeLinejoin="round" />
      <Eyes y={58} gap={14} />
      <Cheeks y={68} gap={23} r={4} />
      <Smile y={70} w={4.5} />
    </>
  ),

  mosse: (u) => (
    <>
      <Ground u={u} />
      <Body u={u} k="b" t={T.moss} d="M12 72C12 52 22 39 31 37C32 28 43 24 50 30C57 23 68 27 69 35C80 35 89 49 88 72C88 84 72 90 50 90C28 90 12 84 12 72Z">
        <g fill="#9be0a5" opacity={0.7}>
          <circle cx="28" cy="48" r="2.4" />
          <circle cx="44" cy="38" r="1.8" />
          <circle cx="64" cy="40" r="2.2" />
          <circle cx="76" cy="52" r="1.6" />
          <circle cx="20" cy="66" r="1.6" />
        </g>
        <g fill="#2f8046" opacity={0.5}>
          <circle cx="70" cy="76" r="2" />
          <circle cx="32" cy="80" r="1.6" />
        </g>
      </Body>
      <path d="M50 30C50 22 52 17 55 13" stroke="#1d5530" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M55 14c5-5 13-4 15 1-6 3-11 3-15-1z" fill="#8bd897" stroke="#1d5530" strokeWidth="1.6" strokeLinejoin="round" />
      <Eyes y={61} gap={15} />
      <Cheeks y={72} gap={25} />
      <Smile y={73} w={5} />
    </>
  ),

  kotte: (u) => (
    <>
      <Ground u={u} w={24} />
      <Body u={u} k="b" t={T.cone} d="M50 9C70 18 79 40 77 62C75 80 64 90 50 90C36 90 25 80 23 62C21 40 30 18 50 9Z">
        {[26, 38, 50, 62, 74, 86].map((y, i) => (
          <g key={y}>
            {Array.from({ length: 6 }, (_, k) => {
              const x = 18 + k * 13 + (i % 2) * 6.5;
              return <path key={k} d={`M${x - 7} ${y} q7 8 14 0`} fill="#77461f" opacity={0.55} />;
            })}
            {Array.from({ length: 6 }, (_, k) => {
              const x = 18 + k * 13 + (i % 2) * 6.5;
              return <path key={`l${k}`} d={`M${x - 6} ${y - 1.5} q6 5 12 0`} stroke="#dda56c" strokeWidth="1.4" fill="none" opacity={0.6} />;
            })}
          </g>
        ))}
      </Body>
      <path d="M50 10V3" stroke="#45270f" strokeWidth="3" strokeLinecap="round" />
      <path d="M50 5c-6-4-11-2-12 2 5 2 9 1 12-2zM50 5c5-5 11-4 13 0-5 3-9 3-13 0z" fill="#5eb36c" stroke="#1d5530" strokeWidth="1.5" strokeLinejoin="round" />
      <ellipse cx="50" cy="58" rx="19" ry="12" fill="#c98a52" opacity={0.6} />
      <Eyes y={56} gap={11} r={7} />
      <Smile y={66} w={3.8} />
    </>
  ),

  bullen: (u) => (
    <>
      <Ground u={u} w={34} />
      <Body u={u} k="b" t={T.bun} d="M10 66C10 46 28 30 50 30C72 30 90 46 90 66C90 82 72 90 50 90C28 90 10 82 10 66Z" sy={-6}>
        <path d="M50 44c12 0 20 7 20 15s-9 13-20 13-17-5-17-11 7-10 14-10 12 4 12 8-5 6-9 6" fill="none" stroke="#9b5a22" strokeWidth="5.5" strokeLinecap="round" />
        <path d="M50 42.5c12 0 20 7 20 15" fill="none" stroke="#f8d19a" strokeWidth="1.6" strokeLinecap="round" opacity={0.8} />
      </Body>
      <g>
        {[
          [26, 40, 18],
          [72, 42, -12],
          [40, 33, 0],
          [60, 34, 30],
          [18, 56, 10],
          [82, 58, 40],
          [48, 50, 15],
        ].map(([x, y, r], i) => (
          <g key={i} transform={`rotate(${r} ${x} ${y})`}>
            <rect x={x - 2.4} y={y - 1.6} width="5" height="4.6" rx="1.4" fill="#d9cdb8" />
            <rect x={x - 2.6} y={y - 2.4} width="5" height="4.4" rx="1.4" fill="#fff" />
          </g>
        ))}
      </g>
      <Eyes y={64} gap={24} r={6.5} />
      <Cheeks y={74} gap={30} r={4} />
      <Smile y={75} w={4} />
    </>
  ),

  isbiten: (u) => (
    <>
      <Ground u={u} w={28} />
      <Body u={u} k="b" t={T.ice} d="M22 30Q22 22 30 22H70Q78 22 78 30V80Q78 88 70 88H30Q22 88 22 80Z">
        <path d="M22 22H78V36Q50 30 22 36Z" fill="#f1fcff" opacity={0.55} />
        <path d="M30 28h16c-7 3-12 8-14 15-1 2-3 1-3-1V31c0-2 0-3 1-3z" fill="#fff" opacity={0.85} />
        <path d="M68 60l-6 6 4 3-5 7" stroke="#6fb6d8" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Body>
      <path d="M36 88c0 4 3 6 5 6s3-3 2-6zM60 88c0 3 2 5 3 5s3-2 2-5z" fill="#aee2f5" stroke="#3a7fa2" strokeWidth="1.4" />
      <Sparkle x={72} y={18} s={4.5} color="#fff" />
      <Sparkle x={80} y={28} s={2.6} color="#fff" />
      <Eyes y={56} gap={13} line="#1e4a63" />
      <Cheeks y={66} gap={22} r={4} color="#ff9fb4" />
      <ellipse cx="50" cy="70" rx="3.6" ry="4.2" fill="#1e4a63" />
    </>
  ),

  molnet: (u) => (
    <>
      <Ground u={u} w={34} />
      <Body u={u} k="b" t={T.cloud} d="M22 86C11 86 5 79 5 70C5 61 12 54 21 54C21 39 32 29 46 29C56 29 64 34 68 42C70 41 73 41 75 41C86 41 94 49 94 60V61C97 64 98 68 98 72C98 80 92 86 84 86Z">
        <path d="M30 42c3-6 9-10 16-10-6 3-10 7-12 12z" fill="#fff" />
      </Body>
      <g fill="#8fc4f2" stroke="#4f7fb6" strokeWidth="1.4">
        <path d="M34 92c0 3 2 5 4 5s4-2 4-5c0-3-4-7-4-7s-4 4-4 7z" />
        <path d="M62 94c0 2 1.5 3.5 3 3.5s3-1.5 3-3.5c0-2-3-5-3-5s-3 3-3 5z" />
      </g>
      <Eyes y={63} gap={14} line="#4a5d80" />
      <Cheeks y={72} gap={24} r={5} />
      <Smile y={72} w={4.5} color="#4a5d80" />
    </>
  ),

  taggen: (u) => (
    <>
      <Ground u={u} y={95} w={22} />
      <Body u={u} k="pot" t={T.pot} d="M29 76H71L66 94H34Z" sx={-2} sy={-3} />
      <Body u={u} k="rim" t={T.pot} d="M25 72Q25 70 27 70H73Q75 70 75 72V78Q75 80 73 80H27Q25 80 25 78Z" sx={-1.5} sy={-2.5} />
      <Body
        u={u}
        k="b"
        t={T.cactus}
        d="M37 71V31C37 22 43 15 50 15S63 22 63 31V71ZM37 56H29C25 56 22 53 22 49V39C22 36 24.5 34 27 34S32 36 32 39V46H37ZM63 47H69V35C69 32 71.5 30 74 30S79 32 79 35V45C79 50 76 53 71 53H63Z"
      >
        {[
          [43, 26],
          [56, 30],
          [42, 46],
          [58, 62],
          [26, 42],
          [75, 40],
        ].map(([x, y], i) => (
          <g key={i} stroke="#d9f5d8" strokeWidth="1.4" strokeLinecap="round">
            <path d={`M${x - 2} ${y - 2}l-2.4 -1.4M${x + 2} ${y - 2}l2.4 -1.4`} />
          </g>
        ))}
        <path d="M50 18v52" stroke="#2b7744" strokeWidth="1.5" opacity={0.5} />
      </Body>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="50" cy="10.5" rx="3.4" ry="6" fill="#ff7aa8" stroke="#8a2350" strokeWidth="1.2" transform={`rotate(${a} 50 14)`} />
      ))}
      <circle cx="50" cy="14" r="2.8" fill="#ffd27a" stroke="#8a5a00" strokeWidth="1" />
      <Eyes y={43} gap={7.5} r={5.4} line="#16402a" />
      <Cheeks y={51} gap={12} r={2.8} />
      <Smile y={53} w={3.2} />
    </>
  ),

  flugis: (u) => (
    <>
      <Ground u={u} w={24} />
      <Body u={u} k="stem" t={T.stem} d="M34 52H66L69 82C69 88 61 91 50 91S31 88 31 82Z" sx={-2} sy={-3} />
      <Body u={u} k="cap" t={T.shroom} d="M7 55C7 30 27 11 50 11S93 30 93 55C93 60 89 62 84 62H16C11 62 7 60 7 55Z" sy={-6}>
        {[
          [28, 30, 6],
          [55, 21, 7],
          [77, 38, 5],
          [44, 44, 4],
          [16, 48, 3.5],
          [68, 52, 3],
        ].map(([x, y, r], i) => (
          <g key={i}>
            <ellipse cx={x + 0.6} cy={y + 1} rx={r} ry={r * 0.85} fill="#d8c6a4" />
            <ellipse cx={x} cy={y} rx={r} ry={r * 0.85} fill="#fff" />
          </g>
        ))}
      </Body>
      <path d="M18 62h64" stroke="#c9a77a" strokeWidth="2" />
      <Eyes y={71} gap={8} r={5} line="#5e4a2d" />
      <Cheeks y={78} gap={13} r={3} />
      <Smile y={79} w={3.3} />
    </>
  ),

  kassetten: (u) => (
    <>
      <Ground u={u} w={36} />
      <Body u={u} k="b" t={T.tape} d="M10 30Q10 23 17 23H83Q90 23 90 30V76Q90 83 83 83H17Q10 83 10 76Z" sy={-4}>
        <path d="M26 83L32 70H68L74 83Z" fill="#4d5d58" />
      </Body>
      <rect x="17" y="29" width="66" height="34" rx="6" fill="#ffd055" stroke="#101614" strokeWidth="2" />
      <rect x="17" y="29" width="66" height="10" rx="5" fill="#ff9b21" />
      <rect x="17" y="35" width="66" height="4" fill="#ff9b21" />
      <path d="M22 34h28" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity={0.75} />
      <rect x="33" y="44" width="34" height="14" rx="7" fill="#1d2725" />
      <path d="M40 51h20" stroke="#6b4a2b" strokeWidth="5" strokeLinecap="round" />
      {[34, 66].map((x) => (
        <g key={x}>
          <circle cx={x} cy="51" r="10" fill="#fff" stroke="#101614" strokeWidth="2" />
          <circle cx={x + 1} cy="52" r="5" fill={INK} />
          {[0, 60, 120].map((a) => (
            <rect key={a} x={x + 0.4} y="47.6" width="1.2" height="8.8" rx="0.6" fill="#fff" transform={`rotate(${a} ${x + 1} 52)`} opacity={0.7} />
          ))}
          <circle cx={x + 3} cy="48.5" r="1.8" fill="#fff" />
        </g>
      ))}
      {[18, 82].map((x) => (
        <circle key={x} cx={x} cy="77" r="2.2" fill="#5c6e69" stroke="#101614" strokeWidth="1" />
      ))}
      <path d="M43 68q7 5 14 0" stroke="#fff" strokeWidth="2.8" fill="none" strokeLinecap="round" />
    </>
  ),

  lyktan: (u) => {
    const glow = u("glow");
    const flame = u("flame");
    return (
      <>
        <defs>
          <radialGradient id={glow}>
            <stop offset="0" stopColor="#ffd27a" stopOpacity="0.9" />
            <stop offset="0.6" stopColor="#ffb347" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={flame} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3c4" />
            <stop offset="0.5" stopColor="#ffb238" />
            <stop offset="1" stopColor="#ff7a1a" />
          </linearGradient>
        </defs>
        <Ground u={u} w={26} />
        <circle cx="50" cy="52" r="40" fill={`url(#${glow})`} />
        <path d="M38 13Q38 4 50 4T62 13" fill="none" stroke="#0e1412" strokeWidth="5" strokeLinecap="round" />
        <Body u={u} k="top" t={T.lantern} d="M28 15H72L66 24H34Z" sx={-1.5} sy={-2.5} />
        <rect x="31" y="23" width="38" height="54" rx="6" fill="#fff6d2" stroke="#0e1412" strokeWidth="3" />
        <rect x="35" y="27" width="30" height="46" rx="4" fill="#ffe9a4" />
        <path d="M50 31c9 9 13 15 13 23a13 13 0 0 1-26 0c0-8 4-14 13-23z" fill={`url(#${flame})`} stroke="#c95a00" strokeWidth="1.6" />
        <path d="M50 44c4.5 4.5 6.5 7.5 6.5 11a6.5 6.5 0 0 1-13 0c0-3.5 2-6.5 6.5-11z" fill="#fff6dc" />
        <path d="M37 30h6v40h-6z" fill="#fff" opacity={0.45} />
        {[31, 69].map((x) => (
          <rect key={x} x={x - 2} y="23" width="4" height="54" rx="2" fill="#2f3b38" />
        ))}
        <Body u={u} k="base" t={T.lantern} d="M25 76Q25 74 27 74H73Q75 74 75 76V84Q75 87 72 87H28Q25 87 25 84Z" sx={-1.5} sy={-2.5} />
        <circle cx="45" cy="56" r="2.6" fill={INK} />
        <circle cx="55" cy="56" r="2.6" fill={INK} />
        <circle cx="45.8" cy="55.2" r="0.9" fill="#fff" />
        <circle cx="55.8" cy="55.2" r="0.9" fill="#fff" />
        <Smile y={62} w={2.6} color="#8a3a00" />
      </>
    );
  },

  malen: (u) => (
    <>
      <Ground u={u} w={22} />
      <Body u={u} k="w1" t={T.moth} d="M46 46C32 20 6 18 5 37C4 53 25 59 43 55ZM54 46C68 20 94 18 95 37C96 53 75 59 57 55Z" sy={-4}>
        <circle cx="22" cy="37" r="7.5" fill="#efe3cd" />
        <circle cx="78" cy="37" r="7.5" fill="#efe3cd" />
        <circle cx="22" cy="37" r="4" fill="#7a6650" />
        <circle cx="78" cy="37" r="4" fill="#7a6650" />
        <circle cx="23.3" cy="35.6" r="1.4" fill="#fff" />
        <circle cx="79.3" cy="35.6" r="1.4" fill="#fff" />
        <path d="M10 28q12-4 26 10M90 28q-12-4-26 10" stroke="#efe3cd" strokeWidth="1.6" fill="none" opacity={0.7} />
      </Body>
      <Body u={u} k="w2" t={T.moth} d="M44 57C29 59 13 68 18 80C23 90 37 83 46 67ZM56 57C71 59 87 68 82 80C77 90 63 83 54 67Z" sy={-3}>
        <circle cx="27" cy="75" r="3" fill="#a08a6c" />
        <circle cx="73" cy="75" r="3" fill="#a08a6c" />
      </Body>
      <Body u={u} k="b" t={T.mothBody} d={ell(50, 58, 12.5, 25)} sx={-2.5} sy={-4}>
        {[64, 71, 78].map((y) => (
          <path key={y} d={`M38 ${y}q12 4 24 0`} stroke="#cbb898" strokeWidth="1.8" fill="none" />
        ))}
      </Body>
      <path d="M45 35C41 26 34 21 27 20M55 35C59 26 66 21 73 20" stroke="#5a4a35" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} stroke="#5a4a35" strokeWidth="1.4" strokeLinecap="round">
          <path d={`M${41 - i * 3.6} ${30 - i * 2.6}l-3 -1`} />
          <path d={`M${59 + i * 3.6} ${30 - i * 2.6}l3 -1`} />
        </g>
      ))}
      <Eyes y={51} gap={5.8} r={4.6} look={0.3} />
      <Smile y={58} w={2.4} />
    </>
  ),

  blackis: (u) => (
    <>
      <Ground u={u} w={34} />
      <Body
        u={u}
        k="arms"
        t={T.octo}
        d="M20 68C12 72 7 81 11 87C15 91 22 87 24 80C25 76 27 73 30 71ZM34 72C31 80 31 89 36 91C41 92 43 86 42 79ZM66 72C69 80 69 89 64 91C59 92 57 86 58 79ZM80 68C88 72 93 81 89 87C85 91 78 87 76 80C75 76 73 73 70 71ZM46 74C45 82 46 90 50 91C54 90 55 82 54 74Z"
        sx={-1.5}
        sy={-3}
      >
        {[
          [14, 84],
          [37, 86],
          [63, 86],
          [86, 84],
          [50, 86],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.6" fill="#e6d8ff" />
        ))}
      </Body>
      <Body u={u} k="b" t={T.octo} d="M14 56C14 32 30 14 50 14S86 32 86 56C86 70 72 78 50 78S14 70 14 56Z" sy={-6}>
        <circle cx="70" cy="28" r="3.4" fill="#cdb5ff" />
        <circle cx="77" cy="38" r="2.2" fill="#cdb5ff" />
        <circle cx="64" cy="22" r="1.6" fill="#cdb5ff" />
      </Body>
      <Eyes y={50} gap={14} line="#2a165a" />
      <Cheeks y={60} gap={24} color="#ff8fc8" />
      <Smile y={62} w={4.5} color="#2a165a" open />
    </>
  ),

  raven: (u) => (
    <>
      <Ground u={u} w={28} />
      <Body u={u} k="b" t={T.fox} d="M15 12L39 31H61L85 12C87 22 87 36 83 47C83 71 68 90 50 90S17 71 17 47C13 36 13 22 15 12Z" sy={-6}>
        <path d="M15 12L31 25L20 32Z M85 12L69 25L80 32Z" fill="#2c1407" />
        <path d="M19 15l9 8-6 4zM81 15l-9 8 6 4z" fill="#ffd1b0" opacity={0.75} />
        <path d="M20 54C27 66 38 72 50 72S73 66 80 54C78 75 66 92 50 92S22 75 20 54Z" fill="#fff6ec" />
        <path d="M42 30c4 7 12 7 16 0" stroke="#ffb07a" strokeWidth="2" fill="none" opacity={0.8} />
      </Body>
      <path d="M44 70Q50 66 56 70Q53 76 50 76Q47 76 44 70Z" fill={INK} />
      <ellipse cx="48" cy="69.8" rx="1.8" ry="1" fill="#fff" opacity={0.7} />
      <path d="M50 76v4" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M44 81q3 3 6 0 3 3 6 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Eyes y={52} gap={14} r={7} look={1.2} />
    </>
  ),

  kristallen: (u) => (
    <>
      <Ground u={u} w={26} />
      <path d="M50 6L77 29L70 84H30L23 29Z" fill="#145e5a" stroke="#145e5a" strokeWidth="5" strokeLinejoin="round" />
      <path d="M50 6L77 29H23Z" fill="#9fe9e3" />
      <path d="M50 6L37 29H63Z" fill="#dafcf8" />
      <path d="M23 29L50 40V84H30Z" fill="#5ccbc4" />
      <path d="M77 29L50 40V84H70Z" fill="#2f9c96" />
      <path d="M23 29L50 40L77 29" fill="none" stroke="#c8f6f2" strokeWidth="1.6" />
      <path d="M50 40V84" stroke="#237c77" strokeWidth="1.4" />
      <path d="M28 34L44 41V74H34Z" fill="#fff" opacity={0.18} />
      <Sparkle x={40} y={16} s={3.4} />
      <Sparkle x={80} y={18} s={4.5} color="#dafcf8" />
      <Sparkle x={18} y={52} s={3} color="#dafcf8" />
      <Eyes y={57} gap={11} r={6.3} line="#0d4744" />
      <Cheeks y={66} gap={18} r={3.4} color="#ff9fb4" />
      <path d="M44 69q6 4.5 12 0" stroke="#0d4744" strokeWidth="2.8" fill="none" strokeLinecap="round" />
    </>
  ),

  dala: (u) => (
    <>
      <Ground u={u} y={93} w={34} />
      <Body u={u} k="base" t={T.lantern} d="M12 84Q12 82 14 82H86Q88 82 88 84V88Q88 90 86 90H14Q12 90 12 88Z" sx={-1} sy={-2} />
      <Body
        u={u}
        k="b"
        t={T.dala}
        d="M20 44Q20 40 24 40H54L60 20Q62 12 70 12H76Q82 12 85 18L90 28Q92 33 87 35L80 37L77 46Q75 52 70 54L72 82H62L58 64H34L30 82H20L22 62Q14 58 12 50L8 40Q14 42 20 44Z"
        sy={-5}
      >
        <path d="M66 14Q60 24 58 40" stroke="#2c0b08" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M54 40Q52 52 46 58M30 44Q34 54 44 58" stroke="#2f6cc9" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M54 40Q52 52 46 58M30 44Q34 54 44 58" stroke="#ffd055" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeDasharray="2 3" />
        <g transform="translate(40 50)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-4.6" rx="2.6" ry="4.4" fill="#fff" transform={`rotate(${a})`} />
          ))}
          <circle r="2.4" fill="#ffd055" />
        </g>
        <path d="M26 52q4-4 8 0M66 22q4 0 6 4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M74 28q6 1 10 4" stroke="#ffd055" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M80 37q-4 6-10 8" stroke="#2f6cc9" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </Body>
      <path d="M68 13L70 4L76 12Z" fill="#cf3b2f" stroke="#4f0f0a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M70.4 7.5L71.4 11.2" stroke="#ffd055" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="74" cy="22" r="4.4" fill="#fff" stroke="#4f0f0a" strokeWidth="1.4" />
      <circle cx="75.2" cy="22.6" r="2.4" fill={INK} />
      <circle cx="76" cy="21.6" r="0.8" fill="#fff" />
      <circle cx="86" cy="28" r="1.2" fill="#4f0f0a" />
    </>
  ),

  kometen: (u) => {
    const tail = u("tail");
    return (
      <>
        <defs>
          <linearGradient id={tail} x1="1" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#ffd055" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ffd055" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M4 14C24 20 38 32 44 44L32 58C26 40 16 26 4 14Z" fill={`url(#${tail})`} />
        <path d="M2 40C18 40 30 46 38 54L30 64C24 52 14 44 2 40Z" fill={`url(#${tail})`} opacity={0.7} />
        <path d="M16 6C30 16 40 26 46 38" stroke="#fff" strokeWidth="1.5" fill="none" opacity={0.5} strokeLinecap="round" />
        <Sparkle x={14} y={30} s={3} />
        <Sparkle x={26} y={12} s={2.4} />
        <Ground u={u} y={93} w={22} />
        <Body u={u} k="b" t={T.comet} d={ell(58, 58, 30, 30)} sy={-6}>
          <circle cx="44" cy="44" r="6" fill="#ffd88c" opacity={0.7} />
          <circle cx="74" cy="72" r="4" fill="#d06f0b" opacity={0.5} />
          <circle cx="66" cy="38" r="2.4" fill="#d06f0b" opacity={0.4} />
        </Body>
        <Eyes y={56} gap={11} cx={60} r={7} />
        <Cheeks y={66} gap={18} cx={60} r={4} color="#ff6a5a" />
        <Smile x={60} y={68} w={4.5} open />
      </>
    );
  },

  solen: (u) => (
    <>
      <g>
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M50 3L56 19H44Z" fill={i % 2 ? "#ffc93c" : "#ffd96b"} stroke="#6e3a00" strokeWidth="1.5" strokeLinejoin="round" transform={`rotate(${i * 30} 50 50)`} />
        ))}
      </g>
      <Body u={u} k="b" t={T.sun} d={ell(50, 50, 30, 30)} sy={-6} />
      <path d="M26 42h48l-2 10c-1 5-5 8-10 8h-3c-4 0-7-3-8-7h-2c-1 4-4 7-8 7h-3c-5 0-9-3-10-8z" fill="#1b2422" stroke="#0b0f0e" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M31 45l7 0-5 10M58 45l7 0-5 10" stroke="#5c6e69" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity={0.9} />
      <path d="M33 46l4 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path d="M60 46l4 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <Cheeks y={64} gap={18} r={4.5} color="#ff6a3a" />
      <Smile y={66} w={6} open />
    </>
  ),

  fjallis: (u) => {
    const lamp = u("lamp");
    const eye = u("eye");
    return (
      <>
        <defs>
          <linearGradient id={lamp} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff6c4" stopOpacity="0.8" />
            <stop offset="1" stopColor="#fff6c4" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={eye}>
            <stop offset="0" stopColor="#e9fff4" />
            <stop offset="0.5" stopColor="#5ae3a8" />
            <stop offset="1" stopColor="#5ae3a8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <Ground u={u} w={32} />
        <Body
          u={u}
          k="b"
          t={T.yeti}
          d="M18 88V50C18 30 32 15 50 15S82 30 82 50V88C78 84 73 84 69 88C65 84 60 84 56 88C52 84 47 84 43 88C39 84 34 84 30 88C26 84 22 84 18 88Z"
          sy={-6}
        >
          <path d="M26 30c3-6 8-10 14-12M30 70l-4 6M44 74l-3 6M70 70l4 6" stroke="#cfc8b8" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </Body>
        <path d="M84 40L100 30V56Z" fill={`url(#${lamp})`} />
        <rect x="27" y="38" width="46" height="22" rx="11" fill="#1f2a2d" stroke="#0b1012" strokeWidth="2" />
        <circle cx="40" cy="49" r="8" fill={`url(#${eye})`} />
        <circle cx="60" cy="49" r="8" fill={`url(#${eye})`} />
        <circle cx="40" cy="49" r="3.4" fill="#e9fff4" />
        <circle cx="60" cy="49" r="3.4" fill="#e9fff4" />
        <path d="M18 34Q50 22 82 34" stroke="#2f6cc9" strokeWidth="5" fill="none" strokeLinecap="round" />
        <rect x="78" y="30" width="10" height="10" rx="3" fill="#ffd055" stroke="#5e584c" strokeWidth="1.6" />
        <circle cx="83" cy="35" r="2.4" fill="#fff6c4" />
        <path d="M44 68q6 4 12 0" stroke="#5e584c" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </>
    );
  },

  norrsken: (u) => {
    const aur = u("aur");
    const aur2 = u("aur2");
    return (
      <>
        <defs>
          <linearGradient id={aur} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#43d6a0" />
            <stop offset="0.55" stopColor="#5fe0e0" />
            <stop offset="1" stopColor="#b48cff" />
          </linearGradient>
          <linearGradient id={aur2} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#9cf0cf" stopOpacity="0.9" />
            <stop offset="1" stopColor="#e6d4ff" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <Ground u={u} w={30} />
        <path d="M24 46C17 26 26 8 34 5C33 15 37 22 43 26C41 15 46 5 54 2C54 12 58 20 63 24C64 15 69 9 76 7C74 18 79 30 74 46Z" fill={`url(#${aur})`} stroke="#123a4a" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M31 40C30 28 33 18 38 13C37 21 40 27 45 31M55 30C55 20 58 13 63 10C62 18 64 25 67 30" fill="none" stroke={`url(#${aur2})`} strokeWidth="3" strokeLinecap="round" />
        <Body u={u} k="b" t={T.night} d="M16 70C16 48 30 34 50 34S84 48 84 70C84 84 70 90 50 90S16 84 16 70Z" sy={-6}>
          {[
            [28, 56, 1.4],
            [74, 60, 1.8],
            [64, 44, 1.1],
            [32, 80, 1.1],
            [70, 80, 1.3],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.9} />
          ))}
          <Sparkle x={36} y={44} s={3} color="#cfe8ff" />
        </Body>
        <Sparkle x={86} y={18} s={4} color="#e6d4ff" />
        <Sparkle x={14} y={22} s={3} color="#9cf0cf" />
        <Eye x={37} y={64} r={7} line="#0b1430" sclera="#eaf6ff" pupil="#16244c" />
        <Eye x={63} y={64} r={7} line="#0b1430" sclera="#eaf6ff" pupil="#16244c" />
        <Cheeks y={73} gap={23} r={4} color="#b48cff" />
        <path d="M45 75q5 3.5 10 0" stroke="#9cf0cf" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      </>
    );
  },

  tomten: (u) => (
    <>
      <Ground u={u} w={30} />
      <Body u={u} k="hat" t={T.gnomeHat} d="M70 8C58 6 46 14 38 28C30 40 24 52 18 62H82C78 46 72 32 64 22C68 18 72 14 76 13C74 10 72 8 70 8Z" sy={-6}>
        <path d="M64 22C52 30 46 44 46 60" stroke="#a42c22" strokeWidth="2.6" fill="none" opacity={0.7} />
        <path d="M68 30C66 40 66 50 68 60" stroke="#ff8173" strokeWidth="1.6" fill="none" opacity={0.6} />
      </Body>
      <Body u={u} k="beard" t={T.beard} d="M14 64C12 76 18 86 26 90C30 96 38 98 44 95C47 98 53 98 56 95C62 98 70 96 74 90C82 86 88 76 86 64Z" sy={-5}>
        <path d="M26 74q4 7 1 14M40 78q3 8 0 15M60 78q-3 8 0 15M74 74q-4 7-1 14M50 82v12" stroke="#ddd3c1" strokeWidth="2" fill="none" strokeLinecap="round" />
      </Body>
      <Body u={u} k="rim" t={T.beard} d="M14 60Q14 56 18 56H82Q86 56 86 60V66Q86 70 82 70H18Q14 70 14 66Z" sx={-1.5} sy={-3}>
        {[22, 34, 46, 58, 70, 80].map((x) => (
          <circle key={x} cx={x} cy="61" r="3.6" fill="#fff" opacity={0.7} />
        ))}
      </Body>
      <Body u={u} k="nose" t={{ fill: "#f2a08c", shade: "#d0705a", light: "#ffd4c6", line: "#7a3324" }} d={ell(50, 72, 8, 6.5)} sx={-1.5} sy={-2.5}>
        <ellipse cx="47" cy="70" rx="2.5" ry="1.6" fill="#fff" opacity={0.7} />
      </Body>
    </>
  ),

  /* ---------- Early alpha-exklusiv ---------- */
  laserdala: (u) => {
    const aura = u("aura");
    const glow = u("glow");
    const gold = u("gold");
    const eye = u("eye");
    return (
      <>
        <defs>
          <radialGradient id={aura}>
            <stop offset="0.35" stopColor="#b98cff" stopOpacity="0.55" />
            <stop offset="0.7" stopColor="#ff4fa3" stopOpacity="0.2" />
            <stop offset="1" stopColor="#ff4fa3" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={glow} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ff2e63" stopOpacity="0.95" />
            <stop offset="1" stopColor="#ff2e63" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id={gold} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff1b0" />
            <stop offset="0.5" stopColor="#ffc93c" />
            <stop offset="1" stopColor="#c98200" />
          </linearGradient>
          <radialGradient id={eye}>
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.35" stopColor="#ffd1de" />
            <stop offset="0.7" stopColor="#ff2e63" />
            <stop offset="1" stopColor="#ff2e63" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="48" cy="54" r="48" fill={`url(#${aura})`} />
        <g className="kl-twinkle">
          <Sparkle x={10} y={20} s={4} color="#efe2ff" />
          <Sparkle x={30} y={8} s={2.4} color="#fff" />
        </g>
        <g className="kl-twinkle kl-twinkle-2">
          <Sparkle x={8} y={70} s={2.6} color="#ffc6e0" />
          <Sparkle x={52} y={6} s={3} color="#ffe9b0" />
        </g>
        <Ground u={u} y={94} w={36} />
        <Body u={u} k="base" t={{ fill: "#3b2370", shade: "#24124d", light: "#6a4bb0", line: "#140833" }} d="M10 84Q10 82 12 82H84Q86 82 86 84V89Q86 91 84 91H12Q10 91 10 89Z" sx={-1} sy={-2}>
          <path d="M12 84.5H84" stroke={`url(#${gold})`} strokeWidth="1.6" />
        </Body>
        <Body
          u={u}
          k="b"
          t={{ fill: "#8f55e0", shade: "#5a2aa8", light: "#caa6ff", line: "#22094d" }}
          d="M18 44Q18 40 22 40H52L58 20Q60 12 68 12H74Q80 12 83 18L88 28Q90 33 85 35L78 37L75 46Q73 52 68 54L70 82H60L56 64H32L28 82H18L20 62Q12 58 10 50L6 40Q12 42 18 44Z"
          sy={-5}
        >
          <path d="M64 14Q58 24 56 40" stroke="#22094d" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d="M64 14Q58 24 56 40" stroke="#ff4fa3" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity={0.8} />
          <path d="M52 40Q50 52 44 58M28 44Q32 54 42 58" stroke={`url(#${gold})`} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M52 40Q50 52 44 58M28 44Q32 54 42 58" stroke="#5a2aa8" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeDasharray="1.5 3" />
          <g transform="translate(38 50)">
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx="0" cy="-4.8" rx="2.7" ry="4.6" fill="#fff4fb" transform={`rotate(${a})`} />
            ))}
            <circle r="2.6" fill="#ffc93c" />
          </g>
          <g fill="#5fe0c8">
            <path d="M22 50c2-4 6-5 9-3-3 1-5 3-6 6z" />
            <path d="M48 58c3-1 6 0 7 3-3-1-5 0-7 2z" />
          </g>
          <path d="M24 52q4-4 8 0M64 22q4 0 6 4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" opacity={0.85} />
          <path d="M72 28q6 1 10 4" stroke={`url(#${gold})`} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M78 37q-4 6-10 8" stroke="#ff4fa3" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        </Body>
        {/* Öra */}
        <path d="M66 13L68 4L74 12Z" fill="#8f55e0" stroke="#22094d" strokeWidth="2" strokeLinejoin="round" />
        <path d="M68.4 7.5L69.4 11.2" stroke="#ffc93c" strokeWidth="1.4" strokeLinecap="round" />
        {/* Laserstrålar */}
        <g className="kl-twinkle" style={{ animationDuration: "0.8s" }}>
          <path d="M73 21L112 30M78 19L112 22" stroke={`url(#${glow})`} strokeWidth="11" strokeLinecap="round" opacity={0.4} />
        </g>
        <path d="M73 21L112 30M78 19L112 22" stroke="#ff2e63" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M73 21L112 30M78 19L112 22" stroke="#ffb3c8" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M73 21L112 30M78 19L112 22" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" />
        {/* Glödande ögon */}
        <circle cx="78" cy="19" r="4.6" fill={`url(#${eye})`} />
        <circle cx="72.5" cy="21.5" r="7.5" fill={`url(#${eye})`} />
        <circle cx="72.5" cy="21.5" r="3.4" fill="#fff" stroke="#22094d" strokeWidth="1.4" />
        <circle cx="72.5" cy="21.5" r="1.6" fill="#ff2e63" />
        <path d="M66 16.5L77 17.5" stroke="#22094d" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="84" cy="28" r="1.2" fill="#22094d" />
        <g className="kl-twinkle" style={{ animationDuration: "0.6s" }}>
          <Sparkle x={108} y={26} s={6} color="#ffd1de" />
        </g>
        <Sparkle x={108} y={26} s={2.6} color="#fff" />
      </>
    );
  },
};

export const SKIN_IDS = Object.keys(SKINS);

export function Avatar({
  skin,
  size = 64,
  className,
  title,
  style,
}: {
  skin: string;
  size?: number;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}) {
  const rid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const u: U = (s) => `k${rid}${skin}${s}`;
  const draw = SKINS[skin] ?? SKINS.kisel;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ flex: "none", overflow: "visible", ...style }}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {draw(u)}
    </svg>
  );
}
