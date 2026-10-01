// Periodized strength + plyometric program for the marathon block.
// Two sessions a week, Monday (the heavier day) and Friday (lighter: it's the day before the long run).
// The program moves through phases alongside the running plan: learn the patterns → lift heavy →
// convert to power → maintain through the taper → activation only in race week.
//
// Evidence base (summarized in PRINCIPLES / SOURCES below):
// - Heavy resistance training (≥80% 1RM) and plyometrics both improve running economy; heavy loading
//   tends to do it best, and the combination beats either alone.
// - The Copenhagen adductor program cut groin problems by ~40% in a large RCT (soccer).
// - The soleus carries the largest load of any muscle in running, so it gets dedicated heavy work.

// ---------- Exercise library ----------
// cue = how to do it; why = what it does for a marathoner.
export const EXERCISES = {
  // Plyometric / reactive
  pogo: {
    name: "Pogo hops",
    cue: "Stiff ankles, barely bend the knees, bounce off the balls of the feet. Quiet, quick contacts.",
    why: "Trains the Achilles/calf spring — the elastic return that makes each stride cheaper.",
  },
  plateHops: {
    name: "Lateral plate hops",
    cue: "Two feet, hop side to side over a weight plate (or a line to start). Land soft and spring straight back out — minimal ground time.",
    why: "Side-to-side stiffness and ankle reactivity. Runners almost never move in the frontal plane, so this patches a gap that shows up as rolled ankles and wobbly hips late in a race.",
  },
  skater: {
    name: "Skater bounds",
    cue: "Bound sideways off one leg, land on the other, stick it for a one-count before going back.",
    why: "Single-leg lateral power plus landing control at the hip and knee.",
  },
  slHop: {
    name: "Single-leg forward hops (stick)",
    cue: "Hop forward off one leg, land on the same leg, hold 2 seconds with the knee tracking over the toes.",
    why: "Running is a series of single-leg landings — this trains absorbing and redirecting that force.",
  },
  boxJump: {
    name: "Box jumps (step down)",
    cue: "Full-intent jump onto a knee-height box, land quietly, step down — don't jump down.",
    why: "Max-intent power without the landing stress of jumping back down.",
  },

  // Lower-body strength
  gobletSquat: {
    name: "Goblet squat",
    cue: "Dumbbell at the chest, sit between the heels, elbows inside the knees, chest tall.",
    why: "Grooves the squat pattern before it gets loaded heavier.",
  },
  trapBarDL: {
    name: "Trap-bar deadlift",
    cue: "Hips back, flat back, push the floor away. Stand tall, don't lean back at the top. Bar path straight up.",
    why: "The main heavy lift — whole posterior chain at a high load. This is the kind of loading that improves running economy most.",
  },
  frontRackLunge: {
    name: "Front-rack reverse lunge",
    cue: "Dumbbells or kettlebells at the shoulders (or a barbell front rack), elbows up. Step back, front shin near vertical, drive up through the front heel.",
    why: "Single-leg strength with less knee stress than a forward lunge. The front rack makes your trunk fight to stay upright, the same job it does late in the marathon.",
  },
  rfess: {
    name: "Rear-foot-elevated split squat",
    cue: "Back foot on a bench, most of your weight on the front leg, lower straight down. Dumbbells at your sides.",
    why: "Heavy single-leg quad and glute work; exposes and fixes left/right imbalances.",
  },
  slRDL: {
    name: "Single-leg Romanian deadlift",
    cue: "Soft standing knee, hinge until the torso is near parallel, hips square to the floor. Weight in the opposite hand.",
    why: "Hamstrings, glutes and foot/ankle balance on one leg — the stance-phase pattern.",
  },
  stepUp: {
    name: "Step-ups",
    cue: "Knee-height box, drive through the top foot, don't push off the bottom one. Control the step down.",
    why: "Single-leg strength that carries over directly to hills.",
  },
  hipThrust: {
    name: "Hip thrust",
    cue: "Upper back on a bench, chin tucked, drive the hips up to a full lockout, squeeze one second.",
    why: "Glute strength for hip extension — the engine of push-off.",
  },
  soleusRaise: {
    name: "Bent-knee (soleus) calf raise",
    cue: "Seated, or standing with knees bent ~45°, heavy load. Full range, pause 2 sec at the bottom, slow down.",
    why: "The soleus takes more force than any other muscle in running. A strong soleus protects the Achilles and calves when legs fade in the last 10K.",
  },
  slCalfRaise: {
    name: "Single-leg calf raise",
    cue: "Straight knee, off a step, full range, 3 seconds down. Hold a dumbbell when bodyweight gets easy.",
    why: "Calf and Achilles capacity, one side at a time.",
  },
  tibRaise: {
    name: "Tibialis raises",
    cue: "Back against a wall, heels out a foot, pull your toes up toward your shins.",
    why: "Front-of-shin strength; helps guard against shin splints as mileage climbs.",
  },

  // Trunk / hips
  copenhagen: {
    name: "Copenhagen plank",
    cue: "Side plank with the top leg on a bench, bottom leg hanging free. Short lever (knee on the bench) to start; long lever (ankle on the bench) when that's easy.",
    why: "Adductor (inner thigh) strength. Weak adductors let the knee cave and the pelvis drop. This exercise cut groin injuries ~40% in the research.",
  },
  chop: {
    name: "Low-to-high chop",
    cue: "Cable or band anchored low. Pull from outside one knee up across to the opposite shoulder, pivoting the back foot, arms long. Rotate through the hips, not the low back.",
    why: "Trains the diagonal link between hip and opposite shoulder, the same counter-rotation your arm swing uses. Keeps form tidy when you're tired.",
  },
  pallof: {
    name: "Pallof press",
    cue: "Stand side-on to a band or cable, press it straight out from the chest and hold 2 sec without letting it twist you.",
    why: "Anti-rotation core strength, so less energy leaks out sideways each stride.",
  },
  deadBug: {
    name: "Dead bug",
    cue: "Low back pressed flat into the floor, extend the opposite arm and leg slowly, exhale fully.",
    why: "Keeps the trunk stable while the limbs move, which is running in a nutshell.",
  },
  suitcaseCarry: {
    name: "Suitcase carry",
    cue: "Heavy dumbbell in one hand, walk tall without leaning toward it.",
    why: "Lateral trunk stability and grip; resists the side-bend that shows up when you fatigue.",
  },
  glueBridge: {
    name: "Glute bridge",
    cue: "Feet flat, drive hips up, squeeze for 2 seconds. Single-leg to progress.",
    why: "Wakes the glutes up without fatigue.",
  },
  bandWalk: {
    name: "Band walks / clamshells",
    cue: "Mini-band above the knees, small steps, toes forward, constant tension.",
    why: "Glute med activation, which keeps the pelvis level.",
  },
};

// Shared dynamic warm-up before every session.
export const WARMUP = [
  "3–5 min easy cardio (bike, row, or brisk walk)",
  "Leg swings: 10 front-to-back + 10 side-to-side each leg",
  "Band walks: 10 steps each direction",
  "Glute bridges: 10",
  "Bodyweight reverse lunge: 5 each leg",
  "1–2 light warm-up sets of the first heavy lift",
];

// ---------- Phases ----------
// weeks = plan week numbers (1-based) the phase covers. Sessions keyed by plan day name.
// Each session is a list of blocks, ordered power → strength → trunk (do the fast stuff fresh).
// RPE = rate of perceived effort out of 10 (RPE 8 ≈ 2 reps left in the tank).
export const PHASES = [
  {
    key: "foundation",
    name: "Foundation",
    weeks: [1, 2],
    goal: "Learn the movements and build tissue tolerance. Moderate loads, nothing to failure.",
    rules: [
      "Weights at RPE 6–7: you finish each set with 3–4 good reps left.",
      "Expect some soreness in week 1. It should fade by week 2.",
    ],
    sessions: {
      Mon: {
        title: "Strength A: Learn the patterns",
        purpose: "Two days of buffer before Wednesday's tempo.",
        blocks: [
          { name: "Power", items: [["pogo", "2 × 20"]] },
          { name: "Strength", items: [
            ["gobletSquat", "3 × 10"],
            ["frontRackLunge", "3 × 8 each leg, light"],
            ["slRDL", "3 × 8 each leg"],
            ["soleusRaise", "3 × 15"],
          ] },
          { name: "Trunk", items: [
            ["copenhagen", "2 × 15–20 sec each side (short lever)"],
            ["deadBug", "2 × 8 each side"],
          ] },
        ],
      },
      Fri: {
        title: "Strength B: Stability & elasticity",
        purpose: "Light, because tomorrow is the long run. You should leave feeling better than you arrived.",
        blocks: [
          { name: "Power", items: [["plateHops", "2 × 10 over a line"]] },
          { name: "Strength", items: [
            ["stepUp", "2 × 10 each leg, bodyweight"],
            ["tibRaise", "2 × 15"],
          ] },
          { name: "Trunk", items: [
            ["chop", "2 × 10 each side, light band"],
            ["pallof", "2 × 10 each side"],
          ] },
        ],
      },
    },
  },
  {
    key: "strength",
    name: "Max Strength",
    weeks: [3, 4, 5, 6],
    goal: "Lift heavy. Heavy, low-rep loading improves running economy more than anything else in the gym, and it doesn't add bulk.",
    rules: [
      "Monday's main lifts at RPE 8 (≈80–85% of max): heavy, but every rep is clean.",
      "Add weight when every set feels RPE 7. Stay at the low end of the reps when you go up.",
      "Week 4: Friday becomes activation only (the half marathon is Saturday).",
      "Week 5 (blister week): lifting is fine if shoes don't rub. Skip all hops until you're running again.",
    ],
    sessions: {
      Mon: {
        title: "Heavy day",
        purpose: "The hardest session of the week. Two days of buffer before Wednesday's quality run.",
        blocks: [
          { name: "Power", items: [
            ["plateHops", "3 × 10 over a plate"],
            ["boxJump", "3 × 4"],
          ] },
          { name: "Strength", items: [
            ["trapBarDL", "4 × 4–5 @ RPE 8"],
            ["frontRackLunge", "3 × 6 each leg, heavy"],
            ["rfess", "3 × 6 each leg"],
            ["soleusRaise", "3 × 8 heavy, 2-sec pause"],
          ] },
          { name: "Trunk", items: [
            ["copenhagen", "3 × 20 sec each side (long lever)"],
            ["chop", "3 × 8 each side"],
          ] },
        ],
      },
      Fri: {
        title: "Power & stability (light)",
        purpose: "Springy, not tired. Moderate loads only, because tomorrow is the long run.",
        blocks: [
          { name: "Power", items: [
            ["pogo", "2 × 20"],
            ["skater", "2 × 5 each side, stick the landing"],
          ] },
          { name: "Strength", items: [
            ["slRDL", "2 × 8 each leg, moderate"],
            ["slCalfRaise", "2 × 12 each leg"],
            ["tibRaise", "2 × 15"],
          ] },
          { name: "Trunk", items: [
            ["pallof", "2 × 10 each side"],
            ["suitcaseCarry", "2 × 30 m each hand"],
          ] },
        ],
      },
    },
  },
  {
    key: "power",
    name: "Power",
    weeks: [7, 8],
    goal: "Turn strength into springiness. Keep the load heavy, cut the volume, and make every plyometric rep fast.",
    rules: [
      "Keep the weight on the bar but drop the sets and reps. Volume is what makes you tired, not intensity.",
      "Plyos at full intent with full rest (60–90 sec). Stop the set when contacts get slow or loud.",
      "The last heavy session is the Monday of week 8, ~2.5 weeks out. Heavy-lift fatigue takes 10–14 days to clear.",
    ],
    sessions: {
      Mon: {
        title: "Heavy + fast",
        purpose: "Last block of real loading. Quality over quantity.",
        blocks: [
          { name: "Power", items: [
            ["plateHops", "3 × 8, as fast as possible"],
            ["slHop", "3 × 5 each leg, stick"],
            ["boxJump", "3 × 3, max height"],
          ] },
          { name: "Strength", items: [
            ["trapBarDL", "3 × 3 @ RPE 8"],
            ["frontRackLunge", "3 × 5 each leg"],
            ["soleusRaise", "3 × 6 heavy"],
          ] },
          { name: "Trunk", items: [
            ["copenhagen", "3 × 25–30 sec each side"],
            ["chop", "3 × 6 each side, fast up, slow down"],
          ] },
        ],
      },
      Fri: {
        title: "Reactive & primed",
        purpose: "Short and sharp before the long run.",
        blocks: [
          { name: "Power", items: [
            ["pogo", "2 × 15"],
            ["plateHops", "2 × 8"],
          ] },
          { name: "Strength", items: [
            ["slRDL", "2 × 6 each leg"],
            ["tibRaise", "2 × 15"],
          ] },
          { name: "Trunk", items: [
            ["copenhagen", "2 × 20 sec each side"],
            ["pallof", "2 × 8 each side"],
          ] },
        ],
      },
    },
  },
  {
    key: "taper",
    name: "Taper",
    weeks: [9],
    goal: "Maintain, don't build. About half the volume at moderate load, so you hold onto your strength and power without carrying fatigue into race week.",
    rules: [
      "Nothing new. Only movements you've already been doing.",
      "Moderate weights at RPE 6–7. No grinding reps, nothing that makes you sore.",
      "This is the last loaded session, 8 days before the race.",
    ],
    sessions: {
      Fri: {
        title: "Maintenance (last loaded session)",
        purpose: "Short and crisp, about 30 minutes. Tomorrow's 13 should feel easy.",
        blocks: [
          { name: "Power", items: [
            ["pogo", "2 × 10"],
            ["plateHops", "2 × 6"],
          ] },
          { name: "Strength", items: [
            ["trapBarDL", "2 × 3 @ RPE 6–7 (~70%)"],
            ["frontRackLunge", "2 × 4 each leg, moderate"],
          ] },
          { name: "Trunk", items: [
            ["copenhagen", "2 × 15 sec each side"],
            ["chop", "2 × 6 each side"],
          ] },
        ],
      },
    },
  },
  {
    key: "race",
    name: "Race Week",
    weeks: [10],
    goal: "Activation only. Bodyweight, about 15 minutes, purely to feel loose and springy. Fitness can't be gained this week, only lost to soreness.",
    rules: [
      "Optional. Skip it if you feel flat; you'll lose nothing.",
      "Monday at the latest (5 days out). Nothing after that except your shakeout drills.",
    ],
    sessions: {
      Mon: {
        title: "Activation (optional)",
        purpose: "Bodyweight only. Get the glutes and feet switched on, then go home.",
        blocks: [
          { name: "Activation", items: [
            ["glueBridge", "2 × 10"],
            ["bandWalk", "2 × 10 steps each way"],
            ["pogo", "1 × 10, easy"],
            ["copenhagen", "1 × 15 sec each side (short lever)"],
            ["deadBug", "1 × 8 each side"],
          ] },
        ],
      },
    },
  },
];

// After the race: what to do once the plan ends.
export const POST_RACE = {
  name: "After the race",
  steps: [
    "Week 1: no lifting. Walk, easy mobility, sleep.",
    "Week 2: if nothing hurts, bodyweight only. The race-week activation session is ideal.",
    "Weeks 3–4: restart Foundation at about half the listed sets, then build back to the full program.",
  ],
};

export const PRINCIPLES = [
  "Lift heavy and jump. Heavy lifting (≈80%+ of your max) and plyometrics both make running more economical. Heavy loading does it best, and the two together beat either alone. 3–6 reps won't bulk you up.",
  "Two sessions a week. Monday is the hard one; Friday stays light because Saturday is the long run.",
  "Order inside a session: power first (while you're fresh), then strength, then trunk.",
  "Mostly single-leg. Running is single-leg, and left/right imbalances are behind a lot of running injuries.",
  "Strengthen the parts that usually break: soleus and Achilles, adductors (Copenhagen planks), shins, glutes.",
  "Taper the lifting with the running. Heavy-lift fatigue takes 10–14 days to clear, so the heavy work ends 2½ weeks out.",
];

export const SOURCES = [
  { label: "Heavy resistance vs. plyometric training for running economy: systematic review & meta-analysis (Sports Med Open, 2022)", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9653533/" },
  { label: "Complex vs. heavy resistance training in well-trained distance runners (2019)", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6487184/" },
  { label: "Why runners should care about the Copenhagen plank (Canadian Running)", url: "https://runningmagazine.ca/sections/training/why-runners-should-care-about-the-copenhagen-plank/" },
  { label: "When to stop lifting before a marathon (RunnersConnect)", url: "https://runnersconnect.net/when-should-i-stop-strength-training-at-the-gym-before-the-marathon/" },
  { label: "9 plyometric & strength movements for runners (TrainingPeaks)", url: "https://www.trainingpeaks.com/coach-blog/9-plyometric-strength-movements-for-runners/" },
];

export function phaseForWeek(weekNo) {
  return PHASES.find((p) => p.weeks.includes(weekNo)) || PHASES[0];
}
