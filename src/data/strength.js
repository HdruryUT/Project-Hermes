// Runner-focused strength work, twice a week (Monday + Friday in the schedule).
// Monday sits 2 days before Tuesday's hard workout — moderate, foundational.
// Friday sits the day before the long run — light, activation-focused, not fatiguing.

export const STRENGTH_SESSIONS = [
  {
    day: "Monday",
    title: "Foundational Strength",
    purpose: "General strength + resilience. Two days of buffer before Tuesday's hard workout, so soreness has time to clear.",
    exercises: [
      { name: "Goblet squats", note: "3 x 10–12, moderate weight" },
      { name: "Single-leg squats (assisted)", note: "2 x 6–8 each leg — hold a rail or chair for balance as needed" },
      { name: "Walking lunges", note: "3 x 10 each leg" },
      { name: "Romanian deadlifts", note: "3 x 10–12" },
      { name: "Step-ups", note: "3 x 10 each leg, knee-height box or bench" },
      { name: "Push-ups", note: "3 x max, good form" },
      { name: "Plank", note: "3 x 30–45 sec" },
      { name: "Russian twists", note: "3 x 15–20 each side, add light weight if comfortable" },
      { name: "Single-leg glute bridge", note: "2 x 12 each leg" },
    ],
  },
  {
    day: "Friday",
    title: "Runner Stability & Power",
    purpose: "Light and activation-focused — the long run is tomorrow, so this primes the body without adding fatigue.",
    exercises: [
      { name: "Single-leg balance reach", note: "2 x 8 each leg" },
      { name: "Clamshells / band walks", note: "2 x 15 each side" },
      { name: "Calf raises", note: "2 x 15–20" },
      { name: "Bird-dogs", note: "2 x 10 each side" },
      { name: "Side plank", note: "2 x 20–30 sec each side" },
      { name: "Pogo hops / ankle bounces", note: "2 x 15–20, light and quick — not max effort" },
    ],
  },
];

export const PRINCIPLES = [
  "Twice a week is plenty — more isn't better if it starts competing with your running recovery.",
  "Prioritize single-leg (unilateral) work. Running is a one-leg-at-a-time sport, and a lot of running injuries trace back to a side-to-side strength or stability imbalance.",
  "Keep Friday light. It sits right before your long run — the goal there is activation, not fatigue.",
  "Don't skip hips and core. Weak glutes and core show up as runner's knee, IT band pain, and low-back issues down the line.",
  "Non-impact, so it's a good fit even around a running setback (blisters, minor tweaks) — check with how your body feels, but strength work doesn't load the same tissues as running does.",
];
