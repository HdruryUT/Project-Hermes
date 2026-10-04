// Turns the race pacing plan + gel timing into an Apple Watch Custom Workout: a list of
// distance-goal segments, each with a pace-range alert, ending exactly where something
// happens (take a gel, the climb starts/ends, the finish). On race day the wrist buzzes at
// each segment change, so the phone never has to come out.
//
// Sub-3 lock: the pace ranges are set so that running the SLOWEST pace each alert allows,
// on every segment, still finishes under 3:00 — with GPS/tangent slack (watches usually log a
// marathon ~0.5–1% long) and a 30-second cushion. Staying inside the alerts = sub-3.
import { parsePace, fmtPaceMinSec } from "./fuel.js";

export const GEL_INTERVALS = [20, 25, 30, 35]; // minutes between gels
export const SUB3 = {
  capSec: 2 * 3600 + 59 * 60 + 30, // worst case 2:59:30
  distanceFactor: 1.006,           // ~26.36 mi on the watch for a 26.2 course
};
const WIDTH = { down: 10, climb: 20 }; // seconds/mile between the fast and slow edge of each alert
const RACE_MI = 26.2;

// Scale the plan's section paces so the slow edges sum (over the padded distance) to the cap,
// keeping the downhill / climb / downhill shape. Slow edges are rounded DOWN to whole seconds,
// so the guarantee holds after rounding.
export function sub3Sections(sections) {
  const raw = sections.map((s) => ({ ...s, len: s.to - s.from, hi: parsePace(s.hi) }));
  const slowTotal = raw.reduce((a, s) => a + s.len * s.hi, 0) * SUB3.distanceFactor;
  const k = Math.min(1, SUB3.capSec / slowTotal);
  return raw.map((s) => {
    const hi = Math.floor(s.hi * k);
    const lo = hi - (WIDTH[s.terrain] ?? 10);
    return { ...s, lo, hi, mid: (lo + hi) / 2 };
  });
}

export function buildWatchPlan(sections, { gelEveryMin = 25, firstGelMin = gelEveryMin, gel, chew } = {}) {
  const secs = sub3Sections(sections);
  const sectionAt = (mi) => secs.find((s) => mi >= s.from && mi < s.to) || secs[secs.length - 1];

  // Walk the course in 0.01-mile steps at each section's mid pace (padded for GPS distance)
  // to find where each gel falls.
  const gels = [];
  let t = 0, nextGel = firstGelMin * 60;
  for (let mi = 0; mi < RACE_MI; mi += 0.01) {
    t += sectionAt(mi).mid * 0.01 * SUB3.distanceFactor;
    if (t >= nextGel && RACE_MI - mi > 1.5) { // no point in a gel inside the last mile and a half
      gels.push(Math.round(mi * 100) / 100);
      nextGel += gelEveryMin * 60;
    }
  }
  const expectedSec = t;
  const worstSec = secs.reduce((a, s) => a + (s.to - s.from) * s.hi, 0) * SUB3.distanceFactor;

  // Segment boundaries: every gel point and every pace change.
  const events = [
    ...gels.map((mi, i) => ({ mi, kind: "gel", label: chew ? `Gel #${i + 1} + ${chew.perGel} salt chew` : `Gel #${i + 1}` })),
    ...secs.slice(1).map((s) => ({
      mi: s.from,
      kind: "pace",
      label: s.terrain === "climb" ? "Climb starts — ease off to the climb pace" : "Climb done — back to goal pace",
    })),
    { mi: RACE_MI, kind: "finish", label: "Finish" },
  ].sort((a, b) => a.mi - b.mi);

  const steps = [];
  let from = 0;
  for (const ev of events) {
    if (ev.mi - from < 0.05) { // event lands on a boundary already made — merge the labels
      const prev = steps[steps.length - 1];
      if (prev) prev.then = `${prev.then} + ${ev.label}`;
      continue;
    }
    const sec = sectionAt(from + 0.001);
    steps.push({
      n: steps.length + 1,
      from,
      to: ev.mi,
      miles: Math.round((ev.mi - from) * 100) / 100,
      paceLo: fmtPaceMinSec(sec.lo),
      paceHi: fmtPaceMinSec(sec.hi),
      terrain: sec.terrain,
      kind: ev.kind,
      then: ev.label,
    });
    from = ev.mi;
  }

  // Fuel from the actual gels.
  const hours = expectedSec / 3600;
  // Sodium comes from the gels plus any salt chews taken with them.
  const sodiumPerGelStop = (gel?.sodiumMg || 0) + (chew ? chew.sodiumMg * chew.perGel : 0);
  const fuel = gel && {
    count: gels.length,
    chews: chew ? gels.length * chew.perGel : 0,
    carbsG: gels.length * gel.carbsG,
    carbsPerHour: (gels.length * gel.carbsG) / hours,
    sodiumMg: gels.length * sodiumPerGelStop,
    sodiumPerHour: (gels.length * sodiumPerGelStop) / hours,
  };
  return { steps, gels, expectedSec, worstSec, sections: secs, fuel };
}

export function fmtClock(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function planAsText(plan, gelEveryMin) {
  const f = plan.fuel;
  const lines = [
    `RACE WATCH PLAN — sub-3 lock (worst case ${fmtClock(plan.worstSec)}, expected ≈${fmtClock(plan.expectedSec)})`,
    f ? `Fuel: Re-Lyte 2–3 h before; 1 gel 10–15 min before the start; then at each gel buzz (every ${gelEveryMin} min): gel${f.chews ? " + 1 salt chew" : ""} + water (≈${Math.round(f.carbsPerHour)} g carbs/h, ≈${Math.round(f.sodiumPerHour)} mg sodium/h). Carry ${f.count + 2} gels${f.chews ? ` and ~${f.chews + 3} chews` : ""}.` : "",
    "Apple Watch › Workout › Outdoor Run › ⋯ › Create Workout › Custom — one Work step per line (distance = the Watch step):",
    ...plan.steps.map((s) => `${s.n}. Mile ${s.to.toFixed(1)}: ${s.then} — pace ${s.paceLo}–${s.paceHi}/mi (Watch step: Work ${s.miles.toFixed(2)} mi)`),
    "Keep Auto-Pause OFF so stops at aid stations still count against the clock.",
  ];
  return lines.filter(Boolean).join("\n");
}
