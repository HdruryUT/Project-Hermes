// Nutrition, grocery, race-day fueling, and gear content.

export const EATING_SCHEDULE = {
  intro:
    "Target roughly 2.5–3.5 g carbs per lb body weight on hard/long days, ~0.7 g protein per lb daily, and steady hydration. Times are examples — anchor them to your own schedule and run time.",
  rows: [
    {
      when: "Wake / pre-run",
      normal: "Small carb snack: banana or toast with honey + water. Coffee if you like.",
      long: "Toast + honey or a small bowl of oatmeal + banana, 45–60 min before. Sip water/electrolytes.",
    },
    {
      when: "Breakfast / post-run",
      normal: "Oats with berries + Greek yogurt + nuts, OR eggs with whole-grain toast + fruit.",
      long: "Recovery within 30–45 min: chocolate milk or a smoothie first, then a full carb + protein breakfast.",
    },
    {
      when: "Mid-morning snack",
      normal: "Apple + a handful of almonds, or Greek yogurt.",
      long: "Extra carbs today: yogurt + granola + fruit. Keep refueling.",
    },
    {
      when: "Lunch",
      normal: "Grain bowl: rice or quinoa + chicken/beans + veg + olive oil. A whole-grain wrap works too.",
      long: "Same, slightly larger. Prioritize carbs + easy protein. Add a side of fruit.",
    },
    {
      when: "Afternoon snack",
      normal: "Whole-grain crackers + hummus, or a banana with peanut butter.",
      long: "Trail mix, dates, or a rice cake with nut butter. Keep glycogen topped up.",
    },
    {
      when: "Dinner",
      normal: "Salmon or lean protein + sweet potato/pasta + vegetables + olive oil.",
      long: "Carb-forward: pasta or rice bowl + protein + veg. Not too heavy — you refueled all day.",
    },
    {
      when: "Hydration (all day)",
      normal: "Half your body weight (lb) in oz of water; more on hot days. Electrolytes after sweaty runs.",
      long: "Higher intake. Electrolyte drink during and after the long run. Aim for pale-straw urine.",
    },
  ],
  principles:
    "Build meals around whole-grain carbs, lean protein at every meal for repair, colorful produce for recovery, and healthy fats in moderation. Limit alcohol and heavily processed food, especially the day before a long run. Iron matters for endurance — include lean red meat, beans, and spinach, and pair plant iron with vitamin C.",
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

export const COURSE = {
  name: "Boulder, UT → Escalante, UT",
  distance: 26.2,
  ascent: 3270,
  descent: 3940,
  netDrop: 670,
  netGradePct: 0.48,
  maxElev: 6778,
  minElev: 5181,
  expectedTime: "3:10–3:13",
  expectedTimeMid: "3:12",
  flatEquivalent: "3:08–3:09",
  profile: [
    { miles: "0–2", grade: "+2.9%", note: "Gentle climb out of Boulder." },
    { miles: "2–8", grade: "−1.5%", note: "Rolling terrain, mild net decline." },
    { miles: "8–12", grade: "−5.0%", note: "Steep descent — the fastest stretch on paper. Run it controlled, not aggressive." },
    { miles: "12–17", grade: "+4.0%", note: "Sustained climb right after the descent, on already-tired legs. This is the section that decides your day." },
    { miles: "17–26", grade: "−1.0%", note: "Gentle rolling decline to the finish." },
  ],
  pacingNotes: [
    "Net elevation change is only −670 ft (≈0.48% average grade) — despite the profile, this is not a fast downhill course.",
    "The miles 8–12 descent and the miles 12–17 climb largely cancel out: time banked bombing the downhill gets paid back, with interest, on the climb right after it.",
    "Run the descent controlled — save your quads for the climb at mile 12, not the other way around.",
    "Pace by effort, not by GPS pace: slowing on miles 12–17 is correct and expected, not a sign anything's wrong.",
    "You're already elevation-acclimatized (Orem sits ~4,500+ ft) — the 6,778 ft high point shouldn't be a major factor on its own.",
  ],
};

export const RACE_DAY = [
  {
    section: "Carb-load — Thu Oct 8 → Sat Oct 10",
    rows: [
      { when: "Thu & Fri", what: "Gradually shift meals toward carbs (~3–4 g/lb): rice, pasta, potatoes, bread, fruit. Keep protein moderate, fat lower. Don't overeat — you're topping off glycogen, not stuffing." },
      { when: "Sat (day before)", what: "Carb-forward, familiar, low-fiber foods. Bigger lunch, moderate early dinner (pasta/rice + light protein). Hydrate with electrolytes all day. Avoid new/spicy/greasy food and alcohol." },
      { when: "Sat evening", what: "Lay out all gear (Gear tab). Set two alarms. Light easy day — legs up, relax." },
    ],
  },
  {
    section: "Race morning — Sun Oct 11",
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
