import { useState, useEffect } from "react";
import {
  effortFromStrava, demoEffort, stravaStatus, effortFromStravaBackend, disconnectStrava,
} from "../services/strava.js";
import {
  computeZones, zonePace, fmtPace, fmtDuration,
  effortFromManual, DISTANCE_PRESETS,
} from "../utils/paces.js";

const ZONE_ORDER = ["easy", "recovery", "long", "marathon", "tempo", "intervals"];

export default function SettingsTab({ effort, onSetEffort }) {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(null); // null = still checking

  const [presetIdx, setPresetIdx] = useState(3); // half marathon
  const [customMiles, setCustomMiles] = useState("");
  // Prefilled with a downhill-adjusted equivalent of the Aug 29 half (raw 1:22:30 on a
  // course averaging ~6.1% grade for the front 6.9 mi, ~3.2% for the final 10K — see
  // the Half Marathon strategy math). Edit freely if you'd rather use the raw time.
  const [timeStr, setTimeStr] = useState("1:26:00");

  const zones = computeZones(effort);

  useEffect(() => {
    stravaStatus().then((s) => setConnected(s.connected));
  }, []);

  async function connectStrava() {
    if (!token.trim()) { setStatus({ type: "warn", msg: "Paste a Strava access token first." }); return; }
    setBusy(true); setStatus(null);
    try {
      const { effort: e } = await effortFromStrava(token.trim());
      onSetEffort(e);
      setStatus({ type: "info", msg: `Connected. Paces set from your run "${e.name}" (${e.miles.toFixed(1)} mi).` });
    } catch (err) {
      setStatus({ type: "warn", msg: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function syncStrava() {
    setBusy(true); setStatus(null);
    try {
      const { effort: e } = await effortFromStravaBackend();
      onSetEffort(e);
      setStatus({ type: "info", msg: `Synced. Paces set from your run "${e.name}" (${e.miles.toFixed(1)} mi).` });
    } catch (err) {
      setStatus({ type: "warn", msg: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    await disconnectStrava();
    setConnected(false);
    setStatus(null);
  }

  function loadDemo() {
    const { effort: e } = demoEffort();
    onSetEffort(e);
    setStatus({ type: "info", msg: "Demo data loaded — paces are based on a sample recent 10-miler." });
  }

  function applyManual() {
    const preset = DISTANCE_PRESETS[presetIdx];
    const miles = preset.miles ?? Number(customMiles);
    const e = effortFromManual(miles, timeStr, "manual");
    if (!e) { setStatus({ type: "warn", msg: "Enter a valid distance and time (e.g. 1:45:00)." }); return; }
    onSetEffort(e);
    setStatus({ type: "info", msg: `Paces set from your ${preset.label} of ${timeStr}.` });
  }

  return (
    <div>
      <div className="card">
        <h2>Your Paces</h2>
        <div className="sub">
          The schedule shows target paces built from a recent effort. Update it here and every workout re-calculates.
        </div>

        {status && <div className={`banner ${status.type}`}>{status.msg}</div>}

        {zones ? (
          <>
            <div className="banner info">
              Predicted marathon time: <b>{fmtDuration(zones.marathonSeconds)}</b> at{" "}
              <b>{fmtPace(zones.marathonPace)}/mi</b>
              {effort?.source === "strava" && effort?.name ? ` · from Strava run "${effort.name}"` : ""}
              {effort?.source === "manual" ? ` · from your entered ${effort.miles.toFixed(1)}-mi effort` : ""}
            </div>
            <div className="zones-grid">
              {ZONE_ORDER.map((k) => {
                const p = zonePace(zones, k);
                return (
                  <div className="zone" key={k}>
                    <div className="z-label">{p.label}</div>
                    <div className="z-pace">{p.text}</div>
                    <div className="z-unit">min / mile</div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="banner warn">No paces yet. Connect Strava, load demo data, or enter a recent run below.</div>
        )}
      </div>

      <div className="card">
        <h2>Connect Strava</h2>
        <div className="sub">
          The app picks your fittest recent run (last 6 weeks) and recalculates every training pace from it.
        </div>

        {connected ? (
          <>
            <div className="banner info">Strava connected ✓ — no token needed, just sync when you want fresh data.</div>
            <div className="btn-row">
              <button className="btn" onClick={syncStrava} disabled={busy}>
                {busy ? "Syncing…" : "Sync latest run & set paces"}
              </button>
              <button className="btn ghost" onClick={loadDemo}>Try with demo data</button>
              <button className="btn ghost small" onClick={handleDisconnect}>Disconnect</button>
            </div>
          </>
        ) : (
          <>
            <div className="banner strava">
              Click Connect to authorize once — the app then refreshes your Strava data itself, no token pasting.
              This needs the app's small serverless backend, so it only works once deployed (see the README) —
              not under plain <code>npm run dev</code>.
            </div>
            <div className="btn-row">
              <a className="btn" href="/api/strava/login">Connect Strava</a>
              <button className="btn ghost" onClick={loadDemo}>Try with demo data</button>
            </div>

            <div className="field" style={{ marginTop: 16 }}>
              <label>Or paste a token manually</label>
              <input
                className="input"
                type="password"
                placeholder="Paste token…"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <div className="hint">
                Works right now in local dev, no deploy needed — but the token expires in ~6 hours, so you'll
                re-paste a fresh one each time. Stored only in this browser.
              </div>
            </div>
            <button className="btn ghost" onClick={connectStrava} disabled={busy}>
              {busy ? "Connecting…" : "Use this token"}
            </button>
          </>
        )}
      </div>

      <div className="card">
        <h2>Or enter a recent run manually</h2>
        <div className="sub">A recent race or hard effort works best — the app predicts your marathon from it.</div>
        <div className="field">
          <label>Distance</label>
          <select className="select" value={presetIdx} onChange={(e) => setPresetIdx(Number(e.target.value))}>
            {DISTANCE_PRESETS.map((p, i) => (
              <option key={p.label} value={i}>{p.label}</option>
            ))}
          </select>
        </div>
        {DISTANCE_PRESETS[presetIdx].miles == null && (
          <div className="field">
            <label>Custom distance (miles)</label>
            <input className="input" value={customMiles} onChange={(e) => setCustomMiles(e.target.value)} placeholder="e.g. 8" />
          </div>
        )}
        <div className="field">
          <label>Time (h:mm:ss or mm:ss)</label>
          <input className="input" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} placeholder="e.g. 1:45:00" />
          <div className="hint">
            Prefilled at 1:26:00 — your raw Aug 29 half was 1:22:30, but that course was steeply downhill
            (~6.1% grade for the first 6.9 mi, ~3.2% for the final 10K). 1:26:00 backs out roughly what that
            effort would predict on a flat course, so your marathon prediction isn't inflated by the grade.
            Use the raw 1:22:30 instead if you'd rather run more aggressive paces.
          </div>
        </div>
        <button className="btn" onClick={applyManual}>Set paces from this run</button>
      </div>
    </div>
  );
}
