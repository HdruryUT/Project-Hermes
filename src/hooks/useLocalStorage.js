import { useState, useEffect } from "react";

// Persist a piece of state to localStorage so checkboxes and settings survive reloads.
// Every component using the same key stays in sync: a write in one (e.g. a background Strava
// sync) updates the others immediately instead of only after they remount.
const EVENT = "orca-storage";

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      const raw = JSON.stringify(value);
      if (localStorage.getItem(key) === raw) return;
      localStorage.setItem(key, raw);
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, raw } }));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [key, value]);

  useEffect(() => {
    const onChange = (e) => {
      if (e.detail.key !== key) return;
      try {
        setValue(JSON.parse(e.detail.raw));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [key]);

  return [value, setValue];
}
