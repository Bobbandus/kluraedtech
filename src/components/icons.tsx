import type { ReactNode } from "react";

/**
 * Klura-ikoner. Ritade för 24×24 med 2.2 i linjebredd och rundade ändar,
 * så att de passar ihop med det rundade typsnittet.
 */
const P: Record<string, ReactNode> = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  play: <path d="M8 5.5v13a.8.8 0 0 0 1.2.7l10.3-6.5a.8.8 0 0 0 0-1.4L9.2 4.8A.8.8 0 0 0 8 5.5z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  bookmark: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M3 19.5c.6-3.3 3-5 6-5s5.4 1.7 6 5" />
      <path d="M15.5 5.3a3.4 3.4 0 0 1 0 6.4M17.5 14.8c1.8.6 3 2.2 3.5 4.7" />
    </>
  ),
  chart: <path d="M5 19V11M10 19V5M15 19v-6M20 19V9" />,
  edit: <path d="M14.5 5.5 18.5 9.5M4.5 19.5l1-4.5L15.8 4.7a1.8 1.8 0 0 1 2.5 0l1 1a1.8 1.8 0 0 1 0 2.5L9 18.5z" />,
  trash: <path d="M5 7h14M10 7V4.5h4V7M7 7l1 12.5h8L17 7M10.5 11v5M13.5 11v5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronUp: <path d="m6 15 6-6 6 6" />,
  shield: <path d="M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6z" />,
  wind: <path d="M3.5 9h11a3 3 0 1 0-3-3M3.5 14.5h14a3 3 0 1 1-3 3M3.5 12h7" />,
  focus: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    </>
  ),
  hourglass: <path d="M7 3.5h10M7 20.5h10M8 3.5c0 4.5 8 4.5 8 8.5s-8 4-8 8.5M16 3.5c0 4.5-8 4.5-8 8.5" />,
  duel: <path d="M4 4l9 9M4 4h4M4 4v4M20 4l-9 9M20 4h-4M20 4v4M7 14l3 3M17 14l-3 3M5.5 18.5l2-2M18.5 18.5l-2-2" />,
  hook: <path d="M15 3.5v9a4.5 4.5 0 1 1-9 0V10l-2.5 2.5M15 3.5h3" />,
  copy: (
    <>
      <rect x="8" y="8" width="11.5" height="11.5" rx="2.5" />
      <path d="M15.5 8V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" />
    </>
  ),
  logout: <path d="M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4M10 16.5 5.5 12 10 7.5M5.5 12H15" />,
  grid: <path d="M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z" />,
  image: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <path d="m3.5 16 4.5-4.5 4 4 3-3 5 5" />
      <circle cx="15.5" cy="9.5" r="1.5" />
    </>
  ),
  flag: <path d="M6 21V4M6 4.5h11l-2.5 4 2.5 4H6" />,
  mountain: <path d="M2.5 19.5 9.5 7l3.5 6 2-3 6.5 9.5z" />,
  trophy: <path d="M8 4.5h8v5a4 4 0 0 1-8 0zM8 6.5H5a3 3 0 0 0 3 4M16 6.5h3a3 3 0 0 1-3 4M12 13.5v3.5M8.5 20h7M10 17h4v3h-4z" />,
  star: <path d="m12 4 2.4 5 5.4.7-4 3.7 1 5.4L12 16.2l-4.8 2.6 1-5.4-4-3.7 5.4-.7z" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: <path d="M3.5 3.5l17 17M10 6c.6-.1 1.3-.2 2-.2 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.8 3.6M6.5 7.3C4 9 2.5 12 2.5 12S6 18.5 12 18.5c1.5 0 2.9-.4 4-1M9.8 9.9a3 3 0 0 0 4.3 4.2" />,
  user: (
    <>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20c.8-3.8 3.7-6 7.5-6s6.7 2.2 7.5 6" />
    </>
  ),
  book: <path d="M12 6.5C10.5 5 8 4.5 4 4.5v14c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-14c-4 0-6.5.5-8 2zM12 6.5v14" />,
  bolt: <path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  bag: <path d="M5 8h14l-1 12H6zM9 8V6.5a3 3 0 0 1 6 0V8" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  external: <path d="M14 4.5h5.5V10M19.5 4.5 11 13M17.5 14v4.5a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18.5V8.5A1.5 1.5 0 0 1 6 7h4.5" />,
  shuffle: <path d="M3.5 7h3.5c4 0 6 10 10 10h3.5M17.5 14l3 3-3 3M3.5 17h3.5c1.4 0 2.6-1.2 3.6-2.8M13.4 9.8C14.4 8.2 15.6 7 17 7h3.5M17.5 4l3 3-3 3" />,
  repeat: <path d="M4.5 11V9.5a3 3 0 0 1 3-3h12M16.5 3.5l3 3-3 3M19.5 13v1.5a3 3 0 0 1-3 3h-12M7.5 20.5l-3-3 3-3" />,
  volume: <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3zM15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.2" />
    </>
  ),
  dots: <path d="M6 12h.01M12 12h.01M18 12h.01" />,
  sparkle: <path d="M12 3.5c.5 4.5 2.5 7 7 8.5-4.5 1.5-6.5 4-7 8.5-.5-4.5-2.5-7-7-8.5 4.5-1.5 6.5-4 7-8.5z" />,
  upload: <path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" />,
  drag: <path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" />,
  maximize: <path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15" />,
};

export type IconName = keyof typeof P;

export function Icon({
  name,
  size = 20,
  stroke = 2.2,
  className,
  label,
  style,
}: {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  label?: string;
  style?: React.CSSProperties;
}) {
  const isDots = name === "dots" || name === "drag";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={isDots ? 3.2 : stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: "none", ...style }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {P[name]}
    </svg>
  );
}
