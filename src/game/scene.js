// The 3D desert behind the whole app: sand flats running out to layered mesas, saguaros, a
// ranch fence and a campfire, with the player figure slowly turning on a sandstone rock ringed
// by a lasso. Two times of day — golden hour and moonlit night — blend into each other: the sun
// sinks behind the hills as the moon rises behind a howling coyote on the mesa.
//
// The figure is a 3D scan of you if one exists at MODEL_URL (drop a .glb in public/models/),
// otherwise a procedurally built hologram stand-in (in a cowboy hat).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createCat } from "./cat.js";
import { buildCowboyHat } from "./hat.js";
import { createTumbleweeds } from "./tumbleweed.js";

export const MODEL_URL = "/models/me.glb";

const FIGURE_HEIGHT = 1.8; // scans are rescaled to this height (meters) whatever units they export in
const PEDESTAL_TOP = 0.16;
const LOOK_AT = new THREE.Vector3(0, 1.05, 0);

// Per-mode palette. Every scenery material is tagged with one of these keys (userData.tone) and
// recoloured as the mode blends day (0) ↔ night (1); numbers are light levels.
const c = (hex) => new THREE.Color(hex);
const THEME = {
  day: {
    zenith: c(0x5d719e), skyMid: c(0xdb9c7a), horizon: c(0xf2b57a), glow: c(0xffa24a),
    ground: c(0xb98252), ridgeNear: c(0x7c4027), ridgeMid: c(0x9b5735), ridgeFar: c(0xbc7c57),
    cactus: c(0x5e7a45), rock: c(0xa95b37), scrub: c(0x7d7b45), straw: c(0xb48c58), wood: c(0x6e4b30), stone: c(0x8b6b56),
    sandstone: c(0xb36a40), sandstoneTop: c(0xcb8659), hemiSky: c(0xffd8ac), hemiGround: c(0x7a4a2a),
    key: c(0xffb070), fill: c(0xffe4c8), dust: c(0xffd9a0),
    // The hologram: cream thread by day (the sky behind it is orange), turquoise by night.
    holo: c(0xf0e1c4),
    hemiI: 0.75, keyI: 1.9, fillI: 0.7, fireI: 1.2, exposure: 0.95,
  },
  night: {
    zenith: c(0x06071a), skyMid: c(0x161a3c), horizon: c(0x2e2f55), glow: c(0x8a9ad0),
    ground: c(0x34304a), ridgeNear: c(0x121019), ridgeMid: c(0x1b1a2b), ridgeFar: c(0x29293f),
    cactus: c(0x23302f), rock: c(0x41323a), scrub: c(0x272c27), straw: c(0x4a4048), wood: c(0x2c2327), stone: c(0x3e3842),
    sandstone: c(0x4c3b44), sandstoneTop: c(0x5e4a52), hemiSky: c(0x5b6b9c), hemiGround: c(0x121020),
    key: c(0xa8b8ff), fill: c(0x7080b8), dust: c(0xa8b8e0),
    holo: c(0x4fc1b0),
    hemiI: 0.6, keyI: 1.0, fillI: 0.35, fireI: 9, exposure: 1.05,
  },
};
const modeMix = (m) => (m === "night" ? 1 : 0);

// Where the sun and moon sit, as directions from the camera — framed beside the figure.
const SUN_DIR = new THREE.Vector3(0.13, 0.05, -1).normalize();
const MOON_DIR = new THREE.Vector3(-0.118, 0.158, -1).normalize();
const SKY_R = 80;

// Seeded random, so the scenery is laid out the same on every visit.
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toned(mat, tone) {
  mat.userData.tone = tone;
  return mat;
}
const standard = (tone, opts = {}) => toned(new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...opts }), tone);

function radialTexture(stops) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const g = cv.getContext("2d");
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [at, col] of stops) grd.addColorStop(at, col);
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(cv);
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

// ---- Sky ------------------------------------------------------------------

function buildSky(scene) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color() }, uMid: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
      uSunDir: { value: SUN_DIR.clone() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vDir = normalize(wp.xyz - cameraPosition);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith, uMid, uHorizon, uGlow, uSunDir;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.14, h));
        col = mix(col, uZenith, smoothstep(0.1, 0.7, h));
        float s = max(dot(d, uSunDir), 0.0);
        col += uGlow * (pow(s, 16.0) * 0.32 + pow(s, 120.0) * 0.5) * (1.0 - smoothstep(0.0, 0.5, h) * 0.5);
        gl_FragColor = vec4(h < 0.0 ? uHorizon : col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(95, 48, 24), material);
  sky.renderOrder = -2;
  scene.add(sky);

  // Stars: a dome of points that fades in at night, a few brighter than the rest.
  const r = rng(7), N = 700, pos = new Float32Array(N * 3), size = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const az = r() * Math.PI * 2, el = Math.asin(0.02 + r() * 0.98);
    pos.set([Math.cos(el) * Math.cos(az) * 90, Math.sin(el) * 90, Math.cos(el) * Math.sin(az) * 90], i * 3);
    size[i] = r() < 0.08 ? 2.6 : 1 + r();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(size, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float size; varying float vTw; uniform float uTime;
      void main() {
        vTw = 0.75 + 0.25 * sin(uTime * 2.0 + position.x * 13.0 + position.z * 7.0);
        gl_PointSize = size * 1.6;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * uOpacity * vTw;
        gl_FragColor = vec4(vec3(1.0, 0.97, 0.9) * 1.4 * a, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  const stars = new THREE.Points(geo, starMat);
  stars.renderOrder = -1;
  scene.add(stars);

  // Sun: a hot disc with a wide soft halo. Moon: a cream disc with faint maria, and a halo.
  const disc = (tex, size) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, fog: false, toneMapped: false,
    }));
    m.renderOrder = -1;
    scene.add(m);
    return m;
  };
  const sun = disc(radialTexture([[0, "#fff6dc"], [0.36, "#ffd27a"], [0.4, "rgba(255,170,80,0.4)"], [0.6, "rgba(255,140,60,0.08)"], [1, "rgba(255,120,40,0)"]]), 14);
  sun.material.color.setScalar(1.5);
  sun.material.blending = THREE.AdditiveBlending;

  const moonCanvas = document.createElement("canvas");
  moonCanvas.width = moonCanvas.height = 256;
  const g = moonCanvas.getContext("2d");
  const halo = g.createRadialGradient(128, 128, 30, 128, 128, 128);
  halo.addColorStop(0, "rgba(220,225,255,0.35)");
  halo.addColorStop(1, "rgba(220,225,255,0)");
  g.fillStyle = halo;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#f4ecd8";
  g.beginPath();
  g.arc(128, 128, 34, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(170,160,150,0.35)";
  for (const [x, y, rad] of [[116, 118, 9], [140, 112, 6], [134, 140, 10], [112, 142, 5], [148, 130, 4]]) {
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  const moonTex = new THREE.CanvasTexture(moonCanvas);
  moonTex.colorSpace = THREE.SRGBColorSpace;
  const moon = disc(moonTex, 17);
  moon.material.color.setScalar(1.15);

  return { sky, material, stars, starMat, sun, moon };
}

// ---- Land -----------------------------------------------------------------

function sandTexture() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const g = cv.getContext("2d");
  g.fillStyle = "#e8e8e8";
  g.fillRect(0, 0, 256, 256);
  const r = rng(3);
  for (let i = 0; i < 5000; i++) {
    const v = 200 + Math.floor(r() * 55);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(r() * 256, r() * 256, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  // wind ripples
  g.strokeStyle = "rgba(255,255,255,0.18)";
  for (let y = 0; y < 256; y += 9) {
    g.beginPath();
    for (let x = 0; x <= 256; x += 8) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 2);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(50, 50);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function buildGround(scene) {
  const geo = new THREE.PlaneGeometry(220, 220, 180, 180);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    // Flat where things walk; gentle dunes further out.
    const k = THREE.MathUtils.smoothstep(r, 12, 30);
    p.setY(i, k * (Math.sin(x * 0.09 + 1.3) * Math.cos(z * 0.07) * 0.9 + Math.sin(x * 0.031 - z * 0.05) * 1.1 + 0.6));
  }
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, standard("ground", { map: sandTexture(), roughness: 1 }));
  scene.add(ground);
}

// One silhouette layer of the far landscape: rolling hills with flat-topped mesas — a cliff
// standing on a sloping talus skirt — at depth z, coloured by its tone and hazed by the fog.
function ridgeLayer({ z, tone, seed, base, mesas }) {
  const r = rng(seed);
  const ph = [r() * 10, r() * 10, r() * 10];
  const hill = (x) => base[0] + (base[1] - base[0]) * (0.5 + 0.3 * Math.sin(x * 0.07 + ph[0]) + 0.2 * Math.sin(x * 0.19 + ph[1]));
  const mesaAt = (x) => {
    let h = 0;
    for (const m of mesas) {
      const cliff = m.h * Math.min(1, Math.max(0, (x - m.x0) / 0.6)) * Math.min(1, Math.max(0, (m.x1 - x) / 0.6));
      const skirtW = (m.x1 - m.x0) * 0.3 + 2;
      const skirt = m.h * 0.42 * Math.min(1, Math.max(0, (x - m.x0 + skirtW) / skirtW)) * Math.min(1, Math.max(0, (m.x1 + skirtW - x) / skirtW));
      const top = cliff >= m.h * 0.999 ? Math.sin(x * 3.1 + ph[2]) * 0.06 : 0;
      h = Math.max(h, cliff + top, skirt);
    }
    return h;
  };
  const shape = new THREE.Shape();
  const X0 = -110, X1 = 110;
  shape.moveTo(X0, -3);
  for (let x = X0; x <= X1; x += 0.2) shape.lineTo(x, Math.max(hill(x), mesaAt(x)));
  shape.lineTo(X1, -3);
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), toned(new THREE.MeshBasicMaterial(), tone));
  mesh.position.z = z;
  return { mesh, heightAt: (x) => Math.max(hill(x), mesaAt(x)) };
}

// A sitting coyote howling at the sky, side on — drawn into a canvas for the mesa-top silhouette.
// Traced in a 100 × 100 box, facing left: sitting tall, head thrown back with the snout to
// the sky and the jaw open, ears laid back, a ruff down the neck, the front leg braced, the
// hind paw flat on the rock, and a bushy tail curling up behind.
const HOWL_PATH =
  "M33.3 0.0 L34.7 1.4 L35.7 5.8 L37.1 9.6 L39.5 11.5 L41.9 16.3 L43.4 19.7 L45.3 22.1 L46.7 24.5 " +
  "L49.1 27.4 L51.1 29.8 L52.0 32.1 L50.6 33.6 L48.2 34.0 L44.8 33.4 L46.7 37.4 L49.6 41.3 " +
  "L53.0 44.1 L55.4 45.1 L56.3 46.3 L57.8 47.2 L59.7 48.8 L61.1 49.9 L62.3 51.6 L64.0 54.2 " +
  "L68.8 59.0 L74.6 66.7 L77.0 72.0 L78.4 78.7 L79.8 83.5 L79.4 88.3 L81.8 81.6 L82.2 73.9 " +
  "L80.8 67.2 L79.4 60.9 L81.3 60.5 L85.1 62.9 L88.0 65.3 L89.4 63.3 L90.4 69.1 L90.9 72.0 " +
  "L91.8 71.0 L91.4 76.8 L93.3 76.8 L92.8 83.5 L89.9 89.3 L85.1 94.0 L78.9 96.0 L77.9 98.1 " +
  "L75.5 99.3 L72.6 99.8 L46.7 100.0 L43.9 98.8 L44.0 96.7 L44.8 94.5 L47.7 93.1 L55.4 93.6 " +
  "L53.5 90.2 L50.6 86.9 L48.2 83.5 L46.5 79.7 L44.8 78.9 L41.9 77.7 L39.1 76.0 L35.2 74.4 " +
  "L32.3 72.9 L29.9 74.9 L27.5 79.7 L25.1 85.4 L23.2 89.4 L20.8 92.1 L19.4 95.0 L17.0 97.1 " +
  "L14.1 98.4 L10.3 99.0 L6.6 98.7 L6.9 96.7 L10.3 95.6 L12.7 93.1 L15.1 87.3 L17.5 80.6 L19.9 73.9 " +
  "L22.0 68.6 L21.8 64.3 L21.0 58.5 L20.8 52.8 L20.4 47.0 L20.2 41.3 L20.8 34.5 L22.0 28.8 " +
  "L23.2 22.1 L24.1 16.8 L23.7 12.0 L22.6 8.6 L22.4 6.7 L23.5 5.8 L25.6 6.5 L26.8 6.7 L26.1 7.7 " +
  "L27.5 8.6 L28.7 5.3 L30.4 1.9 Z";

function buildCoyoteSilhouette() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 256;
  const g = cv.getContext("2d");
  g.scale(2.5, 2.5);
  g.fillStyle = "#fff";
  g.fill(new Path2D(HOWL_PATH));
  const tex = new THREE.CanvasTexture(cv);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), toned(new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5 }), "ridgeMid"));
  return mesh;
}

function buildLandscape(scene) {
  const near = ridgeLayer({ z: -24, tone: "ridgeNear", seed: 11, base: [0.2, 1.4], mesas: [{ x0: 8, x1: 12.5, h: 3.4 }, { x0: -31, x1: -22, h: 2.8 }] });
  const mid = ridgeLayer({
    z: -40, tone: "ridgeMid", seed: 23, base: [0.4, 2.2],
    mesas: [{ x0: -10.5, x1: -2.8, h: 7.6 }, { x0: 17, x1: 31, h: 5.2 }, { x0: -42, x1: -27, h: 6.2 }],
  });
  const far = ridgeLayer({
    z: -62, tone: "ridgeFar", seed: 37, base: [1, 3.2],
    mesas: [{ x0: -26, x1: -13, h: 9.5 }, { x0: -5.5, x1: -2, h: 11 }, { x0: 22, x1: 46, h: 7.5 }, { x0: -62, x1: -40, h: 8.5 }],
  });
  for (const l of [near, mid, far]) scene.add(l.mesh);

  // The coyote sits on the big mid mesa, framed by the moon.
  const coyote = buildCoyoteSilhouette();
  const cx = -6.2, s = 2.5;
  coyote.scale.setScalar(s / 2);
  coyote.position.set(cx, mid.heightAt(cx) + s / 2 - 0.12, -39.9);
  scene.add(coyote);
}

// Saguaro: a ribbed trunk with a domed top and a few upturned arms.
function ribbed(radius, length) {
  const geo = new THREE.CylinderGeometry(radius, radius * 1.04, length, 36, 1, true);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const k = 1 - 0.09 * (0.5 + 0.5 * Math.cos(Math.atan2(z, x) * 12));
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildSaguaro(r, height, material) {
  const g = new THREE.Group();
  const tr = height * 0.06;
  const trunk = new THREE.Mesh(ribbed(tr, height - tr), material);
  trunk.position.y = (height - tr) / 2;
  g.add(trunk);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(tr * 0.95, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), material);
  cap.position.y = height - tr;
  g.add(cap);
  const arms = 1 + Math.floor(r() * 3);
  for (let i = 0; i < arms; i++) {
    const arm = new THREE.Group();
    const ar = tr * (0.62 + r() * 0.15);
    const y = height * (0.32 + r() * 0.3);
    const out = tr + height * (0.09 + r() * 0.07);
    const up = height * (0.16 + r() * 0.2);
    const across = new THREE.Mesh(new THREE.CylinderGeometry(ar, ar, out, 16), material);
    across.rotation.z = Math.PI / 2;
    across.position.set(out / 2, y, 0);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(ar, 16, 12), material);
    elbow.position.set(out, y, 0);
    const rise = new THREE.Mesh(ribbed(ar, up), material);
    rise.position.set(out, y + up / 2, 0);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(ar * 0.97, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), material);
    tip.position.set(out, y + up, 0);
    arm.add(across, elbow, rise, tip);
    arm.rotation.y = (i / arms) * Math.PI * 2 + r() * 1.2;
    g.add(arm);
  }
  return g;
}

function buildRock(r, size, material) {
  const geo = new THREE.DodecahedronGeometry(size, 1);
  const p = geo.attributes.position;
  // The geometry is non-indexed (each face has its own copy of a corner), so the bump must
  // depend on where the corner is, not on the loop — otherwise faces tear apart into shards.
  const seed = r() * 100;
  const bump = (x, y, z) => {
    const h = Math.sin((x * 12.9898 + y * 78.233 + z * 37.719) / size + seed) * 43758.5453;
    return h - Math.floor(h);
  };
  for (let i = 0; i < p.count; i++) {
    const k = 0.8 + bump(p.getX(i), p.getY(i), p.getZ(i)) * 0.35;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.65, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

function buildScrub(r, material) {
  const g = new THREE.Group();
  const n = 3 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const s = 0.1 + r() * 0.18;
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), material);
    b.position.set((r() - 0.5) * 0.45, s * 0.7, (r() - 0.5) * 0.45);
    b.rotation.set(r() * 3, r() * 3, r() * 3);
    g.add(b);
  }
  return g;
}

function buildProps(scene) {
  const r = rng(101);
  const cactus = standard("cactus", { roughness: 0.75 });
  for (const [x, z, h] of [[-4.6, -6.5, 3.4], [5.4, -9.5, 4.6], [-9.5, -15, 5.2], [12, -19, 4.8], [-17, -21, 4.4], [8.6, -23, 3.9], [-26, -12, 5.5], [21, -12, 4.2]]) {
    const s = buildSaguaro(r, h, cactus);
    s.position.set(x, 0, z);
    s.rotation.y = r() * Math.PI * 2;
    scene.add(s);
  }

  const rock = standard("rock", { flatShading: true });
  for (const [x, z, s] of [[-6.5, -3.5, 0.9], [-7.6, -4.6, 0.55], [7, -4, 1.1], [8.2, -3.2, 0.5], [-3.6, -10, 0.7], [9.5, -13, 1.6], [-13, -9, 1.3], [2.2, 3.4, 0.16], [-3.4, 2.6, 0.22], [3.8, -1.2, 0.18], [-2.2, -6.2, 0.2]]) {
    const m = buildRock(r, s, rock);
    m.position.set(x, s * 0.25, z);
    m.rotation.y = r() * 6;
    scene.add(m);
  }

  const scrub = standard("scrub", { flatShading: true });
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = 3.6 + r() * 16;
    const x = Math.cos(a) * d, z = Math.sin(a) * d - 3;
    if (z > 1 || (x > 1 && x < 5.2 && z > -1.6)) continue; // keep the foreground and the lasso's tail clear
    const b = buildScrub(r, scrub);
    b.position.set(x, 0, z);
    scene.add(b);
  }

  // A ranch fence running away to the left: weathered posts and two strands of wire.
  const wood = standard("wood");
  const postGeo = new THREE.BoxGeometry(0.09, 1.05, 0.09);
  const wire = [[], []];
  for (let i = 0; i < 14; i++) {
    const u = i / 13;
    const x = -6.2 - u * 9, z = -2.4 - u * 30;
    const post = new THREE.Mesh(postGeo, wood);
    post.position.set(x, 0.5, z);
    post.rotation.set((r() - 0.5) * 0.08, r(), (r() - 0.5) * 0.1);
    scene.add(post);
    wire[0].push(new THREE.Vector3(x, 0.5, z));
    wire[1].push(new THREE.Vector3(x, 0.88, z));
  }
  const wireMat = toned(new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6 }), "wood");
  for (const pts of wire) scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
}

// The figure's rock: a sandstone slab with an irregular edge, on a darker stratum.
function buildPedestal(scene) {
  const g = new THREE.Group();
  const slab = (rTop, rBot, h, y, tone, seed) => {
    const geo = new THREE.CylinderGeometry(rTop, rBot, h, 22, 1);
    const p = geo.attributes.position;
    const rr = rng(seed), wob = Array.from({ length: 23 }, () => 0.9 + rr() * 0.16);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      if (Math.hypot(x, z) < 1e-3) continue;
      const seg = Math.round(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * 22) % 22;
      p.setX(i, x * wob[seg]);
      p.setZ(i, z * wob[seg]);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, standard(tone, { flatShading: true }));
    m.position.y = y;
    g.add(m);
  };
  slab(1.12, 1.3, 0.12, 0.02, "sandstone", 5);
  slab(1.02, 1.1, 0.1, PEDESTAL_TOP - 0.05, "sandstoneTop", 9);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 48),
    new THREE.MeshBasicMaterial({ map: radialTexture([[0, "rgba(0,0,0,0.6)"], [1, "rgba(0,0,0,0)"]]), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = PEDESTAL_TOP + 0.003;
  g.add(shadow);
  scene.add(g);
}

// The cap's orange rope, as a lasso lying on the sand around the rock, its tail trailing off.
function ropeTexture() {
  const cv = document.createElement("canvas");
  cv.width = 64;
  cv.height = 16;
  const g = cv.getContext("2d");
  g.fillStyle = "#e8913a";
  g.fillRect(0, 0, 64, 16);
  g.strokeStyle = "#a95a1c";
  g.lineWidth = 3;
  for (let x = -16; x < 80; x += 8) {
    g.beginPath();
    g.moveTo(x, 16);
    g.lineTo(x + 10, 0);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildLasso(scene) {
  const tex = ropeTexture();
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
  const R = 1.48, y = 0.024;
  const loop = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const rr = R + Math.sin(a * 3 + 0.5) * 0.05 + Math.sin(a * 7) * 0.02;
    loop.push(new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr));
  }
  const loopCurve = new THREE.CatmullRomCurve3(loop, true);
  const loopTex = tex.clone();
  loopTex.repeat.set(140, 1);
  const loopMesh = new THREE.Mesh(new THREE.TubeGeometry(loopCurve, 240, 0.022, 8, true), mat.clone());
  loopMesh.material.map = loopTex;
  scene.add(loopMesh);

  // Honda knot where the tail leaves the loop, then the tail snaking off to the right.
  const a0 = 0.35, hx = Math.cos(a0) * (R + 0.06), hz = Math.sin(a0) * (R + 0.06);
  const honda = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 8, 20), mat);
  honda.position.set(hx, y + 0.01, hz);
  honda.rotation.x = -Math.PI / 2;
  scene.add(honda);
  const tail = new THREE.CatmullRomCurve3([
    new THREE.Vector3(hx, y, hz), new THREE.Vector3(hx + 0.6, y, hz + 0.15),
    new THREE.Vector3(hx + 1.0, y, hz - 0.35), new THREE.Vector3(hx + 1.7, y, hz - 0.1), new THREE.Vector3(hx + 2.4, y, hz - 0.6),
  ]);
  const tailTex = tex.clone();
  tailTex.repeat.set(60, 1);
  const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(tail, 80, 0.022, 8, false), mat.clone());
  tailMesh.material.map = tailTex;
  scene.add(tailMesh);
}

// Campfire behind the figure: ring of stones, crossed logs, flickering flames, rising embers and
// a warm light that carries the scene at night.
function buildCampfire(scene) {
  const g = new THREE.Group();
  g.position.set(1.5, 0, -4.4);
  const r = rng(55);
  const stone = standard("stone", { flatShading: true });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const s = buildRock(r, 0.07 + r() * 0.03, stone);
    s.position.set(Math.cos(a) * 0.33, 0.03, Math.sin(a) * 0.33);
    g.add(s);
  }
  const wood = standard("wood");
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.5, 8), wood);
    const a = (i / 4) * Math.PI * 2 + 0.4;
    log.position.set(Math.cos(a) * 0.1, 0.12, Math.sin(a) * 0.1);
    log.rotation.set(0, -a, 0);
    log.rotateZ(0.95);
    g.add(log);
  }
  const flames = [];
  for (const [rad, h, col, k] of [[0.16, 0.5, 0xff6a1a, 2.4], [0.11, 0.42, 0xffa030, 3], [0.06, 0.3, 0xffe08a, 3.4]]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 12, 1, true), new THREE.MeshBasicMaterial({
      color: new THREE.Color(col).multiplyScalar(k), transparent: true, opacity: 0.85,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    f.geometry.translate(0, h / 2, 0);
    f.position.y = 0.06;
    g.add(f);
    flames.push(f);
  }
  const light = new THREE.PointLight(0xff8a3a, 1, 11, 1.6);
  light.position.y = 0.5;
  g.add(light);

  const N = 40, pos = new Float32Array(N * 3), life = new Float32Array(N);
  for (let i = 0; i < N; i++) life[i] = r();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const embers = new THREE.Points(geo, new THREE.PointsMaterial({
    color: new THREE.Color(0xff8a30).multiplyScalar(3), size: 0.035, transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  g.add(embers);
  scene.add(g);

  const drift = Array.from({ length: N }, () => [(r() - 0.5) * 0.3, (r() - 0.5) * 0.3, 0.5 + r() * 0.6]);
  return {
    light,
    update(t, dt, level, reduceMotion) {
      const flick = 0.85 + 0.1 * Math.sin(t * 13) + 0.08 * Math.sin(t * 29 + 1.3);
      light.intensity = level * (reduceMotion ? 1 : flick);
      flames.forEach((f, i) => {
        f.scale.y = reduceMotion ? 1 : 1 + 0.18 * Math.sin(t * (11 + i * 3) + i) + 0.08 * Math.sin(t * 23 + i * 2);
        f.rotation.y = t * (0.6 + i * 0.3);
      });
      if (reduceMotion) return;
      for (let i = 0; i < N; i++) {
        life[i] += dt * 0.55;
        if (life[i] > 1) life[i] -= 1;
        const l = life[i], d = drift[i];
        pos.set([d[0] * l + Math.sin(t * 2 + i) * 0.04 * l, 0.2 + l * d[2] * 2.2, d[1] * l], i * 3);
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// Dust drifting on the breeze (warm motes by day, cool specks at night).
function buildDust(scene) {
  const COUNT = 220, r = rng(77);
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) pos.set([(r() - 0.5) * 16, r() * 4, -9 + r() * 12], i * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.022, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(points);
  return points;
}

// ---- Hologram stand-in figure --------------------------------------------

// The hologram's look, plus two live effects driven from uniforms:
//   uGlitch  — occasional glitch: slices jolt sideways, bands drop out, colour flickers
//   uBody    — training body map (x: Achilles/lower calf watch, y: legs load, z: core) glowing
//              on those areas in figure space (feet at y = 0, metres; uFigureInv maps world → figure)
function hologramMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color() }, uTime: { value: 0 },
      uGlitch: { value: 0 }, uGlitchSeed: { value: 0 },
      uBody: { value: new THREE.Vector3() }, uFigureInv: { value: new THREE.Matrix4() },
    },
    vertexShader: /* glsl */ `
      uniform float uGlitch; uniform float uGlitchSeed; uniform mat4 uFigureInv;
      varying vec3 vN; varying vec3 vView; varying float vY; varying vec3 vFig;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        // Glitch: some horizontal slices jolt sideways.
        float band = floor(wp.y * 14.0);
        float h = hash(band + uGlitchSeed * 17.0);
        wp.x += step(0.62, h) * (h - 0.8) * 0.35 * uGlitch;
        vY = wp.y;
        vFig = (uFigureInv * wp).xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uTime;
      uniform float uGlitch; uniform float uGlitchSeed; uniform vec3 uBody;
      varying vec3 vN; varying vec3 vView; varying float vY; varying vec3 vFig;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      // Soft mask around a point in figure space, mirrored across the body's midline (legs).
      float region(vec3 c, float r) {
        vec3 p = vec3(abs(vFig.x), vFig.y, vFig.z);
        return 1.0 - smoothstep(r * 0.45, r, distance(p, c));
      }
      void main() {
        // Clamp before pow(): rounding can push |dot| a hair over 1, and pow(negative) is NaN —
        // which bloom smears into flashing black blotches.
        float rim = pow(clamp(1.0 - abs(dot(normalize(vN), normalize(vView))), 0.0, 1.0), 2.2);
        float lines = 0.55 + 0.45 * step(0.5, fract(vY * 42.0 - uTime * 1.4));
        float sweepY = mod(uTime * 0.45, 2.4) - 0.2;
        float sweep = 1.0 - smoothstep(0.0, 0.07, abs(vY - sweepY)); // edge0 > edge1 is undefined in GLSL

        vec3 col = uColor;

        // Body map. Legs: thighs + shins brighten with recent mileage. Core: gold after strength.
        // Achilles / lower calf: slow amber pulse while on watch.
        float legs = region(vec3(0.1, 0.5, 0.0), 0.34) * uBody.y;
        float core = region(vec3(0.0, 1.12, 0.0), 0.24) * uBody.z;
        float achilles = region(vec3(0.1, 0.24, -0.02), 0.16) * uBody.x;
        col = mix(col, uColor * 1.9 + 0.08, legs * 0.65);      // legs: brighter in the hologram's colour
        col = mix(col, vec3(2.2, 1.25, 0.12), core * 0.85);     // core: saturated gold
        float amberPulse = 0.65 + 0.35 * sin(uTime * 3.2);
        col = mix(col, vec3(2.6, 0.95, 0.08), clamp(achilles * 1.5, 0.0, 1.0)); // achilles: amber

        float a = (0.16 + rim * 0.84) * lines + sweep * 0.5;
        a += achilles * 0.55 * amberPulse + legs * 0.12 + core * 0.15;

        // Glitch: whole bands drop out and the colour skews for a moment.
        float drop = step(0.78, hash(floor(vY * 30.0) + uGlitchSeed * 31.0)) * uGlitch;
        col = mix(col, col.bgr * 1.3, 0.5 * uGlitch * step(0.5, hash(floor(vY * 9.0) + uGlitchSeed)));
        a *= 1.0 - drop;

        gl_FragColor = vec4(col * (0.6 + rim * 2.0 + sweep * 2.0), clamp(a, 0.0, 1.0));
      }`,
    // Normal (not additive) blending, so the figure still reads against a bright sunset sky.
    transparent: true, depthWrite: false,
  });
}

// A simple standing runner built from capsules, feet at y = 0, ~1.8 m tall — in a cowboy hat.
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
  const hat = buildCowboyHat({ brimR: 0.21, crownR: 0.092, crownH: 0.13, felt: material, band: material });
  hat.position.set(0, 1.735, 0);
  hat.rotation.x = -0.08; // tipped back a touch
  g.add(hat);
  return g;
}

// ---- Public API -----------------------------------------------------------

// Opening shot: the camera starts high over the desert, looking out at the mesas, and sweeps
// down to the rock.
const INTRO = { seconds: 4.6, from: new THREE.Vector3(-4, 7.5, 34), lookFrom: new THREE.Vector3(0, 4, -40) };
const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

export function createArena(canvas, { onModel, mode = "day", mix: startMix = null, intro = false } = {}) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.NeutralToneMapping; // keeps the sunset hues (ACES greys them)

  const scene = new THREE.Scene();
  scene.background = new THREE.Color();
  scene.fog = new THREE.Fog(0x000000, 22, 170);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.25;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
  scene.add(hemi);
  // Key from behind-right (toward the sun / moon side) rims everything; fill from the front.
  const key = new THREE.DirectionalLight(0xffffff, 1);
  key.position.set(5, 4, -6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 1);
  fill.position.set(-3, 4, 6);
  scene.add(fill);

  const sky = buildSky(scene);
  buildGround(scene);
  buildLandscape(scene);
  buildProps(scene);
  buildPedestal(scene);
  buildLasso(scene);
  const fire = buildCampfire(scene);
  const dust = buildDust(scene);
  const tumbleweeds = createTumbleweeds(scene, standard("straw", { roughness: 1 }), { reduceMotion, intro });

  const turntable = new THREE.Group();
  turntable.position.y = PEDESTAL_TOP;
  scene.add(turntable);
  const holoMat = hologramMaterial();
  let glitchTimer = 3, glitchLeft = 0;
  const bodyTarget = new THREE.Vector3(); // achilles, legs, core (0–1), eased into the shader
  if (import.meta.env?.DEV) {
    // Dev-only handle for screenshots/tests: force a glitch or a body map.
    window.__holo = {
      glitch: (secs = 0.3) => { glitchLeft = secs; },
      body: (b) => bodyTarget.set(b.achilles ?? 0, b.legs ?? 0, b.core ?? 0),
      state: () => ({ target: bodyTarget.toArray(), uniform: holoMat.uniforms.uBody.value.toArray() }),
    };
  }
  let figure = buildHologram(holoMat);
  turntable.add(figure);

  const scanRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.004, 6, 96),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  scanRing.rotation.x = Math.PI / 2;
  scene.add(scanRing);

  // ---- time of day: every toned material and light blends day (0) ↔ night (1)
  let mix = startMix ?? modeMix(mode), mixTarget = mix;
  const tmp = new THREE.Color();
  const blend = (k) => tmp.copy(THEME.day[k]).lerp(THEME.night[k], mix);
  const num = (k) => THREE.MathUtils.lerp(THEME.day[k], THEME.night[k], mix);
  const sunAt = new THREE.Vector3(), moonAt = new THREE.Vector3(), glowDir = new THREE.Vector3();
  function applyMode() {
    scene.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) if (m.userData.tone) m.color.copy(blend(m.userData.tone));
    });
    const u = sky.material.uniforms;
    u.uZenith.value.copy(blend("zenith"));
    u.uMid.value.copy(blend("skyMid"));
    u.uHorizon.value.copy(blend("horizon"));
    u.uGlow.value.copy(blend("glow"));
    scene.background.copy(blend("horizon"));
    scene.fog.color.copy(blend("horizon"));
    hemi.color.copy(blend("hemiSky"));
    hemi.groundColor.copy(blend("hemiGround"));
    hemi.intensity = num("hemiI");
    key.color.copy(blend("key"));
    key.intensity = num("keyI");
    fill.color.copy(blend("fill"));
    fill.intensity = num("fillI");
    renderer.toneMappingExposure = num("exposure");
    sky.starMat.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(mix, 0.4, 1);
    dust.material.color.copy(blend("dust"));
    holoMat.uniforms.uColor.value.copy(blend("holo")).multiplyScalar(1.15);
    scanRing.material.color.copy(blend("holo")).multiplyScalar(2.5);
    // The sun sinks behind the hills as the moon rises, and the sky's glow follows whichever is up.
    sunAt.copy(SUN_DIR).multiplyScalar(SKY_R).add(new THREE.Vector3(0, 1.4 - mix * 14, 6.4));
    moonAt.copy(MOON_DIR).multiplyScalar(SKY_R).add(new THREE.Vector3(0, 1.4 - (1 - mix) * 16, 6.4));
    sky.sun.position.copy(sunAt);
    sky.moon.position.copy(moonAt);
    sky.sun.material.opacity = 1 - mix * 0.5;
    sky.moon.material.opacity = 0.3 + mix * 0.7;
    glowDir.copy(SUN_DIR).lerp(MOON_DIR, mix).normalize();
    u.uSunDir.value.copy(glowDir);
  }
  applyMode();
  // Day (0) ↔ night (1), or anything between for dusk when following the real sun.
  function setMix(v) {
    mixTarget = Math.max(0, Math.min(1, v));
  }
  function setMode(m) {
    mixTarget = modeMix(m);
  }

  const cat = createCat(scene, { reduceMotion });

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.set(0, 1.4, 6.4);
  camera.lookAt(LOOK_AT);
  let introT = intro && !reduceMotion ? 0 : null;
  const look = new THREE.Vector3(), home = new THREE.Vector3();

  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.6, 1.0);
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
  const dustPos = dust.geometry.attributes.position;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    // Clamp both ways: the first frame's timestamp can predate the scene setup (a negative step
    // that sent eased values backwards), and long stalls shouldn't jump the animation.
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    t += dt;

    if (!dragging) {
      spinVel += (baseSpin - spinVel) * Math.min(1, dt * 1.5);
      turntable.rotation.y += spinVel * dt;
    }
    holoMat.uniforms.uTime.value = t;
    sky.starMat.uniforms.uTime.value = t;

    // Glitch every few seconds, for a fraction of a second.
    glitchTimer -= dt;
    if (glitchTimer <= 0 && !reduceMotion) {
      glitchLeft = 0.12 + Math.random() * 0.25;
      glitchTimer = 5 + Math.random() * 8;
    }
    if (glitchLeft > 0) {
      glitchLeft -= dt;
      holoMat.uniforms.uGlitch.value = Math.random() < 0.7 ? 1 : 0.3; // stutter
      holoMat.uniforms.uGlitchSeed.value = Math.floor(t * 20); // new slices every 50 ms
    } else {
      holoMat.uniforms.uGlitch.value = 0;
    }

    // Body map lives in figure space, which turns with the turntable.
    holoMat.uniforms.uFigureInv.value.copy(turntable.matrixWorld).invert();
    holoMat.uniforms.uBody.value.lerp(bodyTarget, Math.min(1, dt * 2));
    cat.update(dt, camera);
    if (mix !== mixTarget) {
      mix += (mixTarget - mix) * Math.min(1, dt * 1.6);
      if (Math.abs(mixTarget - mix) < 0.003) mix = mixTarget;
      applyMode();
    }
    fire.update(t, dt, num("fireI"), reduceMotion);
    tumbleweeds.update(dt, t);

    const cycle = (t % 5) / 5;
    scanRing.position.y = PEDESTAL_TOP + 0.05 + cycle * 1.85;
    scanRing.material.opacity = Math.sin(cycle * Math.PI) * 0.7;

    if (!reduceMotion) {
      // Dust rides the breeze left to right, bobbing a little.
      for (let i = 0; i < dustPos.count; i++) {
        let x = dustPos.getX(i) + dt * 0.25;
        if (x > 8) x = -8;
        dustPos.setX(i, x);
        dustPos.setY(i, dustPos.getY(i) + Math.sin(t + i) * dt * 0.05);
      }
      dustPos.needsUpdate = true;
    }

    // Sun and moon always face the camera.
    sky.sun.lookAt(camera.position);
    sky.moon.lookAt(camera.position);

    // Ease the framing toward its target so tab/layout changes glide rather than jump.
    const k = firstFrame ? 1 : Math.min(1, dt * 4);
    firstFrame = false;
    focus.x += (focusTarget.x - focus.x) * k;
    focus.y += (focusTarget.y - focus.y) * k;
    focus.zoom += (focusTarget.zoom - focus.zoom) * k;
    camera.setViewOffset(W, H, -focus.x, -focus.y, W, H);
    camera.zoom = focus.zoom;
    home.set(camera.position.x + (mouse.x * 0.25 - camera.position.x) * Math.min(1, dt * 2), 0, 6.4);
    home.y = camera.position.y + (1.4 - mouse.y * 0.08 - camera.position.y) * Math.min(1, dt * 2);
    if (introT != null) {
      introT += dt;
      const u = easeInOut(Math.min(1, introT / INTRO.seconds));
      home.set(0, 1.4, 6.4);
      camera.position.lerpVectors(INTRO.from, home, u);
      camera.lookAt(look.lerpVectors(INTRO.lookFrom, LOOK_AT, u));
      if (introT >= INTRO.seconds) introT = null;
    } else {
      camera.position.copy(home);
      camera.lookAt(LOOK_AT);
    }
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
    setMix,
    skipIntro: () => { introT = null; },
    // Training body map levels, 0–1 each: { achilles, legs, core }.
    setBodyMap: ({ achilles = 0, legs = 0, core = 0 } = {}) => bodyTarget.set(achilles, legs, core),
    toggleCatDance: () => cat.toggleDance(),
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVisibility);
      cat.dispose();
      tumbleweeds.dispose();
      disposeObject(scene);
      scene.environment?.dispose();
      pmrem.dispose();
      target.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
