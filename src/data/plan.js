// 10-week marathon training plan — Project Hermes
// Race day: Saturday, October 10, 2026. Plan starts Monday, August 3, 2026.
// Each day: { type, miles, label, ... }
// type drives which pace zone is shown: easy | recovery | long | tempo | intervals | shakeout | race | rest | xt

export const RACE_DATE = "2026-10-10";
export const PLAN_START = "2026-08-03";

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const rest = { type: "rest", miles: 0, label: "Rest" };
// Strength day labels follow the phases in data/strength.js.
const strength = (label) => ({ type: "strength", miles: 0, label: `Strength — ${label}` });

export const PLAN = [
  {
    week: 1, dates: "Aug 3–9", phase: "Base", focus: "Ease in, find your rhythm",
    days: {
      Mon: strength("Foundation A"),
      Tue: { type: "easy", miles: 4, label: "Easy 4 + strides" },
      Wed: { type: "tempo", miles: 5, tempoMiles: 3, label: "Tempo 5 (3 @ threshold)" },
      Thu: { type: "easy", miles: 4, label: "Easy 4" },
      Fri: strength("Foundation B"),
      Sat: { type: "long", miles: 10, label: "Long 10" },
      Sun: { type: "recovery", miles: 3, label: "Recovery 3" },
    },
  },
  {
    week: 2, dates: "Aug 10–16", phase: "Base", focus: "Build the base",
    days: {
      Mon: strength("Foundation A"),
      Tue: { type: "easy", miles: 5, label: "Easy 5 + strides" },
      Wed: { type: "tempo", miles: 6, tempoMiles: 4, label: "Tempo 6 (4 @ threshold)" },
      Thu: { type: "easy", miles: 4, label: "Easy 4" },
      Fri: strength("Foundation B"),
      Sat: { type: "long", miles: 12, label: "Long 12" },
      Sun: { type: "recovery", miles: 3, label: "Recovery 3" },
    },
  },
  {
    week: 3, dates: "Aug 17–23", phase: "Build", focus: "Add some speed",
    days: {
      Mon: strength("Heavy"),
      Tue: { type: "intervals", miles: 5, reps: "6 × 400m", label: "Intervals 5 (6 × 400m)" },
      Wed: { type: "easy", miles: 6, label: "Easy 6" },
      Thu: { type: "easy", miles: 5, label: "Easy 5" },
      Fri: strength("Power & stability"),
      Sat: { type: "long", miles: 14, label: "Long 14" },
      Sun: { type: "recovery", miles: 4, label: "Recovery 4" },
    },
  },
  {
    week: 4, dates: "Aug 24–30", phase: "Cutback", focus: "Cutback — half marathon tune-up race",
    days: {
      Mon: strength("Heavy"),
      Tue: { type: "easy", miles: 4, label: "Easy 4" },
      Wed: { type: "tempo", miles: 5, tempoMiles: 3, label: "Tempo 5 (3 @ threshold)" },
      Thu: { type: "easy", miles: 4, label: "Easy 4" },
      Fri: strength("Activation only (half tomorrow)"),
      Sat: { type: "halfmarathon", miles: 13.1, label: "🏁 Half Marathon — 13.1" },
      Sun: { type: "recovery", miles: 3, label: "Recovery 3" },
    },
  },
  {
    week: 5, dates: "Aug 31–Sep 6", phase: "Recovery", focus: "Off — healing heel blisters from the half",
    days: {
      Mon: rest,
      Tue: { type: "rest", miles: 0, label: "Rest — blister recovery" },
      Wed: { type: "rest", miles: 0, label: "Rest — blister recovery" },
      Thu: { type: "rest", miles: 0, label: "Rest — blister recovery" },
      Fri: { type: "rest", miles: 0, label: "Rest — blister recovery" },
      Sat: { type: "rest", miles: 0, label: "Rest — blister recovery" },
      Sun: { type: "rest", miles: 0, label: "Rest — blister recovery" },
    },
  },
  {
    week: 6, dates: "Sep 7–13", phase: "Build", focus: "Return to running — ease back in after blisters heal",
    days: {
      Mon: strength("Heavy"),
      Tue: { type: "easy", miles: 5, label: "Easy 5 + strides" },
      Wed: { type: "easy", miles: 6, label: "Easy 6" },
      Thu: { type: "easy", miles: 5, label: "Easy 5" },
      Fri: strength("Power & stability"),
      Sat: { type: "long", miles: 12, label: "Long 12" },
      Sun: { type: "recovery", miles: 3, label: "Recovery 3" },
    },
  },
  {
    week: 7, dates: "Sep 14–20", phase: "Peak", focus: "Peak endurance",
    days: {
      Mon: strength("Heavy + fast"),
      Tue: { type: "easy", miles: 6, label: "Easy 6 + strides" },
      Wed: { type: "tempo", miles: 8, tempoMiles: 6, label: "Tempo 8 (6 @ threshold)" },
      Thu: { type: "easy", miles: 5, label: "Easy 5" },
      Fri: strength("Reactive"),
      Sat: { type: "long", miles: 18, label: "Long 18" },
      Sun: { type: "recovery", miles: 4, label: "Recovery 4" },
    },
  },
  {
    week: 8, dates: "Sep 21–27", phase: "Peak", focus: "Peak week — the 20-miler",
    days: {
      Mon: strength("Heavy + fast (last heavy)"),
      Tue: { type: "easy", miles: 6, label: "Easy 6" },
      Wed: { type: "tempo", miles: 8, tempoMiles: 6, label: "Tempo 8 (6 @ threshold)" },
      Thu: { type: "easy", miles: 5, label: "Easy 5" },
      Fri: strength("Reactive"),
      Sat: { type: "recovery", miles: 4, label: "Recovery 4" },
      Sun: { type: "rest", miles: 0, label: "Rest — long run postponed" },
    },
  },
  {
    week: 9, dates: "Sep 28–Oct 4", phase: "Taper", focus: "Taper — trim volume, keep sharp",
    days: {
      Mon: { type: "long", miles: 20, label: "Long 20 (moved from Sat)" },
      Tue: { type: "recovery", miles: 3, label: "Recovery 3 — buffer after Monday's 20" },
      Wed: { type: "tempo", miles: 6, tempoMiles: 4, label: "Tempo 6 (4 @ threshold)" },
      Thu: { type: "easy", miles: 4, label: "Easy 4" },
      Fri: strength("Taper maintenance (last loaded)"),
      Sat: { type: "long", miles: 13, label: "Long 13" },
      Sun: { type: "recovery", miles: 3, label: "Recovery 3" },
    },
  },
  {
    week: 10, dates: "Oct 5–11", phase: "Race week", focus: "Race week — rest, fuel, run",
    days: {
      Mon: { type: "rest", miles: 0, label: "Rest — optional 15-min activation" },
      Tue: { type: "easy", miles: 4, label: "Easy 4" },
      Wed: { type: "easy", miles: 3, label: "Easy 3 + strides" },
      Thu: { type: "shakeout", miles: 2, label: "Shakeout 2" },
      Fri: rest,
      Sat: { type: "race", miles: 26.2, label: "🏁 RACE — 26.2" },
      Sun: { type: "rest", miles: 0, label: "Post-race recovery" },
    },
  },
];

export function weeklyMiles(week) {
  return Object.values(week.days).reduce((s, d) => s + (d.miles || 0), 0);
}

// Phase → accent color (Hermes gold/bronze palette).
export const PHASE_COLOR = {
  Base: "#9c6b0a",
  Build: "#9c6b0a",
  Cutback: "#f4b740",
  Recovery: "#f4b740",
  Peak: "#ef6c4d",
  Taper: "#f4b740",
  "Race week": "#ef6c4d",
};
