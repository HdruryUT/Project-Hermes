import { useState, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { stravaStatus, fetchActivitiesFromBackend, fetchActivities } from "../services/strava.js";
import { weeklyMileageThroughToday, recentRuns, demoActivities } from "../utils/log.js";
import { currentPosition } from "../utils/schedule.js";
import { fmtPace } from "../utils/paces.js";
import { PHASE_COLOR } from "../data/plan.js";

function paceText(miles, seconds) {
  if (!miles || !seconds) return null;
  return fmtPace(seconds / miles);
}

function WeekRow({ w }) {
  const pct = w.planned > 0 ? Math.round((w.actual / w.planned) * 100) : null;
  const cls = pct == null ? "" : pct >= 90 ? "st-done" : pct >= 60 ? "st-partial" : "st-missed";
  const badgeLabel = pct == null ? null : pct >= 90 ? "On target" : pct >= 60 ? "Under" : "Well under";
  return (
    <div className="mi-row">
      <div className="mi-head">
        <span className="mi-week">Week {w.week}</span>
        <span className="mi-dates muted">{w.dates}</span>
        <span className="phase-pill" style={{ background: PHASE_COLOR[w.phase] || "var(--blue)" }}>{w.phase}</span>
        {badgeLabel && <span className={`log-badge ${cls}`}>{badgeLabel}</span>}
      </div>
      <div className="progressbar"><span style={{ width: `${Math.min(100, pct ?? 0)}%` }} /></div>
      <div className="mi-numbers">
        <b>{w.actual}</b> / {w.planned} mi{pct != null && <span className="muted"> · {pct}%</span>}
      </div>
    </div>
  );
}

function RunRow({ r }) {
  const pace = paceText(r.miles, r.seconds);
  const d = new Date(r.date);
  return (
    <div className="log-row">
      <div className="log-date">
        <div className="log-dow">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
        <div className="log-daynum">{d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
      </div>
      <div className="log-planned">
        <div className="log-planned-label">{r.name}</div>
      </div>
      <div className="log-actual">
        <b>{r.miles.toFixed(1)} mi</b>
        {pace && <span className="muted"> · {pace}/mi</span>}
      </div>
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

  const pos = currentPosition();
  const cutoffWeek = pos.state === "before" ? -1 : pos.weekIndex;

  const weeks = useMemo(
    () => (activities ? weeklyMileageThroughToday(activities, cutoffWeek).reverse() : []),
    [activities, cutoffWeek]
  );
  const runs = useMemo(() => (activities ? recentRuns(activities) : []), [activities]);
  const totalActual = weeks.reduce((s, w) => s + w.actual, 0);
  const totalPlanned = weeks.reduce((s, w) => s + w.planned, 0);

  async function sync() {
    setBusy(true); setStatus(null);
    try {
      const data = await fetchActivitiesFromBackend();
      setActivities(data);
      setSyncedAt(new Date().toISOString());
      setStatus({ type: "info", msg: "Synced — mileage and recent runs updated below." });
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
      setStatus({ type: "info", msg: "Synced — mileage and recent runs updated below." });
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
          Your actual Strava mileage, week by week against target — plus a feed of every run synced for this
          training block.
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

      {weeks.length > 0 && (
        <div className="card">
          <div className="card-row">
            <h2>Weekly Mileage</h2>
            <span className="week-total"><b>{Math.round(totalActual * 10) / 10}</b> / {Math.round(totalPlanned * 10) / 10} mi total</span>
          </div>
          <div className="sub">Actual synced mileage vs. your planned target for each week so far.</div>
          {weeks.map((w) => <WeekRow key={w.week} w={w} />)}
        </div>
      )}

      {runs.length > 0 && (
        <div className="card">
          <h2>Recent Runs</h2>
          <div className="sub">Everything Strava has recorded for this training block, newest first.</div>
          <div className="log-days">
            {runs.map((r) => <RunRow key={r.id} r={r} />)}
          </div>
        </div>
      )}

      {!activities && (
        <div className="card">
          <div className="today-note">Sync Strava (or load demo data) above to see your weekly mileage and recent runs.</div>
        </div>
      )}
    </div>
  );
}
