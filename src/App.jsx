import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { computeZones } from "./utils/paces.js";
import { daysUntilRace, currentPosition, totalPlannedMiles, raceIsRun } from "./utils/schedule.js";
import { sunElevation, nightness, DEFAULT_PLACE } from "./utils/sun.js";
import { RACE_RESULT } from "./data/plan.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { useStravaAutoSync } from "./hooks/useStravaAutoSync.js";
import { bodyStatus } from "./utils/bodyStatus.js";
import { weeklyActualMiles } from "./utils/log.js";
import { setSoundEnabled, setTrack, unlockAudio, playHover, playSelect } from "./game/audio.js";
import CoyoteLogo from "./components/CoyoteLogo.jsx";
import DashboardTab from "./components/DashboardTab.jsx";
import ScheduleTab from "./components/ScheduleTab.jsx";
import EatingTab from "./components/EatingTab.jsx";
import GroceryTab from "./components/GroceryTab.jsx";
import RaceDayTab from "./components/RaceDayTab.jsx";
import GearTab from "./components/GearTab.jsx";
import SettingsTab from "./components/SettingsTab.jsx";
import FuelCalcTab from "./components/FuelCalcTab.jsx";
import StrengthTab from "./components/StrengthTab.jsx";
import LogTab from "./components/LogTab.jsx";
import { IconHome, IconCalendar, IconEating, IconGrocery, IconFlag, IconShirt, IconGauge, IconDroplet, IconDumbbell, IconLog } from "./components/icons.jsx";

// three.js is big — load the 3D arena separately so the menu and panel paint immediately.
const Arena = lazy(() => import("./game/Arena.jsx"));

const TABS = [
  { id: "dashboard", label: "Dashboard", Icon: IconHome },
  { id: "schedule", label: "Schedule", Icon: IconCalendar },
  { id: "strength", label: "Strength", Icon: IconDumbbell },
  { id: "fuel", label: "Fuel Calc", Icon: IconDroplet },
  { id: "eating", label: "Eating", Icon: IconEating },
  { id: "grocery", label: "Grocery", Icon: IconGrocery },
  { id: "gear", label: "Gear", Icon: IconShirt },
  { id: "raceday", label: "Race Day", Icon: IconFlag },
  { id: "log", label: "Log", Icon: IconLog },
  { id: "paces", label: "Paces & Strava", Icon: IconGauge },
];

// Time of day — each relights the desert + recolours the UI and has its own soundtrack
// (src/game/tracks.js). Auto follows the real sun where you are, dusk and all.
const MODES = [
  { id: "day", label: "Day", title: "Day · golden hour · Desert Ride soundtrack" },
  { id: "night", label: "Night", title: "Night · moonlight · Coyote Moon soundtrack" },
  { id: "auto", label: "Auto", title: "Auto · follows the real sun where you are" },
];

const SunIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <circle cx="12" cy="12" r="4.5" fill="currentColor" />
    <path d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
  </svg>
);
const MoonIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="currentColor" /></svg>
);
// Auto: the sun half-set on the horizon.
const HorizonIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M6.5 16a5.5 5.5 0 0 1 11 0Z" fill="currentColor" />
    <path d="M2.5 19.5h19M12 4.5v2.5M4.6 8.6l1.8 1.8M19.4 8.6l-1.8 1.8" />
  </svg>
);
const MODE_ICON = { day: SunIcon, night: MoonIcon, auto: HorizonIcon };

function ModeToggle({ mode, onSelect }) {
  return (
    <div className="mode-toggle" role="radiogroup" aria-label="Colour mode and soundtrack">
      {MODES.map((m) => {
        const Icon = MODE_ICON[m.id];
        return (
        <button
          key={m.id}
          role="radio"
          aria-checked={mode === m.id}
          className={`mode-btn mode-${m.id} ${mode === m.id ? "active" : ""}`}
          onClick={() => onSelect(m.id)}
          title={m.title}
        >
          <span className="mode-dot" aria-hidden="true"><Icon /></span>
          <span className="mode-label">{m.label}</span>
        </button>
        );
      })}
    </div>
  );
}

function SoundToggle({ on, onToggle }) {
  return (
    <button className={`sound-toggle ${on ? "on" : ""}`} onClick={onToggle} title={on ? "Mute music" : "Play music"}>
      <span className="eq" aria-hidden="true"><i /><i /><i /><i /></span>
      <span>{on ? "Sound on" : "Sound off"}</span>
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState(() =>
    new URLSearchParams(window.location.search).has("strava") ? "paces" : "dashboard"
  );
  const [effort, setEffort] = useLocalStorage("orca.effort", null);
  const [sound, setSound] = useLocalStorage("orca.sound", false);
  const [storedMode, setMode] = useLocalStorage("orca.mode", "day");
  // Saves from before the desert theme hold "blue" / "red".
  const choice = MODES.some((m) => m.id === storedMode) ? storedMode : "day";
  // Auto: how far the real sun has set where you are, re-checked every minute.
  const [place, setPlace] = useLocalStorage("orca.place", null);
  const [minute, setMinute] = useState(0);
  useEffect(() => {
    if (choice !== "auto") return;
    const id = setInterval(() => setMinute((n) => n + 1), 60 * 1000);
    return () => clearInterval(id);
  }, [choice]);
  const sceneMix = useMemo(
    () => (choice === "auto" ? nightness(sunElevation(new Date(), place || DEFAULT_PLACE)) : choice === "night" ? 1 : 0),
    [choice, place, minute]
  );
  // The UI and the soundtrack flip at the middle of dusk.
  const mode = sceneMix > 0.5 ? "night" : "day";
  // Opening shot: once per visit, and never for reduced motion.
  const [intro, setIntro] = useState(() => {
    try {
      return !sessionStorage.getItem("orca.introSeen") && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!intro) return;
    try { sessionStorage.setItem("orca.introSeen", "1"); } catch { /* private mode */ }
    const done = setTimeout(() => setIntro(false), 5600);
    const skip = () => setIntro(false);
    window.addEventListener("pointerdown", skip, { once: true });
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      clearTimeout(done);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [intro]);
  const [hasScan, setHasScan] = useState(false);
  const [danceSignal, setDanceSignal] = useState(0); // secret: tap the player name
  useStravaAutoSync();
  const [activities] = useLocalStorage("orca.activities", null);
  // Re-check every 10 min so the body map rolls over at midnight even if the app stays open.
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClockTick((n) => n + 1), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  const body = useMemo(() => bodyStatus(activities), [activities, clockTick]);
  const stageRef = useRef(null);
  const panelRef = useRef(null);
  const menuRefs = useRef([]);

  const zones = computeZones(effort);
  const days = daysUntilRace();
  const raceRun = raceIsRun();
  const pos = currentPosition();
  const level = pos.state === "before" ? 0 : pos.week.week;
  const xpTotal = totalPlannedMiles();
  const xpMiles = pos.state === "before"
    ? 0
    : Math.min(xpTotal, Math.round(weeklyActualMiles(activities).reduce((s, m) => s + m, 0) * 10) / 10);
  const active = TABS.find((t) => t.id === tab);
  const activeIndex = TABS.indexOf(active);

  // Track first, so turning sound on (possibly in the same render) starts the right song.
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mode === "night" ? "#0e0f1b" : "#24160e");
    setTrack(mode);
  }, [mode]);

  useEffect(() => {
    setSoundEnabled(sound);
  }, [sound]);

  // Picking a mode is also "play that mode's song", so it turns the music on.
  function selectMode(id) {
    unlockAudio(); // inside the tap itself — iOS won't start audio from the effect that follows
    playSelect();
    setMode(id);
    if (!sound) setSound(true);
    // Auto asks where you are (once); without an answer it uses Orem.
    if (id === "auto" && !place && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setPlace({ lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2) }),
        () => {},
        { maximumAge: 24 * 3600 * 1000, timeout: 15000 }
      );
    }
  }

  useEffect(() => {
    // Land on Paces & Strava after the /api/strava/callback redirect, and clean the URL.
    if (new URLSearchParams(window.location.search).has("strava")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Open each tab at its top. On desktop the panel scrolls itself; on phones the page scrolls,
  // so if we're already past the panel's top, jump back to just under the sticky header + menu.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.scrollTo({ top: 0 });
    if (getComputedStyle(panel).overflowY === "visible") {
      const sticky = (document.querySelector(".hud-top")?.offsetHeight || 0) + (document.querySelector(".game-menu")?.offsetHeight || 0);
      const top = panel.getBoundingClientRect().top + window.scrollY - sticky;
      if (window.scrollY > top) window.scrollTo({ top });
    }
    // Keep the active item visible in the phone's swipeable menu strip.
    menuRefs.current[TABS.findIndex((t) => t.id === tab)]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);

  function select(id) {
    if (id === tab) return;
    playSelect();
    setTab(id);
  }

  function onMenuKey(e) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const n = (activeIndex + (e.key === "ArrowDown" ? 1 : -1) + TABS.length) % TABS.length;
    select(TABS[n].id);
    menuRefs.current[n]?.focus();
  }

  return (
    <div className={`game ${intro ? "intro" : ""}`}>
      <Suspense fallback={null}>
        <Arena stageRef={stageRef} onModel={setHasScan} mix={sceneMix} intro={intro} danceSignal={danceSignal} bodyMap={body.levels} />
      </Suspense>
      <div className="fx-vignette" aria-hidden="true" />
      <div className="fx-grain" aria-hidden="true" />
      {intro && (
        <div className="intro-title" aria-hidden="true">
          <span>El Coyote</span>
          <small>Marathon Provisions Co.</small>
        </div>
      )}

      <header className="hud-top">
        <div className="brand">
          <CoyoteLogo size={44} />
          <div>
            <h1>El Coyote</h1>
            <div className="tagline">Marathon Provisions Co.</div>
          </div>
        </div>
        <div className="hud-race">
          <span className="hud-label">{raceRun ? RACE_RESULT.race : "Race day"}</span>
          <span className="hud-value">Sat · Oct 10 2026</span>
        </div>
        {raceRun ? (
          <div className="hud-countdown hud-result" title={`${RACE_RESULT.race} — ${RACE_RESULT.place === 1 ? "winner" : "finished"}`}>
            <b>{RACE_RESULT.place === 1 ? "1st" : "Done"}</b>
            <span className="hud-label">{RACE_RESULT.place === 1 ? "place" : ""}</span>
          </div>
        ) : (
          <div className="hud-countdown">
            <span className="hud-label">T-minus</span>
            <b>{String(days).padStart(2, "0")}</b>
            <span className="hud-label">days</span>
          </div>
        )}
        <div className="hud-right">
          <span className={`chip ${zones ? "ok" : ""}`}>{zones ? "Paces calibrated" : "Paces not set"}</span>
          <ModeToggle mode={choice} onSelect={selectMode} />
          <SoundToggle
            on={sound}
            onToggle={() => {
              if (!sound) unlockAudio(); // inside the tap itself, for iOS
              setSound(!sound);
            }}
          />
        </div>
      </header>

      <div className="game-body">
        <nav className="game-menu" onKeyDown={onMenuKey} aria-label="Sections">
          <div className="menu-heading">Pick your trail</div>
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => (menuRefs.current[i] = el)}
              className={`menu-item ${tab === t.id ? "active" : ""}`}
              onClick={() => select(t.id)}
              onMouseEnter={() => tab !== t.id && playHover()}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <t.Icon size={17} />
              <span className="menu-label">{t.label}</span>
            </button>
          ))}
          <div className="menu-hint">↑ ↓ to navigate</div>
        </nav>

        <div className="stage" ref={stageRef}>
          <div className="player-plate">
            {/* Secret: tapping the name toggles the cat's dance. */}
            <div className="player-name" onClick={() => setDanceSignal((n) => n + 1)}>Drury</div>
            <div className="player-tag">Coyote of Orem</div>
            <div className="player-level">
              WEEK {level} <span>· {pos.week.phase}</span>
            </div>
            <div className="xp-bar"><span style={{ width: `${Math.round((xpMiles / xpTotal) * 100)}%` }} /></div>
            <div className="xp-meta">Plan XP · {xpMiles} / {xpTotal} mi</div>
            {body.notes.length > 0 && (
              <div className="body-notes">
                {body.notes.map((n) => <span key={n.text} className={`body-note ${n.tone}`}>{n.text}</span>)}
              </div>
            )}
            <div className="stage-hint">
              ⟲ Drag to rotate{!hasScan && " · hologram stand-in until your 3D scan is added"}
            </div>
          </div>
        </div>

        <main className="panel" ref={panelRef}>
          <div className="panel-head">
            <span className="panel-num"><active.Icon size={22} /></span>
            <div>
              <h2 className="panel-title">{active.label}</h2>
            </div>
          </div>
          <div className="panel-content" key={tab}>
            {tab === "dashboard" && <DashboardTab zones={zones} goToTab={select} />}
            {tab === "schedule" && <ScheduleTab zones={zones} />}
            {tab === "log" && <LogTab />}
            {tab === "strength" && <StrengthTab />}
            {tab === "eating" && <EatingTab />}
            {tab === "fuel" && <FuelCalcTab zones={zones} />}
            {tab === "grocery" && <GroceryTab />}
            {tab === "raceday" && <RaceDayTab />}
            {tab === "gear" && <GearTab />}
            {tab === "paces" && <SettingsTab effort={effort} onSetEffort={setEffort} />}
          </div>
          <div className="footer">
            El Coyote · run the sendero · your data stays in this browser
            <div className="credits">Cat model by J-Toastie (CC-BY 3.0, via Poly Pizza)</div>
          </div>
        </main>
      </div>
    </div>
  );
}
