"use client";

import { useRef, useState } from "react";

/**
 * Diagram för lärarvyn. En serie per diagram – titeln säger vad som visas,
 * så ingen legend behövs. Seriefärgen är validerad mot ytan (dataviz-check).
 */
export const SERIES = "#15895a";
const GRID = "#ebe6dc";
const AXIS_TEXT = "#6f7a77";

export interface LinePoint {
  label: string;
  value: number; // 0–1
  detail?: string;
}

export function LineChart({ points, height = 220, ariaLabel }: { points: LinePoint[]; height?: number; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const W = 640;
  const H = height;
  const pad = { l: 40, r: 44, t: 16, b: 30 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const n = points.length;
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + (1 - v) * ih;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = n ? `${line} L${x(n - 1)} ${y(0)} L${x(0)} ${y(0)} Z` : "";
  const last = points[n - 1];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bd = Infinity;
    points.forEach((_, i) => {
      const d = Math.abs(x(i) - px);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    setHover(best);
  };

  const hp = hover !== null ? points[hover] : null;
  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={ariaLabel}
        style={{ display: "block", height: "auto", touchAction: "pan-y" }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        tabIndex={0}
        onFocus={() => setHover(n - 1)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
          if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
        }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth={1} />
            <text x={pad.l - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={AXIS_TEXT}>
              {Math.round(v * 100)} %
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill={AXIS_TEXT}>
            {p.label}
          </text>
        ))}
        <path d={area} fill={SERIES} opacity={0.1} />
        <path d={line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke="#a3aba8" strokeWidth={1} />}
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : 4} fill={SERIES} stroke="#fff" strokeWidth={2} />
        ))}
        {last && (
          <text x={x(n - 1) + 10} y={y(last.value)} dominantBaseline="middle" fontSize={13} fontWeight={800} fill="#1b2422">
            {Math.round(last.value * 100)} %
          </text>
        )}
      </svg>
      {hp && hover !== null && (
        <div
          role="status"
          style={{
            position: "absolute",
            left: `${(x(hover) / W) * 100}%`,
            top: 0,
            transform: `translate(${hover > n / 2 ? "-105%" : "8%"}, 0)`,
            background: "var(--card)",
            border: "2px solid var(--line)",
            borderRadius: 12,
            boxShadow: "var(--shadow-2)",
            padding: "8px 10px",
            pointerEvents: "none",
            minWidth: 150,
            maxWidth: 240,
            fontSize: "0.85rem",
          }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.15rem" }}>{Math.round(hp.value * 100)} % rätt</div>
          <div className="row gap-4" style={{ color: "var(--ink-2)" }}>
            <span style={{ width: 12, height: 2, background: SERIES, borderRadius: 1 }} aria-hidden="true" />
            {hp.label}
          </div>
          {hp.detail && <div className="muted">{hp.detail}</div>}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, width = 96, height = 28 }: { values: (number | null)[]; width?: number; height?: number }) {
  const pts = values.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (pts.length < 2) return <span className="muted" style={{ fontSize: "0.8rem" }}>–</span>;
  const n = values.length;
  const x = (i: number) => 4 + (i / Math.max(1, n - 1)) * (width - 8);
  const y = (v: number) => 4 + (1 - v) * (height - 8);
  const d = pts.map((p, k) => `${k ? "L" : "M"}${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const end = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <line x1={4} x2={width - 4} y1={y(0.5)} y2={y(0.5)} stroke={GRID} strokeWidth={1} />
      <path d={d} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(end.i)} cy={y(end.v)} r={3.5} fill={SERIES} stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
}

/** Trendpil med text – färg är aldrig enda bäraren. */
export function Trend({ value }: { value: number | null }) {
  if (value === null) return <span className="chip">Ny klass</span>;
  const pts = Math.round(value * 100);
  if (Math.abs(pts) < 2) return <span className="chip">→ Stabil</span>;
  return pts > 0 ? <span className="chip chip-ok">↑ {pts} %-enheter</span> : <span className="chip chip-warn">↓ {Math.abs(pts)} %-enheter</span>;
}
