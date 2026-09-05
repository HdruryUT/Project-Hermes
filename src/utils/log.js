// Matches actual Strava activities against the planned schedule so the Log tab can show
// planned-vs-actual instead of just the static plan.
import { PLAN, PLAN_START, DAY_NAMES } from "../data/plan.js";
import { allRuns } from "../services/strava.js";

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateKey(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Every plan day up to and including today, with its real calendar date attached.
export function plannedDaysThroughToday(now = new Date()) {
  const start = new Date(PLAN_START + "T00:00:00");
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const out = [];
  PLAN.forEach((week, weekIndex) => {
    DAY_NAMES.forEach((dow, dowIndex) => {
      const date = addDays(start, weekIndex * 7 + dowIndex);
      if (date > today) return;
      out.push({ date, key: dateKey(date), isToday: dateKey(date) === dateKey(today), weekIndex, dayName: dow, week, planned: week.days[dow] });
    });
  });
  return out;
}

// status: "done" | "partial" | "missed" | "today" | "extra" | "asplanned" (rest/strength day with no run)
export function buildLog(activities, now = new Date()) {
  const runs = allRuns(activities);
  const runsByDate = {};
  for (const r of runs) {
    const day = (r.date || "").slice(0, 10);
    (runsByDate[day] ||= []).push(r);
  }

  const days = plannedDaysThroughToday(now);
  return days.map((d) => {
    const matches = runsByDate[d.key] || [];
    const actualMiles = matches.reduce((s, r) => s + r.miles, 0);
    const actualSeconds = matches.reduce((s, r) => s + r.seconds, 0);
    const plannedMiles = d.planned.miles || 0;

    let status;
    if (plannedMiles > 0) {
      if (matches.length) status = actualMiles >= plannedMiles * 0.85 ? "done" : "partial";
      else status = d.isToday ? "today" : "missed";
    } else {
      status = matches.length ? "extra" : "asplanned";
    }

    return { ...d, matches, actualMiles, actualSeconds, status };
  });
}

// Synthetic Strava-shaped activities spanning the actual plan dates, for the Log tab's demo
// button — unlike services/strava.js DEMO_RUNS (recent runs relative to "today", used to demo
// pace-setting), these need to fall on real plan days to demonstrate matching.
export function demoActivities(now = new Date()) {
  const days = plannedDaysThroughToday(now);
  const acts = [];
  let id = 1;
  days.forEach((d, i) => {
    if (d.isToday) return;
    const miles = d.planned.miles || 0;
    if (miles > 0) {
      if (i % 7 === 2) return; // deterministically "missed" every so often
      const factor = i % 5 === 0 ? 0.6 : 1 + ((i % 3) - 1) * 0.05;
      const actualMiles = Math.round(miles * factor * 10) / 10;
      const secPerMile = 480 + (i % 4) * 20;
      acts.push({
        id: id++, name: d.planned.label, type: "Run", sport_type: "Run",
        start_date: d.date.toISOString(), start_date_local: d.date.toISOString(),
        distance: actualMiles * 1609.344, moving_time: Math.round(actualMiles * secPerMile),
      });
    } else if (i % 11 === 0) {
      acts.push({
        id: id++, name: "Easy extra jog", type: "Run", sport_type: "Run",
        start_date: d.date.toISOString(), start_date_local: d.date.toISOString(),
        distance: 3 * 1609.344, moving_time: 3 * 540,
      });
    }
  });
  return acts;
}

// Actual miles run per plan week (index-aligned with PLAN), for overlaying onto the
// planned-mileage chart. Weeks with no matching runs come back as 0, not null — callers
// that only want weeks through "today" should slice/mask the result themselves.
export function weeklyActualMiles(activities) {
  const runs = allRuns(activities);
  const start = new Date(PLAN_START + "T00:00:00");
  const totals = new Array(PLAN.length).fill(0);
  for (const r of runs) {
    const d = new Date(r.date);
    const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((localMidnight - start) / 86400000);
    if (diffDays < 0) continue;
    const weekIndex = Math.floor(diffDays / 7);
    if (weekIndex >= PLAN.length) continue;
    totals[weekIndex] += r.miles;
  }
  return totals.map((m) => Math.round(m * 10) / 10);
}

export function logSummary(log) {
  const scored = log.filter((d) => (d.planned.miles || 0) > 0 && !d.isToday);
  const done = scored.filter((d) => d.status === "done").length;
  const partial = scored.filter((d) => d.status === "partial").length;
  const missed = scored.filter((d) => d.status === "missed").length;
  const plannedMiles = scored.reduce((s, d) => s + d.planned.miles, 0);
  const actualMiles = log.reduce((s, d) => s + d.actualMiles, 0);
  return {
    total: scored.length, done, partial, missed,
    adherencePct: scored.length ? Math.round(((done + partial * 0.5) / scored.length) * 100) : null,
    plannedMiles: Math.round(plannedMiles * 10) / 10,
    actualMiles: Math.round(actualMiles * 10) / 10,
  };
}
