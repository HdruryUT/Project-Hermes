import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { computeZones } from "./utils/paces.js";
import { daysUntilRace, currentPosition, milesThroughWeek, totalPlannedMiles } from "./utils/schedule.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { setSoundEnabled, setTrack, playHover, playSelect } from "./game/audio.js";
import HermesLogo from "./components/HermesLogo.jsx";
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

// Greek numerals for the menu: Α, Β, Γ … (Ϛ is the archaic sign for 6).
const NUMERALS = ["Α", "Β", "Γ", "Δ", "Ε", "Ϛ", "Ζ", "Η", "Θ", "Ι"];

// three.js is big — load the 3D arena separately so the menu and panel paint immediately.
const Arena = lazy(() => import("./game/Arena.jsx"));

const TABS = [
  { id: "dashboard", label: "Dashboard", title: "Mount Olympus", Icon: IconHome },
  { id: "schedule", label: "Schedule", title: "The Odyssey", Icon: IconCalendar },
  { id: "strength", label: "Strength", title: "The Palaestra", Icon: IconDumbbell },
  { id: "fuel", label: "Fuel Calc", title: "Nectar & Ambrosia", Icon: IconDroplet },
  { id: "eating", label: "Eating", title: "The Feast", Icon: IconEating },
  { id: "grocery", label: "Grocery", title: "The Agora", Icon: IconGrocery },
  { id: "gear", label: "Gear", title: "The Armory", Icon: IconShirt },
  { id: "raceday", label: "Race Day", title: "Run of Pheidippides", Icon: IconFlag },
  { id: "log", label: "Log", title: "The Chronicle", Icon: IconLog },
  { id: "paces", label: "Paces & Strava", title: "The Oracle", Icon: IconGauge },
];

// Colour mode — each recolours the arena + UI and has its own soundtrack (src/game/tracks.js).
const MODES = [
  { id: "blue", label: "Blue", title: "Blue mode · Messenger soundtrack" },
  { id: "red", label: "Red", title: "Red mode · Spartan soundtrack" },
];

function ModeToggle({ mode, onSelect }) {
  return (
    <div className="mode-toggle" role="radiogroup" aria-label="Colour mode and soundtrack">
      {MODES.map((m) => (
        <button
          key={m.id}
          role="radio"
          aria-checked={mode === m.id}
          className={`mode-btn ${m.id} ${mode === m.id ? "active" : ""}`}
          onClick={() => onSelect(m.id)}
          title={m.title}
        >
          <span className="mode-dot" aria-hidden="true" />
          <span className="mode-label">{m.label}</span>
        </button>
      ))}
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
  const [mode, setMode] = useLocalStorage("orca.mode", "blue");
  const [hasScan, setHasScan] = useState(false);
  const stageRef = useRef(null);
  const panelRef = useRef(null);
  const menuRefs = useRef([]);

  const zones = computeZones(effort);
  const days = daysUntilRace();
  const pos = currentPosition();
  const level = pos.state === "before" ? 0 : pos.week.week;
  const xpMiles = pos.state === "before" ? 0 : milesThroughWeek(pos.weekIndex);
  const xpTotal = totalPlannedMiles();
  const active = TABS.find((t) => t.id === tab);
  const activeIndex = TABS.indexOf(active);

  // Track first, so turning sound on (possibly in the same render) starts the right song.
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mode === "red" ? "#0a0405" : "#040812");
    setTrack(mode);
  }, [mode]);

  useEffect(() => {
    setSoundEnabled(sound);
  }, [sound]);

  // Picking a mode is also "play that mode's song", so it turns the music on.
  function selectMode(id) {
    playSelect();
    setMode(id);
    if (!sound) setSound(true);
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
    <div className="game">
      <Suspense fallback={null}>
        <Arena stageRef={stageRef} onModel={setHasScan} mode={mode} />
      </Suspense>
      <div className="fx-vignette" aria-hidden="true" />
      <div className="fx-scanlines" aria-hidden="true" />

      <header className="hud-top">
        <div className="brand">
          <HermesLogo size={40} />
          <div>
            <h1><span className="h1-pre">Project </span>Hermes</h1>
            <div className="tagline">Marathon training companion</div>
          </div>
        </div>
        <div className="hud-race">
          <span className="hud-label">Race day</span>
          <span className="hud-value">Sat · Oct 10 2026</span>
        </div>
        <div className="hud-countdown">
          <span className="hud-label">T-minus</span>
          <b>{String(days).padStart(2, "0")}</b>
          <span className="hud-label">days</span>
        </div>
        <div className="hud-right">
          <span className={`chip ${zones ? "ok" : ""}`}>{zones ? "Paces calibrated" : "Paces not set"}</span>
          <ModeToggle mode={mode} onSelect={selectMode} />
          <SoundToggle on={sound} onToggle={() => setSound(!sound)} />
        </div>
      </header>

      <div className="game-body">
        <nav className="game-menu" onKeyDown={onMenuKey} aria-label="Sections">
          <div className="menu-heading">Choose your path</div>
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => (menuRefs.current[i] = el)}
              className={`menu-item ${tab === t.id ? "active" : ""}`}
              onClick={() => select(t.id)}
              onMouseEnter={() => tab !== t.id && playHover()}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <span className="menu-num">{NUMERALS[i]}</span>
              <t.Icon size={17} />
              <span className="menu-label">{t.label}</span>
            </button>
          ))}
          <div className="menu-hint">↑ ↓ to navigate</div>
        </nav>

        <div className="stage" ref={stageRef}>
          <div className="player-plate">
            <div className="player-name">Drury</div>
            <div className="player-tag">Hero of Olympus</div>
            <div className="player-level">
              LVL {level} <span>· {pos.week.phase}</span>
            </div>
            <div className="xp-bar"><span style={{ width: `${Math.round((xpMiles / xpTotal) * 100)}%` }} /></div>
            <div className="xp-meta">Plan XP · {xpMiles} / {xpTotal} mi</div>
            <div className="stage-hint">
              ⟲ Drag to rotate{!hasScan && " · hologram stand-in until your 3D scan is added"}
            </div>
          </div>
        </div>

        <main className="panel" ref={panelRef}>
          <div className="panel-head">
            <span className="panel-num"><span>{NUMERALS[activeIndex]}</span></span>
            <div>
              <div className="panel-kicker">{active.title}</div>
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
            Project Hermes · swift as the messenger · your data stays in this browser
            <div className="credits">
              Cat model by J-Toastie (CC-BY 3.0, via Poly Pizza) · Orchestra samples: VSCO 2 CE (CC0) · Choirs: ShangusBurger, Uzbazur on Freesound (CC0)
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
