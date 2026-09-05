// Strava integration.
//
// For a personal, local app the simplest path is a short-lived **access token** that you
// generate from your own Strava API application page. Paste it into the Paces tab.
// (Full OAuth needs a client secret + redirect server — see README for how to add that later.)
//
// This module fetches recent running activities, picks the run that best represents your
// CURRENT fitness (the one predicting the fastest marathon via Riegel), and returns it as
// an `effort` the pace engine can use.

import { riegelPredict } from "../utils/paces.js";

const API = "https://www.strava.com/api/v3";
const MARATHON_MI = 26.2188;
const METERS_PER_MILE = 1609.344;

export async function fetchActivities(token, perPage = 60) {
  const res = await fetch(`${API}/athlete/activities?per_page=${perPage}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("Strava token invalid or expired. Generate a fresh one.");
  if (!res.ok) throw new Error(`Strava error ${res.status}`);
  return res.json();
}

export function filterRecentRuns(activities, weeks = 6, minMiles = 3) {
  const cutoff = Date.now() - weeks * 7 * 24 * 3600 * 1000;
  return (activities || [])
    .filter((a) => a.type === "Run" || a.sport_type === "Run")
    .filter((a) => new Date(a.start_date).getTime() >= cutoff)
    .map((a) => ({
      id: a.id,
      name: a.name,
      date: a.start_date_local || a.start_date,
      miles: a.distance / METERS_PER_MILE,
      seconds: a.moving_time,
    }))
    .filter((a) => a.miles >= minMiles && a.seconds > 0);
}

// All runs across the whole training block (for matching against the plan in the Log tab) —
// no recency/distance cutoff, unlike filterRecentRuns which is tuned for picking a fitness effort.
export function allRuns(activities, weeks = 20) {
  return filterRecentRuns(activities, weeks, 0);
}

export function bestEffort(runs) {
  if (!runs || !runs.length) return null;
  let best = null;
  let bestPredicted = Infinity;
  for (const r of runs) {
    const predicted = riegelPredict(r.miles, r.seconds, MARATHON_MI);
    if (predicted < bestPredicted) {
      bestPredicted = predicted;
      best = r;
    }
  }
  return best
    ? { miles: best.miles, seconds: best.seconds, source: "strava", name: best.name, date: best.date }
    : null;
}

export async function effortFromStrava(token) {
  const activities = await fetchActivities(token);
  const runs = filterRecentRuns(activities);
  if (!runs.length) throw new Error("No qualifying runs (≥3 mi in the last 6 weeks) found on Strava yet.");
  return { effort: bestEffort(runs), runs };
}

// ---- Connect-once mode (via the /api/strava/* serverless functions) -------
// No token handling in the browser at all — the backend holds the refresh token
// and re-authenticates with Strava on every call. Requires this app to be
// deployed (or run under `vercel dev`) since plain `vite dev` has no /api routes.

export async function stravaStatus() {
  try {
    const res = await fetch("/api/strava/status");
    if (!res.ok) return { connected: false };
    return await res.json();
  } catch {
    return { connected: false };
  }
}

export async function fetchActivitiesFromBackend(perPage = 60) {
  const res = await fetch(`/api/strava/activities?per_page=${perPage}`);
  if (res.status === 401) throw new Error("Strava isn't connected — click Connect Strava first.");
  if (!res.ok) throw new Error(`Strava sync failed (${res.status}).`);
  return res.json();
}

export async function effortFromStravaBackend() {
  const activities = await fetchActivitiesFromBackend();
  const runs = filterRecentRuns(activities);
  if (!runs.length) throw new Error("No qualifying runs (≥3 mi in the last 6 weeks) found on Strava yet.");
  return { effort: bestEffort(runs), runs };
}

export async function disconnectStrava() {
  await fetch("/api/strava/disconnect", { method: "POST" });
}

// ---- Demo mode -------------------------------------------------------------
export const DEMO_RUNS = [
  { id: 1, name: "Easy morning loop", date: "2026-07-28", miles: 5.2, seconds: 5.2 * 555 },
  { id: 2, name: "Tempo Tuesday", date: "2026-07-24", miles: 6.0, seconds: 6.0 * 505 },
  { id: 3, name: "Long run", date: "2026-07-21", miles: 12.0, seconds: 12.0 * 560 },
  { id: 4, name: "10-miler (strong)", date: "2026-07-14", miles: 10.0, seconds: 10.0 * 512 },
  { id: 5, name: "Recovery jog", date: "2026-07-30", miles: 3.5, seconds: 3.5 * 600 },
];

export function demoEffort() {
  return { effort: bestEffort(DEMO_RUNS), runs: DEMO_RUNS };
}
