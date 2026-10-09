import { useState, useMemo } from "react";
import { RACE_PACING, RACE_GEL, RACE_SALT_CHEW, RACE_PRELOAD } from "../data/nutrition.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { buildWatchPlan, fmtClock, planAsText, GEL_INTERVALS } from "../utils/watchPlan.js";

const RACE_MI = 26.2;
const pct = (mi) => `${(mi / RACE_MI) * 100}%`;

// Race-day plan for the Apple Watch: the course as segments that end where something happens
// (gel, climb, finish), each with a pace alert — so the wrist does the coaching and the phone
// stays in the pocket.
export default function WatchPlanCard() {
  const [stored, setGelEvery] = useLocalStorage("orca.watchPlan.gelMin.v2", RACE_GEL.everyMin) // v2: drop choices saved under the old 30-min default;
  const gelEvery = GEL_INTERVALS.includes(stored) ? stored : RACE_GEL.everyMin;
  const [copied, setCopied] = useState(false);
  const plan = useMemo(() => buildWatchPlan(RACE_PACING.segments, { gelEveryMin: gelEvery, gel: RACE_GEL, chew: RACE_SALT_CHEW }), [gelEvery]);
  const f = plan.fuel;
  const fmtPace = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(planAsText(plan, gelEvery));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the table is still there to read */
    }
  }

  return (
    <div className="card watch-plan">
      <div className="card-row">
        <h2>⌚ Race Watch Plan</h2>
        <span className="week-total">≈ <b>{fmtClock(plan.expectedSec)}</b> expected</span>
      </div>
      <div className="sub">
        Your race as an Apple Watch custom workout. Each segment ends where something happens, so your wrist buzzes
        for every gel and every terrain change, with a pace alert if you drift. Set it up once; the phone stays put away.
      </div>

      <div className="wp-lock">
        <b>🔒 Sub-3 lock.</b> Even at the <i>slowest</i> pace every alert allows, on every segment, you finish in{" "}
        <b>{fmtClock(plan.worstSec)}</b>. That already allows for your watch measuring ~0.6% long (tangents, GPS)
        plus a 30-second cushion. Stay inside the alerts and sub-3 is guaranteed; the middle of each range lands
        around {fmtClock(plan.expectedSec)}. Keep <b>Auto-Pause off</b> so aid-station stops still count.
      </div>

      <div className="wp-controls">
        <div className="phase-picker" role="radiogroup" aria-label="Gel spacing">
          {GEL_INTERVALS.map((m) => (
            <button key={m} className={`phase-pill ${m === gelEvery ? "active" : ""}`} onClick={() => setGelEvery(m)} role="radio" aria-checked={m === gelEvery}>
              Gel every {m} min
            </button>
          ))}
        </div>
      </div>

      {/* Course strip: terrain sections with gel markers */}
      <div className="wp-strip" aria-label="Course sections and gel points">
        {plan.sections.map((s) => (
          <div key={s.from} className={`wp-sec ${s.terrain}`} style={{ left: pct(s.from), width: pct(s.to - s.from) }}>
            <span>{s.terrain === "climb" ? "⛰ climb" : "↘ downhill"} · {fmtPace(s.lo)}–{fmtPace(s.hi)}</span>
          </div>
        ))}
        {plan.gels.map((mi, i) => (
          <div key={i} className="wp-gel" style={{ left: pct(mi) }} title={`Gel #${i + 1} at mile ${mi.toFixed(1)}`}>
            <i>⚡</i><em>{mi.toFixed(1)}</em>
          </div>
        ))}
      </div>
      <div className="wp-axis"><span>Start</span><span>Mile 13.1</span><span>26.2</span></div>

      {f && (
        <div className="wp-fuel">
          <div><span className="lbl">Gels + chews</span><b>{f.count} + {f.chews}</b><span className="lbl">+ {f.pre} pre-start · carry {f.count + f.pre + 1} gels, ~{f.chews + 3} chews</span></div>
          <div className={f.carbsPerHour < 60 ? "warn" : ""}><span className="lbl">Carbs</span><b>{Math.round(f.carbsPerHour)} g/h</b><span className="lbl">{f.carbsG} g incl. pre-start · aim 60–90</span></div>
          <div className={f.sodiumPerHour < 300 ? "warn" : ""}><span className="lbl">Sodium</span><b>{Math.round(f.sodiumPerHour)} mg/h</b><span className="lbl">gels + chews · aim 300–600</span></div>
        </div>
      )}
      {f && (
        <ol className="wp-routine">
          <li><b>2–3 h before:</b> 1 scoop {RACE_PRELOAD.name} ({RACE_PRELOAD.sodiumMg} mg sodium, {RACE_PRELOAD.potassiumMg} mg potassium) in 16–20 oz water; finish by ~90 min before.</li>
          <li><b>10–15 min before:</b> 1 gel with a few sips of water.</li>
          <li><b>Every gel buzz (each {gelEvery} min):</b> 1 gel + a few sips of water{f.chewEvery > 1
            ? <>; add {RACE_SALT_CHEW.perGel} salt chew with every {f.chewEvery === 2 ? "other" : `${f.chewEvery}th`} gel (the buzzes marked "+ salt chew").</>
            : <> + {RACE_SALT_CHEW.perGel} salt chew.</>}</li>
          <li><b>Aid stations:</b> drink to thirst; an extra chew only if it's warm or a cramp is starting.</li>
        </ol>
      )}

      <div className="table-scroll">
        <table className="grid wp-steps">
          <thead>
            <tr><th>#</th><th>At mile</th><th>Pace alert</th><th>Buzz means…</th></tr>
          </thead>
          <tbody>
            {plan.steps.map((s) => (
              <tr key={s.n} className={s.kind}>
                <td className="when">{s.n}</td>
                <td><b className="wp-mile">{s.to.toFixed(1)}</b><div className="muted wp-setup">Watch step: {s.miles.toFixed(2)} mi</div></td>
                <td>{s.paceLo}–{s.paceHi}/mi</td>
                <td>{s.kind === "gel" ? "⚡ " : s.kind === "finish" ? "🏁 " : "⛰ "}{s.then}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-title">Set it up on your Watch (about 5 minutes, the night before)</div>
      <ol className="wp-howto">
        <li>Open <b>Workout</b> on the Watch, scroll to <b>Outdoor Run</b>, tap <b>⋯</b> → <b>Create Workout</b> → <b>Custom</b>.</li>
        <li>Set <b>Warmup</b> and <b>Cooldown</b> to off (or skip them).</li>
        <li>For each row above, add a <b>Work</b> step: Goal = <b>Distance</b> (the small "Watch step" miles under each mile marker), Alert = <b>Pace range</b> (the pace shown). No recovery steps.</li>
        <li>Name it <b>"Race"</b>. On race morning: Workout → Outdoor Run → ⋯ → <b>Race</b> → Start.</li>
      </ol>
      <div className="btn-row">
        <button className="btn small" onClick={copy}>{copied ? "Copied ✓" : "Copy plan as text"}</button>
      </div>
      <div className="hint" style={{ marginTop: 10 }}>
        Menu names can differ slightly between watchOS versions. A web app can't send workouts to the Watch directly
        (only native iPhone apps can), which is why this is a card you follow once.
      </div>
    </div>
  );
}
