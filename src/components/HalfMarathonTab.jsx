import { RACE_INFO, MORNING_TIMELINE, PREP_CHECKLIST, COURSE_STRATEGY } from "../data/halfMarathonRace.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { zonePace } from "../utils/paces.js";
import elevationImg from "../assets/half-marathon-elevation.webp";

export default function HalfMarathonTab({ zones }) {
  const [checked, setChecked] = useLocalStorage("orca.halfMarathonChecklist", {});
  const allItems = PREP_CHECKLIST.flatMap((g) => g.items.map((i) => `${g.group}::${i.name}`));
  const doneCount = allItems.filter((k) => checked[k]).length;
  const toggle = (key) => setChecked((c) => ({ ...c, [key]: !c[key] }));
  const goalPace = zonePace(zones, "halfmarathon");

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
