import type { ReactNode } from "react";

export type Subject =
  | "historia"
  | "matematik"
  | "engelska"
  | "biologi"
  | "geografi"
  | "kemi"
  | "fysik"
  | "svenska"
  | "samhalle"
  | "musik"
  | "slojd";

export const SUBJECTS: Record<Subject, { label: string; bg: string; fg: string }> = {
  historia: { label: "Historia", bg: "#f3dfc4", fg: "#8a4b1d" },
  matematik: { label: "Matematik", bg: "#d7e5fb", fg: "#1f519f" },
  engelska: { label: "Engelska", bg: "#fbd9d4", fg: "#a93127" },
  biologi: { label: "Biologi", bg: "#d6efdc", fg: "#1d6b3c" },
  geografi: { label: "Geografi", bg: "#cfeaea", fg: "#16656a" },
  kemi: { label: "Kemi", bg: "#ece2fa", fg: "#5a3ea6" },
  fysik: { label: "Fysik", bg: "#fff0c7", fg: "#8a6400" },
  svenska: { label: "Svenska", bg: "#dde9f6", fg: "#24507d" },
  samhalle: { label: "Samhällskunskap", bg: "#f7e3d0", fg: "#8b4513" },
  musik: { label: "Musik", bg: "#f9dceb", fg: "#962d63" },
  slojd: { label: "Slöjd", bg: "#efe3d3", fg: "#7a5230" },
};

const MOTIF: Record<Subject, (fg: string) => ReactNode> = {
  slojd: (fg) => (
    <>
      <rect x="104" y="40" width="60" height="58" rx="8" fill={fg} opacity=".85" />
      <rect x="104" y="40" width="60" height="58" rx="8" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="6 5" opacity=".7" />
      <path d="M176 100 222 30" stroke={fg} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="219" cy="35" rx="3" ry="6" fill="#fff" transform="rotate(33 219 35)" />
      <path d="M176 100c-8 10-26 12-40 6s-30-2-38 8" stroke={fg} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".6" />
    </>
  ),
  historia: (fg) => (
    <>
      <path d="M118 72h84l-8 22h-68z" fill={fg} opacity=".9" />
      <path d="M160 18v54" stroke={fg} strokeWidth="5" strokeLinecap="round" />
      <path d="M162 22c18 6 26 20 26 40h-26z" fill="#fff" />
      <path d="M158 28c-14 6-22 18-22 34h22z" fill="#fff" opacity=".8" />
      <path d="M96 104c20-6 40-6 64 0s44 6 64 0" stroke={fg} strokeWidth="4" fill="none" opacity=".35" strokeLinecap="round" />
    </>
  ),
  matematik: (fg) => (
    <>
      <circle cx="122" cy="62" r="30" fill={fg} opacity=".85" />
      <rect x="160" y="30" width="56" height="56" rx="8" fill="#fff" transform="rotate(12 188 58)" />
      <path d="M176 58h24M188 46v24" stroke={fg} strokeWidth="6" strokeLinecap="round" transform="rotate(12 188 58)" />
      <path d="M104 106l22-36 22 36z" fill="#ff9b21" />
    </>
  ),
  engelska: (fg) => (
    <>
      <rect x="102" y="24" width="86" height="56" rx="16" fill="#fff" />
      <path d="M124 80l-4 18 18-18z" fill="#fff" />
      <text x="145" y="62" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="28" fill={fg}>Hi!</text>
      <rect x="168" y="62" width="62" height="42" rx="14" fill={fg} />
      <text x="199" y="90" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="18" fill="#fff">Hej!</text>
    </>
  ),
  biologi: (fg) => (
    <>
      <path d="M150 104c-30-18-48-34-48-54 0-14 10-24 22-24 10 0 18 6 26 16 8-10 16-16 26-16 12 0 22 10 22 24 0 20-18 36-48 54z" fill={fg} opacity=".85" />
      <path d="M112 62h18l8-14 10 28 8-14h32" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  geografi: (fg) => (
    <>
      <path d="M90 108l42-66 22 32 16-22 40 56z" fill={fg} opacity=".9" />
      <path d="M132 42l12 18-8-4-6 8-6-6-6 4z" fill="#fff" />
      <path d="M170 52l9 12-6-2-5 5-4-4-5 2z" fill="#fff" />
      <circle cx="206" cy="36" r="12" fill="#ff9b21" />
    </>
  ),
  kemi: (fg) => (
    <>
      <path d="M138 22h28M144 22v28l-26 46c-3 6 1 12 8 12h52c7 0 11-6 8-12l-26-46V22" fill="#fff" stroke={fg} strokeWidth="5" strokeLinejoin="round" />
      <path d="M126 80h52l10 18c2 4-1 8-6 8h-60c-5 0-8-4-6-8z" fill={fg} opacity=".85" />
      <circle cx="148" cy="88" r="5" fill="#fff" />
      <circle cx="162" cy="76" r="3.5" fill="#fff" />
      <circle cx="198" cy="40" r="7" fill={fg} opacity=".4" />
    </>
  ),
  fysik: (fg) => (
    <>
      <ellipse cx="156" cy="62" rx="52" ry="18" fill="none" stroke={fg} strokeWidth="5" />
      <ellipse cx="156" cy="62" rx="52" ry="18" fill="none" stroke={fg} strokeWidth="5" transform="rotate(60 156 62)" />
      <ellipse cx="156" cy="62" rx="52" ry="18" fill="none" stroke={fg} strokeWidth="5" transform="rotate(-60 156 62)" />
      <circle cx="156" cy="62" r="10" fill="#ff9b21" />
    </>
  ),
  svenska: (fg) => (
    <>
      <path d="M104 34c18-6 34-6 52 4v66c-18-10-34-10-52-4z" fill="#fff" />
      <path d="M208 34c-18-6-34-6-52 4v66c18-10 34-10 52-4z" fill={fg} opacity=".85" />
      <path d="M114 50c10-3 20-3 32 2M114 64c10-3 20-3 32 2M114 78c10-3 20-3 32 2" stroke={fg} strokeWidth="3.5" strokeLinecap="round" opacity=".5" />
      <text x="182" y="76" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="900" fontSize="26" fill="#fff">Å</text>
    </>
  ),
  samhalle: (fg) => (
    <>
      <path d="M100 52l56-30 56 30z" fill={fg} opacity=".9" />
      <rect x="108" y="52" width="96" height="8" fill={fg} opacity=".9" />
      <g fill="#fff">
        <rect x="116" y="62" width="12" height="34" rx="3" />
        <rect x="140" y="62" width="12" height="34" rx="3" />
        <rect x="164" y="62" width="12" height="34" rx="3" />
        <rect x="188" y="62" width="12" height="34" rx="3" />
      </g>
      <rect x="102" y="96" width="108" height="10" rx="3" fill={fg} opacity=".9" />
    </>
  ),
  musik: (fg) => (
    <>
      <path d="M146 30l56-12v62" stroke={fg} strokeWidth="7" fill="none" strokeLinejoin="round" />
      <path d="M146 30v62" stroke={fg} strokeWidth="7" />
      <ellipse cx="134" cy="94" rx="15" ry="11" fill={fg} />
      <ellipse cx="190" cy="82" rx="15" ry="11" fill={fg} />
      <path d="M146 44l56-12" stroke={fg} strokeWidth="7" />
    </>
  ),
};

/** Egna motiv för enskilda quiz (så att quiz i samma ämne inte ser likadana ut). */
const EXTRA: Record<string, (fg: string) => ReactNode> = {
  vag: (fg) => (
    <>
      <path d="M120 20v74M96 98h48" stroke={fg} strokeWidth="6" strokeLinecap="round" />
      <path d="M76 36h88" stroke={fg} strokeWidth="5" strokeLinecap="round" />
      <path d="M80 38 66 72h28zM160 38l-14 34h28z" fill="none" stroke={fg} strokeWidth="3" strokeLinejoin="round" />
      <path d="M62 72a18 9 0 0 0 36 0zM142 72a18 9 0 0 0 36 0z" fill={fg} />
      <circle cx="120" cy="20" r="6" fill="#fff" />
    </>
  ),
  valurna: (fg) => (
    <>
      <path d="M104 22h34l10 10v30h-44z" fill="#fff" />
      <path d="M114 36h22M114 44h16" stroke={fg} strokeWidth="3" strokeLinecap="round" opacity=".6" />
      <rect x="84" y="52" width="80" height="50" rx="8" fill={fg} />
      <rect x="104" y="58" width="40" height="5" rx="2.5" fill="#fff" opacity=".85" />
    </>
  ),
  jordglob: (fg) => (
    <>
      <circle cx="120" cy="60" r="38" fill={fg} />
      <path d="M82 60h76M120 22c-14 12-14 64 0 76M120 22c14 12 14 64 0 76" stroke="#fff" strokeWidth="3" fill="none" opacity=".75" />
      <circle cx="152" cy="86" r="17" fill="#fff" />
      <path d="M152 96s-10-6-10-12c0-4 3-6 6-6 2 0 3.5 1.2 4 2.5.5-1.3 2-2.5 4-2.5 3 0 6 2 6 6 0 6-10 12-10 12z" fill={fg} />
    </>
  ),
  mynt: (fg) => (
    <>
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx="104" cy={92 - i * 12} rx="26" ry="9" fill={i % 2 ? "#fff" : fg} stroke={fg} strokeWidth="3" />
      ))}
      <circle cx="150" cy="56" r="24" fill={fg} />
      <text x="150" y="64" textAnchor="middle" fontSize="24" fontWeight="900" fill="#fff" fontFamily="system-ui">kr</text>
    </>
  ),
  borg: (fg) => (
    <>
      <path d="M78 102V48h12v10h10V48h12v10h16V48h12v10h10V48h12v54z" fill={fg} />
      <path d="M110 102V80a10 10 0 0 1 20 0v22z" fill="#fff" />
      <path d="M120 48V22l22 7-22 7" fill="#fff" stroke={fg} strokeWidth="2" />
    </>
  ),
  sag: (fg) => (
    <>
      <path d="M70 72 170 40l6 18-100 32z" fill="#fff" stroke={fg} strokeWidth="3" strokeLinejoin="round" />
      <path d="M76 90l4 8 6-11 6 8 6-11 6 8 6-11 6 8 6-11 6 8 6-11 6 8 6-11 6 8 6-11" stroke={fg} strokeWidth="2.5" fill="none" strokeLinejoin="round" opacity=".7" />
      <rect x="162" y="30" width="34" height="40" rx="10" fill={fg} transform="rotate(-18 179 50)" />
    </>
  ),
};

export function CoverArt({ subject, className, rounded = 16, height, motif }: { subject: Subject; className?: string; rounded?: number; height?: number | string; motif?: string }) {
  const s = SUBJECTS[subject] ?? SUBJECTS.historia;
  return (
    <svg
      viewBox="0 0 240 120"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ width: "100%", height: height ?? "auto", borderRadius: rounded, background: s.bg, display: "block" }}
      aria-hidden="true"
    >
      <circle cx="26" cy="104" r="44" fill="#fff" opacity=".35" />
      <circle cx="232" cy="8" r="26" fill="#fff" opacity=".3" />
      {(motif && EXTRA[motif] ? EXTRA[motif] : MOTIF[subject])(s.fg)}
    </svg>
  );
}
