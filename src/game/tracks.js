// The two soundtracks, synthesized with the Web Audio API (no audio files). Each track is built
// on a given AudioContext and output node, so the same code runs live or in an offline render.
//
//   blue — "Messenger": synthwave in A Phrygian dominant (the Mediterranean scale).
//   red  — "Spartan": an original choral-orchestral piece in D Phrygian played on real
//          recordings (public/audio/spartan — CC0 VSCO 2 orchestra + CC0 Freesound choirs):
//          a dark-ambient lament (solo violin, low strings, "ooh" choir, heartbeat timpani),
//          then full choir, horns, trombones, tuba, driving cellos and war drums.
//
// createTrack(name, ctx, out, opts) → { ready, stepDur, loopSteps, level, play(step, time) }
// `ready` resolves once any samples are loaded; play() is called once per 16th note, slightly
// ahead of time, by the scheduler in audio.js. opts.loadSample(name) → ArrayBuffer overrides
// how samples are fetched (used for offline renders in Node).

export const midiHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Noise and a reverb impulse, made once per context.
const shared = new WeakMap();
function resources(ctx) {
  let r = shared.get(ctx);
  if (r) return r;
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  const len = Math.floor(ctx.sampleRate * 3.5);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8);
  }
  r = { noise, ir };
  shared.set(ctx, r);
  return r;
}

function env(gainNode, t, peak, attack, release) {
  gainNode.gain.setValueAtTime(0.0001, t);
  gainNode.gain.exponentialRampToValueAtTime(peak, t + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
}

// Attack → hold → release envelope for sustained voices.
function swell(gainNode, t, peak, attack, hold, release) {
  const g = gainNode.gain;
  g.setValueAtTime(0.0001, t);
  g.linearRampToValueAtTime(peak, t + attack);
  g.setValueAtTime(peak, t + attack + hold);
  g.linearRampToValueAtTime(0.0001, t + attack + hold + release);
}

function noiseHit(ctx, dest, t, { type, freq, q = 1, peak, release }) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = resources(ctx).noise;
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  env(g, t, peak, 0.002, release);
  s.connect(f).connect(g);
  for (const d of [].concat(dest)) g.connect(d);
  s.start(t);
  s.stop(t + release + 0.05);
}

export function createTrack(name, ctx, out, opts = {}) {
  return name === "red" ? spartan(ctx, out, opts) : messenger(ctx, out);
}

// ---- Blue: "Messenger" -----------------------------------------------------

function messenger(ctx, out) {
  const BPM = 104;
  const STEP = 60 / BPM / 4;
  // A → Bb → Gm → A7, one chord per bar.
  const CHORDS = [
    { root: 45, tones: [57, 61, 64, 69] },
    { root: 46, tones: [58, 62, 65, 70] },
    { root: 43, tones: [55, 58, 62, 67] },
    { root: 45, tones: [57, 61, 64, 67] },
  ];
  const ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 1, 2];

  // Dotted-8th feedback delay for the arp — the spacey synthwave echo.
  const delay = ctx.createDelay(1);
  delay.delayTime.value = STEP * 3;
  const fb = ctx.createGain();
  fb.gain.value = 0.38;
  const wet = ctx.createGain();
  wet.gain.value = 0.3;
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(out);

  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    env(g, t, 0.9, 0.004, 0.32);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.4);
  }

  function bass(t, note) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.value = midiHz(note);
    f.type = "lowpass";
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(180, t + STEP * 0.9);
    env(g, t, 0.22, 0.005, STEP * 0.9);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + STEP);
  }

  // Plucked, lyre-like arp: bright sawtooth through a lowpass that snaps shut.
  function arp(t, note) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.value = midiHz(note + 12);
    f.type = "lowpass";
    f.Q.value = 6;
    f.frequency.setValueAtTime(4200, t);
    f.frequency.exponentialRampToValueAtTime(500, t + STEP * 1.2);
    env(g, t, 0.07, 0.002, STEP * 1.8);
    o.connect(f).connect(g);
    g.connect(out);
    g.connect(delay);
    o.start(t);
    o.stop(t + STEP * 2);
  }

  function pad(t, tones) {
    const len = STEP * 16;
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = "lowpass";
    f.frequency.value = 1400;
    swell(g, t, 0.05, 0.5, len - 0.8, 0.3);
    f.connect(g).connect(out);
    for (const n of tones.slice(0, 3)) {
      for (const detune of [-8, 8]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = midiHz(n);
        o.detune.value = detune;
        o.connect(f);
        o.start(t);
        o.stop(t + len + 0.05);
      }
    }
  }

  return {
    ready: Promise.resolve(),
    stepDur: STEP,
    loopSteps: 16 * CHORDS.length,
    level: 0.8,
    play(i, t) {
      const bar = Math.floor(i / 16) % CHORDS.length;
      const s = i % 16;
      const chord = CHORDS[bar];
      if (s === 0) pad(t, chord.tones);
      if (s % 4 === 0) kick(t);
      if (s === 4 || s === 12) noiseHit(ctx, out, t, { type: "bandpass", freq: 1900, peak: 0.28, release: 0.18 });
      if (s % 4 === 2) noiseHit(ctx, out, t, { type: "highpass", freq: 7500, peak: 0.12, release: 0.05 });
      bass(t, chord.root + (s % 2 ? 12 : 0));
      arp(t, chord.tones[ARP[s]]);
    },
  };
}

// ---- Red: "Spartan" --------------------------------------------------------

// Sample sets: [file, MIDI pitch it sounds at] (measured, not taken from the filenames), or a
// bare file name for unpitched percussion. Timpani pitches are approximate and get retuned.
const SPARTAN_SAMPLES = {
  bass_sus: [["bass_sus_1", 36], ["bass_sus_2", 40], ["bass_sus_3", 44]],
  cello_sus: [["cello_sus_1", 50], ["cello_sus_2", 53], ["cello_sus_3", 57], ["cello_sus_4", 60], ["cello_sus_5", 64]],
  viola_sus: [["viola_sus_1", 62], ["viola_sus_2", 65], ["viola_sus_3", 69], ["viola_sus_4", 72]],
  violins_sus: [["violins_sus_1", 62], ["violins_sus_2", 66], ["violins_sus_3", 69], ["violins_sus_4", 72], ["violins_sus_5", 76]],
  cello_spic: [["cello_spic_1", 36], ["cello_spic_2", 50], ["cello_spic_3", 53], ["cello_spic_4", 57]],
  violin_solo: [["violin_solo_1", 67], ["violin_solo_2", 69], ["violin_solo_3", 72], ["violin_solo_4", 76], ["violin_solo_5", 79]],
  horn: [["horn_1", 50], ["horn_2", 53], ["horn_3", 57], ["horn_4", 60]],
  trombone: [["trombone_1", 46], ["trombone_2", 50], ["trombone_3", 53]],
  tuba: [["tuba_1", 41], ["tuba_2", 46], ["tuba_3", 50]],
  choir_ooh: [["choir_ooh", 47.96]], // one sustained note each, re-pitched into chords
  choir_ahh: [["choir_ahh", 53.11]],
  timpani: [["timpani_1", 29.85], ["timpani_3", 37.5]],
  timpani_roll: [["timpani_roll_1", 35.5]],
  bassdrum: ["bassdrum_1", "bassdrum_2"],
  gong: ["gong_1"],
  cymbal_cresc: ["cymbal_cresc_1"],
};
const CYMBAL_PEAK = 3.1; // seconds into cymbal_cresc_1 where the swell peaks

const fetchSample = (name) =>
  fetch(`/audio/spartan/${name}.m4a`).then((r) => {
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
    return r.arrayBuffer();
  });

// Shift a MIDI note by octaves until it lies within [lo, hi].
function fit(n, lo, hi) {
  while (n < lo) n += 12;
  while (n > hi) n -= 12;
  return n;
}

function spartan(ctx, out, { loadSample = fetchSample } = {}) {
  const BPM = 66;
  const STEP = 60 / BPM / 4;
  const SECTION = 8 * 16; // A: lament (bars 1–8), B: full orchestra (bars 9–16)

  // D Phrygian (D Eb F G A Bb C). The Eb → Dm cadence at the end of each half is the
  // "ancient", Eastern-Mediterranean colour.
  const DM = [38, 41, 45], EB = [39, 43, 46], CM = [36, 39, 43], BB = [34, 38, 41];
  const PROG = [DM, EB, DM, CM, BB, CM, EB, DM]; // [root, third, fifth]

  // [step within the section, MIDI note, length in steps]
  const LAMENT = [ // solo violin, section A
    [0, 69, 8], [8, 74, 8], [16, 75, 12], [28, 74, 4], [32, 77, 8], [40, 75, 4], [44, 74, 4],
    [48, 72, 16], [64, 74, 8], [72, 77, 8], [80, 79, 6], [86, 77, 2], [88, 75, 8],
    [96, 75, 4], [100, 74, 4], [104, 72, 4], [108, 70, 4], [112, 69, 16],
  ];
  const ANTHEM = [ // horns (an octave down) + violins, section B
    [0, 62, 8], [8, 57, 8], [16, 58, 16], [32, 57, 8], [40, 62, 8], [48, 63, 8], [56, 62, 4],
    [60, 60, 4], [64, 62, 16], [80, 63, 8], [88, 67, 8], [96, 67, 8], [104, 65, 4], [108, 63, 4],
    [112, 62, 16],
  ];
  const OSTINATO = [0, 0, 2, 0, 0, 0, 1, 2]; // cello spiccato 8ths, as chord-tone indices

  const reverb = ctx.createConvolver();
  reverb.buffer = resources(ctx).ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  reverb.connect(wet).connect(out);

  const buffers = {};
  const ready = Promise.all(
    Object.values(SPARTAN_SAMPLES).flat().map((entry) => {
      const name = Array.isArray(entry) ? entry[0] : entry;
      return loadSample(name)
        .then((data) => ctx.decodeAudioData(data))
        .then((buf) => { buffers[name] = buf; });
    })
  );

  // Play `group` at `midi` (nearest sample, repitched), or an unpitched hit when midi is null.
  function play(group, midi, t, { gain = 1, swellTo = null, dur = null, attack = 0.01, release = 0.5, send = 0.4, variant = 0 } = {}) {
    const set = SPARTAN_SAMPLES[group];
    let name, rate = 1;
    if (midi == null) {
      name = set[variant % set.length];
    } else {
      let best = set[0];
      for (const s of set) if (Math.abs(s[1] - midi) < Math.abs(best[1] - midi)) best = s;
      name = best[0];
      rate = Math.pow(2, (midi - best[1]) / 12);
    }
    const buf = buffers[name];
    if (!buf) return;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf;
    src.playbackRate.value = rate;
    src.start(t); // before any stop() — stopping an unstarted source throws
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    if (dur != null) {
      // Hold (or crescendo to swellTo) for the note's length, then release.
      if (swellTo != null) g.gain.linearRampToValueAtTime(swellTo, t + dur);
      else g.gain.setValueAtTime(gain, t + dur);
      g.gain.linearRampToValueAtTime(0, t + dur + release);
      src.stop(t + dur + release + 0.05);
    }
    src.connect(g).connect(out);
    if (send > 0) {
      const s = ctx.createGain();
      s.gain.value = send;
      g.connect(s).connect(reverb);
    }
  }

  const BAR = STEP * 16;
  const timp = (midi, t, gain) => play("timpani", fit(midi, 31, 40), t, { gain, send: 0.5 });

  // One bar of sustained strings (re-voiced each bar; overlapping releases keep it legato).
  function strings(chord, t, full) {
    const [root, third, fifth] = chord;
    const opts = { dur: BAR, attack: 0.35, release: 0.7, send: 0.45 };
    play("bass_sus", fit(root, 31, 43), t, { ...opts, gain: full ? 0.55 : 0.45 });
    play("cello_sus", fit(root, 48, 59), t, { ...opts, gain: full ? 0.4 : 0.32 });
    play("cello_sus", fit(fifth, 52, 63), t, { ...opts, gain: full ? 0.3 : 0.22 });
    play("viola_sus", fit(third, 60, 71), t, { ...opts, gain: full ? 0.28 : 0.18 });
    if (full) {
      play("violins_sus", fit(fifth, 69, 80), t, { ...opts, gain: 0.14 });
      play("violins_sus", fit(third, 72, 83), t, { ...opts, gain: 0.1 });
    }
  }

  // Choir: a low "ooh" through the lament with the "ahh" rising in from bar 5; the full
  // "ahh" chord (root, fifth, third) through B.
  function choir(chord, bar, t, full) {
    const [root, third, fifth] = chord;
    const opts = { dur: BAR, attack: full ? 0.4 : 0.9, release: 1.0, send: 0.7 };
    if (!full) {
      play("choir_ooh", fit(root, 43, 52), t, { ...opts, gain: 0.5 });
      play("choir_ooh", fit(fifth, 43, 52), t, { ...opts, gain: 0.32 });
      if (bar >= 4) {
        const swell = { ...opts, attack: 1.4, send: 0.8 };
        play("choir_ahh", fit(root, 49, 58), t, { ...swell, gain: 0.22 + 0.04 * (bar - 4) });
        play("choir_ahh", fit(fifth, 49, 58), t, { ...swell, gain: 0.16 + 0.03 * (bar - 4) });
      }
      return;
    }
    play("choir_ooh", fit(root, 43, 52), t, { ...opts, gain: 0.45 });
    play("choir_ahh", fit(root, 49, 58), t, { ...opts, gain: 0.6 });
    play("choir_ahh", fit(fifth, 49, 58), t, { ...opts, gain: 0.5 });
    play("choir_ahh", fit(third, 49, 58), t, { ...opts, gain: 0.38 });
  }

  // The choir carries the B melody an octave below the horns/violins — "ahh" for most of it,
  // the lower "ooh" voices for the bottom notes so neither sample is stretched too far.
  const sing = (note, t, steps) =>
    play(note >= 49 ? "choir_ahh" : "choir_ooh", note, t, { gain: 0.5, dur: steps * STEP, attack: 0.15, release: 0.8, send: 0.65 });

  function brass(chord, t) {
    const [root, , fifth] = chord;
    const opts = { dur: BAR - STEP, attack: 0.12, release: 0.5, send: 0.5 };
    play("tuba", fit(root, 34, 46), t, { ...opts, gain: 0.5 });
    play("trombone", fit(root, 46, 57), t, { ...opts, gain: 0.32 });
    play("trombone", fit(fifth, 48, 59), t, { ...opts, gain: 0.26 });
  }

  return {
    ready,
    stepDur: STEP,
    loopSteps: SECTION * 2,
    level: 0.45,
    play(i, t) {
      const inB = i >= SECTION;
      const k = i % SECTION; // step within the section
      const bar = Math.floor(k / 16), s = k % 16;
      const chord = PROG[bar];

      if (s === 0) strings(chord, t, inB);
      if (s === 0 && (inB || bar >= 1)) choir(chord, bar, t, inB);

      if (!inB) {
        // A — lament: heartbeat timpani, solo violin.
        if (k === 0) play("gong", null, t, { gain: 0.35, send: 0.6 });
        if (s === 0) timp(chord[0], t, 0.75);
        if (s === 3 && bar >= 2) timp(chord[0], t, 0.4);
        const n = LAMENT.find(([at]) => at === k);
        if (n) play("violin_solo", n[1], t, { gain: 0.42, dur: n[2] * STEP, attack: 0.12, release: 0.6, send: 0.55 });
      } else {
        // B — full orchestra.
        if (k === 0) play("gong", null, t, { gain: 0.6, send: 0.6 });
        if (s === 0) brass(chord, t);
        const n = ANTHEM.find(([at]) => at === k);
        if (n) {
          const opts = { dur: n[2] * STEP, attack: 0.1, release: 0.5, send: 0.5 };
          play("horn", n[1] - 12, t, { ...opts, gain: 0.45 });
          play("violins_sus", n[1], t, { ...opts, gain: 0.22 });
          sing(n[1] - 12, t, n[2]);
        }
        if (s % 2 === 0) {
          play("cello_spic", fit(chord[OSTINATO[s / 2]], 45, 57), t, { gain: s === 0 ? 0.5 : 0.36, dur: STEP * 1.2, release: 0.1, send: 0.15 });
        }
        if (s === 0) play("bassdrum", null, t, { gain: 0.85, send: 0.5, variant: 0 });
        if (s === 10) play("bassdrum", null, t, { gain: 0.5, send: 0.5, variant: 1 });
        const hits = { 0: 1, 3: 0.45, 6: 0.6, 8: 0.85, 11: 0.45, 14: 0.65 };
        if (hits[s] && bar < 7) timp(s === 8 ? chord[2] : chord[0], t, hits[s]);
        if (bar === 7) {
          // Last bar: timpani roll swelling into the return of the lament.
          if (s === 0) play("timpani_roll", fit(chord[0], 31, 40), t, { gain: 0.2, swellTo: 0.85, dur: BAR - 0.1, attack: 0.05, release: 0.3, send: 0.5 });
          if (s === 12 || s === 14) timp(chord[0], t, 0.7 + s * 0.02);
        }
      }

      // Cymbal swell timed to peak exactly on the B downbeat.
      if (i === SECTION - Math.round(CYMBAL_PEAK / STEP)) play("cymbal_cresc", null, t, { gain: 0.45, send: 0.6 });
    },
  };
}
