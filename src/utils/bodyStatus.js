// The training body map shown on the hologram: which areas to light up, and how strongly (0–1).
//   achilles — on watch per BODY_WATCH in the plan (amber)
//   legs     — recent load: running miles logged in the last 3 days
//   core     — a strength session today or yesterday (per the plan)
import { BODY_WATCH, PLAN, PLAN_START, DAY_NAMES } from "../data/plan.js";
import { allRuns } from "../services/strava.js";

const DAY = 86400000;
const midnight = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

function plannedDay(date) {
  // Round, not floor: across a daylight-saving change a "day" between midnights is 23 or 25 h.
  const idx = Math.round((midnight(date) - midnight(new Date(PLAN_START + "T00:00:00"))) / DAY);
  if (idx < 0) return null;
  const week = PLAN[Math.floor(idx / 7)];
  return week ? week.days[DAY_NAMES[idx % 7]] : null;
}

export function bodyStatus(activities, now = new Date()) {
  const today = midnight(now);
  const watch = BODY_WATCH.find((w) => today >= midnight(new Date(w.from + "T00:00:00")) && today <= midnight(new Date(w.to + "T00:00:00")));

  const recentMiles = activities
    ? allRuns(activities).filter((r) => now - new Date(r.date) <= 3 * DAY).reduce((s, r) => s + r.miles, 0)
    : 0;

  const strengthDay = [0, 1].map((back) => plannedDay(new Date(today - back * DAY))).find((d) => d?.type === "strength");

  return {
    levels: {
      achilles: watch ? 1 : 0,
      legs: Math.min(1, recentMiles / 20),
      core: strengthDay ? 0.85 : 0,
    },
    notes: [
      watch && { tone: "amber", text: watch.note },
      recentMiles >= 1 && { tone: "accent", text: `Legs: ${Math.round(recentMiles)} mi in 3 days` },
      strengthDay && { tone: "gold", text: "Core: strength day" },
    ].filter(Boolean),
  };
}
