// Where the sun is: its height above the horizon (degrees) at a time and place, from NOAA's
// solar-position equations — accurate to well under a degree, which is plenty to tell golden
// hour from dusk from night.
const rad = Math.PI / 180;

// Orem, Utah — used when the browser can't (or isn't allowed to) say where you are.
export const DEFAULT_PLACE = { lat: 40.2969, lon: -111.6946 };

export function sunElevation(date = new Date(), { lat, lon } = DEFAULT_PLACE) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525; // Julian centuries since J2000

  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360; // mean longitude
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T); // mean anomaly
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T); // orbit eccentricity
  const C = Math.sin(M * rad) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * M * rad) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * rad) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * rad); // apparent longitude
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * rad); // obliquity
  const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad)); // declination (rad)

  // Equation of time (minutes): how far sundial time runs ahead of clock time.
  const y = Math.tan((eps / 2) * rad) ** 2;
  const eot = 4 / rad * (y * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(M * rad) +
    4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad) -
    0.5 * y * y * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * M * rad));

  const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const solarMin = (((utcMin + eot + 4 * lon) % 1440) + 1440) % 1440;
  const hourAngle = (solarMin / 4 - 180) * rad;

  const cosZenith = Math.sin(lat * rad) * Math.sin(decl) + Math.cos(lat * rad) * Math.cos(decl) * Math.cos(hourAngle);
  return 90 - Math.acos(Math.max(-1, Math.min(1, cosZenith))) / rad;
}

// How "night" the scene should be, 0 (full day) → 1 (full night), easing through dusk: full
// golden-hour light while the sun is more than 4° up, full night once it's 6° below.
export function nightness(elevation) {
  const u = Math.max(0, Math.min(1, (4 - elevation) / 10));
  return u * u * (3 - 2 * u);
}
