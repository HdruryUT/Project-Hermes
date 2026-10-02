// Soundtrack playback + menu blips, generated live with the Web Audio API (no audio files).
// Two tracks (see tracks.js) — one per colour mode — crossfade when the mode changes.
// Browsers only allow audio after a user gesture, so nothing plays until the sound toggle is
// clicked — or, if it was left on last visit, until the first click/keypress on the page.
import { createTrack } from "./tracks.js";

const LOOKAHEAD = 0.12;

let ctx = null, master, sfx;
let enabled = false, current = "blue";
const players = {}; // track name → { out, track, timer, step, nextTime }

// iOS 17+: treat this as media playback, so it isn't muted by the ring/silent switch.
function setPlaybackSession() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = "playback";
  } catch {
    /* unsupported */
  }
}

// Transparent below 0.8, then rounds peaks smoothly toward 1.0 — a backstop for the rare
// overs the compressor's automatic make-up gain lets through, which would otherwise clip hard.
export function softCeiling(ctx) {
  const shaper = ctx.createWaveShaper();
  const n = 2048, curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
    curve[i] = Math.sign(x) * (a < 0.8 ? a : 0.8 + 0.2 * Math.tanh((a - 0.8) / 0.2));
  }
  shaper.curve = curve;
  shaper.oversample = "2x";
  return shaper;
}

function init() {
  if (ctx) return;
  setPlaybackSession();
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  // A safety limiter: catches only peaks near full scale, so the soundtracks keep their
  // quiet-to-loud contrast (a lower threshold flattens the red track's build).
  master = ctx.createDynamicsCompressor();
  master.threshold.value = -3;
  master.knee.value = 2;
  master.ratio.value = 20;
  master.attack.value = 0.003;
  master.release.value = 0.25;
  master.connect(softCeiling(ctx)).connect(ctx.destination);
  sfx = ctx.createGain();
  sfx.gain.value = 0.5;
  sfx.connect(master);
}

function player(name) {
  if (!players[name]) {
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(master);
    players[name] = { out, track: createTrack(name, ctx, out), timer: 0, step: 0, nextTime: 0 };
  }
  return players[name];
}

function tick(p) {
  while (p.nextTime < ctx.currentTime + LOOKAHEAD) {
    p.track.play(p.step, p.nextTime);
    p.step = (p.step + 1) % p.track.loopSteps;
    p.nextTime += p.track.stepDur;
  }
}

function fade(p, to, seconds) {
  const g = p.out.gain, now = ctx.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.linearRampToValueAtTime(to, now + seconds);
}

function start(name) {
  const p = player(name);
  p.wanted = true;
  // Sample-based tracks begin once their recordings have downloaded (a second or two, once).
  p.track.ready.then(
    () => {
      if (!p.wanted) return;
      fade(p, p.track.level, 1.5);
      if (p.timer) return;
      p.step = 0;
      p.nextTime = ctx.currentTime + 0.08;
      p.timer = setInterval(() => tick(p), 25);
      tick(p);
    },
    (err) => console.warn(`Couldn't load the ${name} soundtrack:`, err)
  );
}

function stop(name) {
  const p = players[name];
  if (!p) return;
  p.wanted = false;
  if (!p.timer) return;
  fade(p, 0, 0.8);
  const timer = p.timer;
  p.timer = 0;
  // Keep scheduling under the fade-out; a restart in the meantime just runs alongside (tick is idempotent).
  setTimeout(() => clearInterval(timer), 900);
}

// Unlock audio output. Must run synchronously inside a tap/click handler: iOS only lets audio
// start from code running directly in the gesture — not from a React effect afterwards.
export function unlockAudio() {
  init();
  setPlaybackSession();
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  // Starting a silent one-sample buffer inside the gesture is what unlocks older iOS versions.
  const src = ctx.createBufferSource();
  src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  src.connect(ctx.destination);
  src.start(0);
}

// If sound was left on last visit, the context starts suspended; unlock on the first real
// gesture. iOS counts touchend/click as activation (not touchstart/pointerdown).
const GESTURES = ["touchend", "click", "keydown"];
let gestureHooked = false;
function resumeOnGesture() {
  if (gestureHooked) return;
  gestureHooked = true;
  const go = () => {
    if (enabled) unlockAudio();
    // resume() settles asynchronously, so stay hooked until a later gesture finds it running.
    if (ctx.state === "running" || !enabled) {
      GESTURES.forEach((g) => window.removeEventListener(g, go, true));
      gestureHooked = false;
    }
  };
  GESTURES.forEach((g) => window.addEventListener(g, go, true));
}

export function setSoundEnabled(on) {
  enabled = on;
  if (!on) {
    Object.keys(players).forEach(stop);
    return;
  }
  init();
  ctx.resume().catch(() => {});
  if (ctx.state !== "running") resumeOnGesture();
  start(current);
}

// Switch soundtrack ("blue" | "red"), crossfading if music is playing.
export function setTrack(name) {
  current = name;
  if (!enabled || !ctx) return;
  Object.keys(players).filter((n) => n !== name).forEach(stop);
  start(name);
}

function blip(freqs, len, peak) {
  if (!enabled || !ctx || ctx.state !== "running") return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "triangle";
  freqs.forEach((f, i) => o.frequency.setValueAtTime(f, t + (i * len) / freqs.length));
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.003 + len);
  o.connect(g).connect(sfx);
  o.start(t);
  o.stop(t + len + 0.05);
}

export const playHover = () => blip([1320], 0.05, 0.06);
export const playSelect = () => blip([660, 990], 0.12, 0.12);
