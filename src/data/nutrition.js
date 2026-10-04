// Nutrition, grocery, race-day fueling, and gear content.

export const EATING_SCHEDULE = {
  intro:
    "Built around your ~6:00 PM run. The goal: eat most of your carbs earlier in the day so you're fueled by evening, keep the pre-run snack light and easy to digest, then refuel fast afterward. Target ~2.5–3.5 g carbs per lb on long days, ~0.7 g protein per lb daily.",
  rows: [
    {
      when: "Breakfast (~7–8 AM)",
      normal: "Balanced start: oats with berries + Greek yogurt + nuts, OR eggs with whole-grain toast + fruit.",
      long: "Same, a bit bigger. Extra carbs today — add fruit or a second slice of toast. Start hydrating early.",
    },
    {
      when: "Lunch (~12–1 PM)",
      normal: "Your main fuel for tonight's run: carb-forward grain bowl — rice/quinoa + chicken or beans + veg + olive oil.",
      long: "Load the carbs here: larger pasta/rice bowl + lean protein + veg. This meal fills the tank for tonight.",
    },
    {
      when: "Pre-run snack (~4:30 PM)",
      normal: "60–90 min out: easy-to-digest carbs, low fiber/fat — banana, toast + honey, or an energy bar. Water + electrolytes.",
      long: "Same, slightly more (e.g. banana + a few dates). Top off ~15 min before with a gel or chews for runs over ~90 min.",
    },
    {
      when: "During the run (~6 PM)",
      normal: "Runs under ~60 min: water is enough. Sip electrolytes if it's warm.",
      long: "Fuel like race day: 30–60 g carbs/hr (a gel every 30–45 min) + steady fluids. This is your rehearsal.",
    },
    {
      when: "Post-run dinner (~7:15 PM)",
      normal: "Within 30–45 min: recovery carbs + protein — salmon or lean protein + sweet potato/pasta + vegetables.",
      long: "Carb-forward recovery: pasta or rice bowl + protein + veg. Chocolate milk or a smoothie first if dinner's delayed.",
    },
    {
      when: "Evening (~9 PM)",
      normal: "Light if hungry: Greek yogurt, cottage cheese, or fruit. Keep sipping water.",
      long: "A little extra protein (Greek yogurt / cottage cheese) supports overnight repair after a hard effort.",
    },
    {
      when: "Hydration (all day)",
      normal: "Half your body weight (lb) in oz of water; more on hot days. Pre-load fluids in the afternoon before an evening run.",
      long: "Higher intake, front-loaded through the day. Electrolyte drink during and after. Aim for pale-straw urine.",
    },
  ],
  principles:
    "Because you run in the evening, breakfast and especially lunch are your fueling meals — don't skimp on daytime carbs. Keep the late-afternoon snack light and familiar so nothing sits heavy at 6 PM. Build meals around whole-grain carbs, lean protein for repair, colorful produce, and healthy fats in moderation. Limit alcohol and heavy/greasy food the day before a long run. Iron matters for endurance — include lean red meat, beans, and spinach, and pair plant iron with vitamin C.",
};

export const GROCERY = [
  { group: "Complex carbs (fuel)", items: ["Oats / oatmeal", "Brown rice & quinoa", "Whole-grain bread & wraps", "Whole-grain pasta", "Sweet potatoes", "Potatoes"] },
  { group: "Lean protein (repair)", items: ["Chicken breast", "Salmon / white fish", "Eggs", "Greek yogurt", "Canned tuna", "Tofu / tempeh"] },
  { group: "Beans & legumes", items: ["Black beans", "Chickpeas", "Lentils", "Hummus", "Edamame"] },
  { group: "Fruit (carbs + vitamins)", items: ["Bananas (running gold)", "Berries", "Apples & oranges", "Dates (natural fuel)", "Frozen fruit for smoothies"] },
  { group: "Vegetables", items: ["Spinach & leafy greens", "Broccoli", "Bell peppers", "Carrots", "Tomatoes", "Avocado"] },
  { group: "Healthy fats", items: ["Olive oil", "Almonds & walnuts", "Peanut / almond butter", "Chia / flax seeds"] },
  { group: "Dairy / alternatives", items: ["Milk or fortified plant milk", "Chocolate milk (recovery)", "Cheese", "Cottage cheese"] },
  { group: "Hydration & electrolytes", items: ["Electrolyte tablets/powder", "Sports drink mix", "Coconut water"] },
  { group: "Run fuel (test these!)", items: ["Energy gels (2–3 flavors)", "Energy chews", "Sports beans", "Salt / electrolyte capsules"] },
  { group: "Snacks & pantry", items: ["Granola / trail mix", "Rice cakes", "Whole-grain crackers", "Honey & maple syrup", "Dark chocolate", "Coffee / tea"] },
];

export const RACE_DAY = [
  {
    section: "Carb-load — Wed Oct 7 → Fri Oct 9",
    rows: [
      { when: "Wed & Thu", what: "Gradually shift meals toward carbs (~3–4 g/lb): rice, pasta, potatoes, bread, fruit. Keep protein moderate, fat lower. Don't overeat — you're topping off glycogen, not stuffing." },
      { when: "Fri (day before)", what: "Carb-forward, familiar, low-fiber foods. Bigger lunch, moderate early dinner (pasta/rice + light protein). Hydrate with electrolytes all day. Avoid new/spicy/greasy food and alcohol." },
      { when: "Every day through Fri", what: "Keep your usual scoop of beet powder (≈700 mg nitrate from the betaine nitrate + beet root) with breakfast. Skip antiseptic mouthwash — it blunts the nitrate effect. Pink urine is harmless." },
      { when: "Fri evening", what: "Lay out all gear (Gear tab). Set two alarms. Light easy day — legs up, relax." },
    ],
  },
  {
    section: "Race morning — Sat Oct 10",
    rows: [
      { when: "3–3.5 hrs before", what: "Familiar breakfast, ~600–800 cal, carb-heavy & low fiber: oatmeal + banana + honey, or bagel + peanut butter + banana. Coffee if that's your routine. Same breakfast you rehearsed before long runs." },
      { when: "2–3 hrs before", what: "1 scoop Re-Lyte (810 mg sodium, 400 mg potassium) in 16–20 oz water, with or after breakfast. Finish it by ~90 min before the start so there's time for a bathroom stop. (Skip the pickle juice — this covers it.) Plus ½ scoop of beet powder with breakfast (≈350 mg nitrate) — nitrate peaks 2–3 h later, and the half dose keeps race-morning stomach easy." },
      { when: "10–15 min before", what: "1 gel (24 g carbs) with a few sips of water. Use the bathroom. Nothing new." },
    ],
  },
  {
    section: "During the race (26.2 mi)",
    rows: [
      { when: "Every Watch buzz", what: "Gel + 1 salt chew + a few sips of water — at miles 4.6, 9.2, 13.5, 17.6 and 22.1 (one every 30 min). That's ~41 g carbs and ~340 mg sodium per hour, plus whatever sports drink you take. Carry 7 gels (pre-start, 5 in the race, 1 spare) and ~8 chews." },
      { when: "Fluids", what: "Drink to thirst at aid stations — small, frequent sips. Alternate water and sports drink. Favor electrolytes in heat; avoid over-drinking plain water." },
      { when: "Electrolytes", what: "1 salt chew (100 mg sodium, 30 mg potassium) with each gel is the default. Only add an extra chew if it's warm, you're caked in salt, or a cramp is starting. Drink to thirst — don't force plain water." },
      { when: "Pacing", what: "Start at the slow end of your 6:23–6:33 range for the first couple of miles and let it settle. Staying inside each range (your Watch alerts) is what keeps you under 3:00." },
    ],
  },
  {
    section: "After you finish",
    rows: [
      { when: "First 30–45 min", what: "Recovery carbs + protein: chocolate milk, a recovery shake, a banana. Keep walking — don't sit down right away." },
      { when: "Rest of day", what: "Full meal once your stomach settles, plenty of fluids + electrolytes. Celebrate — you earned it." },
      { when: "Days after", what: "Easy walking and gentle mobility. No running for several days; let the body rebuild." },
    ],
  },
];

// The gels used on race day (per gel).
export const RACE_GEL = { carbsG: 24, sodiumMg: 100, everyMin: 30 }; // everyMin: chosen spacing in the race
// Taken with each gel during the race.
export const RACE_SALT_CHEW = { sodiumMg: 100, potassiumMg: 30, perGel: 1 };
// Pre-race electrolyte drink, 2–3 hours before the start.
export const RACE_PRELOAD = { name: "Re-Lyte", sodiumMg: 810, potassiumMg: 400 };

export const RACE_PACING = {
  intro:
    "Sub-3 plan. Every range below is set so that even running its slowest pace, on every section, finishes in " +
    "about 2:59:20, already allowing for the watch measuring the course ~0.6% long and a 30-second cushion. " +
    "The course profile still suits a slightly negative-ish split around the midrace climb:",
  sections: [
    {
      range: "Miles 1–11",
      terrain: "net downhill, ~1000 ft loss",
      note: "Hold 6:23–6:33/mile. Gravity is helping, so this should feel controlled, but don't dip into the 6:00s chasing the downhill — you'll pay for it on the climb.",
    },
    {
      range: "Miles 11–17",
      terrain: "sustained climb, ~900 ft gain",
      note: "Ease to 7:12–7:32/mile. That's 40–60 sec/mile slower than the downhill and fully built into the sub-3 math. Trying to hold 6:30s here is the classic way to blow up this course.",
    },
    {
      range: "Hogsback / exposed rock spine",
      terrain: "within the climb stretch",
      note: "No pace change beyond the climb range above — keep effort smooth and controlled on the exposed footing.",
    },
    {
      range: "Miles 17–26.2",
      terrain: "net downhill, rolling",
      note: "Back to 6:28–6:38/mile. Legs will be tired from the climb; hold the range rather than hammering sub-6:20s to \"make up time\" — the time is already in the bank.",
    },
  ],
  // The same sections as numbers, for the Watch workout plan (pace as m:ss per mile). These are
  // the sub-3 ranges: the slow edges sum to ~2:59:20 over a GPS-padded 26.2.
  segments: [
    { from: 0, to: 11, lo: "6:23", hi: "6:33", terrain: "down" },
    { from: 11, to: 17, lo: "7:12", hi: "7:32", terrain: "climb" },
    { from: 17, to: 26.2, lo: "6:28", hi: "6:38", terrain: "down" },
  ],
  summary:
    "The math: middle of each range — ~6:28 for the first 11, ~7:22 up the climb, ~6:33 home — lands around " +
    "2:56–2:57. Slowest edge of every range is still ~2:59:20. Stay inside the ranges (your Watch alerts enforce " +
    "them) and sub-3 holds; the climb is where it's won or lost, so respect its range. With the Achilles this " +
    "week, run by feel first: if the calf/Achilles complains, back off — no time goal is worth a DNF.",
};

export const GEAR = [
  {
    group: "Wear",
    items: [
      { name: "Running shoes", note: "Broken-in (50–300 mi), NOT brand new. Your trusted long-run pair." },
      { name: "Moisture-wicking socks", note: "Anti-blister, the exact pair you trained in." },
      { name: "Shorts / tights", note: "Comfortable, no-chafe, pockets for gels if no race belt." },
      { name: "Tech shirt / singlet", note: "Breathable, non-cotton. Pin the bib on the night before." },
      { name: "Sports bra (if needed)", note: "Supportive and chafe-free on long runs." },
    ],
  },
  {
    group: "Weather",
    items: [
      { name: "Hat or visor", note: "Sun and sweat management." },
      { name: "Sunglasses", note: "For a bright October morning." },
      { name: "Throwaway layer", note: "Old long-sleeve/gloves for the cold start — toss once warm." },
      { name: "Arm sleeves / light gloves", note: "Chilly mornings; easy to remove mid-race." },
    ],
  },
  {
    group: "Anti-chafe & skin",
    items: [
      { name: "Anti-chafe balm", note: "Thighs, underarms, feet, bra line, waistband." },
      { name: "Nipple guards / tape", note: "Non-negotiable for long distance." },
      { name: "Sunscreen", note: "Sweat-resistant, applied before the start." },
      { name: "Blister plasters", note: "Pre-applied to any hot spots." },
    ],
  },
  {
    group: "Fuel & tech",
    items: [
      { name: "Energy gels / chews", note: "The number you practiced (≈5–7), in tested flavors." },
      { name: "Race belt / gel pockets", note: "Tested so it doesn't bounce or chafe." },
      { name: "Electrolyte / salt caps", note: "If you use them — pre-count the dose." },
      { name: "GPS watch", note: "Charged the night before, set to your pacing screen." },
      { name: "Handheld / soft flask (optional)", note: "If you prefer carrying your own fluid." },
    ],
  },
  {
    group: "Logistics",
    items: [
      { name: "Race bib + pins", note: "Attached to your shirt the night before (4 pins)." },
      { name: "Timing chip", note: "Attached per race instructions." },
      { name: "ID + a little cash/card", note: "For after the race." },
      { name: "Phone", note: "Logistics, photos, and safety." },
      { name: "Post-race bag", note: "Dry clothes, sandals, recovery drink, snack, towel." },
      { name: "Directions & start time", note: "Know your corral, start time, and bag-drop location." },
    ],
  },
];
