import { PLAN, DAY_NAMES, weeklyMiles, PHASE_COLOR } from "../data/plan.js";
import { zoneForWorkout, zonePace } from "../utils/paces.js";

function DayCell({ dow, day, zones }) {
  const cls = ["day", day.type].join(" ");
  const zoneKey = zoneForWorkout(day.type);
  const pace = zoneKey ? zonePace(zones, zoneKey) : null;
  return (
    <div className={cls}>
      <div className="dow">{dow}</div>
      <div className="wk-label">{day.label}</div>
      {pace && (
        <div className="wk-pace">
          {pace.text}
          <span style={{ color: "var(--muted)", fontWeight: 500 }}> /mi</span>
        </div>
      )}
    </div>
  );
}

export default function ScheduleTab({ zones }) {
  return (
    <div>
      <div className="card">
        <h2>Training Schedule</h2>
        <div className="sub">
          10 weeks, strength twice a week, long runs climbing from 10 to 20 miles, then a taper into race day.
          {zones
            ? " Paces below are personalized from your recent runs."
            : " Connect Strava or enter a recent run in the Paces tab to see personalized target paces."}
        </div>
        <div className="legend">
          <span><span className="dot" style={{ background: "var(--blue)" }} />Long run</span>
          <span><span className="dot" style={{ background: "var(--orange)" }} />Race</span>
          <span><span className="dot" style={{ background: "var(--amber)" }} />Strength</span>
          <span>Strides = 4–6 × 20-sec smooth pickups · XT = bike/swim/elliptical</span>
        </div>
      </div>

      {PLAN.map((wk) => (
        <div className="week" key={wk.week}>
          <div className="week-head">
            <span className="week-badge">Week {wk.week}</span>
            <span className="week-dates">{wk.dates}</span>
            <span className="phase-pill" style={{ background: PHASE_COLOR[wk.phase] || "var(--blue)" }}>
              {wk.phase}
            </span>
            <span className="week-focus">{wk.focus}</span>
            <span className="week-total">
              <b>{weeklyMiles(wk)}</b> mi
            </span>
          </div>
          <div className="days">
            {DAY_NAMES.map((dow) => (
              <DayCell key={dow} dow={dow} day={wk.days[dow]} zones={zones} />
            ))}
          </div>
        </div>
      ))}

      <div className="callout">
        Golden rules: keep easy runs truly easy, never add more than ~10% weekly mileage, and put nothing new in
        your body or on your feet on race day that you haven't tested on a long run.
      </div>
    </div>
  );
}
