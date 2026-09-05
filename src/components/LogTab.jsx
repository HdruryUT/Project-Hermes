import { useState, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { stravaStatus, fetchActivitiesFromBackend, fetchActivities } from "../services/strava.js";
import { buildLog, logSummary, demoActivities } from "../utils/log.js";
import { fmtPace } from "../utils/paces.js";
import { PHASE_COLOR } from "../data/plan.js";

const STATUS_META = {
  done: { label: "Done", cls: "st-done" },
  partial: { label: "Partial", cls: "st-partial" },
  missed: { label: "Missed", cls: "st-missed" },
  today: { label: "Today", cls: "st-today" },
  extra: { label: "Extra run", cls: "st-extra" },
  asplanned: { label: "", cls: "st-plain" },
};

function paceText(miles, seconds) {
  if (!miles || !seconds) return null;
  return fmtPace(seconds / miles);
}

function DayRow({ d }) {
  const meta = STATUS_META[d.status];
  const dateLabel = d.date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const pace = paceText(d.actualMiles, d.actualSeconds);
  return (
    <div className={`log-row ${meta.cls}`}>
      <div className="log-date">
        <div className="log-dow">{d.dayName}</div>
        <div className="log-daynum">{dateLabel}</div>
      </div>
      <div className="log-planned">
        <div className="log-planned-label">{d.planned.label}</div>
      </div>
      <div className="log-actual">
        {d.matches.length ? (
          <>
            <b>{d.actualMiles.toFixed(1)} mi</b>
            {pace && <span className="muted"> · {pace}/mi</span>}
            {d.matches.length > 1 && <span className="muted"> · {d.matches.length} runs</span>}
          </>
        ) : d.status === "missed" ? (
          <span className="muted">No matching run</span>
        ) : d.status === "today" ? (
          <span className="muted">Not synced yet</span>
        ) : (
          <span className="muted">—</span>
        )}
      </div>
      {meta.label && <div className={`log-badge ${meta.cls}`}>{meta.label}</div>}
    </div>
  );
}

export default function LogTab() {
  const [activities, setActivities] = useLocalStorage("orca.activities", null);
  const [syncedAt, setSyncedAt] = useLocalStorage("orca.activities.syncedAt", null);
  const [connected, setConnected] = useState(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  useMemo(() => {
    stravaStatus().then((s) => setConnected(s.connected));
  }, []);

  const log = useMemo(() => (activities ? buildLog(activities) : null), [activities]);
  const summary = useMemo(() => (log ? logSummary(log) : null), [log]);
  const weeks = useMemo(() => {
    if (!log) return [];
    const byWeek = new Map();
    for (const d of log) {
      if (!byWeek.has(d.weekIndex)) byWeek.set(d.weekIndex, { week: d.week, days: [] });
      byWeek.get(d.weekIndex).days.push(d);
    }
    return [...byWeek.values()].reverse();
  }, [log]);

  async function sync() {
    setBusy(true); setStatus(null);
    try {
      const data = await fetchActivitiesFromBackend();
      setActivities(data);
      setSyncedAt(new Date().toISOString());
      setStatus({ type: "info", msg: "Synced — planned vs. actual updated below." });
    } catch (err) {
      setStatus({ type: "warn", msg: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function syncWithToken() {
    if (!token.trim()) { setStatus({ type: "warn", msg: "Paste a Strava access token first." }); return; }
    setBusy(true); setStatus(null);
    try {
      const data = await fetchActivities(token.trim());
      setActivities(data);
      setSyncedAt(new Date().toISOString());
      setStatus({ type: "info", msg: "Synced — planned vs. actual updated below." });
    } catch (err) {
      setStatus({ type: "warn", msg: err.message });
    } finally {
      setBusy(false);
    }
  }

  function loadDemo() {
    setActivities(demoActivities());
    setSyncedAt(new Date().toISOString());
    setStatus({ type: "info", msg: "Demo activities loaded." });
  }

  return (
    <div>
      <div className="card">
        <h2>Training Log</h2>
        <div className="sub">
          Planned workouts from the schedule, matched against your actual Strava runs by date — so you can see
          adherence, not just the plan.
        </div>

        {status && <div className={`banner ${status.type}`}>{status.msg}</div>}

        {connected ? (
          <div className="btn-row">
            <button className="btn" onClick={sync} disabled={busy}>{busy ? "Syncing…" : "Sync Strava activities"}</button>
            <button className="btn ghost small" onClick={loadDemo}>Try with demo data</button>
          </div>
        ) : (
          <>
            <div className="field">
              <label>Strava access token</label>
              <input
                className="input" type="password" placeholder="Paste token…"
                value={token} onChange={(e) => setToken(e.target.value)}
              />
              <div className="hint">
                Works right now under plain <code>npm run dev</code> — generate one at{" "}
                strava.com/settings/api. Once the app is deployed, use Connect Strava on the Paces tab instead
                and this tab will sync automatically.
              </div>
            </div>
            <div className="btn-row">
              <button className="btn" onClick={syncWithToken} disabled={busy}>{busy ? "Syncing…" : "Sync with token"}</button>
              <button className="btn ghost small" onClick={loadDemo}>Try with demo data</button>
            </div>
          </>
        )}
        {syncedAt && <div className="hint" style={{ marginTop: 10 }}>Last synced {new Date(syncedAt).toLocaleString()}.</div>}
      </div>

      {summary && (
        <div className="card">
          <div className="card-row">
            <h2>Adherence so far</h2>
            <span className="week-total"><b>{summary.actualMiles}</b> / {summary.plannedMiles} planned mi</span>
          </div>
          <div className="progressbar"><span style={{ width: `${summary.adherencePct ?? 0}%` }} /></div>
          <div className="progress-meta">
            <span><b>{summary.done}</b> done</span>
            <span><b>{summary.partial}</b> partial</span>
            <span><b>{summary.missed}</b> missed</span>
            <span>of <b>{summary.total}</b> planned runs</span>
          </div>
        </div>
      )}

      {weeks.map(({ week, days }) => (
        <div className="week" key={week.week}>
          <div className="week-head">
            <span className="week-badge">Week {week.week}</span>
            <span className="week-dates">{week.dates}</span>
            <span className="phase-pill" style={{ background: PHASE_COLOR[week.phase] || "var(--blue)" }}>{week.phase}</span>
          </div>
          <div className="log-days">
            {days.map((d) => <DayRow key={d.key} d={d} />)}
          </div>
        </div>
      ))}

      {!log && (
        <div className="card">
          <div className="today-note">Sync Strava (or load demo data) above to see planned vs. actual for the weeks you've already run.</div>
        </div>
      )}
    </div>
  );
}
