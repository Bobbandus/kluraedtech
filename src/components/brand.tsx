import Link from "next/link";

/** Klura-märket: ett rundat fjäll med en flagga på toppen. */
export function LogoMark({ size = 32, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect x="0" y="0" width="40" height="40" rx="11" fill="#12735a" />
      <path d="M6.5 31.5 L16.2 15.4 a2.6 2.6 0 0 1 4.5 0 L23.6 20.3 L26 16.8 a2.2 2.2 0 0 1 3.7 0 L35 25.5 V31.5 Z" fill="#fff" />
      <path d="M16.2 15.4 a2.6 2.6 0 0 1 4.5 0 L23.6 20.3 L21.2 23.1 L18.4 20.2 L15.3 22.6 L13.2 20.5 Z" fill="#c9e6d9" />
      <path d="M18.45 13.9 V6.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19.2 6.4 L25.2 8.3 L19.2 10.4 Z" fill="#ff9b21" />
    </svg>
  );
}

export function Wordmark({ href = "/", size = 30, light = false }: { href?: string; size?: number; light?: boolean }) {
  return (
    <Link href={href} className="wordmark" aria-label="Klura – startsida" style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <LogoMark size={size} />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: size * 0.82,
          letterSpacing: "-0.03em",
          color: light ? "#fff" : "var(--ink)",
          lineHeight: 1,
          transform: "translateY(-1px)",
        }}
      >
        klura
      </span>
    </Link>
  );
}

/** Gnista — den permanenta valutan. En fyruddig gnista med varm kärna. */
export function GnistaIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M12 1.8c.6 0 1 .4 1.2 1l1.5 5.1c.2.6.6 1 1.2 1.2l5.1 1.5c.6.2 1 .7 1 1.4s-.4 1.2-1 1.4l-5.1 1.5c-.6.2-1 .6-1.2 1.2l-1.5 5.1c-.2.6-.6 1-1.2 1s-1-.4-1.2-1l-1.5-5.1c-.2-.6-.6-1-1.2-1.2l-5.1-1.5c-.6-.2-1-.7-1-1.4s.4-1.2 1-1.4l5.1-1.5c.6-.2 1-.6 1.2-1.2l1.5-5.1c.2-.6.6-1 1.2-1z"
        fill="#ff9b21"
      />
      <path d="M12 6.2l1 3.4c.2.8.8 1.4 1.6 1.6l3.4 1-3.4 1c-.8.2-1.4.8-1.6 1.6l-1 3.4-1-3.4c-.2-.8-.8-1.4-1.6-1.6l-3.4-1 3.4-1c.8-.2 1.4-.8 1.6-1.6z" fill="#ffd27a" />
      <circle cx="12" cy="12" r="1.6" fill="#fff6e3" />
    </svg>
  );
}

export function Gnistor({ amount, size = 18, strong = true }: { amount: number; size?: number; strong?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: strong ? 750 : 600, fontVariantNumeric: "tabular-nums" }}>
      <GnistaIcon size={size} />
      {amount.toLocaleString("sv-SE")}
      <span className="sr-only"> gnistor</span>
    </span>
  );
}

/** Plus-märke för framtida premiumfunktioner — diskret. */
export function PlusBadge({ small }: { small?: boolean }) {
  return (
    <span className="chip chip-plus" style={small ? { height: 22, fontSize: "0.72rem", padding: "0 8px" } : undefined}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M5 1v8M1 5h8" stroke="#ff9b21" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      Plus
    </span>
  );
}
