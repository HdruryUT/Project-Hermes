import { useState, useId } from "react";
import { weeklyMiles } from "../data/plan.js";

// Hand-rolled inline-SVG bar chart — emphasis form: one hue (the current week) +
// gray (every other week as context). No legend needed for a single series; the
// card's own title/subtitle name what's plotted. Colors are the app's existing
// CSS custom properties, so light/dark both fall out for free.

const VW = 720;
const VH = 210;
const PAD = { top: 26, right: 8, bottom: 28, left: 34 };
const BAR_MAX = 24; // cap — never fill the slot, let the leftover be air
const RADIUS = 4; // rounded top, square baseline

function niceMax(raw) {
  return Math.max(10, Math.ceil(raw / 10) * 10);
}

// Catmull-Rom-ish smoothing through a series of points — gives the gentle curve of a
// typical activity-tracker chart instead of sharp straight-line segments.
function smoothPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function MileageChart({ plan, activeWeekIndex = null, actual = null }) {
  const [hover, setHover] = useState(null);
  const gradientId = useId();

  const weeks = plan.map((w) => ({
    week: w.week,
    dates: w.dates,
    phase: w.phase,
    miles: weeklyMiles(w),
  }));

  const plotW = VW - PAD.left - PAD.right;
  const plotH = VH - PAD.top - PAD.bottom;
  const baselineY = PAD.top + plotH;
  const actualValues = (actual || []).filter((v) => v != null);
  const max = niceMax(Math.max(...weeks.map((w) => w.miles), ...actualValues));
  const slotW = plotW / weeks.length;
  const yFor = (v) => baselineY - (v / max) * plotH;
  const xFor = (i) => PAD.left + i * slotW + slotW / 2;

  const actualPoints = actual
    ? actual.map((v, i) => (v == null ? null : { i, x: xFor(i), y: yFor(v), v })).filter(Boolean)
    : [];
  const lastActual = actualPoints[actualPoints.length - 1] || null;
  const areaPath = actualPoints.length > 1
    ? `${smoothPath(actualPoints)} L ${actualPoints[actualPoints.length - 1].x} ${baselineY} L ${actualPoints[0].x} ${baselineY} Z`
    : "";

  const ticks = [0, max / 2, max];

  const hoveredWeek = hover != null ? weeks[hover] : null;
  const hoveredActual = hover != null && actual ? actual[hover] : null;
  const tw = hoveredActual != null ? 140 : 122;
  const th = hoveredActual != null ? 54 : 40;
  const hoverSlotX = hover != null ? PAD.left + hover * slotW : 0;
  const tipCx = hover != null
    ? Math.min(Math.max(hoverSlotX + slotW / 2, PAD.left + tw / 2 + 2), VW - PAD.right - tw / 2 - 2)
    : 0;
  const tipTopY = hover != null
    ? Math.max(2, Math.min(yFor(hoveredWeek.miles), hoveredActual != null ? yFor(hoveredActual) : Infinity) - th - 8)
    : 0;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
      role="img"
      aria-label="Planned miles per week across the training plan"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={VW - PAD.right} y1={yFor(t)} y2={yFor(t)} stroke="var(--line)" strokeWidth="1" />
          <text x={PAD.left - 6} y={yFor(t) + 3} textAnchor="end" fontSize="10" fill="var(--muted)">{t}</text>
        </g>
      ))}

      {weeks.map((w, i) => {
        const slotX = PAD.left + i * slotW;
        const barX = slotX + (slotW - BAR_MAX) / 2;
        const barTopY = yFor(w.miles);
        const barH = baselineY - barTopY;
        const r = Math.min(RADIUS, barH / 2, BAR_MAX / 2);
        const isActive = i === activeWeekIndex;
        const isHover = i === hover;
        const fill = isActive ? "var(--blue)" : "var(--muted)";

        return (
          <g key={w.week}>
            <rect x={barX} y={barTopY} width={BAR_MAX} height={barH} rx={r} ry={r} fill={fill} opacity={isActive ? 1 : 0.55} />
            {barH > r && (
              <rect x={barX} y={barTopY + r} width={BAR_MAX} height={Math.max(0, barH - r)} fill={fill} opacity={isActive ? 1 : 0.55} />
            )}
            {isHover && (
              <rect
                x={barX - 2} y={barTopY - 2} width={BAR_MAX + 4} height={barH + 2} rx={r + 2} ry={r + 2}
                fill="none" stroke="var(--ink)" strokeOpacity="0.35" strokeWidth="1.5"
              />
            )}
            {isActive && hover !== i && (
              <text x={slotX + slotW / 2} y={barTopY - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ink)">
                {w.miles}
              </text>
            )}
            <text x={slotX + slotW / 2} y={baselineY + 16} textAnchor="middle" fontSize="10" fill="var(--muted)">
              W{w.week}
            </text>

            {/* Generous hit target — the whole slot column, not just the thin bar */}
            <rect
              x={slotX} y={PAD.top} width={slotW} height={plotH}
              fill="transparent"
              tabIndex={0}
              role="button"
              aria-label={`Week ${w.week}, ${w.dates}, ${w.phase} phase, ${w.miles} miles planned`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              style={{ cursor: "pointer" }}
            />
          </g>
        );
      })}

      {/* Actual mileage overlay — Strava-style filled line, drawn over the planned bars */}
      {actualPoints.length > 1 && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--blue)", stopOpacity: 0.35 }} />
              <stop offset="100%" style={{ stopColor: "var(--blue)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          <path d={smoothPath(actualPoints)} fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinecap="round" />
          {actualPoints.map((p) => (
            <circle
              key={p.i} cx={p.x} cy={p.y}
              r={p === lastActual ? 5 : 3}
              fill={p === lastActual ? "var(--blue)" : "var(--card)"}
              stroke="var(--blue)" strokeWidth="2"
            />
          ))}
          {lastActual && (
            <text
              x={Math.min(lastActual.x + 8, VW - PAD.right - 2)} y={lastActual.y - 8}
              textAnchor={lastActual.x > VW - PAD.right - 40 ? "end" : "start"}
              fontSize="11" fontWeight="700" fill="var(--blue)"
            >
              {lastActual.v} mi
            </text>
          )}
        </>
      )}

      {hoveredWeek && (
        <g pointerEvents="none">
          <rect x={tipCx - tw / 2} y={tipTopY} width={tw} height={th} rx="8" fill="var(--solid)" />
          <text x={tipCx} y={tipTopY + 16} textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
            Week {hoveredWeek.week} · {hoveredWeek.miles} mi{hoveredActual != null ? " planned" : ""}
          </text>
          {hoveredActual != null ? (
            <text x={tipCx} y={tipTopY + 31} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--amber)">
              {hoveredActual} mi actual
            </text>
          ) : null}
          <text x={tipCx} y={tipTopY + th - 8} textAnchor="middle" fontSize="10" fill="#fff" opacity="0.85">
            {hoveredWeek.dates} · {hoveredWeek.phase}
          </text>
        </g>
      )}
    </svg>
  );
}
