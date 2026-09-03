import { STRENGTH_SESSIONS, PRINCIPLES } from "../data/strength.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";

export default function StrengthTab() {
  const [checked, setChecked] = useLocalStorage("orca.strengthChecklist", {});
  const toggle = (key) => setChecked((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div>
      <div className="card">
        <h2>Strength Training for Runners</h2>
        <div className="sub">Two sessions a week, built into your schedule on Mondays and Fridays.</div>
        <ul style={{ margin: "0 0 4px", paddingLeft: 20 }}>
          {PRINCIPLES.map((p) => (
            <li key={p} style={{ marginBottom: 6 }}>{p}</li>
          ))}
        </ul>
      </div>

      {STRENGTH_SESSIONS.map((session) => {
        const items = session.exercises.map((e) => `${session.day}::${e.name}`);
        const doneCount = items.filter((k) => checked[k]).length;
        return (
          <div className="card" key={session.day}>
            <div className="card-row">
              <h2>{session.day} — {session.title}</h2>
              <button className="btn ghost small" onClick={() => setChecked((c) => {
                const next = { ...c };
                items.forEach((k) => delete next[k]);
                return next;
              })}>
                Clear
              </button>
            </div>
            <div className="sub">{session.purpose}</div>
            <div className="progress">
              <b>{doneCount}</b> / {session.exercises.length} done
            </div>
            <div className="check-group">
              {session.exercises.map((ex) => {
                const key = `${session.day}::${ex.name}`;
                const done = !!checked[key];
                return (
                  <label className={`check ${done ? "done" : ""}`} key={key}>
                    <input type="checkbox" checked={done} onChange={() => toggle(key)} />
                    <span>
                      <span className="name">{ex.name}</span>
                      <br />
                      <span className="note">{ex.note}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="callout">
        Warm up with 5 minutes of easy movement (leg swings, glute bridges, band walks) before either session, and
        finish with light stretching. Form over weight — stop a set short rather than break form.
      </div>
    </div>
  );
}
