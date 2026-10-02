// The 3D "character select" arena behind the whole app: a neon grid floor, glowing pedestal,
// receding light frames, and the player figure slowly turning on the pedestal.
//
// The figure is a 3D scan of you if one exists at MODEL_URL (drop a .glb in public/models/),
// otherwise a procedurally built hologram stand-in.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createCat } from "./cat.js";

export const MODEL_URL = "/models/me.glb";

const NEON = new THREE.Color(0x38c8ff);
const RED = new THREE.Color(0xff3b2f);
// The accent colour per mode. Red is scaled up to cyan's luminance so it crosses the bloom
// threshold and glows just as much (pure red is far darker to the eye than cyan).
const luminance = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const GOLD = new THREE.Color(0xf5c04a);
const BG = 0x040812;
// Per-mode palette. The dark "neutrals" (background/fog, floor, pedestal metal, sky light) shift
// too — navy metal reflecting a cool sky reads as blue patches on an otherwise red stage.
const c = (hex) => new THREE.Color(hex);
const MODE_THEME = {
  blue: { accent: NEON, bg: c(BG), floor: c(0x060c18), metal: c(0x0b1526), sky: c(0xbfe6ff), ground: c(0x08101e) },
  red: {
    accent: RED.clone().multiplyScalar(luminance(NEON) / luminance(RED)),
    bg: c(0x0a0405), floor: c(0x0e0606), metal: c(0x1a0c0c), sky: c(0xffd2c8), ground: c(0x1a0808),
  },
};
const modeMix = (m) => (m === "red" ? 1 : 0);
const FIGURE_HEIGHT = 1.8; // scans are rescaled to this height (meters) whatever units they export in
const PEDESTAL_TOP = 0.16;
const LOOK_AT = new THREE.Vector3(0, 1.05, 0);

// Neon materials push their colour above 1.0 so only they cross the bloom threshold —
// the lit figure stays crisp while the lines glow. Materials in the accent colour are tagged
// with their boost so a mode switch can recolour them (see applyAccent).
function tagAccent(mat, color, boost) {
  if (color === NEON) mat.userData.accentBoost = boost;
  return mat;
}
function neon(color, boost = 3, opts = {}) {
  const m = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(boost), toneMapped: false, ...opts });
  return tagAccent(m, color, boost);
}
function neonLine(color, boost = 2.5, opacity = 1) {
  const m = new THREE.LineBasicMaterial({
    color: color.clone().multiplyScalar(boost), toneMapped: false, transparent: opacity < 1, opacity,
  });
  return tagAccent(m, color, boost);
}

function radialTexture(inner, outer) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function disposeObject(root) {
  root.traverse((n) => {
    n.geometry?.dispose();
    const mats = Array.isArray(n.material) ? n.material : n.material ? [n.material] : [];
    for (const m of mats) {
      for (const k in m) if (m[k]?.isTexture) m[k].dispose();
      m.dispose();
    }
  });
}

// ---- Environment ----------------------------------------------------------

function buildArena(scene) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    Object.assign(new THREE.MeshStandardMaterial({ color: 0x060c18, roughness: 0.38, metalness: 0.7 }), { userData: { neutral: "floor" } })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new THREE.GridHelper(80, 80);
  grid.material = neonLine(NEON, 0.9, 0.22);
  grid.position.y = 0.002;
  scene.add(grid);

  // A colonnade of temple fronts receding down the hall: marble columns carrying a neon
  // architrave and pediment.
  const TEMPLES = [-3.5, -7, -10.5, -14];
  const W = 2.2, H = 5.4, R = 1.2, O = 0.4;
  const seg = [
    [-W, 0], [-W, H], [W, 0], [W, H],
    [-W - O, H], [W + O, H], [-W - O, H + 0.12], [W + O, H + 0.12],
    [-W - O, H + 0.12], [0, H + 0.12 + R], [0, H + 0.12 + R], [W + O, H + 0.12],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0));
  const frameGeo = new THREE.BufferGeometry().setFromPoints(seg);
  TEMPLES.forEach((z, i) => {
    const frame = new THREE.LineSegments(frameGeo, neonLine(i % 2 ? GOLD : NEON, 2.6 - i * 0.4));
    frame.position.z = z;
    scene.add(frame);
  });
  const runway = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-W, 0.004, 3), new THREE.Vector3(-W, 0.004, -14),
    new THREE.Vector3(W, 0.004, 3), new THREE.Vector3(W, 0.004, -14),
  ]);
  scene.add(new THREE.LineSegments(runway, neonLine(NEON, 1.6)));

  const column = buildColumn();
  for (const side of [-1, 1]) {
    for (const z of TEMPLES) {
      const c = column.clone();
      c.position.set(side * W, 0, z);
      scene.add(c);
    }
  }
}

// A Doric column ~5.4 m tall: plinth, fluted shaft, echinus and abacus.
function buildColumn() {
  const g = new THREE.Group();
  const marble = new THREE.MeshStandardMaterial({ color: 0x6f6c66, roughness: 0.55, metalness: 0.1 });

  const shaft = new THREE.CylinderGeometry(0.3, 0.36, 4.8, 48, 1);
  const p = shaft.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 - 0.06 * Math.max(0, Math.cos(a * 20)); // 20 flutes
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  shaft.computeVertexNormals();
  const s = new THREE.Mesh(shaft, marble);
  s.position.y = 0.2 + 2.4;
  g.add(s);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 0.95), marble);
  plinth.position.y = 0.1;
  g.add(plinth);
  const echinus = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.3, 0.22, 48), marble);
  echinus.position.y = 5.0 + 0.11;
  g.add(echinus);
  const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.18, 1.0), marble);
  abacus.position.y = 5.22 + 0.09;
  g.add(abacus);

  for (const [y, r, color] of [[0.24, 0.37, NEON], [4.96, 0.31, GOLD]]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(r, 0.01, 6, 64), neon(color, 2.6));
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    g.add(band);
  }
  return g;
}

// Greek key (meander) around a circle on the floor plane, as line segments.
// Each unit is a hook rising off an inner base ring: up, across, down, back, up.
function meanderRing(rBase, depth, units) {
  const hook = [[1, 0], [1, 4], [5, 4], [5, 1], [3, 1], [3, 2]]; // (u along, v outward), 6 u per unit
  const pts = [];
  const at = (unit, u, v) => {
    const a = ((unit * 6 + u) / (units * 6)) * Math.PI * 2;
    const r = rBase + (v / 4) * depth;
    return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
  };
  for (let n = 0; n < units; n++) {
    for (let i = 0; i < hook.length - 1; i++) {
      const [u0, v0] = hook[i], [u1, v1] = hook[i + 1];
      const steps = Math.max(1, Math.abs(u1 - u0)); // subdivide arcs so they follow the curve
      for (let s = 0; s < steps; s++) {
        pts.push(at(n, u0 + ((u1 - u0) * s) / steps, v0 + ((v1 - v0) * s) / steps));
        pts.push(at(n, u0 + ((u1 - u0) * (s + 1)) / steps, v0 + ((v1 - v0) * (s + 1)) / steps));
      }
    }
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

function buildPedestal(scene) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x0b1526, roughness: 0.35, metalness: 0.85 });
  metal.userData.neutral = "metal";

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.2, PEDESTAL_TOP, 72), metal);
  base.position.y = PEDESTAL_TOP / 2;
  g.add(base);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.012, 8, 160), neon(NEON, 3.2));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = PEDESTAL_TOP + 0.002;
  g.add(rim);

  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.006, 6, 128), neon(GOLD, 2.4));
  inner.rotation.x = Math.PI / 2;
  inner.position.y = PEDESTAL_TOP + 0.004;
  g.add(inner);

  const key = new THREE.LineSegments(meanderRing(0.8, 0.16, 30), neonLine(GOLD, 2.2));
  key.position.y = PEDESTAL_TOP + 0.005;
  g.add(key);

  const floorRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.008, 6, 160), neon(NEON, 2));
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = 0.006;
  g.add(floorRing);

  // Segmented outer ring that counter-rotates — the "loading" ring of a character select.
  const dashes = new THREE.Group();
  const dashMat = neon(NEON, 1.6, { transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const SEG = 28;
  for (let i = 0; i < SEG; i++) {
    const len = (Math.PI * 2) / SEG;
    const dash = new THREE.Mesh(new THREE.RingGeometry(1.62, 1.68, 6, 1, i * len, len * 0.55), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dashes.add(dash);
  }
  dashes.position.y = 0.007;
  g.add(dashes);

  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 64),
    tagAccent(new THREE.MeshBasicMaterial({
      map: radialTexture("rgba(255,255,255,0.55)", "rgba(255,255,255,0)"), color: NEON.clone(),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }), NEON, 1)
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.004;
  g.add(glow);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 48),
    new THREE.MeshBasicMaterial({ map: radialTexture("rgba(0,0,0,0.7)", "rgba(0,0,0,0)"), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = PEDESTAL_TOP + 0.006;
  g.add(shadow);

  scene.add(g);
  return { dashes };
}

function buildParticles(scene) {
  const COUNT = 260;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 1] = Math.random() * 5;
    pos[i * 3 + 2] = -10 + Math.random() * 13;
  }
  // Mostly accent-coloured motes with every third one gold (recoloured in applyAccent).
  const col = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const c = (i % 3 ? NEON : GOLD).clone().multiplyScalar(2);
    col.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    vertexColors: true, size: 0.03, transparent: true, opacity: 0.7,
    depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
  scene.add(points);
  return points;
}

// ---- Hologram stand-in figure --------------------------------------------

function hologramMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: NEON.clone() }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vView; varying float vY;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vY = wp.y;
        vN = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uTime;
      varying vec3 vN; varying vec3 vView; varying float vY;
      void main() {
        // Clamp before pow(): rounding can push |dot| a hair over 1, and pow(negative) is NaN —
        // which bloom smears into flashing black blotches.
        float rim = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vView))), 0.0, 1.0), 2.2);
        float lines = 0.55 + 0.45 * step(0.5, fract(vY * 42.0 - uTime * 1.4));
        float sweepY = mod(uTime * 0.45, 2.4) - 0.2;
        float sweep = 1.0 - smoothstep(0.0, 0.07, abs(vY - sweepY)); // edge0 > edge1 is undefined in GLSL
        float a = (0.1 + rim * 0.9) * lines + sweep * 0.5;
        gl_FragColor = vec4(uColor * (0.5 + rim * 2.2 + sweep * 2.0), a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

// A simple standing runner built from capsules, feet at y = 0, ~1.8 m tall.
function buildHologram(material) {
  const g = new THREE.Group();
  const part = (geo, [x, y, z], { scale, rot } = {}) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    if (scale) m.scale.set(...scale);
    if (rot) m.rotation.set(...rot);
    g.add(m);
  };
  const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 6, 16);

  part(new THREE.SphereGeometry(0.11, 24, 18), [0, 1.66, 0], { scale: [0.88, 1.1, 1] });
  part(cap(0.05, 0.06), [0, 1.52, 0]);
  part(cap(0.17, 0.3), [0, 1.27, 0], { scale: [1.18, 1, 0.62] });
  part(cap(0.15, 0.08), [0, 0.99, 0], { scale: [1.1, 1, 0.7] });
  for (const s of [-1, 1]) {
    part(cap(0.05, 0.24), [s * 0.255, 1.25, 0], { rot: [0, 0, s * 0.13] });
    part(cap(0.042, 0.22), [s * 0.29, 0.98, 0.01], { rot: [0, 0, s * 0.06] });
    part(new THREE.SphereGeometry(0.05, 16, 12), [s * 0.305, 0.81, 0.015]);
    part(cap(0.078, 0.34), [s * 0.1, 0.7, 0]);
    part(cap(0.056, 0.34), [s * 0.1, 0.3, 0]);
    part(cap(0.045, 0.13), [s * 0.1, 0.05, 0.05], { rot: [Math.PI / 2, 0, 0] });
  }
  g.add(buildLaurel());
  return g;
}

// Gold laurel wreath: two sprays of leaves meeting at the back of the head, open at the brow.
function buildLaurel() {
  const g = new THREE.Group();
  const leafGeo = new THREE.SphereGeometry(1, 10, 6);
  const leafMat = neon(GOLD, 1.5);
  const LEAVES = 11;
  for (const side of [-1, 1]) {
    for (let i = 0; i < LEAVES; i++) {
      const a = Math.PI / 2 + side * (0.55 + (i / (LEAVES - 1)) * 2.45); // from the temples round to the back
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.scale.set(0.009, 0.005, 0.026);
      leaf.position.set(Math.cos(a) * 0.092, 1.735 + (i % 2 ? 0.008 : -0.004), Math.sin(a) * 0.092);
      leaf.rotation.set(side * 0.5, -a + side * 0.55, 0);
      g.add(leaf);
    }
  }
  return g;
}

// ---- Public API -----------------------------------------------------------

export function createArena(canvas, { onModel, mode = "blue" } = {}) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(BG);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.075);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const hemi = new THREE.HemisphereLight(0xbfe6ff, 0x08101e, 0.7);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(2.5, 4, 4);
  scene.add(key);
  const rimCool = new THREE.PointLight(NEON, 16);
  rimCool.position.set(-2, 2.2, -1.5);
  scene.add(rimCool);
  const rimWarm = new THREE.PointLight(GOLD, 10);
  rimWarm.position.set(2, 1.4, -1.5);
  scene.add(rimWarm);

  buildArena(scene);
  const { dashes } = buildPedestal(scene);
  const particles = buildParticles(scene);

  const turntable = new THREE.Group();
  turntable.position.y = PEDESTAL_TOP;
  scene.add(turntable);
  const holoMat = hologramMaterial();
  let figure = buildHologram(holoMat);
  turntable.add(figure);

  const scanRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.004, 6, 96),
    neon(NEON, 3, { transparent: true, opacity: 0 })
  );
  scanRing.rotation.x = Math.PI / 2;
  scene.add(scanRing);

  // ---- colour mode: accent-tagged materials and the dark neutrals blend blue (0) ↔ red (1)
  let mix = modeMix(mode), mixTarget = mix;
  const accent = new THREE.Color(), tmp = new THREE.Color();
  const blend = (key) => tmp.copy(MODE_THEME.blue[key]).lerp(MODE_THEME.red[key], mix);
  const particleColors = particles.geometry.attributes.color;
  function applyAccent() {
    accent.copy(blend("accent"));
    scene.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        const boost = m.userData.accentBoost;
        if (boost != null) m.color.copy(accent).multiplyScalar(boost);
        if (m.userData.neutral) m.color.copy(blend(m.userData.neutral));
      }
    });
    scene.background.copy(blend("bg"));
    scene.fog.color.copy(blend("bg"));
    renderer.setClearColor(blend("bg"));
    hemi.color.copy(blend("sky"));
    hemi.groundColor.copy(blend("ground"));
    holoMat.uniforms.uColor.value.copy(accent);
    rimCool.color.copy(accent);
    for (let i = 0; i < particleColors.count; i++) {
      if (i % 3) particleColors.setXYZ(i, accent.r * 2, accent.g * 2, accent.b * 2);
    }
    particleColors.needsUpdate = true;
  }
  applyAccent();
  function setMode(m) {
    mixTarget = modeMix(m);
  }

  const cat = createCat(scene, { reduceMotion });

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 1.4, 6.4);
  camera.lookAt(LOOK_AT);

  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- sizing + framing: the figure is centred on the page's "stage" area, not the viewport
  let W = 1, H = 1;
  const focus = { x: 0, y: 0, zoom: 1 };
  const focusTarget = { x: 0, y: 0, zoom: 1 };
  let firstFrame = true;

  // Phones get a slightly lower render resolution — bloom + MSAA at full retina is heavy there.
  const maxPixelRatio = window.matchMedia("(pointer: coarse)").matches ? 1.5 : 1.75;
  let sizeKey = "";
  function resize() {
    const pr = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
    const key = `${window.innerWidth}x${window.innerHeight}@${pr}`;
    if (key === sizeKey) return; // mobile browsers fire resize for no-op changes while scrolling
    const first = !sizeKey;
    sizeKey = key;
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    composer.setPixelRatio(pr);
    composer.setSize(W, H);
    camera.aspect = W / H;
    // Resizing wipes the canvas; repaint now rather than leaving it black until the next frame.
    if (!first) {
      camera.updateProjectionMatrix();
      composer.render(0);
    }
  }
  resize();
  window.addEventListener("resize", resize);

  // f = { x, y, height } in viewport px, or null to centre on the viewport.
  function setFocus(f) {
    if (!f) {
      focusTarget.x = 0; focusTarget.y = 0; focusTarget.zoom = 1;
      return;
    }
    focusTarget.x = f.x - W / 2;
    focusTarget.y = f.y - H / 2;
    focusTarget.zoom = Math.min(1, Math.max(0.42, f.height / (H * 0.82)));
  }

  // ---- interaction: drag to spin, gentle mouse parallax
  let dragging = false, lastX = 0, spinVel = 0;
  const baseSpin = reduceMotion ? 0.08 : 0.38;
  const mouse = { x: 0, y: 0 };
  const onDown = (e) => {
    dragging = true;
    lastX = e.clientX;
    canvas.setPointerCapture?.(e.pointerId);
    canvas.classList.add("grabbing");
  };
  const onMove = (e) => {
    mouse.x = (e.clientX / W) * 2 - 1;
    mouse.y = (e.clientY / H) * 2 - 1;
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    turntable.rotation.y += dx * 0.012;
    spinVel = dx * 0.7;
  };
  const onUp = () => {
    dragging = false;
    canvas.classList.remove("grabbing");
  };
  canvas.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);

  // ---- swap in the real scan if one has been dropped into public/models/
  let disposed = false;
  (async () => {
    try {
      const res = await fetch(MODEL_URL, { method: "HEAD" });
      const type = res.headers.get("content-type") || "";
      if (!res.ok || type.includes("text/html")) return; // dev server answers unknown paths with index.html
    } catch {
      return;
    }
    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        if (disposed) return disposeObject(gltf.scene);
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        model.scale.setScalar(FIGURE_HEIGHT / box.getSize(new THREE.Vector3()).y);
        box.setFromObject(model);
        const c = box.getCenter(new THREE.Vector3());
        model.position.set(-c.x, -box.min.y, -c.z);
        turntable.remove(figure);
        disposeObject(figure);
        figure = model;
        turntable.add(figure);
        onModel?.(true);
      },
      undefined,
      (err) => console.warn("Couldn't load your 3D scan from", MODEL_URL, err)
    );
  })();

  // ---- render loop (paused while the tab is hidden)
  let raf = 0, last = performance.now(), t = 0;
  const pos = particles.geometry.attributes.position;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    if (!dragging) {
      spinVel += (baseSpin - spinVel) * Math.min(1, dt * 1.5);
      turntable.rotation.y += spinVel * dt;
    }
    dashes.rotation.y -= dt * (reduceMotion ? 0.02 : 0.15);
    holoMat.uniforms.uTime.value = t;
    cat.update(dt, camera);
    if (mix !== mixTarget) {
      mix += (mixTarget - mix) * Math.min(1, dt * 3);
      if (Math.abs(mixTarget - mix) < 0.005) mix = mixTarget;
      applyAccent();
    }

    const cycle = (t % 5) / 5;
    scanRing.position.y = PEDESTAL_TOP + 0.05 + cycle * 1.85;
    scanRing.material.opacity = Math.sin(cycle * Math.PI) * 0.8;

    if (!reduceMotion) {
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + dt * 0.12;
        if (y > 5) y = 0;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // Ease the framing toward its target so tab/layout changes glide rather than jump.
    const k = firstFrame ? 1 : Math.min(1, dt * 4);
    firstFrame = false;
    focus.x += (focusTarget.x - focus.x) * k;
    focus.y += (focusTarget.y - focus.y) * k;
    focus.zoom += (focusTarget.zoom - focus.zoom) * k;
    camera.setViewOffset(W, H, -focus.x, -focus.y, W, H);
    camera.zoom = focus.zoom;
    camera.position.x += (mouse.x * 0.25 - camera.position.x) * Math.min(1, dt * 2);
    camera.position.y += (1.4 - mouse.y * 0.08 - camera.position.y) * Math.min(1, dt * 2);
    camera.lookAt(LOOK_AT);
    camera.updateProjectionMatrix();

    composer.render(dt);
  }

  function onVisibility() {
    cancelAnimationFrame(raf);
    if (document.visibilityState === "visible") {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  document.addEventListener("visibilitychange", onVisibility);
  raf = requestAnimationFrame(frame);

  return {
    setFocus,
    setMode,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVisibility);
      cat.dispose();
      disposeObject(scene);
      scene.environment?.dispose();
      pmrem.dispose();
      target.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
