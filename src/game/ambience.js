// Desert ambience under the music, all synthesized: the campfire (a low roar, crackles, the odd
// pop and a hiss of sap), wind that gusts and dies, and crickets once it's dark. By day the wind
// carries it and the fire is quiet; at night the fire and crickets come forward.
//
// createAmbience(ctx, out) → { start(), stop(), setMode(name), schedule(until) }
// schedule() lays down the random events (crackles, chirps) up to a time — the live player
// calls it on a timer; an offline render can call it directly.

const LEVELS = {
  day: { fire: 0.45, wind: 1, crickets: 0 },
  night: { fire: 1, wind: 0.45, crickets: 1 },
};

export function createAmbience(ctx, out) {
  const sr = ctx.sampleRate;
  const noise = ctx.createBuffer(1, sr * 2, sr);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const loopNoise = () => {
    const s = ctx.createBufferSource();
    s.buffer = noise;
    s.loop = true;
    return s;
  };

  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(out);

  // The fire sits a little right of centre, where it is in the scene.
  const fire = ctx.createGain();
  const firePan = ctx.createStereoPanner();
  firePan.pan.value = 0.3;
  fire.connect(firePan).connect(master);
  const wind = ctx.createGain();
  wind.connect(master);
  const crickets = ctx.createGain();
  crickets.connect(master);

  const nodes = [];
  // Fire's roar: low, breathing noise.
  {
    const s = loopNoise(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = "lowpass";
    lp.frequency.value = 220;
    g.gain.value = 0.3;
    const lfo = ctx.createOscillator(), depth = ctx.createGain();
    lfo.frequency.value = 0.23;
    depth.gain.value = 0.1;
    lfo.connect(depth).connect(g.gain);
    s.connect(lp).connect(g).connect(fire);
    nodes.push(s, lfo);
  }
  // Wind: band-passed noise whose pitch and loudness drift with two slow, unrelated swells.
  {
    const s = loopNoise(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    bp.type = "bandpass";
    bp.frequency.value = 520;
    bp.Q.value = 0.9;
    g.gain.value = 0.1;
    for (const [rate, fDepth, gDepth] of [[0.07, 260, 0.07], [0.17, 120, 0.04]]) {
      const lfo = ctx.createOscillator(), fd = ctx.createGain(), gd = ctx.createGain();
      lfo.frequency.value = rate;
      fd.gain.value = fDepth;
      gd.gain.value = gDepth;
      lfo.connect(fd).connect(bp.frequency);
      lfo.connect(gd).connect(g.gain);
      nodes.push(lfo);
    }
    s.connect(bp).connect(g).connect(wind);
    nodes.push(s);
  }

  // One crackle: a tiny burst of noise, filtered somewhere in the treble.
  function crackle(t, peak) {
    const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise;
    bp.type = "bandpass";
    bp.frequency.value = 1200 + Math.random() * 4500;
    bp.Q.value = 0.8 + Math.random() * 2;
    const len = 0.003 + Math.random() * Math.random() * 0.025;
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(bp).connect(g).connect(fire);
    s.start(t, Math.random() * 1.5);
    s.stop(t + len + 0.01);
  }
  // Sap hissing out of a log.
  function hiss(t) {
    const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise;
    hp.type = "highpass";
    hp.frequency.value = 3500;
    const len = 0.4 + Math.random() * 0.9;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.025, t + 0.08);
    g.gain.linearRampToValueAtTime(0.0001, t + len);
    s.connect(hp).connect(g).connect(fire);
    s.start(t, Math.random());
    s.stop(t + len + 0.02);
  }
  // A cricket's chirp: three or four quick pulses of a high tone.
  function chirp(t, freq, pan) {
    const o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner();
    o.frequency.value = freq;
    p.pan.value = pan;
    const pulses = 3 + Math.floor(Math.random() * 2);
    g.gain.setValueAtTime(0, t);
    for (let k = 0; k < pulses; k++) {
      const at = t + k * 0.034;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.02, at + 0.006);
      g.gain.linearRampToValueAtTime(0, at + 0.022);
    }
    o.connect(g).connect(p).connect(crickets);
    o.start(t);
    o.stop(t + pulses * 0.034 + 0.02);
  }

  // Random events, scheduled ahead.
  let nextCrackle = 0, nextHiss = 0;
  const cricketsAt = [{ next: 0, freq: 4400, pan: -0.55, every: 0.62 }, { next: 0.3, freq: 4750, pan: 0.6, every: 0.81 }];
  function schedule(until) {
    const now = ctx.currentTime;
    if (nextCrackle < now) nextCrackle = now;
    while (nextCrackle < until) {
      // Crackles come in clusters: a pop, then a few smaller snaps right after.
      const big = Math.random() < 0.12;
      crackle(nextCrackle, big ? 0.22 : 0.03 + Math.random() * 0.09);
      if (big) for (let k = 1; k < 4; k++) crackle(nextCrackle + k * (0.01 + Math.random() * 0.04), 0.05 + Math.random() * 0.08);
      nextCrackle += -Math.log(1 - Math.random()) / 7; // ~7 a second, at random
    }
    if (nextHiss < now) nextHiss = now + 4 + Math.random() * 8;
    while (nextHiss < until) {
      hiss(nextHiss);
      nextHiss += 6 + Math.random() * 14;
    }
    for (const c of cricketsAt) {
      if (c.next < now) c.next = now + Math.random() * c.every;
      while (c.next < until) {
        chirp(c.next, c.freq * (1 + (Math.random() - 0.5) * 0.01), c.pan);
        // crickets pause now and then
        c.next += c.every * (1 + (Math.random() - 0.5) * 0.08) + (Math.random() < 0.08 ? 2 + Math.random() * 3 : 0);
      }
    }
  }

  let started = false, timer = 0;
  function setMode(name, seconds = 2) {
    const L = LEVELS[name] || LEVELS.day, t = ctx.currentTime;
    for (const [node, v] of [[fire, L.fire], [wind, L.wind], [crickets, L.crickets]]) {
      node.gain.cancelScheduledValues(t);
      node.gain.setValueAtTime(node.gain.value, t);
      node.gain.linearRampToValueAtTime(v, t + seconds);
    }
  }
  setMode("day", 0);

  return {
    setMode,
    schedule,
    start() {
      if (!started) {
        nodes.forEach((n) => n.start());
        started = true;
      }
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(2.6, t + 2.5);
      clearInterval(timer);
      timer = setInterval(() => schedule(ctx.currentTime + 0.25), 100);
      schedule(ctx.currentTime + 0.25);
    },
    stop() {
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + 0.8);
      clearInterval(timer);
      timer = 0;
    },
  };
}
