import { useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage.js";
import { stravaStatus, fetchActivitiesFromBackend } from "../services/strava.js";

const STALE_MS = 15 * 60 * 1000;

// Keeps synced Strava activities fresh without a trip to the Log tab: on load (and whenever the
// app comes back to the foreground), if Strava is connected in this browser and the last sync
// is over 15 minutes old, re-sync. Synced data lives per browser/device, so without this a
// laptop could keep showing weeks-old mileage that the phone has already updated.
export function useStravaAutoSync() {
  const [, setActivities] = useLocalStorage("orca.activities", null);
  const [, setSyncedAt] = useLocalStorage("orca.activities.syncedAt", null);

  useEffect(() => {
    let cancelled = false, running = false;
    async function sync() {
      if (running) return;
      try {
        const last = JSON.parse(localStorage.getItem("orca.activities.syncedAt") || "null");
        if (last && Date.now() - new Date(last).getTime() < STALE_MS) return;
      } catch {
        /* unreadable — just sync */
      }
      running = true;
      try {
        const { connected } = await stravaStatus();
        if (!connected || cancelled) return;
        const data = await fetchActivitiesFromBackend();
        if (cancelled) return;
        setActivities(data);
        setSyncedAt(new Date().toISOString());
      } catch {
        /* offline / Strava hiccup — keep what we have; the Log tab shows errors on manual sync */
      } finally {
        running = false;
      }
    }
    sync();
    const onVisible = () => document.visibilityState === "visible" && sync();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [setActivities, setSyncedAt]);
}
