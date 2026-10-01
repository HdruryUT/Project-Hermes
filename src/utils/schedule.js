// Figures out where "today" falls in the plan so the Dashboard can show the
// current week and today's workout.
import { PLAN, PLAN_START, RACE_DATE, DAY_NAMES, weeklyMiles } from "../data/plan.js";

function atMidnight(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Returns { state, weekIndex, dayName, week, today }
//   state: "before" | "during" | "after"
export function currentPosition(now = new Date()) {
  const start = atMidnight(new Date(PLAN_START + "T00:00:00"));
  const today = atMidnight(now);
  const diffDays = Math.floor((today - start) / 86400000);

  if (diffDays < 0) {
    const week = PLAN[0];
    return { state: "before", weekIndex: 0, dayName: "Mon", week, today: week.days.Mon };
  }

  const weekIndex = Math.floor(diffDays / 7);
  if (weekIndex > PLAN.length - 1) {
    const week = PLAN[PLAN.length - 1];
    return { state: "after", weekIndex: PLAN.length - 1, dayName: "Sun", week, today: week.days.Sun };
  }

  const dow = (today.getDay() + 6) % 7; // convert Sun=0 → Mon=0 index
  const dayName = DAY_NAMES[dow];
  const week = PLAN[weekIndex];
  return { state: "during", weekIndex, dayName, week, today: week.days[dayName] };
}

// Total planned miles across the whole plan.
export function totalPlannedMiles() {
  return PLAN.reduce((s, w) => s + weeklyMiles(w), 0);
}

// Miles scheduled up to and including the current week (a rough progress proxy).
export function milesThroughWeek(weekIndex) {
  return PLAN.slice(0, weekIndex + 1).reduce((s, w) => s + weeklyMiles(w), 0);
}

// Whole days from today until race day (0 on or after race day).
export function daysUntilRace(now = new Date()) {
  const race = atMidnight(new Date(RACE_DATE + "T00:00:00"));
  return Math.max(0, Math.ceil((race - atMidnight(now)) / 86400000));
}
