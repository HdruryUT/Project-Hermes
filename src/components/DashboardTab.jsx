import { RACE_DATE, DAY_NAMES, PHASE_COLOR, weeklyMiles, PLAN } from "../data/plan.js";
import { zoneForWorkout, zonePace, fmtPace, fmtDuration } from "../utils/paces.js";
import { currentPosition, totalPlannedMiles, milesThroughWeek } from "../utils/schedule.js";
import { weeklyActualMiles } from "../utils/log.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { IconEating, IconGrocery, IconFlag, IconShirt } from "./icons.jsx";
import MileageChart from "./MileageChart.jsx";

function daysUntilRace() {
  const race = new Date(RACE_DATE + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((race - now) / 86400000));
}

const GLANCE_ZONES = ["easy", "long", "tempo", "marathon"];

export default function DashboardTab({ zones, goToTab }) {
  const pos = currentPosition();
  const { week, dayName, today, state } = pos;
  const days = daysUntilRace();
  const weekNo = week.week;
  const doneMiles = milesThroughWeek(pos.weekIndex);
  const totalMiles = totalPlannedMiles();
  const progressPct = Math.round((doneMiles / totalMiles) * 100);

  const [activities] = useLocalStorage("orca.activities", null);
  const cutoffWeek = state === "after" ? PLAN.length - 1 : state === "during" ? pos.weekIndex : -1;
  const actualSeries = activities && cutoffWeek >= 0
    ? weeklyActualMiles(activities).map((m, i) => (i <= cutoffWeek ? m : null))
    : null;

  const todayZoneKey = zoneForWorkout(today.type);
  const todayPace = todayZoneKey ? zonePace(zones, todayZoneKey) : null;
  const isRest = today.type === "rest" || today.type === "xt";
  const isStrength = today.type === "strength";

  return (
    <div>
      {/* Stat strip */}
      <div className="dash-grid">
        <div className="stat accent-orange">
          <div className="lbl">Race day</div>
          <div className="big">{days}</div>
          <div className="lbl">days to go · Oct 10</div>
        </div>
        <div className="stat">
          <div className="lbl">Training week</div>
          <div className="big">{weekNo}<span className="of">/10</span></div>
          <div className="lbl">{week.phase} · {week.dates}</div>
        </div>
        <div className="stat">
          <div className="lbl">This week</div>
          <div className="big">{weeklyMiles(week)}<span className="of">mi</span></div>
          <div className="lbl">planned volume</div>
        </div>
        <div className="stat accent-teal">
          <div className="lbl">Predicted marathon</div>
          <div className="big small">{zones ? fmtDuration(zones.marathonSeconds) : "—"}</div>
          <div className="lbl">
            {zones ? `${fmtPace(zones.marathonPace)}/mi goal` : "set your paces →"}
          </div>
        </div>
      </div>

      {/* Today */}
      <div className="card today-card">
        <div className="today-head">
          <span className="today-tag">
            {state === "before" ? "Kicking off" : state === "after" ? "You made it 🎉" : `Today · ${dayName}`}
          </span>
          <span className="phase-pill" style={{ background: PHASE_COLOR[week.phase] || "var(--teal)" }}>
            {week.phase}
          </span>
        </div>
        <div className="today-workout">{today.label}</div>
        {isRest ? (
          <div className="today-note">Rest is training too — this is when your body adapts. Take it easy.</div>
        ) : isStrength ? (
          <div className="today-note">
            Strength day — check the Strength tab for today's session.{" "}
            <button className="btn small" onClick={() => goToTab("strength")}>Open Strength</button>
          </div>
        ) : todayPace ? (
          <div className="today-pace">
            Target pace <b>{todayPace.text}/mi</b> <span className="muted">({todayPace.label})</span>
          </div>
        ) : (
          <div className="today-note">
            Set your paces to see today's target →{" "}
            <button className="btn small" onClick={() => goToTab("paces")}>Set paces</button>
          </div>
        )}
      </div>

      {/* This week strip */}
      <div className="card">
        <div className="card-row">
          <h2>This week</h2>
          <button className="btn ghost small" onClick={() => goToTab("schedule")}>Full schedule →</button>
        </div>
        <div className="sub">{week.focus}</div>
        <div className="days mini">
          {DAY_NAMES.map((dow) => {
            const d = week.days[dow];
            const zk = zoneForWorkout(d.type);
            const p = zk ? zonePace(zones, zk) : null;
            const isToday = state === "during" && dow === dayName;
            return (
              <div className={`day ${d.type} ${isToday ? "is-today" : ""}`} key={dow}>
                <div className="dow">{dow}{isToday ? " •" : ""}</div>
                <div className="wk-label">{d.label}</div>
                {p && <div className="wk-pace">{p.text}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly mileage */}
      <div className="card">
        <div className="card-row">
          <h2>Training Volume</h2>
          {actualSeries && (
            <div className="chart-legend">
              <span><span className="dot" style={{ background: "var(--muted)" }} />Planned</span>
              <span><span className="dot" style={{ background: "var(--blue)" }} />Actual</span>
            </div>
          )}
        </div>
        <div className="sub">
          Planned miles per week across the plan{state === "during" ? " — this week is highlighted" : ""}.
          {!activities && " Sync Strava on the Log tab to see actual mileage overlaid here."}
        </div>
        <MileageChart plan={PLAN} activeWeekIndex={state === "during" ? pos.weekIndex : null} actual={actualSeries} />
      </div>

      {/* Progress + paces */}
      <div className="dash-two">
        <div className="card">
          <h2>Plan progress</h2>
          <div className="sub">Week {weekNo} of 10 · {progressPct}% of planned miles scheduled so far</div>
          <div className="progressbar"><span style={{ width: `${progressPct}%` }} /></div>
          <div className="progress-meta">
            <span><b>{doneMiles}</b> mi through this week</span>
            <span><b>{totalMiles}</b> mi total plan</span>
          </div>
        </div>

        <div className="card">
          <div className="card-row">
            <h2>Paces at a glance</h2>
            <button className="btn ghost small" onClick={() => goToTab("paces")}>Adjust →</button>
          </div>
          {zones ? (
            <div className="glance-zones">
              {GLANCE_ZONES.map((k) => {
                const p = zonePace(zones, k);
                return (
                  <div className="glance" key={k}>
                    <span className="g-label">{p.label}</span>
                    <span className="g-pace">{p.text}<span className="muted"> /mi</span></span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="today-note">
              No paces set yet.{" "}
              <button className="btn small" onClick={() => goToTab("paces")}>Connect Strava / set paces</button>
            </div>
          )}
        </div>
      </div>

      {/* Quick nav */}
      <div className="quick-nav">
        <button className="quick" onClick={() => goToTab("eating")}><IconEating size={26} /><span>Eating</span></button>
        <button className="quick" onClick={() => goToTab("grocery")}><IconGrocery size={26} /><span>Grocery</span></button>
        <button className="quick" onClick={() => goToTab("raceday")}><IconFlag size={26} /><span>Race Day</span></button>
        <button className="quick" onClick={() => goToTab("gear")}><IconShirt size={26} /><span>Gear</span></button>
      </div>
    </div>
  );
}
