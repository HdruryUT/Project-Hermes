// The two soundtracks, synthesized with the Web Audio API (no audio files). Each track is built
// on a given AudioContext and output node, so the same code runs live or in an offline render.
//
//   day   — "Desert Ride": early-'70s desert folk-rock — two 12-string acoustics on an
//           Em ↔ D6add9/F# vamp, round bass, bongos and shaker, a fingerpicked lead, hummed oohs.
//   night — "Coyote Moon": a slow spaghetti-western piece in A minor over Am–G–F–E — twangy
//           tremolo guitar with slapback echo, a heartbeat drum, a lonely whistle, and a
//           coyote howling at the end of each pass.
//
// Plucked strings are Karplus–Strong: a burst of noise circulating in a short, slightly damped
// delay line, rendered into a buffer (a few takes per note) and cached. In the day track each
// instrument also rings through a model of its body, and the timing and touch are loosened.
//
// createTrack(name, ctx, out, opts) → { ready, stepDur, loopSteps, level, play(step, time) }
// play() is called once per 16th note, slightly ahead of time, by the scheduler in audio.js.

export const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Reverb impulse: a few early reflections off nearby walls, then a diffuse tail that gets darker
// as it dies away (air and soft surfaces soak up the highs first), decorrelated left and right.
function makeIR(ctx, seconds, { darken = 1 } = {}) {
  const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
  const ir = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let k = 0; k < 9; k++) {
      const at = Math.floor(sr * (0.006 + Math.random() * 0.045));
      d[at] += (Math.random() < 0.5 ? -1 : 1) * (0.7 - k * 0.06);
    }
    let lp = 0;
    const start = Math.floor(sr * 0.012);
    for (let i = start; i < len; i++) {
      const u = i / len;
      const a = Math.min(0.96, 0.15 + u * darken * 1.1); // one-pole lowpass closing over time
      lp = a * lp + (1 - a) * (Math.random() * 2 - 1);
      const fadeIn = Math.min(1, (i - start) / (sr * 0.02));
      d[i] += lp * Math.exp((-6.9 * i) / len) * fadeIn * 1.6;
    }
  }
  return ir;
}

// Noise, reverbs and the pluck cache, made once per context.
const shared = new WeakMap();
function resources(ctx) {
  let r = shared.get(ctx);
  if (r) return r;
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  r = { noise, ir: makeIR(ctx, 3.2), room: makeIR(ctx, 1.1, { darken: 0.8 }), plucks: new Map() };
  shared.set(ctx, r);
  return r;
}

// An instrument's wooden body (or banjo head) as an impulse response: the direct sound plus a
// set of resonant modes ringing briefly — [frequency Hz, decay s, level]. Plucked or bowed
// strings run through it, which is most of what makes them sound like a real instrument.
function bodyIR(ctx, modes, { direct = 1, seconds = 0.25 } = {}) {
  const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    d[0] = direct;
    for (const [f, decay, level] of modes) {
      const ph = Math.random() * Math.PI * 2, fr = f * (1 + (ch ? 0.012 : -0.012));
      const w = (2 * Math.PI * fr) / sr;
      for (let i = 1; i < len; i++) d[i] += level * 0.02 * Math.sin(w * i + ph) * Math.exp(-i / (decay * sr));
    }
  }
  return buf;
}

// A signal path for one instrument: body → tone shaping → stereo place → the mix and a reverb
// send. Returns the node to play into.
function instrument(ctx, out, reverb, { modes, direct, hp = 60, lp = 9000, pan = 0, send = 0.2, gain = 1, solo = false }) {
  const input = ctx.createGain();
  input.gain.value = solo ? 0 : gain; // `solo` here means "muted by someone else's solo"
  const body = ctx.createConvolver();
  body.normalize = false; // keep the direct sound at its own level; the modes only colour it
  body.buffer = bodyIR(ctx, modes, { direct });
  const hpf = ctx.createBiquadFilter();
  hpf.type = "highpass";
  hpf.frequency.value = hp;
  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = lp;
  const panner = ctx.createStereoPanner();
  panner.pan.value = pan;
  input.connect(body).connect(hpf).connect(lpf).connect(panner);
  panner.connect(out);
  const s = ctx.createGain();
  s.gain.value = send;
  panner.connect(s).connect(reverb);
  return input;
}

// A little human looseness: timing (± seconds) and loudness (± fraction).
const loose = (t, amt = 0.006) => t + (Math.random() - 0.5) * 2 * amt;
const vary = (g, amt = 0.15) => g * (1 + (Math.random() - 0.5) * 2 * amt);

function env(gainNode, t, peak, attack, release) {
  gainNode.gain.setValueAtTime(0.0001, t);
  gainNode.gain.exponentialRampToValueAtTime(peak, t + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
}

function noiseHit(ctx, dest, t, { type, freq, q = 1, peak, release }) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = resources(ctx).noise;
  s.loop = true;
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  env(g, t, peak, 0.002, release);
  s.connect(f).connect(g);
  for (const d of [].concat(dest)) g.connect(d);
  s.start(t, Math.random() * 0.5);
  s.stop(t + release + 0.05);
}

// ---- Karplus–Strong strings ------------------------------------------------

// bright: how sharp the pick's attack is · damp: how fast the highs die (0.5 = classic KS) ·
// decay: overall sustain · pick: where along the string it's plucked (near the bridge = nasal).
const STRINGS = {
  steel: { bright: 0.7, damp: 0.47, decay: 0.9968, dur: 2.4, pick: 0.17 },  // dreadnought guitar
  twang: { bright: 0.9, damp: 0.5, decay: 0.9975, dur: 3.0, pick: 0.1 },    // baritone electric
  bass: { bright: 0.3, damp: 0.5, decay: 0.9945, dur: 1.5, pick: 0.22 },    // upright bass
  banjo: { bright: 0.95, damp: 0.4, decay: 0.991, dur: 1.2, pick: 0.09 },   // five-string banjo
  mando: { bright: 0.85, damp: 0.44, decay: 0.9935, dur: 0.9, pick: 0.13 }, // mandolin
};
const VARIANTS = 3; // a few takes of each note, so repeats never sound copy-pasted

function pluckBuffer(ctx, midi, kind) {
  const cache = resources(ctx).plucks;
  const id = `${kind}:${midi}:${Math.floor(Math.random() * VARIANTS)}`;
  if (cache.has(id)) return cache.get(id);
  const { bright, damp, decay, dur, pick } = STRINGS[kind];
  const sr = ctx.sampleRate;
  const N = Math.max(2, Math.round(sr / midiHz(midi)));
  // Excitation: a burst of noise, smoothed for darker strings, then comb-filtered for where the
  // pick strikes (that position's harmonics cancel — the nasal snap near the bridge).
  const noise = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++) {
    prev = prev * (1 - bright) + (Math.random() * 2 - 1) * bright;
    noise[i] = prev;
  }
  const P = Math.max(1, Math.round(pick * N));
  const ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = noise[i] - noise[(i - P + N) % N];
  const len = Math.floor(sr * dur);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const k = i % N;
    const v = ring[k];
    d[i] = v;
    ring[k] = decay * ((1 - damp) * v + damp * ring[(k + 1) % N]);
    peak = Math.max(peak, Math.abs(v));
  }
  for (let i = 0; i < len; i++) d[i] /= peak || 1;
  // The loop filter adds `damp` samples of delay; retune so the note lands in pitch.
  const entry = { buf, rate: (midiHz(midi) * (N + damp)) / sr };
  cache.set(id, entry);
  return entry;
}

function pluck(ctx, dest, t, midi, kind, { gain = 0.3, dur = null, cents = 0 } = {}) {
  const { buf, rate } = pluckBuffer(ctx, midi, kind);
  const s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = buf;
  s.playbackRate.value = rate * Math.pow(2, cents / 1200);
  g.gain.setValueAtTime(gain, t);
  const end = dur != null ? Math.min(dur, buf.duration) : buf.duration;
  if (dur != null) {
    g.gain.setValueAtTime(gain, t + end);
    g.gain.linearRampToValueAtTime(0.0001, t + end + 0.06); // fretting hand lets go
  }
  s.connect(g);
  for (const d of [].concat(dest)) g.connect(d);
  s.start(t);
  s.stop(t + end + 0.08);
}

// ---- Voices ----------------------------------------------------------------

// Whistle: a near-sine tone with a breathy edge, gliding from the previous note, with vibrato
// that grows on held notes.
function whistler(ctx, dest, { gain = 0.12 } = {}) {
  let lastHz = null;
  return (t, midi, len) => {
    const f0 = midiHz(midi);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    const from = lastHz && Math.abs(Math.log2(lastHz / f0)) < 1 ? lastHz : f0 * 0.97;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(f0, t + 0.06);
    lastHz = f0;
    // vibrato
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = 5.6;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(f0 * 0.012, t + Math.min(len, 0.6));
    lfo.connect(depth).connect(o.frequency);
    o.connect(g);
    // breath
    const b = ctx.createBufferSource(), bf = ctx.createBiquadFilter(), bg = ctx.createGain();
    b.buffer = resources(ctx).noise;
    b.loop = true;
    bf.type = "bandpass";
    bf.frequency.value = f0 * 1.5;
    bf.Q.value = 3;
    bg.gain.value = 0.25;
    b.connect(bf).connect(bg).connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.05);
    g.gain.setValueAtTime(gain, t + Math.max(0.06, len - 0.06));
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.05);
    for (const d of [].concat(dest)) g.connect(d);
    const end = t + len + 0.1;
    for (const x of [o, lfo, b]) { x.start(t); x.stop(end); }
  };
}

// A coyote: one long rising-then-falling howl, or a run of short yips.
function coyote(ctx, dest, t, { gain = 0.1, yips = 0 } = {}) {
  const calls = yips ? Array.from({ length: yips }, (_, i) => ({ at: i * 0.17, dur: 0.13, lo: 620 + i * 30, hi: 980 + i * 40 })) : [{ at: 0, dur: 2.8, lo: 360, hi: 860 }];
  for (const c of calls) {
    const s = t + c.at;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = "sine";
    o2.type = "triangle";
    for (const x of [o, o2]) {
      x.frequency.setValueAtTime(c.lo, s);
      if (yips) {
        x.frequency.exponentialRampToValueAtTime(c.hi, s + c.dur * 0.5);
        x.frequency.exponentialRampToValueAtTime(c.lo * 1.1, s + c.dur);
      } else {
        x.frequency.exponentialRampToValueAtTime(c.hi, s + 0.7);
        x.frequency.setValueAtTime(c.hi, s + 1.6);
        x.frequency.exponentialRampToValueAtTime(c.hi * 0.92, s + 1.9);
        x.frequency.exponentialRampToValueAtTime(c.lo * 1.2, s + c.dur);
      }
    }
    o2.detune.value = 1200;
    const o2g = ctx.createGain();
    o2g.gain.value = 0.18;
    // a wavering vibrato on the held part
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = 6.5;
    depth.gain.value = yips ? 0 : 14;
    lfo.connect(depth);
    depth.connect(o.frequency);
    depth.connect(o2.frequency);
    f.type = "lowpass";
    f.frequency.value = 2600;
    o.connect(f);
    o2.connect(o2g).connect(f);
    f.connect(g);
    g.gain.setValueAtTime(0.0001, s);
    g.gain.linearRampToValueAtTime(gain, s + (yips ? 0.02 : 0.35));
    g.gain.setValueAtTime(gain, s + c.dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, s + c.dur);
    for (const d of [].concat(dest)) g.connect(d);
    for (const x of [o, o2, lfo]) { x.start(s); x.stop(s + c.dur + 0.05); }
  }
}

// opts.solo (offline mixing only): render just one part of the day track.
export function createTrack(name, ctx, out, opts = {}) {
  return name === "night" ? coyoteMoon(ctx, out) : desertRide(ctx, out, opts);
}

// Melody notes: [16th step within the phrase, MIDI note, length in steps].
const find = (notes, k) => notes.find(([at]) => at === k);

// ---- Day: "Desert Ride" ----------------------------------------------------

// Early-'70s desert folk-rock: two 12-string acoustics strumming a hypnotic two-chord vamp
// (Em ↔ D6add9/F#, the open E and B ringing through both) in a loping 16th groove, a round
// bass, bongos and shaker, a fingerpicked acoustic lead, and soft hummed harmonies — the tunes
// are our own. Close and dry, like a small studio. 20 bars: guitars → the lead → the hum.
function desertRide(ctx, out, { solo = null } = {}) {
  const BPM = 122;
  const STEP = 60 / BPM / 4;

  // Open-position voicings, low → high strings.
  const EM = { bass: 40, chord: [40, 47, 52, 55, 59, 64] };   // 0 2 2 0 0 0
  const D69 = { bass: 42, chord: [42, 45, 50, 57, 59, 64] };  // 2 0 0 2 0 0
  const SECTIONS = [["intro", 4], ["verse", 8], ["chorus", 8]];
  const FORM = SECTIONS.flatMap(([name, len]) => Array.from({ length: len }, (_, at) => ({ name, at, ch: at % 2 ? D69 : EM })));

  // Strums per 16th: D = down (all strings), U = up (top four), u = a ghosted upstroke.
  const GTR_A = ["D", null, null, "u", "D", null, "U", null, null, "u", "U", null, "D", null, "U", null];
  const GTR_B = ["D", null, "U", null, "D", null, "U", null, "D", null, "U", null, "D", null, "U", "u"];

  // Our own lines, in E Dorian: [16th step in the 8 bars, MIDI note, length in steps].
  const LEAD = [
    [4, 71, 4], [8, 69, 2], [10, 67, 6],
    [16, 66, 4], [20, 69, 4], [24, 71, 8],
    [36, 74, 4], [40, 71, 4], [44, 69, 4],
    [48, 71, 12], [60, 69, 4],
    [64, 67, 4], [68, 69, 4], [72, 71, 4], [76, 74, 4],
    [80, 76, 8], [88, 74, 4], [92, 71, 4],
    [96, 69, 6], [102, 67, 2], [104, 64, 8],
    [112, 66, 4], [116, 64, 12],
  ];
  const HUM = [
    [0, 71, 8], [8, 69, 8], [16, 69, 16],
    [32, 71, 6], [38, 74, 2], [40, 71, 8], [48, 69, 16],
    [64, 67, 8], [72, 69, 8], [80, 71, 16],
    [96, 74, 8], [104, 71, 8], [112, 69, 16],
  ];
  // A diatonic third below, in E Dorian (E F# G A B C# D), for the hum's harmony.
  const DORIAN = [4, 6, 7, 9, 11, 1, 2];
  const thirdBelow = (n) => {
    const deg = DORIAN.indexOf(n % 12);
    if (deg < 0) return n - 3;
    const to = DORIAN[(deg + 5) % 7];
    return n - ((n % 12) - to + 12) % 12;
  };

  // A small, dry room.
  const room = ctx.createConvolver();
  room.buffer = resources(ctx).room;
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  room.connect(wet).connect(out);

  const DREAD = [[106, 0.035, 1], [212, 0.03, 0.6], [262, 0.025, 0.5], [430, 0.02, 0.4], [640, 0.018, 0.3], [1080, 0.014, 0.25], [2250, 0.01, 0.2], [3500, 0.008, 0.15]];
  const gtrL = instrument(ctx, out, room, { solo: solo && solo !== "guitars", modes: DREAD, direct: 1, hp: 90, lp: 9000, pan: -0.6, send: 0.18, gain: 0.5 });
  const gtrR = instrument(ctx, out, room, { solo: solo && solo !== "guitars", modes: DREAD.map(([f, d, l]) => [f * 1.04, d, l]), direct: 1, hp: 110, lp: 9500, pan: 0.6, send: 0.18, gain: 0.42 });
  const lead = instrument(ctx, out, room, { solo: solo && solo !== "lead", modes: DREAD, direct: 1, hp: 120, lp: 7000, pan: 0.1, send: 0.3, gain: 1.3 });
  const bass = instrument(ctx, out, room, {
    solo: solo && solo !== "bass", modes: [[64, 0.04, 0.8], [118, 0.03, 0.6], [205, 0.025, 0.4], [340, 0.02, 0.25]],
    direct: 1, hp: 35, lp: 900, pan: 0, send: 0.06, gain: 0.55,
  });
  const drums = ctx.createStereoPanner();
  drums.pan.value = 0.3;
  const drumLevel = ctx.createGain();
  drumLevel.gain.value = solo && solo !== "drums" ? 0 : 1.6;
  drumLevel.connect(drums);
  drums.connect(out);
  const ds = ctx.createGain();
  ds.gain.value = 0.25;
  drums.connect(ds).connect(room);
  const voices = ctx.createGain();
  voices.gain.value = solo && solo !== "hum" ? 0 : 1;
  voices.connect(out);
  const vs = ctx.createGain();
  vs.gain.value = 0.5;
  voices.connect(vs).connect(room);

  // 12-string strum: each string is a pair — the four low ones with an octave string, the top
  // two in unison — the pair a few ms and a few cents apart. That shimmer is the 12-string sound.
  function strum12(dest, t, notes, { up = false, gain = 0.2, spread = 0.01, dur = null }) {
    const order = up ? [...notes].reverse() : notes;
    let at = loose(t, 0.005);
    order.forEach((n, i) => {
      const idx = notes.indexOf(n);
      const g = vary(gain * (1 - i * 0.03), 0.12);
      pluck(ctx, dest, at, n, "steel", { gain: g, dur, cents: -3 });
      pluck(ctx, dest, at + 0.004, idx < 4 ? n + 12 : n, "steel", { gain: g * (idx < 4 ? 0.55 : 0.8), dur, cents: 4 });
      at += spread * (0.7 + Math.random() * 0.6);
    });
  }
  function guitar(dest, pattern, s, t, ch, level) {
    const stroke = pattern[s];
    if (!stroke) return;
    const dur = STEP * 3.2; // strings ring until the next stroke damps them
    if (stroke === "D") strum12(dest, t, ch.chord, { gain: (s % 4 === 0 ? 0.16 : 0.13) * level, spread: 0.011, dur });
    else if (stroke === "U") strum12(dest, t, ch.chord.slice(-4), { up: true, gain: 0.09 * level, spread: 0.008, dur });
    else strum12(dest, t, ch.chord.slice(-3), { up: true, gain: 0.04 * level, spread: 0.006, dur: STEP }); // ghost
  }

  // Bass: round and short, the root with a push into the next bar.
  const BASS = { 0: [0, 5], 6: [0, 2], 8: [0, 3], 11: [12, 1], 12: [0, 2], 14: [7, 2] };
  function bassNote(t, midi, steps) {
    const at = loose(t, 0.004);
    pluck(ctx, bass, at, midi, "bass", { gain: vary(0.6, 0.1), dur: steps * STEP * 0.92 });
    noiseHit(ctx, bass, at, { type: "lowpass", freq: 240, peak: 0.25, release: 0.04 });
  }

  // Bongos: a tuned skin (fundamental + the drumhead's inharmonic overtone), a little pitch
  // bend down as the head relaxes, and the slap of the hand.
  function bongo(t, high, gain) {
    const f = high ? 410 : 285;
    for (const [mult, lvl, dec] of [[1, 1, high ? 0.12 : 0.17], [1.59, 0.35, 0.06]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(f * mult * 1.12, t);
      o.frequency.exponentialRampToValueAtTime(f * mult, t + 0.025);
      env(g, t, gain * lvl, 0.002, dec);
      o.connect(g).connect(drumLevel);
      o.start(t);
      o.stop(t + dec + 0.05);
    }
    noiseHit(ctx, drumLevel, t, { type: "bandpass", freq: high ? 3200 : 2300, q: 1.2, peak: gain * 0.35, release: 0.012 });
  }
  const shaker = (t, gain) => noiseHit(ctx, drumLevel, t, { type: "bandpass", freq: 7500, q: 0.7, peak: gain, release: 0.045 });
  function kick(t, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.1);
    env(g, t, gain, 0.004, 0.22);
    o.connect(g).connect(drumLevel);
    o.start(t);
    o.stop(t + 0.3);
  }
  const BONGOS = [[0, false, 0.2], [3, true, 0.1], [6, true, 0.15], [8, false, 0.17], [10, true, 0.11], [11, true, 0.08], [14, true, 0.15]];

  // Fingerpicked lead: a single string with a pick-hand accent, and a slide up into the note
  // now and then (a second, quieter pluck a step below, cut short).
  function leadNote(t, midi, steps) {
    const at = loose(t, 0.006);
    if (steps >= 4 && Math.random() < 0.35) pluck(ctx, lead, at - 0.06, midi - 2, "steel", { gain: 0.18, dur: 0.055 });
    pluck(ctx, lead, at, midi, "steel", { gain: vary(0.42, 0.1), dur: steps * STEP * 0.98 });
  }

  // Hummed "ooh": a breathy voice — a buzzy source through the vocal tract's formants for "oo",
  // with a gentle scoop into each note, vibrato that blooms late, and air on top.
  function hum(t, midi, steps, gain) {
    const len = steps * STEP, f0 = midiHz(midi);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f0 * 0.97, t);
    o.frequency.exponentialRampToValueAtTime(f0, t + 0.09);
    const vib = ctx.createOscillator(), vd = ctx.createGain();
    vib.frequency.value = 5 + Math.random() * 0.5;
    vd.gain.setValueAtTime(0, t);
    vd.gain.linearRampToValueAtTime(f0 * 0.009, t + Math.min(len, 0.7));
    vib.connect(vd).connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.08);
    g.gain.setValueAtTime(gain, t + Math.max(0.1, len - 0.12));
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.1);
    for (const [f, q, lvl] of [[320, 6, 1], [780, 8, 0.4], [2500, 7, 0.05]]) {
      const bp = ctx.createBiquadFilter(), lg = ctx.createGain();
      bp.type = "bandpass";
      bp.frequency.value = f * (1 + (Math.random() - 0.5) * 0.04);
      bp.Q.value = q;
      lg.gain.value = lvl * 3;
      o.connect(bp).connect(lg).connect(g);
    }
    const air = ctx.createBufferSource(), af = ctx.createBiquadFilter(), ag = ctx.createGain();
    air.buffer = resources(ctx).noise;
    air.loop = true;
    af.type = "bandpass";
    af.frequency.value = 1800;
    af.Q.value = 0.6;
    ag.gain.value = 0.12;
    air.connect(af).connect(ag).connect(g);
    g.connect(voices);
    const end = t + len + 0.15;
    for (const x of [o, vib]) { x.start(t); x.stop(end); }
    air.start(t, Math.random() * 0.5);
    air.stop(end);
  }

  return {
    ready: Promise.resolve(),
    stepDur: STEP,
    loopSteps: FORM.length * 16,
    level: 0.8,
    play(i, t) {
      const bar = Math.floor(i / 16), s = i % 16;
      const { name, at, ch } = FORM[bar];
      const intro = name === "intro";

      // Guitars: the left one from the top, the right one joins after two bars.
      guitar(gtrL, GTR_A, s, t, ch, 1);
      if (!intro || at >= 2) guitar(gtrR, GTR_B, s, t, ch, 0.9);
      if (intro && at < 2) return;

      // Bass, hand drums and shaker.
      const b = BASS[s];
      if (b) bassNote(t, ch.bass + b[0], b[1]);
      if (s === 0 || s === 8) kick(t, 0.3);
      for (const [k, high, gain] of BONGOS) if (k === s) bongo(loose(t, 0.005), high, vary(gain, 0.15));
      shaker(loose(t, 0.003), s % 4 === 2 ? 0.06 : s % 2 ? 0.022 : 0.036);

      const k = at * 16 + s;
      if (name === "verse") {
        const n = find(LEAD, k);
        if (n) leadNote(t, n[1], n[2]);
      } else if (name === "chorus") {
        const n = find(HUM, k);
        if (n) {
          hum(t, n[1], n[2], 0.11);
          hum(t + 0.01, thirdBelow(n[1]), n[2], 0.08);
        }
      }
    },
  };
}

// ---- Night: "Coyote Moon" --------------------------------------------------

function coyoteMoon(ctx, out) {
  const BPM = 66;
  const STEP = 60 / BPM / 4;

  // Andalusian cadence: Am – G – F – E. arp = the guitar's 8th-note picking pattern.
  const AM = { root: 33, arp: [45, 52, 57, 60, 64, 60, 57, 52], tremolo: [57, 60, 64] };
  const G = { root: 31, arp: [43, 50, 55, 59, 62, 59, 55, 50], tremolo: [55, 59, 62] };
  const F = { root: 29, arp: [41, 48, 53, 57, 60, 57, 53, 48], tremolo: [53, 57, 60] };
  const E = { root: 28, arp: [40, 47, 52, 56, 59, 56, 52, 47], tremolo: [52, 56, 59] };
  const PROG = [AM, G, F, E];
  // Sections: intro (guitar + heartbeat), the whistled tune, then the howl.
  const SECTIONS = [["intro", 4], ["tune", 8], ["howl", 4]];
  const STARTS = [];
  SECTIONS.reduce((bar, [, len]) => (STARTS.push(bar), bar + len), 0);
  const TOTAL = SECTIONS.reduce((n, [, len]) => n + len, 0);
  const sectionAt = (bar) => {
    for (let k = SECTIONS.length - 1; k >= 0; k--) if (bar >= STARTS[k]) return { name: SECTIONS[k][0], at: bar - STARTS[k] };
  };

  const MELODY = [
    [0, 69, 4], [4, 76, 12],
    [16, 74, 4], [20, 72, 4], [24, 71, 4], [28, 74, 4],
    [32, 72, 12], [44, 69, 4],
    [48, 71, 8], [56, 68, 4], [60, 64, 4],
    [64, 69, 4], [68, 72, 4], [72, 76, 8],
    [80, 79, 6], [86, 77, 2], [88, 76, 4], [92, 74, 4],
    [96, 72, 6], [102, 74, 2], [104, 72, 4], [108, 69, 4],
    [112, 71, 4], [116, 68, 4], [120, 69, 8],
  ];

  const hall = ctx.createConvolver();
  hall.buffer = resources(ctx).ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.42;
  hall.connect(wet).connect(out);

  // Twang guitar: tremolo → slapback echo → spring-ish hall.
  const trem = ctx.createGain();
  trem.gain.value = 0.7;
  const lfo = ctx.createOscillator(), lfoDepth = ctx.createGain();
  lfo.frequency.value = 5.2;
  lfoDepth.gain.value = 0.3;
  lfo.connect(lfoDepth).connect(trem.gain);
  lfo.start();
  const twangTone = ctx.createBiquadFilter();
  twangTone.type = "peaking";
  twangTone.frequency.value = 1800;
  twangTone.gain.value = 5;
  twangTone.connect(trem);
  trem.connect(out);
  trem.connect(hall);
  const echo = ctx.createDelay(1);
  echo.delayTime.value = STEP * 3;
  const fb = ctx.createGain();
  fb.gain.value = 0.3;
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = "lowpass";
  echoTone.frequency.value = 2200;
  const echoOut = ctx.createGain();
  echoOut.gain.value = 0.35;
  trem.connect(echo);
  echo.connect(echoTone).connect(fb).connect(echo);
  echoTone.connect(echoOut).connect(out);

  const whistle = whistler(ctx, [out, hall], { gain: 0.1 });

  // Heartbeat: a low tom, "ba-dum".
  function tom(t, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    env(g, t, gain, 0.004, 0.4);
    o.connect(g);
    g.connect(out);
    g.connect(hall);
    o.start(t);
    o.stop(t + 0.5);
  }

  // A low drone under each bar, and a soft string pad in the howl section.
  function drone(t, root, len, gain) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = "triangle";
    o.frequency.value = midiHz(root + 12);
    f.type = "lowpass";
    f.frequency.value = 300;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.8);
    g.gain.setValueAtTime(gain, t + len - 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.4);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + len + 0.5);
  }
  function pad(t, notes, len, gain) {
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1100;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 1.2);
    g.gain.setValueAtTime(gain, t + len - 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.8);
    f.connect(g);
    g.connect(out);
    g.connect(hall);
    for (const n of notes) for (const det of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = midiHz(n);
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + len + 0.9);
    }
  }
  // Rattlesnake: a burst of noise chattering at ~45 Hz.
  function rattle(t, dur, gain) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), am = ctx.createGain();
    const lfo2 = ctx.createOscillator(), amDepth = ctx.createGain();
    s.buffer = resources(ctx).noise;
    s.loop = true;
    f.type = "highpass";
    f.frequency.value = 4500;
    lfo2.type = "square";
    lfo2.frequency.value = 45;
    amDepth.gain.value = 0.5;
    am.gain.value = 0.5;
    lfo2.connect(amDepth).connect(am.gain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.15);
    g.gain.setValueAtTime(gain, t + dur - 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(am).connect(g).connect(out);
    for (const x of [s, lfo2]) { x.start(t); x.stop(t + dur + 0.05); }
  }

  return {
    ready: Promise.resolve(),
    stepDur: STEP,
    loopSteps: TOTAL * 16,
    level: 0.85,
    play(i, t) {
      const bar = Math.floor(i / 16), s = i % 16;
      const sec = sectionAt(bar);
      const ch = PROG[sec.at % 4];
      const BAR = STEP * 16;

      if (s === 0) drone(t, ch.root, BAR, 0.16);
      if (s === 0) tom(t, sec.name === "intro" ? 0.35 : 0.5);
      if (s === 3) tom(t, sec.name === "intro" ? 0.2 : 0.3);
      if (sec.name !== "intro" && s === 8) tom(t, 0.18);

      if (sec.name === "howl") {
        // Tremolo-picked chords, a pad underneath, and the coyote.
        if (s % 2 === 0) for (const n of ch.tremolo) pluck(ctx, twangTone, t, n, "twang", { gain: s % 4 === 0 ? 0.13 : 0.09, dur: STEP * 1.8 });
        if (s === 0) pad(t, ch.tremolo.map((n) => n - 12), BAR, 0.03);
        if (sec.at === 0 && s === 2) coyote(ctx, [out, hall], t, { gain: 0.07 });
        if (sec.at === 2 && s === 4) coyote(ctx, [out, hall], t, { gain: 0.05, yips: 4 });
      } else if (s % 2 === 0) {
        // Picked arpeggio, the bass note of each bar ringing out.
        const n = ch.arp[s / 2];
        pluck(ctx, twangTone, t, n, "twang", { gain: s === 0 ? 0.3 : 0.18, dur: s === 0 ? null : STEP * 3 });
      }

      if (sec.name === "tune") {
        const k = sec.at * 16 + s;
        const n = find(MELODY, k);
        if (n) whistle(t, n[1], n[2] * STEP);
      }
      if (sec.name === "intro" && sec.at === 1 && s === 8) rattle(t, 1.4, 0.035);
    },
  };
}
