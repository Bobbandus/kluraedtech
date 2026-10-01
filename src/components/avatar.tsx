import type { ReactNode } from "react";

/**
 * Klurisar — Kluras egna figurer.
 * Gemensamt formspråk: platta former, en ljusare höjdpunkt, en mörkare
 * skugga i underkant, stora vita ögon med mörka pupiller. viewBox 0 0 100 100.
 */

function Eyes({ y = 50, gap = 16, cx = 50, r = 7.5, pupil = 3.6, look = 0.8 }: { y?: number; gap?: number; cx?: number; r?: number; pupil?: number; look?: number }) {
  return (
    <g>
      <circle cx={cx - gap} cy={y} r={r} fill="#fff" />
      <circle cx={cx + gap} cy={y} r={r} fill="#fff" />
      <circle cx={cx - gap + look} cy={y + 0.8} r={pupil} fill="#1b2422" />
      <circle cx={cx + gap + look} cy={y + 0.8} r={pupil} fill="#1b2422" />
      <circle cx={cx - gap + look + 1.3} cy={y - 0.6} r={1.1} fill="#fff" />
      <circle cx={cx + gap + look + 1.3} cy={y - 0.6} r={1.1} fill="#fff" />
    </g>
  );
}

function Smile({ x = 50, y = 62, w = 7, color = "#1b2422" }: { x?: number; y?: number; w?: number; color?: string }) {
  return <path d={`M${x - w} ${y} q${w} ${w * 0.8} ${w * 2} 0`} stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" />;
}

function Shadow({ y = 92, w = 30 }: { y?: number; w?: number }) {
  return <ellipse cx="50" cy={y} rx={w} ry="4" fill="#1b2422" opacity="0.12" />;
}

const SKINS: Record<string, () => ReactNode> = {
  kisel: () => (
    <>
      <Shadow />
      <path d="M14 70c-3-20 10-40 34-42 25-2 41 14 39 36-1 16-14 26-38 26-20 0-33-6-35-20z" fill="#94a09d" />
      <path d="M22 50c6-12 18-18 30-18 9 0 16 3 21 8-12-3-28-1-38 6-5 3-9 6-13 4z" fill="#b6c0bd" />
      <path d="M15 72c6 10 18 15 36 15 18 0 30-6 35-16-4 13-17 20-37 20-18 0-30-6-34-19z" fill="#7a8683" />
      <Eyes y={58} gap={14} />
      <Smile y={71} w={5} />
    </>
  ),
  mosse: () => (
    <>
      <Shadow />
      <path d="M12 74c0-22 14-42 38-42s38 20 38 42c0 10-6 16-38 16S12 84 12 74z" fill="#4ca35f" />
      <path d="M14 46c2-10 10-12 14-8 2-9 12-12 18-6 4-8 15-8 18 1 7-4 15 1 14 9 6 1 9 7 6 12-24-6-46-6-70-1-4-3-3-7 0-7z" fill="#6cc27b" />
      <circle cx="30" cy="40" r="2.5" fill="#a5e0ad" />
      <circle cx="58" cy="34" r="2" fill="#a5e0ad" />
      <circle cx="72" cy="42" r="2.5" fill="#a5e0ad" />
      <path d="M13 76c8 9 20 12 37 12s29-3 37-12c-1 10-10 14-37 14S14 86 13 76z" fill="#367d45" />
      <Eyes y={62} gap={15} />
      <Smile y={75} w={5} />
    </>
  ),
  kotte: () => (
    <>
      <Shadow w={24} />
      <path d="M50 8c22 10 30 34 28 56-2 18-12 26-28 26S24 82 22 64C20 42 28 18 50 8z" fill="#9a6337" />
      <g fill="none" stroke="#7a4a24" strokeWidth="3" strokeLinecap="round">
        <path d="M30 34q10 8 20 0q10 8 20 0" />
        <path d="M25 52q12 9 25 0q13 9 25 0" />
        <path d="M24 70q13 9 26 0q13 9 26 0" />
      </g>
      <path d="M50 8c-8 6-14 14-17 24 4-10 10-17 17-20z" fill="#c08452" />
      <path d="M50 4v8" stroke="#4f7d3a" strokeWidth="4" strokeLinecap="round" />
      <Eyes y={58} gap={12} r={7} />
    </>
  ),
  bullen: () => (
    <>
      <Shadow w={34} />
      <path d="M10 64c0-20 18-36 40-36s40 16 40 36c0 16-18 26-40 26S10 80 10 64z" fill="#d9954a" />
      <path d="M50 46c10 0 18 6 18 14s-8 12-18 12-16-4-16-10 6-10 13-10 11 3 11 7-4 6-8 6" fill="none" stroke="#9b5a22" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M11 68c4 12 20 20 39 20s35-8 39-20c0 14-17 22-39 22S11 82 11 68z" fill="#b8742f" />
      <g fill="#fff">
        <rect x="24" y="40" width="4" height="4" rx="1" transform="rotate(20 26 42)" />
        <rect x="70" y="42" width="4" height="4" rx="1" transform="rotate(-15 72 44)" />
        <rect x="40" y="33" width="3.5" height="3.5" rx="1" />
        <rect x="60" y="34" width="3.5" height="3.5" rx="1" transform="rotate(30 61 35)" />
        <rect x="18" y="56" width="3.5" height="3.5" rx="1" />
        <rect x="80" y="58" width="3.5" height="3.5" rx="1" transform="rotate(40 81 59)" />
      </g>
      <Eyes y={58} gap={24} r={6.5} pupil={3.2} />
    </>
  ),
  flugis: () => (
    <>
      <Shadow w={22} />
      <path d="M34 54h32l3 30c0 5-8 7-19 7s-19-2-19-7z" fill="#f4ead6" />
      <path d="M34 84c2 4 8 6 16 6s14-2 16-6c0 5-7 7-16 7s-16-2-16-7z" fill="#d9ccb0" />
      <path d="M8 54C8 30 28 12 50 12s42 18 42 42c0 4-4 6-8 6H16c-4 0-8-2-8-6z" fill="#d6463a" />
      <path d="M14 46C18 28 32 18 46 17c-14 6-24 16-28 30z" fill="#ee6d60" />
      <g fill="#fff">
        <circle cx="30" cy="32" r="5" />
        <circle cx="56" cy="24" r="6" />
        <circle cx="76" cy="40" r="4.5" />
        <circle cx="46" cy="44" r="3.5" />
        <circle cx="20" cy="50" r="3" />
      </g>
      <Eyes y={70} gap={8} r={5} pupil={2.6} />
      <Smile y={79} w={3.5} />
    </>
  ),
  molnet: () => (
    <>
      <Shadow w={34} />
      <path d="M22 84c-10 0-16-7-16-15 0-9 7-15 15-15 0-14 11-24 25-24 10 0 18 5 22 13 2-1 5-1 7-1 11 0 19 8 19 18v2c4 3 6 7 6 11 0 6-5 11-12 11z" fill="#e8f1fb" />
      <path d="M8 74c3 6 8 10 14 10h56c6 0 10-3 12-8-2 7-6 12-13 12H22c-8 0-13-6-14-14z" fill="#bcd3ee" />
      <path d="M30 44c3-7 10-11 17-11-6 3-11 7-13 13z" fill="#fff" />
      <Eyes y={62} gap={14} />
      <ellipse cx="28" cy="72" rx="5" ry="3" fill="#ffb8b0" opacity=".7" />
      <ellipse cx="72" cy="72" rx="5" ry="3" fill="#ffb8b0" opacity=".7" />
      <Smile y={72} w={4.5} />
    </>
  ),
  isbiten: () => (
    <>
      <Shadow w={28} />
      <rect x="18" y="22" width="64" height="66" rx="16" fill="#a8dcf2" />
      <path d="M18 70c0 10 6 18 16 18h32c10 0 16-8 16-18v4c0 8-6 14-16 14H34c-10 0-16-6-16-14z" fill="#76bfe0" />
      <path d="M28 30h18c-8 2-14 8-16 16-2 2-4 0-4-2V34c0-2 1-4 2-4z" fill="#e4f6fd" />
      <path d="M70 30l3 6M74 30l-3 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <Eyes y={56} gap={14} />
      <path d="M44 70h12" stroke="#1b2422" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  taggen: () => (
    <>
      <path d="M28 76h44l-5 18H33z" fill="#c8673c" />
      <rect x="25" y="72" width="50" height="8" rx="3" fill="#e07c4a" />
      <path d="M36 74V30c0-9 6-16 14-16s14 7 14 16v44z" fill="#3f9b5a" />
      <path d="M36 54h-8c-4 0-6-3-6-7V38c0-3 2-5 5-5s5 2 5 5v8h4zM64 46h8V34c0-3 2-5 5-5s5 2 5 5v10c0 4-3 8-8 8h-10z" fill="#3f9b5a" />
      <path d="M42 22c2-4 5-6 8-6-3 3-5 7-5 12z" fill="#6cc27b" />
      <g stroke="#2a6e3e" strokeWidth="2" strokeLinecap="round">
        <path d="M42 64l-2-1M58 64l2-1M44 32l-2-1M57 32l2-1" />
      </g>
      <circle cx="50" cy="13" r="4" fill="#ff7aa8" />
      <Eyes y={44} gap={8} r={5.5} pupil={2.8} />
      <Smile y={55} w={3.5} />
    </>
  ),
  kassetten: () => (
    <>
      <Shadow w={34} />
      <rect x="10" y="24" width="80" height="58" rx="9" fill="#2d3a37" />
      <rect x="18" y="31" width="64" height="30" rx="5" fill="#ffc93c" />
      <rect x="18" y="31" width="64" height="9" rx="4" fill="#ff9b21" />
      <circle cx="35" cy="51" r="9" fill="#fff" />
      <circle cx="65" cy="51" r="9" fill="#fff" />
      <g fill="#1b2422">
        <circle cx="36" cy="52" r="4.2" />
        <circle cx="66" cy="52" r="4.2" />
      </g>
      <path d="M44 51h12" stroke="#1b2422" strokeWidth="2.5" />
      <path d="M26 82l6-12h36l6 12z" fill="#46534f" />
      <circle cx="38" cy="76" r="2" fill="#2d3a37" />
      <circle cx="62" cy="76" r="2" fill="#2d3a37" />
      <path d="M44 66q6 4 12 0" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  lyktan: () => (
    <>
      <Shadow w={24} />
      <path d="M50 4c-6 0-10 4-10 8h20c0-4-4-8-10-8z" fill="#2d3a37" />
      <rect x="30" y="12" width="40" height="8" rx="3" fill="#2d3a37" />
      <rect x="28" y="20" width="44" height="58" rx="10" fill="#ffe9a8" />
      <rect x="28" y="20" width="44" height="58" rx="10" fill="none" stroke="#2d3a37" strokeWidth="5" />
      <path d="M50 30c8 8 12 14 12 22a12 12 0 0 1-24 0c0-8 4-14 12-22z" fill="#ff9b21" />
      <path d="M50 42c4 4 6 7 6 11a6 6 0 0 1-12 0c0-4 2-7 6-11z" fill="#ffd27a" />
      <rect x="26" y="76" width="48" height="10" rx="4" fill="#2d3a37" />
      <circle cx="44" cy="54" r="2.4" fill="#1b2422" />
      <circle cx="56" cy="54" r="2.4" fill="#1b2422" />
    </>
  ),
  malen: () => (
    <>
      <Shadow w={20} />
      <path d="M46 46C30 22 6 22 6 40c0 14 18 20 36 16zM54 46c16-24 40-24 40-6 0 14-18 20-36 16z" fill="#c9b79c" />
      <path d="M44 56C28 58 12 68 18 80c6 10 20 2 28-14zM56 56c16 2 32 12 26 24-6 10-20 2-28-14z" fill="#a8937a" />
      <circle cx="22" cy="38" r="6" fill="#efe4d0" />
      <circle cx="78" cy="38" r="6" fill="#efe4d0" />
      <circle cx="22" cy="38" r="2.6" fill="#7a6650" />
      <circle cx="78" cy="38" r="2.6" fill="#7a6650" />
      <ellipse cx="50" cy="58" rx="12" ry="24" fill="#efe4d0" />
      <path d="M38 64c4 6 8 8 12 8s8-2 12-8c-2 10-6 16-12 16s-10-6-12-16z" fill="#d8c8ae" />
      <path d="M45 36c-4-8-10-12-16-12M55 36c4-8 10-12 16-12" stroke="#7a6650" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <Eyes y={52} gap={6} r={4.5} pupil={2.4} look={0.3} />
    </>
  ),
  blackis: () => (
    <>
      <Shadow w={34} />
      <g fill="#8a63d2">
        <path d="M18 70c-6 4-10 12-6 16 4 3 8-3 12-8z" />
        <path d="M32 74c-2 8-2 14 3 15s6-7 6-13z" />
        <path d="M68 74c2 8 2 14-3 15s-6-7-6-13z" />
        <path d="M82 70c6 4 10 12 6 16-4 3-8-3-12-8z" />
        <path d="M46 76c0 8 1 14 4 14s4-6 4-14z" />
      </g>
      <path d="M14 56c0-24 16-42 36-42s36 18 36 42c0 14-14 22-36 22S14 70 14 56z" fill="#9b74e0" />
      <path d="M24 34c6-10 16-16 26-16-10 4-18 12-22 22z" fill="#b99af0" />
      <path d="M15 60c4 10 16 16 35 16s31-6 35-16c0 12-14 20-35 20S15 72 15 60z" fill="#7a54c2" />
      <g fill="#b99af0">
        <circle cx="70" cy="30" r="3" />
        <circle cx="78" cy="40" r="2" />
      </g>
      <Eyes y={52} gap={14} />
      <Smile y={64} w={4} />
    </>
  ),
  raven: () => (
    <>
      <Shadow w={28} />
      <path d="M14 14l26 18H60l26-18-4 34c0 22-14 40-32 40S18 70 18 48z" fill="#e8742f" />
      <path d="M18 18l14 10-12 6zM82 18l-14 10 12 6z" fill="#2d3a37" />
      <path d="M22 54c6 10 16 16 28 16s22-6 28-16c-2 20-12 34-28 34S24 74 22 54z" fill="#fff4e8" />
      <path d="M44 72h12l-6 6z" fill="#1b2422" />
      <path d="M30 38c4-4 10-6 20-6-8 2-14 6-16 10z" fill="#f69356" />
      <Eyes y={52} gap={14} r={6.5} pupil={3.4} />
    </>
  ),
  kristallen: () => (
    <>
      <Shadow w={26} />
      <path d="M50 6l26 22-6 54H30l-6-54z" fill="#54c6c0" />
      <path d="M50 6l26 22H24z" fill="#8fe0da" />
      <path d="M24 28l26 10 26-10-6 54H50z" fill="#3aa9a3" />
      <path d="M24 28l26 10v44H30z" fill="#54c6c0" />
      <path d="M50 6l-10 22h20z" fill="#c4f3ef" />
      <path d="M50 38v44" stroke="#2b8f8a" strokeWidth="1.5" />
      <Eyes y={54} gap={11} r={6} pupil={3} />
      <path d="M44 68q6 4 12 0" stroke="#1b2422" strokeWidth="2.8" fill="none" strokeLinecap="round" />
    </>
  ),
  dala: () => (
    <>
      <Shadow w={30} />
      <path d="M62 10c10 0 18 8 18 18l-4 14H58L50 30c-4 10-14 16-14 16H22c-4 0-6 4-4 8l4 8v24h10V70h28v18h10V60l8-12c4-6 4-14 0-18z" fill="#c8362d" />
      <path d="M62 10c-4 0-6 2-8 4l6 2c2 0 4-2 4-4z" fill="#2d3a37" />
      <path d="M26 54c6-6 16-6 22 0M40 50c6-6 16-6 22 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M30 58c2 4 6 6 10 6M48 58c2 4 6 6 10 6" stroke="#ffc93c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M74 22l6 2" stroke="#ffc93c" strokeWidth="3" strokeLinecap="round" />
      <circle cx="68" cy="22" r="5" fill="#fff" />
      <circle cx="69" cy="23" r="2.6" fill="#1b2422" />
      <path d="M58 40l4 6-6 4" stroke="#2d6ac9" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  kometen: () => (
    <>
      <path d="M6 20c20 4 34 14 40 26L28 56C24 40 16 28 6 20z" fill="#ffc93c" opacity=".55" />
      <path d="M2 40c18 0 32 6 38 14l-12 10C24 52 14 44 2 40z" fill="#ff9b21" opacity=".5" />
      <circle cx="58" cy="58" r="30" fill="#ff9b21" />
      <path d="M36 50c4-12 14-20 26-20-10 4-18 10-22 20z" fill="#ffc93c" />
      <path d="M30 66c4 12 16 20 30 20s24-8 27-20c-1 14-13 24-29 24S31 80 30 66z" fill="#d27410" />
      <Eyes y={56} gap={11} cx={60} r={6.5} pupil={3.4} />
      <Smile x={60} y={69} w={4} />
    </>
  ),
  norrsken: () => (
    <>
      <Shadow w={30} />
      <path d="M22 40C18 22 26 8 34 6c-2 10 2 18 8 22-2-10 2-20 10-24 0 10 4 18 10 22 0-8 4-14 10-16-2 10 2 22-2 30z" fill="#43d6a0" />
      <path d="M30 36c0-10 4-18 10-22-1 8 1 14 6 18M56 32c2-8 6-14 12-16-1 7 0 14-2 20" fill="#9cf0cf" opacity=".8" />
      <path d="M16 70c0-22 14-36 34-36s34 14 34 36c0 14-14 20-34 20S16 84 16 70z" fill="#22356e" />
      <path d="M17 74c4 9 16 14 33 14s29-5 33-14c-1 11-13 16-33 16S18 85 17 74z" fill="#16244f" />
      <g fill="#fff">
        <circle cx="26" cy="56" r="1.3" />
        <circle cx="74" cy="60" r="1.6" />
        <circle cx="66" cy="44" r="1" />
        <circle cx="32" cy="80" r="1" />
      </g>
      <Eyes y={64} gap={13} r={7} pupil={3.4} />
      <path d="M45 76q5 3 10 0" stroke="#9cf0cf" strokeWidth="2.8" fill="none" strokeLinecap="round" />
    </>
  ),
  tomten: () => (
    <>
      <Shadow w={28} />
      <path d="M50 4C38 16 24 40 18 60h64C76 40 62 16 50 4z" fill="#d6463a" />
      <path d="M50 4c-4 8-10 18-14 30 6-10 12-20 14-30z" fill="#ee6d60" />
      <rect x="14" y="56" width="72" height="12" rx="6" fill="#f4ead6" />
      <path d="M20 66c0 14 12 26 30 26s30-12 30-26z" fill="#f8f3e9" />
      <path d="M20 66c2 6 6 10 12 13-6-1-10-6-12-13zM80 66c-2 6-6 10-12 13 6-1 10-6 12-13z" fill="#ddd2bd" />
      <ellipse cx="50" cy="70" rx="8" ry="6.5" fill="#f2a28f" />
      <ellipse cx="47" cy="68" rx="2.5" ry="1.8" fill="#f8c4b6" />
    </>
  ),
  fjallis: () => (
    <>
      <Shadow w={30} />
      <path d="M20 88V48c0-18 13-32 30-32s30 14 30 32v40c-5-4-10-4-15 0-5-4-10-4-15 0-5-4-10-4-15 0-5-4-10-4-15 0z" fill="#f3efe6" />
      <path d="M26 40c3-12 12-20 24-20-10 4-17 11-20 22z" fill="#fff" />
      <path d="M20 76v12c5-4 10-4 15 0 5-4 10-4 15 0 5-4 10-4 15 0 5-4 10-4 15 0V76c-4 5-10 6-15 2-5 4-10 4-15 0-5 4-10 4-15 0-5 4-11 3-15-2z" fill="#dcd5c6" />
      <rect x="28" y="40" width="44" height="18" rx="9" fill="#1b2422" />
      <circle cx="40" cy="49" r="4" fill="#43d6a0" />
      <circle cx="60" cy="49" r="4" fill="#43d6a0" />
    </>
  ),
  solen: () => (
    <>
      <g fill="#ffc93c">
        {Array.from({ length: 10 }, (_, i) => (
          <path key={i} d="M50 4l6 14H44z" transform={`rotate(${i * 36} 50 50)`} />
        ))}
      </g>
      <circle cx="50" cy="50" r="30" fill="#ff9b21" />
      <path d="M28 40c4-10 12-16 22-16-8 4-14 10-17 18z" fill="#ffc93c" />
      <rect x="28" y="40" width="44" height="12" rx="5" fill="#1b2422" />
      <path d="M50 44v4" stroke="#1b2422" strokeWidth="3" />
      <rect x="31" y="42" width="7" height="3" rx="1.5" fill="#46534f" />
      <rect x="54" y="42" width="7" height="3" rx="1.5" fill="#46534f" />
      <Smile y={62} w={6} />
    </>
  ),
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
      {draw()}
    </svg>
  );
}
