# Project Hermes — Marathon Training App

A local React app for your October 10, 2026 marathon. Tabs: **Dashboard, Schedule, Strength,
Eating, Fuel Calc, Grocery, Race Day, Gear,** and **Paces & Strava**. It personalizes every
workout's target pace from a recent run — pulled from Strava or entered by hand — and
includes a light/dark theme and an at-a-glance dashboard.

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
└─ strava/
   ├─ login.js            redirect to Strava's OAuth consent screen
   ├─ callback.js         exchange the auth code, store a refresh token (httpOnly cookie)
   ├─ activities.js       refresh the access token, proxy "list activities"
   ├─ status.js           tells the frontend whether Strava is connected
   └─ disconnect.js       clears the stored refresh token

src/
├─ main.jsx
├─ App.jsx                tab shell, dark-mode toggle, countdown, pace state
├─ styles.css             Hermes gold/bronze theme + dark mode (CSS variables)
├─ data/
│  ├─ plan.js             the 10-week schedule + phase colors
│  ├─ strength.js         Monday/Friday strength sessions for runners
│  └─ nutrition.js        eating schedule (evening runner), grocery, race-day, gear, race pacing plan
├─ utils/
│  ├─ paces.js            Riegel predictor + training-pace zones
│  ├─ fuel.js             carb/fluid/sodium estimator for long runs
│  └─ schedule.js         "where am I in the plan today" helper
├─ services/strava.js     Strava fetch (manual token + connect-once backend) + demo data
├─ hooks/useLocalStorage.js
└─ components/
   ├─ HermesLogo.jsx      winged Hermes mark
   ├─ DashboardTab.jsx    home: countdown, today, this week, progress, paces
   └─ …Tab.jsx            one file per tab
```

## Tweaking

- Workouts / distances / phase colors → `src/data/plan.js`
- Meals, grocery, race-day, gear → `src/data/nutrition.js`
- How paces are derived → `computeZones` in `src/utils/paces.js`
- Colors / theme → CSS variables at the top of `src/styles.css`

## Notes

- **Not medical advice.** Build mileage gradually, keep easy days easy, back off on sharp or
  worsening pain.
- The eating schedule assumes an evening (~6 PM) run — daytime meals are the fueling meals.
```
