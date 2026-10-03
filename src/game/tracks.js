// The two soundtracks, synthesized with the Web Audio API (no audio files). Each track is built
// on a given AudioContext and output node, so the same code runs live or in an offline render.
//
//   blue — "Messenger": French house / disco-funk — four-on-the-floor, disco bass, pumping
//          filtered chords and a robotic vocoder-style lead (synthesized live).
//   red  — "Spartan": an original choral-orchestral piece in F# Phrygian played on real
//          recordings (public/audio/spartan — CC0 VSCO 2 orchestra + CC0 Freesound choirs):
//          a choir-led opening over a held F# (ison), a drum-driven drop with the choir
//          receding, a quiet choral breath, then a heavy climax of low choir, brass and drums.
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

// French house / disco-funk: four-on-the-floor at 122 BPM, octave-jumping disco bass, lush
// minor-9th chords that pump under the kick and sit behind a slowly opening filter, and a
// robotic vocoder-style lead. 16 bars that build: filtered intro → filter opens → robot lead
// → full groove with chord stabs.
function messenger(ctx, out) {
  const BPM = 122;
  const STEP = 60 / BPM / 4;
  const BAR = STEP * 16;
  const { noise } = resources(ctx);

  // Am9 → Fmaj9 → Dm9 → E9, voiced for a warm disco pad. root = bass note (MIDI).
  const CHORDS = [
    { root: 45, voicing: [57, 60, 64, 67, 71] },
    { root: 41, voicing: [53, 57, 60, 64, 67] },
    { root: 38, voicing: [50, 53, 57, 60, 64] },
    { root: 40, voicing: [52, 56, 59, 62, 66] },
  ];
  // Disco bass: [16th step, interval above the root]
  const BASS = [[0, 0], [3, 12], [6, 0], [8, 12], [10, 0], [11, 7], [14, 12]];
  const STABS = [3, 6, 10, 13];
  // Robot lead, one 4-bar phrase: [step in phrase, MIDI note, length in steps] — original.
  const LEAD = [
    [0, 76, 6], [6, 74, 2], [8, 76, 4], [12, 79, 4],
    [16, 81, 8], [24, 79, 4], [28, 76, 4],
    [32, 77, 6], [38, 76, 2], [40, 74, 4], [44, 72, 4],
    [48, 71, 8], [56, 68, 4], [60, 71, 4],
  ];

  // Chords and stabs run through the "filter house" lowpass and a pumping sidechain bus.
  const pump = ctx.createGain();
  const sweep = ctx.createBiquadFilter();
  sweep.type = "lowpass";
  sweep.Q.value = 5;
  sweep.frequency.value = 350;
  sweep.connect(pump).connect(out);

  // Short room reverb for claps and the lead.
  const room = ctx.createConvolver();
  room.buffer = resources(ctx).ir;
  const roomWet = ctx.createGain();
  roomWet.gain.value = 0.12;
  room.connect(roomWet).connect(out);

  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(155, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
    env(g, t, 1.0, 0.002, 0.28);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.35);
    noiseHit(ctx, out, t, { type: "highpass", freq: 3000, peak: 0.12, release: 0.012 }); // beater click
    // Sidechain: the chords duck on every kick and swell back — the French-house pump.
    pump.gain.cancelScheduledValues(t);
    pump.gain.setValueAtTime(0.25, t);
    pump.gain.linearRampToValueAtTime(1, t + STEP * 3);
  }

  // Hand clap: three quick noise bursts, like several hands slightly out of sync.
  function clap(t) {
    for (const [dt, pk] of [[0, 0.32], [0.011, 0.3], [0.022, 0.4]]) {
      noiseHit(ctx, [out, room], t + dt, { type: "bandpass", freq: 1300, q: 1.2, peak: pk, release: dt === 0.022 ? 0.16 : 0.012 });
    }
  }

  const hat = (t, open) => noiseHit(ctx, out, t, { type: "highpass", freq: open ? 6500 : 8500, peak: open ? 0.4 : 0.16, release: open ? 0.13 : 0.03 });

  function bass(t, note, len) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth";
    o2.type = "square";
    o.frequency.value = o2.frequency.value = midiHz(note);
    o2.detune.value = 6;
    f.type = "lowpass";
    f.Q.value = 7;
    f.frequency.setValueAtTime(1400, t);
    f.frequency.exponentialRampToValueAtTime(220, t + len * 0.8);
    env(g, t, 0.15, 0.004, len);
    o.connect(f);
    o2.connect(f);
    f.connect(g).connect(out);
    for (const x of [o, o2]) {
      x.start(t);
      x.stop(t + len + 0.05);
    }
  }

  // Lush pad: detuned saws on each chord tone, into the sweep filter → pump.
  function chord(t, voicing, len, peak, attack) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + len - 0.04);
    g.gain.linearRampToValueAtTime(0.0001, t + len);
    g.connect(sweep);
    for (const n of voicing) {
      for (const detune of [-9, 9]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = midiHz(n);
        o.detune.value = detune;
        o.connect(g);
        o.start(t);
        o.stop(t + len + 0.02);
      }
    }
  }

  // Robot lead: a buzzy saw+square voice shaped by two vowel formant filters that glide from
  // "oh" to "ah" across each note — the talk-box / vocoder colour. No vibrato: robotic.
  function robot(t, note, len) {
    const f0 = midiHz(note);
    const src = [ctx.createOscillator(), ctx.createOscillator()];
    src[0].type = "sawtooth";
    src[1].type = "square";
    src[1].detune.value = -1200; // octave below adds body
    const mix = ctx.createGain();
    mix.gain.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.02);
    g.gain.setValueAtTime(0.16, t + len - 0.03);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.04);
    for (const [fa, fb, q, lvl] of [[450, 750, 7, 1], [850, 1200, 9, 0.7], [2400, 2600, 6, 0.25]]) {
      const bp = ctx.createBiquadFilter(), lg = ctx.createGain();
      bp.type = "bandpass";
      bp.Q.value = q;
      bp.frequency.setValueAtTime(fa, t);
      bp.frequency.linearRampToValueAtTime(fb, t + Math.min(len, 0.25));
      lg.gain.value = lvl * 3;
      mix.connect(bp).connect(lg).connect(g);
    }
    for (const o of src) {
      o.frequency.setValueAtTime(f0 * 0.985, t);
      o.frequency.exponentialRampToValueAtTime(f0, t + 0.03); // tiny scoop into the note
      o.connect(mix);
      o.start(t);
      o.stop(t + len + 0.08);
    }
    g.connect(out);
    g.connect(room);
  }

  // Filter-house cutoff per bar: closed and murky → opens over the build → stays bright.
  const CUTOFF = [350, 450, 600, 800, 1100, 1600, 2300, 3200, 4500, 5500, 6000, 4500, 6500, 7500, 7500, 5000];

  return {
    ready: Promise.resolve(),
    stepDur: STEP,
    loopSteps: 16 * CUTOFF.length,
    level: 0.75,
    play(i, t) {
      const bar = Math.floor(i / 16), s = i % 16;
      const c = CHORDS[bar % CHORDS.length];
      const intro = bar < 4, leadIn = bar >= 8, full = bar >= 12;

      if (s === 0) {
        const next = CUTOFF[(bar + 1) % CUTOFF.length];
        sweep.frequency.setValueAtTime(CUTOFF[bar], t);
        sweep.frequency.exponentialRampToValueAtTime(next, t + BAR);
        chord(t, c.voicing, BAR, 0.06, 0.03);
      }
      if (s % 4 === 0) kick(t);
      if (!intro && (s === 4 || s === 12)) clap(t);
      if (s % 4 === 2) hat(t, true);
      else if (!intro || s % 2 === 0) hat(t, false);

      const b = BASS.find(([at]) => at === s);
      if (b && (!intro || bar >= 2)) bass(t, c.root + b[1], STEP * (b[1] === 0 ? 1.8 : 1.3));

      if (full && STABS.includes(s)) chord(t, c.voicing.map((n) => n + 12).slice(1), STEP * 0.9, 0.05, 0.005);

      if (leadIn) {
        const n = LEAD.find(([at]) => at === (bar % 4) * 16 + s);
        if (n) robot(t, n[1], n[2] * STEP);
      }
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
  const BPM = 63;
  const STEP = 60 / BPM / 4;
  const BAR = STEP * 16;

  // Four sections (in bars), following the shape of a cinematic choral piece:
  //   choir  — a strong choir carries the melody alone: no bass, no drums
  //   drive  — the drums drop and the beat picks up; low brass/strings enter; choir recedes
  //   breath — back to the choir alone, softer
  //   climax — loudest: heavy drums every bar, low brass, deep choir + horns on the main line
  // then it cuts off and loops to the choir.
  const SECTIONS = [["choir", 8], ["drive", 8], ["breath", 4], ["climax", 12]];
  const STARTS = [];
  SECTIONS.reduce((bar, [, len]) => (STARTS.push(bar), bar + len), 0);
  const TOTAL_BARS = SECTIONS.reduce((n, [, len]) => n + len, 0);
  const sectionAt = (bar) => {
    for (let k = SECTIONS.length - 1; k >= 0; k--) if (bar >= STARTS[k]) return { name: SECTIONS[k][0], at: bar - STARTS[k], len: SECTIONS[k][1] };
  };

  // F# Phrygian (F# G A B C# D E) — the flat second (G) gives the ancient, Eastern-Mediterranean
  // edge. Eight-bar progression: F#m → G → F#m → Em → D → Em → G → F#m.
  const FSM = [42, 45, 49], G = [43, 47, 50], EM = [40, 43, 47], D = [38, 42, 45];
  const PROG = [FSM, G, FSM, EM, D, EM, G, FSM]; // [root, third, fifth]

  // [step within an 8-bar phrase, MIDI note, length in steps] — original lines.
  const CHANT = [ // the choir's melody (choir + viola an octave up)
    [0, 49, 8], [8, 54, 8], [16, 55, 12], [28, 54, 4], [32, 57, 8], [40, 55, 4], [44, 54, 4],
    [48, 52, 16], [64, 54, 8], [72, 57, 8], [80, 59, 6], [86, 57, 2], [88, 55, 8],
    [96, 55, 4], [100, 54, 4], [104, 52, 4], [108, 50, 4], [112, 49, 16],
  ];
  const ANTHEM = [ // climax line: horns + choir, violins an octave up
    [0, 54, 8], [8, 49, 8], [16, 50, 16], [32, 49, 8], [40, 54, 8], [48, 55, 8], [56, 54, 4],
    [60, 52, 4], [64, 54, 16], [80, 55, 8], [88, 59, 8], [96, 59, 8], [104, 57, 4], [108, 55, 4],
    [112, 54, 16],
  ];
  const OSTINATO = [0, 0, 2, 0, 0, 0, 1, 2]; // cello spiccato 8ths, as chord-tone indices

  // All parts mix into one bus (peaks are caught by the master limiter in audio.js).
  const bus = ctx.createGain();
  bus.connect(out);

  const reverb = ctx.createConvolver();
  reverb.buffer = resources(ctx).ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.4;
  reverb.connect(wet).connect(bus);

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
  function play(group, midi, t, { gain = 1, swellTo = null, dur = null, attack = 0.01, release = 0.5, send = 0.4, variant = 0, bright = false } = {}) {
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
    if (bright) {
      // Lift the presence range so the choir rings out rather than sounding muffled.
      const shelf = ctx.createBiquadFilter();
      shelf.type = "highshelf";
      shelf.frequency.value = 1800;
      shelf.gain.value = 9;
      src.connect(shelf).connect(g);
    } else {
      src.connect(g);
    }
    g.connect(bus);
    if (send > 0) {
      const s = ctx.createGain();
      s.gain.value = send;
      g.connect(s).connect(reverb);
    }
  }

  const timp = (midi, t, gain) => play("timpani", fit(midi, 31, 40), t, { gain, send: 0.5 });
  const sustain = { dur: BAR, release: 0.9 };

  // Choir chord for one bar. `level` scales it: 1 = carrying the piece, ~0.35 = background.
  // `low` puts the weight in the deep voices (climax).
  function choirChord([root, third, fifth], t, level, low = false) {
    const o = { ...sustain, attack: 0.5, send: 0.75, bright: true };
    // Ison: part of the choir holds the home note (F#) under every chord, as Byzantine choirs do.
    play("choir_ahh", 54, t, { ...o, gain: 0.32 * level });
    if (low) {
      play("choir_ooh", fit(root, 42, 49), t, { ...o, gain: 0.6 * level });
      play("choir_ahh", fit(root, 47, 55), t, { ...o, gain: 0.55 * level });
      play("choir_ahh", fit(fifth, 47, 55), t, { ...o, gain: 0.45 * level });
      play("choir_ahh", fit(third, 50, 58), t, { ...o, gain: 0.3 * level });
    } else {
      play("choir_ahh", fit(root, 50, 58), t, { ...o, gain: 0.5 * level });
      play("choir_ahh", fit(fifth, 50, 58), t, { ...o, gain: 0.42 * level });
      play("choir_ahh", fit(third, 52, 60), t, { ...o, gain: 0.34 * level });
    }
  }
  // A melody note sung by the choir — "ahh" for most of the range, "ooh" for the lowest notes.
  const sing = (note, t, steps, gain) =>
    play(note >= 48 ? "choir_ahh" : "choir_ooh", note, t, { gain, dur: steps * STEP, attack: 0.12, release: 0.9, send: 0.7, bright: true });
  // Soft high strings on the chord — the upper shimmer above the choir.
  const highStrings = ([, third, fifth], t, gain) => {
    play("violins_sus", fit(fifth, 66, 78), t, { ...sustain, attack: 0.4, send: 0.5, gain });
    play("violins_sus", fit(third, 70, 81), t, { ...sustain, attack: 0.4, send: 0.5, gain: gain * 0.8 });
  };

  function lowStrings([root, , fifth], t, gain) {
    play("bass_sus", 42, t, { ...sustain, attack: 0.3, send: 0.4, gain: 0.55 * gain }); // F# pedal under every chord
    play("cello_sus", fit(root, 48, 59), t, { ...sustain, attack: 0.3, send: 0.4, gain: 0.4 * gain });
    play("cello_sus", fit(fifth, 52, 63), t, { ...sustain, attack: 0.3, send: 0.4, gain: 0.3 * gain });
  }
  function lowBrass([root, , fifth], t, gain) {
    const o = { dur: BAR - STEP, attack: 0.1, release: 0.5, send: 0.5 };
    play("tuba", fit(root, 34, 46), t, { ...o, gain: 0.55 * gain });
    play("trombone", fit(root, 42, 53), t, { ...o, gain: 0.36 * gain });
    play("trombone", fit(fifth, 45, 56), t, { ...o, gain: 0.3 * gain });
  }

  // Driving percussion. `heavy` for the climax.
  function drums(chord, s, t, heavy, k) {
    if (s === 0) play("bassdrum", null, t, { gain: 0.95 * k, send: 0.5, variant: 0 });
    if (s === 8) play("bassdrum", null, t, { gain: 0.7 * k, send: 0.5, variant: 1 });
    if (heavy && (s === 6 || s === 14)) play("bassdrum", null, t, { gain: 0.45, send: 0.5, variant: 1 });
    const pattern = { 0: 1, 3: 0.5, 6: 0.6, 8: 0.85, 10: 0.45, 11: 0.5, 12: 0.7, 14: 0.6, 15: 0.4 };
    if (pattern[s]) timp(s === 8 || s === 12 ? chord[2] : chord[0], t, pattern[s] * k);
    if (s % 2 === 0) {
      play("cello_spic", fit(chord[OSTINATO[s / 2]], 45, 57), t, { gain: (s === 0 ? 0.5 : 0.36) * k, dur: STEP * 1.2, release: 0.1, send: 0.15 });
    }
  }

  return {
    ready,
    stepDur: STEP,
    loopSteps: TOTAL_BARS * 16,
    level: 0.3,
    play(i, t) {
      const bar = Math.floor(i / 16), s = i % 16;
      const sec = sectionAt(bar);
      // Phrases restart with each section, so every section enters on the home chord with
      // its melody from the top; the final bar of the piece resolves home before the loop.
      const phraseBar = sec.at % 8;
      const finalBar = sec.name === "climax" && sec.at === sec.len - 1;
      const chord = finalBar ? FSM : PROG[phraseBar];
      const k = phraseBar * 16 + s; // position in the 8-bar phrase, for the melodies
      const line = (notes) => notes.find(([at]) => at === k);

      if (sec.name === "choir" || sec.name === "breath") {
        // Deliberately well below the drop and climax — the contrast is what makes them land.
        const level = sec.name === "choir" ? 0.6 : 0.42;
        if (s === 0) {
          choirChord(chord, t, level);
          highStrings(chord, t, 0.32 * level);
        }
        const n = line(CHANT);
        if (n) {
          const o = { dur: n[2] * STEP, attack: 0.2, release: 0.8, send: 0.6 };
          sing(n[1], t, n[2], 0.6 * level);
          play("viola_sus", n[1] + 12, t, { ...o, gain: 0.16 * level });
          play("violins_sus", n[1] + 24, t, { ...o, gain: 0.2 * level }); // the bright top of the line
        }
      } else if (sec.name === "drive") {
        if (s === 0) {
          if (sec.at === 0) play("gong", null, t, { gain: 0.5, send: 0.6 });
          choirChord(chord, t, 0.35);
          lowStrings(chord, t, 1.3);
          highStrings(chord, t, 0.22);
          if (sec.at % 2 === 0) lowBrass(chord, t, 1.15);
          // horns answer with a swelling chord every other bar
          if (sec.at % 2 === 1) for (const n of [chord[0], chord[2]]) play("horn", fit(n, 50, 60), t, { gain: 0.32, dur: BAR, attack: 0.6, release: 0.6, send: 0.5 });
        }
        drums(chord, s, t, false, 1.2);
      } else if (sec.name === "climax") {
        const last = sec.at === sec.len - 1;
        if (s === 0) {
          if (sec.at === 0) play("gong", null, t, { gain: 0.75, send: 0.6 });
          // the brass keeps building through the final bars
          const build = sec.at >= sec.len - 5 ? 1.7 : 1.35;
          choirChord(chord, t, 1.1, true);
          lowStrings(chord, t, 1.45);
          lowBrass(chord, t, build);
          highStrings(chord, t, 0.38);
        }
        const n = line(ANTHEM);
        if (n && !last) {
          const o = { dur: n[2] * STEP, attack: 0.1, release: 0.5, send: 0.5 };
          play("horn", n[1], t, { ...o, gain: 0.55 });
          sing(n[1], t, n[2], 0.5);
          play("violins_sus", n[1] + 12, t, { ...o, gain: 0.42 });
          play("violins_sus", n[1] + 24, t, { ...o, gain: 0.18 });
        }
        if (!last) drums(chord, s, t, true, 1.6);
        else if (s === 0) {
          // final hit, then silence before the choir returns
          play("bassdrum", null, t, { gain: 1, send: 0.7 });
          timp(chord[0], t, 1);
          play("gong", null, t, { gain: 0.5, send: 0.7 });
        }
      }

      // Cymbal swells timed to peak on the drop and on the climax downbeat.
      for (const target of [STARTS[1], STARTS[3]]) {
        if (i === target * 16 - Math.round(CYMBAL_PEAK / STEP)) play("cymbal_cresc", null, t, { gain: 0.45, send: 0.6 });
      }
      // Timpani roll building through the bar before the climax.
      if (bar === STARTS[3] - 1 && s === 0) {
        play("timpani_roll", fit(chord[0], 31, 40), t, { gain: 0.15, swellTo: 0.8, dur: BAR - 0.1, attack: 0.05, release: 0.3, send: 0.5 });
      }
    },
  };
}
