import { RACE_DAY, COURSE } from "../data/nutrition.js";

export default function RaceDayTab() {
  return (
    <div>
      <div className="card">
        <h2>Course Profile — {COURSE.name}</h2>
        <div className="sub">
          {COURSE.distance} mi · {COURSE.ascent.toLocaleString()} ft ascent · {COURSE.descent.toLocaleString()} ft descent ·
          net −{COURSE.netDrop} ft ({COURSE.netGradePct}% avg grade)
        </div>

        <div className="zones-grid">
          <div className="zone">
            <div className="z-label">Distance</div>
            <div className="z-pace">{COURSE.distance}</div>
            <div className="z-unit">miles</div>
          </div>
          <div className="zone">
            <div className="z-label">Ascent</div>
            <div className="z-pace">{COURSE.ascent.toLocaleString()}</div>
            <div className="z-unit">feet</div>
          </div>
          <div className="zone">
            <div className="z-label">Descent</div>
            <div className="z-pace">{COURSE.descent.toLocaleString()}</div>
            <div className="z-unit">feet</div>
          </div>
          <div className="zone">
            <div className="z-label">Max elevation</div>
            <div className="z-pace">{COURSE.maxElev.toLocaleString()}</div>
            <div className="z-unit">feet</div>
          </div>
          <div className="zone">
            <div className="z-label">Min elevation</div>
            <div className="z-pace">{COURSE.minElev.toLocaleString()}</div>
            <div className="z-unit">feet</div>
          </div>
        </div>

        <div className="banner info" style={{ marginTop: 16 }}>
          Expected finish based on your current fitness: <b>{COURSE.expectedTime}</b> (target ~{COURSE.expectedTimeMid}) ·
          flat-equivalent fitness is {COURSE.flatEquivalent} — the climb at miles 12–17 cancels out most of what the
          descent gives back.
        </div>

        <div className="section-title">Mile-by-mile grade</div>
        <table className="grid">
          <tbody>
            {COURSE.profile.map((p) => (
              <tr key={p.miles}>
                <td className="when" style={{ width: "14%" }}>{p.miles}</td>
                <td style={{ width: "12%" }}>{p.grade}</td>
                <td>{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="callout" style={{ marginTop: 16 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {COURSE.pacingNotes.map((n) => (
              <li key={n} style={{ marginBottom: 6 }}>{n}</li>
            ))}
          </ul>
        </div>
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
        <div className="callout" style={{ marginTop: 16 }}>
          Rehearse it: practice this exact fueling — breakfast, gels, drink — on your long runs so race day has zero
          surprises. Your gut can be trained just like your legs.
        </div>
      </div>
    </div>
  );
}
