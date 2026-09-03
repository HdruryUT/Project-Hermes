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
      { when: "Fri evening", what: "Lay out all gear (Gear tab). Set two alarms. Light easy day — legs up, relax." },
    ],
  },
  {
    section: "Race morning — Sat Oct 10",
    rows: [
      { when: "3–3.5 hrs before", what: "Familiar breakfast, ~600–800 cal, carb-heavy & low fiber: oatmeal + banana + honey, or bagel + peanut butter + banana. Coffee if that's your routine. Same breakfast you rehearsed before long runs." },
      { when: "Up to the start", what: "Sip water/electrolytes. Optional small top-off ~15 min before: half a banana, a few chews, or a gel. Use the bathroom. Nothing new." },
    ],
  },
  {
    section: "During the race (26.2 mi)",
    rows: [
      { when: "Carbs", what: "30–60 g carbs per hour — about one gel every 30–45 min. Start early (~mile 4–5), before you feel low." },
      { when: "Fluids", what: "Drink to thirst at aid stations — small, frequent sips. Alternate water and sports drink. Favor electrolytes in heat; avoid over-drinking plain water." },
      { when: "Electrolytes", what: "Add salt/electrolyte caps if it's warm or you're a salty sweater. Late cramping is often sodium, not just fatigue." },
      { when: "Pacing", what: "Start conservative — first few miles slightly slower than goal pace. A negative split feels far better than blowing up at mile 20." },
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

export const RACE_PACING = {
  intro:
    "Updated after the Aug 29 tune-up half (raw 1:22:00, ~1:25:30 flat-course-equivalent once the downhill grade " +
    "is backed out) — Riegel now predicts a flat marathon goal of about 6:48/mile instead of the earlier 7:20. " +
    "Here's that new pace applied to each section — the course profile is still well-suited to a slightly " +
    "negative-ish split around the midrace climb:",
  sections: [
    {
      range: "Miles 1–11",
      terrain: "net downhill, ~1000 ft loss",
      note: "Hold 6:33–6:43/mile. Slightly faster than goal pace is fine here since gravity's helping, but don't dip into 6:10s chasing the downhill — you'll pay for it on the climb.",
    },
    {
      range: "Miles 11–17",
      terrain: "sustained climb, ~900 ft gain",
      note: "Plan on 7:18–7:43/mile, maybe touching 7:58 on the steepest stretch. That's 30–55 sec/mile slower than goal — expected and fine. Trying to hold 6:48 here is the classic way to blow up this course.",
    },
    {
      range: "Hogsback / exposed rock spine",
      terrain: "within the climb stretch",
      note: "No pace change beyond the climb adjustment above — just keep effort smooth and controlled rather than pushing on the exposed footing.",
    },
    {
      range: "Miles 17–26.2",
      terrain: "net downhill, rolling",
      note: "Target 6:38–6:48/mile. Legs will be tired from the climb, so this isn't a place to hammer sub-6:30s to \"make up time\" — just hold goal pace or slightly under.",
    },
  ],
  summary:
    "Rough math: if you run the first 11 at ~6:38, the climb (6 miles) at ~7:30, and the final 9.2 at ~6:43, you " +
    "land right around 2:58–3:00 total — close to the new flat 6:48 average, just distributed to match the " +
    "terrain instead of forcing even splits. This is a meaningfully faster goal than before, riding on one " +
    "strong tune-up result and a Riegel extrapolation from half to full distance — treat it as a stretch goal " +
    "and stay open to backing off toward the old ~7:20 pace if the climb or late miles aren't cooperating.",
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
