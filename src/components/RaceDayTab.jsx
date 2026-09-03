import { RACE_DAY, RACE_PACING } from "../data/nutrition.js";
import courseMapImg from "../assets/course-map.png";

export default function RaceDayTab() {
  return (
    <div>
      <div className="card">
        <h2>Course Map</h2>
        <div className="sub">Elevation profile and route for race day.</div>
        <div className="map-preview">
          <img src={courseMapImg} alt="Course map and elevation profile" />
        </div>
      </div>

      <div className="card">
        <h2>Race Pacing Plan</h2>
        <div className="sub">{RACE_PACING.intro}</div>
        <table className="grid">
          <tbody>
            {RACE_PACING.sections.map((s) => (
              <tr key={s.range}>
                <td style={{ width: "26%" }}>
                  <b>{s.range}</b>
                  <div className="muted" style={{ fontSize: 12 }}>{s.terrain}</div>
                </td>
                <td>{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="callout silver" style={{ marginTop: 16 }}>{RACE_PACING.summary}</div>
      </div>

      <div className="card">
        <h2>Race Week &amp; Fueling</h2>
        <div className="sub">Everything from carb-load to the finish line. Rehearse the fueling on your Week 6–8 long runs.</div>
        {RACE_DAY.map((block) => (
          <div key={block.section}>
            <div className="section-title">{block.section}</div>
            <table className="grid">
              <tbody>
                {block.rows.map((r) => (
                  <tr key={r.when}>
                    <td className="when" style={{ width: "22%" }}>{r.when}</td>
                    <td>{r.what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div className="callout silver" style={{ marginTop: 16 }}>
          Rehearse it: practice this exact fueling — pre-run snack, gels, drink — on your long runs so race day has
          zero surprises. Your gut can be trained just like your legs.
        </div>
      </div>
    </div>
  );
}
