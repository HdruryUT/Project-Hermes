# Project Hermes — Marathon Training App

The app is styled like a video-game character screen in a neon Greek temple: a 3D arena
renders behind everything (your character turning on a pedestal), the tabs are the main menu,
and each tab opens in the panel on the right. A black cat wanders the arena.

Two modes, switched in the top bar, each with its own look and soundtrack:
- **Blue** — cyan neon, a synthwave track generated in the browser.
- **Red** — Spartan red, an original choral-orchestral track played from real recordings
  (`public/audio/spartan/`, ~2 MB, downloaded the first time red is chosen).

Music only starts after a click (browser rule); the **Sound** button mutes it. Asset credits are
in `public/audio/spartan/CREDITS.txt`, `public/models/CREDITS.txt` and the app footer.

A local React app for your October 10, 2026 marathon. Tabs: **Dashboard, Schedule, Strength,
Fuel Calc, Eating, Grocery, Gear, Race Day, Log,** and **Paces & Strava**. It personalizes every
workout's target pace from a recent run — pulled from Strava or entered by hand — and
includes an at-a-glance dashboard.

---

## Run it locally

Requires [Node.js](https://nodejs.org) (LTS). Check with `node -v`; if missing, install the
LTS build and reopen your terminal.

From this folder (the one with `package.json`):

```bash
npm install      # first time only
npm run dev      # opens http://localhost:5173
```

In VS Code: `File → Open Folder…` → pick this folder → open the terminal (`` Ctrl+` ``) →
run the two commands. Edits hot-reload in the browser.

## Deploy (Vercel)

Push to GitHub, then in Vercel: **Add New → Project → import the repo**. It auto-detects
Vite (build `npm run build`, output `dist`). Deploy. Every future `git push` redeploys.

---

## Your 3D character

Until you add a scan of yourself, the pedestal shows a hologram stand-in. To use your own body:

1. **Capture a scan** with a phone 3D-scanning app — e.g. Polycam, Scaniverse or KIRI Engine.
   Stand still, arms slightly away from your sides, while someone walks a slow full circle
   around you (two passes: one at chest height, one lower). Good, even light helps a lot.
2. **Export as GLB** (`.glb`). If the app offers it, reduce/decimate the mesh so the file is
   ideally under ~20 MB — it downloads every time the app opens.
3. **Save it as `public/models/me.glb`.** Reload — the app finds it automatically, scales it to
   the pedestal and swaps out the hologram. Any height/units/orientation from the app is fine.

Heads-up: anything in `public/` is served publicly once deployed. `me.glb` is in `.gitignore`
so your scan stays on your machine; remove that line if you do want it on the live site.

## Personalize paces

Open **Paces & Strava**:

- **Try with demo data** — instant sample paces.
- **Enter a recent run** — distance + time; predicts your marathon (Riegel) and derives
  easy / long / tempo / interval / goal-marathon paces.
- **Connect Strava** — one-time authorization, then the app pulls your fittest recent run
  itself, no tokens. Requires the app to be deployed (see below). Locally, before you've
  deployed, use the manual-token fallback in the same card instead.

### Connect Strava (one-time setup, after deploying)

Auto-refreshing Strava access without you re-pasting a token every few hours needs a
server to hold the app's **client secret** — a static site can't do that safely. This repo
ships that as a small serverless backend under `api/strava/*` (Vercel functions), already
wired up. To turn it on:

1. **Register a Strava API application** at <https://www.strava.com/settings/api>.
   - **Authorization Callback Domain**: your Vercel domain with no `https://` or path —
     e.g. `project-hermes.vercel.app`, or your custom domain if you set one.
   - Note the **Client ID** and **Client Secret** it gives you.
2. **Add environment variables in Vercel** — Project → Settings → Environment Variables:
   - `STRAVA_CLIENT_ID` — the Client ID from step 1.
   - `STRAVA_CLIENT_SECRET` — the Client Secret from step 1. Never commit this or prefix
     it with `VITE_` (that would ship it to the browser).
3. **Redeploy** (env var changes need a fresh deploy to take effect).
4. In the app, **Paces & Strava → Connect Strava**. You'll approve access on Strava's site
   once; after that, "Sync latest run & set paces" always fetches fresh data — no more
   tokens.

Testing locally with the backend live requires the Vercel CLI (`vercel dev`, after
`vercel link` and `vercel env pull`) — plain `npm run dev` doesn't run the `/api` functions,
which is exactly when the manual-token fallback in the Connect Strava card is useful.

### Strava access token (manual fallback, works without deploying)

1. <https://www.strava.com/settings/api> → create an app (callback domain `localhost`).
2. Copy **Your Access Token** into the token field in the Connect Strava card.
3. Tokens expire after a few hours; regenerate and re-paste when needed.

---

## Project structure

```
api/                      Vercel serverless functions (only live once deployed)
├─ _lib/strava.js         shared cookie + token-refresh helpers (not itself an endpoint)
└─ strava/
   ├─ login.js            redirect to Strava's OAuth consent screen
   ├─ callback.js         exchange the auth code, store a refresh token (httpOnly cookie)
   ├─ activities.js       refresh the access token, proxy "list activities"
   ├─ status.js           tells the frontend whether Strava is connected
   └─ disconnect.js       clears the stored refresh token

public/models/me.glb      your 3D scan (optional, git-ignored — see "Your 3D character")
public/models/cat.glb     the cat model (CC-BY 3.0, credited)
public/audio/spartan/     orchestra + choir samples for the red track (CC0)

src/
├─ main.jsx
├─ App.jsx                game shell: HUD bar, menu, stage, panel, countdown, pace state
├─ styles.css             neon Greek game theme (CSS variables) + per-tab styles
├─ game/
│  ├─ scene.js            three.js arena: temple colonnade, pedestal, hologram/scan, bloom, modes
│  ├─ cat.js              the roaming black cat (procedural walk/trot/sit on a rigged model)
│  ├─ Arena.jsx           mounts the scene and frames the figure on the stage area
│  ├─ tracks.js           the two soundtracks (synth "Messenger", sampled "Spartan")
│  └─ audio.js            playback, crossfading between tracks, menu sounds
├─ data/
│  ├─ plan.js             the 10-week schedule + phase colors
│  ├─ strength.js         periodized strength + plyometric program (phases follow the plan)
│  └─ nutrition.js        eating schedule (evening runner), grocery, race-day, gear, race pacing plan
├─ utils/
│  ├─ paces.js            Riegel predictor + training-pace zones
│  ├─ fuel.js             carb/fluid/sodium estimator for long runs
│  ├─ schedule.js         "where am I in the plan today" + race countdown helpers
│  └─ log.js              matches synced Strava runs to plan weeks (planned vs. actual mileage)
├─ services/strava.js     Strava fetch (manual token + connect-once backend) + demo data
├─ hooks/useLocalStorage.js
└─ components/
   ├─ HermesLogo.jsx      winged Hermes mark
   ├─ DashboardTab.jsx    home: countdown, today, this week, progress, paces
   ├─ MileageChart.jsx    weekly planned-mileage chart with actual-miles overlay
   ├─ LogTab.jsx          Training Log: weekly actual vs. target + recent-run feed
   ├─ SettingsTab.jsx     the Paces & Strava tab
   ├─ icons.jsx           line-icon set for the sidebar nav
   └─ …Tab.jsx            one file per tab
```

## Tweaking

- Workouts / distances / phase colors → `src/data/plan.js`
- Meals, grocery, race-day, gear → `src/data/nutrition.js`
- How paces are derived → `computeZones` in `src/utils/paces.js`
- Colors / theme → CSS variables at the top of `src/styles.css`
- 3D arena (columns, pedestal, lighting) → `src/game/scene.js`; music → `src/game/audio.js`

## Notes

- **Not medical advice.** Build mileage gradually, keep easy days easy, back off on sharp or
  worsening pain.
- The eating schedule assumes an evening (~6 PM) run — daytime meals are the fueling meals.
```
