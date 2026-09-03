import { useState, useEffect } from "react";
import { RACE_DATE } from "./data/plan.js";
import { computeZones } from "./utils/paces.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
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
import { IconHome, IconCalendar, IconEating, IconGrocery, IconFlag, IconShirt, IconGauge, IconDroplet, IconDumbbell } from "./components/icons.jsx";

const TABS = [
  { id: "dashboard", label: "Dashboard", Icon: IconHome },
  { id: "schedule", label: "Schedule", Icon: IconCalendar },
  { id: "strength", label: "Strength", Icon: IconDumbbell },
  { id: "eating", label: "Eating", Icon: IconEating },
  { id: "fuel", label: "Fuel Calc", Icon: IconDroplet },
  { id: "grocery", label: "Grocery", Icon: IconGrocery },
  { id: "raceday", label: "Race Day", Icon: IconFlag },
  { id: "gear", label: "Gear", Icon: IconShirt },
  { id: "paces", label: "Paces & Strava", Icon: IconGauge },
];

function daysUntilRace() {
  const race = new Date(RACE_DATE + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((race - now) / 86400000));
}

export default function App() {
  const [tab, setTab] = useState(() =>
    new URLSearchParams(window.location.search).has("strava") ? "paces" : "dashboard"
  );
  const [effort, setEffort] = useLocalStorage("orca.effort", null);
  const [theme, setTheme] = useLocalStorage("orca.theme", "light");
  const zones = computeZones(effort);
  const days = daysUntilRace();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    // Land on Paces & Strava after the /api/strava/callback redirect, and clean the URL.
    if (new URLSearchParams(window.location.search).has("strava")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <div className="brand">
            <HermesLogo size={46} />
            <div>
              <h1>Project Hermes</h1>
              <div className="tagline">Marathon training companion</div>
            </div>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            title="Toggle dark mode"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
        <div className="meta">
          <span>🗓 <b>Sat, Oct 10, 2026</b></span>
          <span className="countdown">{days} days to go</span>
          <span>{zones ? "Paces personalized ✓" : "Paces not set"}</span>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <t.Icon size={17} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {tab === "dashboard" && <DashboardTab zones={zones} goToTab={setTab} />}
      {tab === "schedule" && <ScheduleTab zones={zones} />}
      {tab === "strength" && <StrengthTab />}
      {tab === "eating" && <EatingTab />}
      {tab === "fuel" && <FuelCalcTab zones={zones} />}
      {tab === "grocery" && <GroceryTab />}
      {tab === "raceday" && <RaceDayTab />}
      {tab === "gear" && <GearTab />}
      {tab === "paces" && <SettingsTab effort={effort} onSetEffort={setEffort} />}

      <div className="footer">Project Hermes · local training companion · your data stays in this browser</div>
    </div>
  );
}
