import { EATING_SCHEDULE } from "../data/nutrition.js";

// "Breakfast (~7–8 AM)" -> { label: "Breakfast", time: "~7–8 AM" }, so the time can sit on
// its own line under the label instead of stretching the When column.
function splitWhen(when) {
  const m = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(when);
  return m ? { label: m[1], time: m[2] } : { label: when, time: null };
}

export default function EatingTab() {
  const { intro, rows, principles } = EATING_SCHEDULE;
  return (
    <div className="card">
      <h2>Eating Schedule</h2>
      <div className="sub">{intro}</div>
      <table className="grid">
        <thead>
          <tr>
            <th style={{ width: "14%" }}>When</th>
            <th>Normal run day (~6 PM)</th>
            <th>Long-run day</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const { label, time } = splitWhen(r.when);
            return (
              <tr key={r.when}>
                <td className="when">
                  {label}
                  {time && <div className="when-time">{time}</div>}
                </td>
                <td>{r.normal}</td>
                <td>{r.long}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="callout" style={{ marginTop: 16 }}>{principles}</div>
    </div>
  );
}
