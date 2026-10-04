// Proxies the Strava "list athlete activities" call, refreshing the access token
// server-side first. The frontend never sees or handles a Strava token at all.
import { getRefreshToken, setRefreshCookie, refreshAccessToken } from "../_lib/strava.js";

export default async function handler(req, res) {
  const refreshToken = getRefreshToken(req);
  if (!refreshToken) {
    res.status(401).json({ error: "not_connected" });
    return;
  }

  const tokenData = await refreshAccessToken(refreshToken);
  if (!tokenData) {
    res.status(401).json({ error: "reauth_required" });
    return;
  }
  if (tokenData.refresh_token && tokenData.refresh_token !== refreshToken) {
    setRefreshCookie(res, tokenData.refresh_token);
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const perPage = Math.min(Number(url.searchParams.get("per_page")) || 60, 200); // Strava's max
  // Optional lower bound (epoch seconds) so a sync can cover the whole training block.
  const after = Number(url.searchParams.get("after"));
  const afterParam = Number.isFinite(after) && after > 0 ? `&after=${Math.floor(after)}` : "";

  const actRes = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}${afterParam}`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!actRes.ok) {
    res.status(actRes.status).json({ error: "strava_api_error" });
    return;
  }

  res.status(200).json(await actRes.json());
}
