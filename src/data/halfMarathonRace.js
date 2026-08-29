// One-off content for the Aug 29, 2026 half marathon tune-up race (NEBO course).
// Net downhill point-to-point: 7,966 ft start → 4,711 ft finish, 3,255 ft total drop
// over 13.1 mi. From the elevation chart's own labeled numbers: the final 10K drops
// only 1,040 ft over 6.2 mi (~167 ft/mi, ~3.2% grade), which means the front ~6.9 mi
// carries the other 2,215 ft (~321 ft/mi, ~6.1% grade) — the front half is far
// steeper than the back half, not evenly graded.

export const RACE_INFO = {
  date: "Saturday, August 29, 2026",
  start: "6:30 AM",
  startElevation: 7966,
  finishElevation: 4711,
  totalDrop: 3255,
  distance: 13.1,
};

export const MORNING_TIMELINE = [
  {
    section: "Tonight — Fri Aug 28",
    rows: [
      { when: "Dinner", what: "Carb-forward, familiar, low-fiber: pasta/rice + light protein. Nothing new, nothing spicy or greasy. Hydrate with electrolytes through the evening." },
      { when: "Lay out gear", what: "Bib, Hyperion Elite 5s, warm throwaway layers for a cold high-elevation start, sunglasses, gels, watch charged." },
      { when: "Logistics check", what: "This is a net-downhill point-to-point course starting at ~8,000 ft — confirm your shuttle/parking plan and pickup time tonight, not race morning." },
      { when: "Sleep", what: "Set two alarms. Aim to be in bed early — the wake-up is going to be early regardless of what time you fall asleep." },
    ],
  },
  {
    section: "Race morning — Sat Aug 29",
    rows: [
      { when: "~3:45–4:00 AM", what: "Wake up. Get dressed in layers — start-line temps at ~8,000 ft before dawn can be well into the 40s°F even in late August." },
      { when: "~4:00 AM (breakfast)", what: "Carb-heavy, low-fiber, familiar: oatmeal + banana + honey, or bagel + peanut butter + banana. Same breakfast you've rehearsed before long runs. Coffee if that's your routine." },
      { when: "Shuttle to start", what: "Downhill point-to-point courses almost always require an early shuttle — budget extra time, and expect a wait at the start line after drop-off. Keep a throwaway layer on until right before the gun." },
      { when: "Final 15–20 min", what: "Sip water/electrolytes. Optional small top-off: half a banana, a few chews, or a gel. Use the bathroom. Nothing new." },
    ],
  },
];

export const PREP_CHECKLIST = [
  {
    group: "Gear",
    items: [
      { name: "Hyperion Elite 5 shoes", note: "Already broken in — don't debut anything untested." },
      { name: "Bib + timing chip", note: "Pinned the night before." },
      { name: "Throwaway warm layer", note: "Start elevation ~8,000 ft is cold pre-dawn — old sweatshirt/gloves you don't mind losing." },
      { name: "Sunglasses & cap", note: "You'll be descending for over an hour in daylight." },
      { name: "Watch charged", note: "GPS may wander on canyon/mountain roads — pace by effort as a backup." },
    ],
  },
  {
    group: "Fuel",
    items: [
      { name: "Gels / chews packed", note: "Check the Fuel Calc tab for a target g/hr based on your weight and this course's time." },
      { name: "Pre-race snack", note: "Banana, a few chews, or a gel ~15 min before the gun." },
      { name: "Electrolytes", note: "Still needed on a downhill course — you're still working for 1.5–2 hours." },
    ],
  },
  {
    group: "Logistics",
    items: [
      { name: "Shuttle/parking plan confirmed", note: "Know your pickup time and location before you sleep." },
      { name: "Alarm set (x2)", note: "Early wake-up for a 6:30 AM gun." },
      { name: "Phone / ID / car key plan", note: "Sorted for a point-to-point finish, likely away from your car." },
    ],
  },
];

// Downhill pace adjustments — conservative, clearly-estimated ranges, not physics.
// Front section is steeper (more free speed) but also where braking/technique caps
// the gain; back section is gentler grade but legs are already fatigued by then,
// so its adjustment is smaller too despite being "easier" terrain.
export const SEGMENTS = [
  {
    label: "Miles 1–6.9",
    note: "Steep section, ~6.1% avg grade",
    distance: 6.9,
    adjustLo: 0.04, // faster bound uses the larger % below
    adjustHi: 0.06,
  },
  {
    label: "Miles 6.9–13.1",
    note: "Final 10K, ~3.2% avg grade — legs already tired",
    distance: 6.2,
    adjustLo: 0.02,
    adjustHi: 0.04,
  },
];

// basePaceSecPerMile: flat-effort goal pace (e.g. midpoint of the Goal Half Marathon zone).
export function computeTargetSplits(basePaceSecPerMile) {
  if (!basePaceSecPerMile) return null;
  const segments = SEGMENTS.map((seg) => {
    const paceFast = basePaceSecPerMile * (1 - seg.adjustHi); // larger % cut = faster pace
    const paceSlow = basePaceSecPerMile * (1 - seg.adjustLo);
    return {
      ...seg,
      paceLo: paceFast,
      paceHi: paceSlow,
      timeLo: paceFast * seg.distance,
      timeHi: paceSlow * seg.distance,
    };
  });
  const totalTimeLo = segments.reduce((s, x) => s + x.timeLo, 0);
  const totalTimeHi = segments.reduce((s, x) => s + x.timeHi, 0);
  const flatTime = basePaceSecPerMile * RACE_INFO.distance;
  return { segments, totalTimeLo, totalTimeHi, flatTime };
}

export const COURSE_STRATEGY = [
  {
    title: "The grade isn't even — front is much steeper than back",
    note: "The course drops 3,255 ft total, but the final 10K only accounts for 1,040 ft of that (~3.2% grade). That means the front ~6.9 miles carries the other 2,215 ft — roughly 6.1% average grade, almost twice as steep as the back half. The steep part comes first, while your legs are freshest — which is good, but it's also where most people do the most quad damage without realizing it.",
  },
  {
    title: "Miles 1–7: controlled, not free",
    note: "Gravity will make this feel easy — resist the urge to let it rip just because you can. Hold a controlled, quick-cadence effort rather than an all-out speed. This is the steep section; every mile you overcook here shows up as pain in the final 10K.",
  },
  {
    title: "Miles 7–13.1: the grade eases, but your legs won't feel fresh",
    note: "The course itself gets easier here, but your quads will already be fatigued from the steep front half regardless of how well you paced it — that's just what sustained downhill running does. Keep cadence high even if stride shortens. This section is more runnable than the front, so it's a good place to hold effort steady rather than trying to \"save\" a kick.",
  },
  {
    title: "Technique matters more than usual",
    note: "Short, quick strides (aim for your normal cadence, not longer ones). Land under your center of mass, not out in front. Slight forward lean from the ankles, not the waist. Avoid \"braking\" — reaching your foot out ahead and stiffening to slow down is exactly what wrecks quads on grades like this.",
  },
  {
    title: "Run by effort, not by pace",
    note: "Your Goal Half Marathon pace (from Paces & Strava) is based on flat-course math — on a course this steep you'll very likely run notably faster than that without extra effort, especially in the first 7 miles. Don't force even splits; let the downhill do the work early, then just hold effort steady as the grade eases and fatigue sets in.",
  },
];
