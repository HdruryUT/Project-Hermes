// A black cat that roams the arena: wanders in from off-screen, circles the pedestal, stops to
// look around or sit, then pads off into the dark and comes back a while later.
//
// The model (public/models/cat.glb — "Cat" by J-Toastie, CC-BY 3.0, via Poly Pizza) only ships
// an idle clip, so all movement is procedural on its skeleton:
//   - walk: lateral-sequence gait (LH → LF → RH → RF), the way cats walk
//   - trot: diagonal pairs
//   - stride frequency is derived from speed and leg length, so paws don't skate
//   - head looks around / at the camera, tail sways with a lag down its length, sitting folds
//     the hind legs and tilts the body up.
//
// Bone axes (measured on this rig): local Z swings a leg forward (+) / back (−), and bends the
// lower leg; Head/Neck X turns the head sideways, Z tilts it up; tail X curls sideways, Z up/down.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const URL = "/models/cat.glb";
const HEIGHT = 0.36;       // standing height to ear tips, metres (the figure is 1.8 m)
const ORBIT_R = 1.95;      // walking circle around the pedestal (its dashed ring is at 1.68)
const WALK = { speed: 0.42, duty: 0.64, amp: 0.38, phases: { LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 } };
const TROT = { speed: 0.95, duty: 0.5, amp: 0.5, phases: { LF: 0, RH: 0, RF: 0.5, LH: 0.5 } };
// Places to vanish to / appear from: just past the sides of the stage (behind the menu and
// panel on desktop, off-screen on phones), or back into the dark between the columns.
const OFFSTAGE = [
  [-4.5, 2.4], [4.5, 2.4], [-4.8, 0.4], [4.8, 0.4], [-2.9, -5.5], [2.9, -5.5], [-1.2, -7], [1.2, -7],
];

const LEGS = [
  { key: "LF", upper: "L_Leg_Upper", lower: "L_Leg_Lower", foot: "L_Foot", front: true },
  { key: "RF", upper: "R_Leg_Upper", lower: "R_Leg_Lower", foot: "R_Foot", front: true },
  { key: "LH", upper: "L_BLeg_Upper", lower: "L_BLeg_Lower", foot: "L_BFoot", front: false },
  { key: "RH", upper: "R_BLeg_Upper", lower: "R_BLeg_Lower", foot: "R_BFoot", front: false },
];
const BONES = [...LEGS.flatMap((l) => [l.upper, l.lower, l.foot]), "Neck", "Head", "tail1", "tail2", "tail3", "tail4"];

// Sitting: hind legs folded under, front legs straight, head level, tail down and curled.
const SIT_POSE = {
  L_BLeg_Upper: { z: -1.0 }, R_BLeg_Upper: { z: -1.0 }, L_BLeg_Lower: { z: 2.0 }, R_BLeg_Lower: { z: 2.0 },
  L_BFoot: { z: -1.0 }, R_BFoot: { z: -1.0 }, L_Leg_Upper: { z: -0.65 }, R_Leg_Upper: { z: -0.65 },
  Head: { z: -0.5 }, Neck: { z: -0.15 }, tail1: { z: 1.3 }, tail2: { z: 0.4 }, tail3: { x: 0.6 }, tail4: { x: 0.6 },
};
const SIT_PITCH = 0.5;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const smooth = (cur, target, rate, dt) => cur + (target - cur) * Math.min(1, rate * dt);
const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Leg swing for gait phase p ∈ [0,1): stance sweeps the paw back along the ground, swing
// brings it forward on an eased arc with the joint lift peaking mid-swing.
function legCycle(p, duty, amp) {
  if (p < duty) return { swing: amp * (1 - (2 * p) / duty), lift: 0 };
  const u = (p - duty) / (1 - duty);
  return { swing: -amp + 2 * amp * (0.5 - 0.5 * Math.cos(Math.PI * u)), lift: Math.sin(Math.PI * u) };
}

export function createCat(scene, { reduceMotion = false } = {}) {
  const root = new THREE.Group();   // position + heading on the floor
  const pivot = new THREE.Group();  // sit tilt
  root.add(pivot);
  root.visible = false;
  scene.add(root);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.2, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.5, 0.7, 1);
  shadow.position.y = 0.003;
  root.add(shadow);

  let bones = null, rest = null, legLen = 0.15, sitDrop = 0, disposed = false, model = null;
  const q = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);

  new GLTFLoader().load(URL, (gltf) => {
    if (disposed) return;
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    model.scale.setScalar(HEIGHT / box.getSize(new THREE.Vector3()).y);
    box.setFromObject(model);
    model.position.y -= box.min.y;
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false; // skinned bounds don't follow the procedural pose
      const m = o.material;
      m.map = null; // the albedo has lighter patches — a black cat is one solid colour
      m.color.setRGB(0.035, 0.035, 0.04);
      m.needsUpdate = true;
      m.roughness = 0.42;
      m.metalness = 0.0;
      m.envMapIntensity = 0.9; // a little sheen so the black reads against the dark floor
    });
    pivot.add(model);
    bones = {};
    rest = {};
    for (const n of BONES) {
      bones[n] = model.getObjectByName(n);
      rest[n] = bones[n].quaternion.clone();
    }
    model.updateMatrixWorld(true);
    const a = bones.L_Leg_Upper.getWorldPosition(new THREE.Vector3());
    const b = model.getObjectByName("L_Foot_end").getWorldPosition(new THREE.Vector3());
    legLen = a.distanceTo(b);

    // Glowing eyes, placed relative to the head bone.
    const head = bones.Head;
    const hp = head.getWorldPosition(new THREE.Vector3());
    const eyeGeo = new THREE.SphereGeometry(0.0062, 10, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xd8ff5a).multiplyScalar(1.8), toneMapped: false });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      // measured on the rig: eyes sit ~4 cm ahead of and ~6 cm above the head bone, just behind the nose
      const wp = hp.clone().add(new THREE.Vector3(HEIGHT * 0.117, HEIGHT * 0.161, side * HEIGHT * 0.053));
      head.add(eye);
      eye.position.copy(head.worldToLocal(wp));
      eye.scale.setScalar(1 / head.getWorldScale(new THREE.Vector3()).x); // keep the eye's size in metres
    }

    // How far the sit pose drops the body, so the seated cat rests on the floor.
    applyPose({ sit: 1 });
    pivot.rotation.z = SIT_PITCH;
    pivot.updateMatrixWorld(true);
    sitDrop = -new THREE.Box3().setFromObject(model, true).min.y;
    pivot.rotation.z = 0;
    applyPose({});
  });

  // ---- pose -------------------------------------------------------------
  const angles = {}; // bone → { x, z } offsets from rest, rebuilt each frame
  function add(bone, axis, v) {
    const a = (angles[bone] ||= { x: 0, z: 0 });
    a[axis] += v;
  }
  function applyPose({ sit = 0 } = {}) {
    for (const n of BONES) angles[n] = { x: 0, z: 0 };
    if (sit) for (const [n, a] of Object.entries(SIT_POSE)) for (const k in a) add(n, k, a[k] * sit);
    commit();
  }
  function commit() {
    for (const n of BONES) {
      const a = angles[n];
      bones[n].quaternion.copy(rest[n]);
      if (a.z) bones[n].quaternion.multiply(q.setFromAxisAngle(Z, a.z));
      if (a.x) bones[n].quaternion.multiply(q.setFromAxisAngle(X, a.x));
    }
  }

  // ---- behaviour --------------------------------------------------------
  const pos = new THREE.Vector2(), vel = { speed: 0 };
  let heading = 0;
  let tasks = [];
  let task = null, taskTime = 0;
  let gaitPhase = 0, sitW = 0, sitTarget = 0, trotW = 0;
  let headYaw = 0, headPitch = 0, lookTimer = 0, lookYaw = 0, lookPitch = 0;
  let flick = 0, flickTimer = rand(2, 5), t = 0;

  const angleOf = (x, z) => Math.atan2(z, x);
  const onCircle = (a) => new THREE.Vector2(Math.cos(a) * ORBIT_R, Math.sin(a) * ORBIT_R);

  // A path that walks around the pedestal on the circle rather than through it.
  function arcPoints(a0, a1) {
    const pts = [], steps = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.25));
    for (let i = 0; i <= steps; i++) pts.push(onCircle(a0 + ((a1 - a0) * i) / steps));
    return pts;
  }

  function planVisit() {
    const [sx, sz] = pick(OFFSTAGE);
    const enterA = angleOf(sx, sz), dir = Math.random() < 0.5 ? 1 : -1;
    const midA = enterA + dir * rand(1.6, 3.2);
    const exitA = midA + dir * rand(0.8, 2.2);
    // Leave toward whichever exit lies closest to where the circling ends, so the straight
    // walk out heads away from the pedestal instead of across it.
    const [ex, ez] = OFFSTAGE.reduce((best, p) =>
      Math.abs(wrapAngle(angleOf(...p) - exitA)) < Math.abs(wrapAngle(angleOf(...best) - exitA)) ? p : best);
    const trot = Math.random() < 0.25;
    pos.set(sx, sz);
    heading = Math.atan2(-sz, -sx);
    root.visible = true;
    const plan = [
      { type: "go", path: [onCircle(enterA), ...arcPoints(enterA, midA)], gait: trot ? "trot" : "walk" },
      { type: "stand", dur: rand(1.8, 3.5) },
    ];
    if (Math.random() < 0.65) plan.push({ type: "sit", dur: rand(5, 10) }, { type: "stand", dur: rand(0.6, 1.4) });
    plan.push(
      { type: "go", path: [...arcPoints(midA, exitA), new THREE.Vector2(ex, ez)], gait: Math.random() < 0.3 ? "trot" : "walk" },
      { type: "away", dur: rand(4, 10) }
    );
    return plan;
  }

  if (reduceMotion) {
    // No wandering: just a cat sitting beside the pedestal.
    pos.copy(onCircle(Math.PI * 0.35));
    heading = Math.atan2(-pos.y, -pos.x) + 0.6;
    root.visible = true;
    tasks = [{ type: "sit", dur: Infinity }];
  } else {
    tasks = [{ type: "away", dur: 2.5 }];
  }

  function nextTask() {
    if (!tasks.length) tasks = planVisit();
    task = tasks.shift();
    taskTime = 0;
    if (task.type === "away") root.visible = false;
  }

  let lastCamera = null;
  function update(dt, camera) {
    lastCamera = camera;
    if (!bones) return;
    t += dt;
    if (!task) nextTask();
    taskTime += dt;

    let targetSpeed = 0;
    sitTarget = task.type === "sit" ? 1 : 0;

    if (task.type === "go") {
      // Wait to stand up fully before walking off.
      const gait = task.gait === "trot" ? TROT : WALK;
      while (task.path.length && pos.distanceTo(task.path[0]) < 0.12) task.path.shift();
      if (!task.path.length) {
        nextTask();
      } else if (sitW < 0.15) {
        const tgt = task.path[0];
        const desired = Math.atan2(tgt.y - pos.y, tgt.x - pos.x);
        const turn = wrapAngle(desired - heading);
        const maxTurn = (task.gait === "trot" ? 3 : 2.4) * dt;
        heading += Math.max(-maxTurn, Math.min(maxTurn, turn));
        // Slow down for sharp turns, like a real animal.
        targetSpeed = gait.speed * (1 - Math.min(0.7, Math.abs(turn) / Math.PI));
      }
    } else if (task.type === "stand" || task.type === "sit" || task.type === "away") {
      if (taskTime > task.dur) nextTask();
    }

    vel.speed = smooth(vel.speed, targetSpeed, targetSpeed > vel.speed ? 2.2 : 4, dt);
    pos.x += Math.cos(heading) * vel.speed * dt;
    pos.y += Math.sin(heading) * vel.speed * dt;
    sitW = smooth(sitW, sitTarget, sitTarget ? 2.2 : 3, dt);
    trotW = smooth(trotW, task.gait === "trot" ? 1 : 0, 3, dt);

    root.position.set(pos.x, 0, pos.y);
    root.rotation.y = -heading; // model faces +X; heading is measured in the XZ plane

    // ---- gait
    const speed = vel.speed;
    const amp = THREE.MathUtils.lerp(WALK.amp, TROT.amp, trotW);
    const duty = THREE.MathUtils.lerp(WALK.duty, TROT.duty, trotW);
    // paw travels 2·amp·legLen during stance, which lasts duty/f → f = v·duty / (2·amp·legLen)
    gaitPhase = (gaitPhase + (speed * duty) / (2 * amp * legLen) * dt) % 1;
    const moveW = Math.min(1, speed / (WALK.speed * 0.6));

    for (const n of BONES) angles[n] = { x: 0, z: 0 };
    for (const leg of LEGS) {
      const ph = THREE.MathUtils.lerp(WALK.phases[leg.key], TROT.phases[leg.key], trotW);
      const { swing, lift } = legCycle((gaitPhase + ph) % 1, duty, amp);
      add(leg.upper, "z", swing * moveW);
      if (leg.front) {
        add(leg.lower, "z", -lift * 0.95 * moveW);
        add(leg.foot, "z", lift * 0.55 * moveW);
      } else {
        add(leg.lower, "z", lift * 0.7 * moveW);
        add(leg.foot, "z", -lift * 0.6 * moveW);
      }
    }
    // body bob: lowest twice per stride
    const bob = -Math.abs(Math.sin(gaitPhase * Math.PI * 2)) * 0.006 * moveW;

    // ---- sit blend
    for (const [n, a] of Object.entries(SIT_POSE)) for (const k in a) add(n, k, a[k] * sitW);
    pivot.rotation.z = SIT_PITCH * sitW;
    pivot.position.y = sitDrop * sitW + bob;

    // ---- head: glance around, often at the camera; steadier while walking
    lookTimer -= dt;
    if (lookTimer <= 0) {
      lookTimer = rand(1.2, 3.2);
      const toCam = new THREE.Vector3().subVectors(camera.position, root.position);
      const camYaw = wrapAngle(Math.atan2(toCam.z, toCam.x) - heading); // relative to facing
      const atCamera = Math.random() < (speed > 0.05 ? 0.25 : 0.55);
      lookYaw = atCamera ? -camYaw : rand(-0.8, 0.8);
      lookPitch = atCamera ? 0.12 : rand(-0.15, 0.25);
      if (speed > 0.05) lookYaw *= 0.4;
    }
    headYaw = smooth(headYaw, THREE.MathUtils.clamp(lookYaw, -1.0, 1.0), 4, dt);
    headPitch = smooth(headPitch, lookPitch, 3, dt);
    add("Neck", "x", headYaw * 0.4);
    add("Head", "x", headYaw * 0.6);
    add("Head", "z", headPitch - bob * 4); // head stays level while the body bobs

    // ---- tail: carried up and swaying while moving, lazy swish when still, tip flicks
    flickTimer -= dt;
    if (flickTimer <= 0) { flick = 1; flickTimer = rand(2.5, 7); }
    flick = Math.max(0, flick - dt * 2.5);
    const tip = Math.sin(t * 14) * flick * 0.5;
    ["tail1", "tail2", "tail3", "tail4"].forEach((n, i) => {
      add(n, "x", Math.sin(t * (1.2 + speed * 3) - i * 0.6) * (0.12 + 0.1 * moveW) * (1 - sitW * 0.7) + (i >= 2 ? tip : 0));
    });
    add("tail1", "z", -0.15 * moveW);

    commit();
  }

  // Dev-only handle for inspecting the cat from the console / tests.
  if (import.meta.env?.DEV) {
    window.__cat = {
      get state() {
        return { loaded: !!bones, visible: root.visible, task: task?.type, left: task?.path?.length, x: +pos.x.toFixed(2), z: +pos.y.toFixed(2), speed: +vel.speed.toFixed(2), sit: +sitW.toFixed(2) };
      },
      root,
      // Fast-forward the simulation, e.g. until a condition on state holds.
      advance(seconds, until) {
        for (let s = 0; s < seconds; s += 1 / 30) {
          update(1 / 30, lastCamera);
          if (until && until(this.state)) break;
        }
        return this.state;
      },
      // Put the cat somewhere doing something: place({ x, z, heading, task: "sit" | "stand" }).
      place({ x, z, heading: h, task: type = "stand" }) {
        pos.set(x, z);
        heading = h;
        root.visible = true;
        tasks = [];
        task = { type, dur: Infinity };
        taskTime = 0;
      },
      // The cat's on-screen position in CSS px (for close-up screenshots).
      screen() {
        const v = root.position.clone().setY(0.15).project(lastCamera);
        return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
      },
    };
  }

  return {
    update,
    dispose() {
      disposed = true;
      scene.remove(root);
      root.traverse((o) => {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        for (const m of mats) { m.map?.dispose(); m.dispose(); }
      });
    },
  };
}
