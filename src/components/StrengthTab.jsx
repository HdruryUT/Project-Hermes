import { useState } from "react";
import { EXERCISES, WARMUP, PHASES, POST_RACE, PRINCIPLES, SOURCES, phaseForWeek } from "../data/strength.js";
import { PLAN } from "../data/plan.js";
import { currentPosition } from "../utils/schedule.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";

const DAY_LABEL = { Mon: "Monday", Fri: "Friday" };

function weekRange(phase) {
  const first = PLAN[phase.weeks[0] - 1];
  const last = PLAN[phase.weeks[phase.weeks.length - 1] - 1];
  const label = phase.weeks.length > 1 ? `Weeks ${phase.weeks[0]}–${phase.weeks[phase.weeks.length - 1]}` : `Week ${phase.weeks[0]}`;
  const start = first.dates.split("–")[0];
  const end = last.dates.split("–")[1];
  return `${label} · ${start}–${end}`;
}

export default function StrengthTab() {
  const pos = currentPosition();
  const current = phaseForWeek(pos.week.week);
  const [phaseKey, setPhaseKey] = useState(current.key);
  const phase = PHASES.find((p) => p.key === phaseKey) || current;
  const isCurrent = phase.key === current.key && pos.state === "during";

  const [checked, setChecked] = useLocalStorage("orca.strengthChecklist", {});
  const [showCues, setShowCues] = useLocalStorage("orca.strengthCues", true);
  const toggle = (key) => setChecked((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div>
      <div className="card">
        <h2>Strength Training for Runners</h2>
        <div className="sub">
          A periodized program that tracks the running plan: two sessions a week, heavy early, more power at peak,
          then tapering down into race day.
        </div>
        <ul style={{ margin: "0 0 4px", paddingLeft: 20 }}>
          {PRINCIPLES.map((p) => (
            <li key={p} style={{ marginBottom: 6 }}>{p}</li>
          ))}
        </ul>
      </div>

      {pos.state === "after" && (
        <div className="card">
          <h2>{POST_RACE.name}</h2>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {POST_RACE.steps.map((s) => <li key={s} style={{ marginBottom: 6 }}>{s}</li>)}
          </ul>
        </div>
      )}

      <div className="phase-picker">
        {PHASES.map((p) => (
          <button
            key={p.key}
            className={`phase-pill ${p.key === phase.key ? "active" : ""}`}
            onClick={() => setPhaseKey(p.key)}
          >
            {p.name}
            {p.key === current.key && pos.state === "during" && <span className="now">now</span>}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-row">
          <h2>{phase.name}</h2>
          <span className="phase-weeks">{weekRange(phase)}</span>
        </div>
        <div className="sub" style={{ marginBottom: 8 }}>{phase.goal}</div>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {phase.rules.map((r) => <li key={r} style={{ marginBottom: 4 }}>{r}</li>)}
        </ul>
      </div>

      <div className="card">
        <div className="card-row">
          <h2>Warm-up (every session)</h2>
          <label className="cue-toggle">
            <input type="checkbox" checked={showCues} onChange={() => setShowCues(!showCues)} />
            Show coaching cues
          </label>
        </div>
        <ol style={{ margin: "6px 0 0", paddingLeft: 20 }}>
          {WARMUP.map((w) => <li key={w} style={{ marginBottom: 4 }}>{w}</li>)}
        </ol>
      </div>

      {Object.entries(phase.sessions).map(([day, session]) => {
        const items = session.blocks.flatMap((b) => b.items.map(([id]) => `${phase.key}::${day}::${id}`));
        const doneCount = items.filter((k) => checked[k]).length;
        const isToday = isCurrent && pos.dayName === day;
        return (
          <div className={`card ${isToday ? "today-card" : ""}`} key={day}>
            <div className="card-row">
              <h2>
                {DAY_LABEL[day]}: {session.title}
                {isToday && <span className="today-tag">Today</span>}
              </h2>
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
              <b>{doneCount}</b> / {items.length} done
            </div>
            {session.blocks.map((block) => (
              <div className="check-group" key={block.name}>
                <h3>{block.name}</h3>
                {block.items.map(([id, rx]) => {
                  const ex = EXERCISES[id];
                  const key = `${phase.key}::${day}::${id}`;
                  const done = !!checked[key];
                  return (
                    <label className={`check ${done ? "done" : ""}`} key={key}>
                      <input type="checkbox" checked={done} onChange={() => toggle(key)} />
                      <span>
                        <span className="name">{ex.name}</span>
                        <span className="rx">{rx}</span>
                        {showCues && (
                          <>
                            <br />
                            <span className="note">{ex.cue}</span>
                            <br />
                            <span className="note why">Why: {ex.why}</span>
                          </>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}

      <div className="callout" style={{ marginBottom: 16 }}>
        Form before load. End a set early rather than let your form break. Sharp or worsening pain means stop;
        ordinary muscle fatigue is fine. No equipment? Swap the trap bar for a heavy kettlebell or dumbbell deadlift,
        hop over a towel instead of a plate, and use a band for the chops.
      </div>

      <div className="card">
        <h2>Sources</h2>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
          {SOURCES.map((s) => (
            <li key={s.url} style={{ marginBottom: 4 }}>
              <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
