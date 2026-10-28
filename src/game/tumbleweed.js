// Tumbleweeds blowing across the desert on the breeze (left → right, with the dust): tangled
// balls of dry twigs that roll, bounce, and now and then catch a gust and hop. Each one crosses
// at its own depth, then a while later another blows in from off-screen.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const COUNT = 3;
const X_FROM = -11, X_TO = 11; // off-screen on either side of the stage
// Depths to cross at: behind the rock (most of the time), or now and then right in front of it.
const LANES = [-3.2, -4.8, -6.5, -8.5, -11, 3.1];

const rand = (a, b) => a + Math.random() * (b - a);
const ACROSS_WIND = new THREE.Vector3(0, 0, -1); // rolling left → right turns about −Z

// One shared twig ball, ~1 m across: a few dozen thin, wandering branches looping around a
// sphere and back through the middle.
function twigBall() {
  const parts = [];
  const R = 0.5;
  const onBall = (r) => new THREE.Vector3().randomDirection().multiplyScalar(r);
  for (let i = 0; i < 46; i++) {
    const pts = [onBall(R * rand(0.75, 1))];
    for (let k = 0; k < 4; k++) {
      const next = pts[pts.length - 1].clone().add(onBall(R * 0.55));
      next.setLength(Math.min(R, Math.max(R * 0.35, next.length()))); // stay inside the ball
      pts.push(next);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    parts.push(new THREE.TubeGeometry(curve, 10, i < 8 ? 0.012 : 0.007, 3, false));
  }
  const geo = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return geo;
}

export function createTumbleweeds(scene, material, { reduceMotion = false, intro = false } = {}) {
  const geo = twigBall();
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false });
  const shadowGeo = new THREE.CircleGeometry(0.42, 24);
  const weeds = [];

  for (let i = 0; i < COUNT; i++) {
    const mesh = new THREE.Mesh(geo, material);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    mesh.visible = shadow.visible = false;
    scene.add(mesh, shadow);
    // In the opening shot the first one blows across in front of the rock as the camera comes in.
    const w = { mesh, shadow, active: false, wait: intro && i === 0 ? 0.6 : 1.5 + i * 5 + rand(0, 3), lane: intro && i === 0 ? 3.1 : null };
    weeds.push(w);
  }

  function launch(w) {
    const forced = w.lane;
    const used = weeds.filter((o) => o.active).map((o) => o.lane);
    const free = LANES.filter((z) => !used.includes(z));
    const behind = free.filter((z) => z < 0);
    // The lane in front of the rock comes up rarely, so it stays a surprise.
    w.lane = forced ?? (free.includes(3.1) && Math.random() < 0.15 ? 3.1 : behind[Math.floor(Math.random() * behind.length)]);
    w.size = rand(0.55, 0.95);
    w.mesh.scale.setScalar(w.size);
    w.x = X_FROM - rand(0, 2);
    w.z = w.lane + rand(-0.4, 0.4);
    w.speed = rand(1.4, 2.4);
    w.y = 0;
    w.vy = 0;
    w.spin = new THREE.Vector3(rand(-0.4, 0.4), rand(-0.4, 0.4), 0);
    w.mesh.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
    w.active = true;
  }

  function update(dt, t) {
    if (reduceMotion) return;
    for (const w of weeds) {
      if (!w.active) {
        w.mesh.visible = w.shadow.visible = false;
        w.wait -= dt;
        if (w.wait <= 0) launch(w);
        continue;
      }
      const r = 0.5 * w.size;
      // Gusts: the speed breathes, and every so often a gust lifts it off the ground.
      const gust = 1 + 0.35 * Math.sin(t * 0.9 + w.lane) + 0.15 * Math.sin(t * 2.3 + w.lane * 3);
      const v = w.speed * gust;
      w.x += v * dt;
      w.vy -= 9.8 * dt;
      w.y += w.vy * dt;
      if (w.y <= 0) {
        w.y = 0;
        // bounce: lively on landing, plus a random hop now and then
        w.vy = Math.abs(w.vy) > 0.6 ? Math.abs(w.vy) * 0.45 : Math.random() < dt * 0.9 ? rand(1.6, 3.2) : rand(0.25, 0.7);
      }
      w.mesh.position.set(w.x, r + w.y, w.z);
      // Roll: turn by distance ÷ radius about the axis across the wind, wobbling a little.
      w.mesh.rotateOnWorldAxis(ACROSS_WIND, (v * dt) / r);
      w.mesh.rotation.x += w.spin.x * dt;
      w.mesh.rotation.y += w.spin.y * dt;
      w.shadow.position.set(w.x, 0.006, w.z);
      const lift = Math.min(1, w.y / 1.5);
      w.shadow.scale.setScalar(w.size * (1 - lift * 0.4));
      w.shadow.material.opacity = 0.35 * (1 - lift * 0.6);
      w.mesh.visible = w.shadow.visible = true;
      if (w.x > X_TO + 2) {
        w.active = false;
        w.lane = null;
        w.wait = rand(4, 12);
      }
    }
  }

  return {
    update,
    dispose() {
      geo.dispose();
      material.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      for (const w of weeds) scene.remove(w.mesh, w.shadow);
    },
  };
}
