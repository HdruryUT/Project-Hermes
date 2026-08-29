import { RACE_INFO, MORNING_TIMELINE, PREP_CHECKLIST, COURSE_STRATEGY, computeTargetSplits } from "../data/halfMarathonRace.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { zonePace, fmtPace, fmtDuration } from "../utils/paces.js";
import elevationImg from "../assets/half-marathon-elevation.webp";

function fmtMinutes(sec) {
  return Math.round(sec / 60);
}

export default function HalfMarathonTab({ zones }) {
  const [checked, setChecked] = useLocalStorage("orca.halfMarathonChecklist", {});
  const allItems = PREP_CHECKLIST.flatMap((g) => g.items.map((i) => `${g.group}::${i.name}`));
  const doneCount = allItems.filter((k) => checked[k]).length;
  const toggle = (key) => setChecked((c) => ({ ...c, [key]: !c[key] }));
  const goalPace = zonePace(zones, "halfmarathon");
  const basePace = goalPace ? (goalPace.lo + goalPace.hi) / 2 : null;
  const splits = computeTargetSplits(basePace);

  return (
    <div>
      <div className="card">
        <h2>🏔 Half Marathon — Tomorrow</h2>
        <div className="sub">
          {RACE_INFO.date} · Start {RACE_INFO.start} · Net downhill, {RACE_INFO.startElevation.toLocaleString()} ft
          → {RACE_INFO.finishElevation.toLocaleString()} ft ({RACE_INFO.totalDrop.toLocaleString()} ft drop over {RACE_INFO.distance} mi)
        </div>
        <div className="map-preview">
          <img src={elevationImg} alt="Half marathon elevation profile — net downhill from 7,966 ft to 4,711 ft" />
        </div>
        {goalPace && (
          <div className="banner info" style={{ marginTop: 14 }}>
            Flat-course goal pace: <b>{goalPace.text}/mi</b> — but read the course strategy below, this grade will run faster than that.
          </div>
        )}
      </div>

      <div className="card">
        <h2>Tonight &amp; Race Morning</h2>
        <div className="sub">Timed backward from a 6:30 AM gun.</div>
        {MORNING_TIMELINE.map((block) => (
          <div key={block.section}>
            <div className="section-title">{block.section}</div>
            <table className="grid">
              <tbody>
                {block.rows.map((r) => (
                  <tr key={r.when}>
                    <td className="when" style={{ width: "26%" }}>{r.when}</td>
                    <td>{r.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Prep Checklist</h2>
        <div className="progress">
          <b>{doneCount}</b> / {allItems.length} ready
          <button className="btn ghost small" style={{ marginLeft: 12 }} onClick={() => setChecked({})}>
            Clear all
          </button>
        </div>
        {PREP_CHECKLIST.map((g) => (
          <div className="check-group" key={g.group}>
            <h3>{g.group}</h3>
            {g.items.map((item) => {
              const key = `${g.group}::${item.name}`;
              const done = !!checked[key];
              return (
                <label className={`check ${done ? "done" : ""}`} key={key}>
                  <input type="checkbox" checked={done} onChange={() => toggle(key)} />
                  <span>
                    <span className="name">{item.name}</span>
                    <br />
                    <span className="note">{item.note}</span>
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Course &amp; Pacing Strategy</h2>
        <div className="sub">Read from the elevation chart's own numbers — the grade is not evenly distributed.</div>

        {splits ? (
          <>
            <table className="grid" style={{ marginBottom: 4 }}>
              <tbody>
                {splits.segments.map((s) => (
                  <tr key={s.label}>
                    <td style={{ width: "26%" }}>
                      <b>{s.label}</b>
                      <div className="muted" style={{ fontSize: 12 }}>{s.note}</div>
                    </td>
                    <td>
                      <b>{fmtPace(s.paceLo)}–{fmtPace(s.paceHi)}/mi</b>
                      <div className="muted" style={{ fontSize: 13 }}>~{fmtMinutes(s.timeLo)}–{fmtMinutes(s.timeHi)} min for this segment</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="banner info" style={{ marginTop: 4 }}>
              Projected finish: <b>{fmtDuration(splits.totalTimeLo)}–{fmtDuration(splits.totalTimeHi)}</b>
              <span className="muted"> · vs ~{fmtDuration(splits.flatTime)} if this were a flat course</span>
            </div>
            <div className="hint" style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, marginBottom: 10 }}>
              Rough targets from typical downhill pace adjustments, not a guarantee — everyone's downhill running
              efficiency differs. Use these as a sanity check, not a number to chase.
            </div>
          </>
        ) : (
          <div className="banner warn" style={{ marginBottom: 10 }}>
            Set your paces in Paces &amp; Strava to see personalized target splits for this course.
          </div>
        )}

        {COURSE_STRATEGY.map((s) => (
          <div key={s.title} style={{ marginBottom: 14 }}>
            <div className="section-title" style={{ marginTop: 0, marginBottom: 4 }}>{s.title}</div>
            <div>{s.note}</div>
          </div>
        ))}
        <div className="callout" style={{ marginTop: 8 }}>
          Good luck tomorrow — you've done the work. Trust your training, control the steep front section, and let
          the back half take care of itself.
        </div>
      </div>
    </div>
  );
}
