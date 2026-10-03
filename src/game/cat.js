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
import { musicClock } from "./audio.js";

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

// Dancing: up on the hind legs (body tilted ~70° nose-up, hind legs counter-rotated to stay
// vertical, head levelled to look ahead). The moves are layered on top in update().
const DANCE_POSE = {
  L_BLeg_Upper: { z: -1.25 }, R_BLeg_Upper: { z: -1.25 }, L_BLeg_Lower: { z: 0.3 }, R_BLeg_Lower: { z: 0.3 },
  Head: { z: -1.0 }, Neck: { z: -0.2 }, tail1: { z: 1.2 },
};
const DANCE_PITCH = 1.25;
const FRONT = Math.PI / 2; // the spot on the circle nearest the camera

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

  let bones = null, rest = null, legLen = 0.15, sitDrop = 0, danceDrop = 0, disposed = false, model = null;
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
    applyPose({ dance: 1 });
    pivot.rotation.z = DANCE_PITCH;
    pivot.updateMatrixWorld(true);
    danceDrop = -new THREE.Box3().setFromObject(model, true).min.y;
    pivot.rotation.z = 0;
    applyPose({});
  });

  // ---- pose -------------------------------------------------------------
  const angles = {}; // bone → { x, z } offsets from rest, rebuilt each frame
  function add(bone, axis, v) {
    const a = (angles[bone] ||= { x: 0, z: 0 });
    a[axis] += v;
  }
  function addPose(pose, w) {
    if (w) for (const [n, a] of Object.entries(pose)) for (const k in a) add(n, k, a[k] * w);
  }
  function applyPose({ sit = 0, dance = 0 } = {}) {
    for (const n of BONES) angles[n] = { x: 0, z: 0 };
    addPose(SIT_POSE, sit);
    addPose(DANCE_POSE, dance);
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
  let gaitPhase = 0, sitW = 0, sitTarget = 0, trotW = 0, danceW = 0, visitsSinceDance = 2;
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

  // Round to the front of the pedestal from angle `fromA`, face the camera, dance, then leave.
  function dancePlan(fromA, gait, dur, hurry = false) {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const toFront = fromA + wrapAngle(FRONT - fromA);
    const away = FRONT + dir * rand(0.9, 1.6);
    const [dx, dz] = OFFSTAGE.reduce((best, p) =>
      Math.abs(wrapAngle(angleOf(...p) - away)) < Math.abs(wrapAngle(angleOf(...best) - away)) ? p : best);
    return [
      { type: "go", path: [onCircle(fromA), ...arcPoints(fromA, toFront)], gait, hurry },
      { type: "face", heading: FRONT, dur: 3 },
      { type: "stand", dur: hurry ? 0.2 : 0.6 },
      { type: "dance", dur },
      { type: "stand", dur: rand(1, 2) },
      { type: "go", path: [...arcPoints(FRONT, away), new THREE.Vector2(dx, dz)], gait: "walk" },
      { type: "away", dur: rand(4, 10) },
    ];
  }

  // The secret toggle: dance now (hurrying over from wherever it is), or stop if dancing.
  function toggleDance() {
    if (reduceMotion || !bones) return;
    if (task?.type === "dance") {
      task.dur = 0; // finish now → stands, then wanders off as usual
      return;
    }
    if (task?.type === "face" || tasks.some((x) => x.type === "dance")) return; // already on its way
    if (!root.visible) {
      // Appear from the nearer front side of the stage.
      const [sx, sz] = pick([[-4.5, 2.4], [4.5, 2.4]]);
      pos.set(sx, sz);
      heading = Math.atan2(-sz, -sx);
      root.visible = true;
    }
    visitsSinceDance = 0;
    tasks = dancePlan(angleOf(pos.x, pos.y), "trot", 20, true);
    task = null; // pick up the new plan on the next frame
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

    // Every so often (and at least every fourth visit): come round to the front, face the
    // camera, stand up on the hind legs and dance.
    if (!reduceMotion && (visitsSinceDance >= 3 || Math.random() < 0.3)) {
      visitsSinceDance = 0;
      return dancePlan(enterA, trot ? "trot" : "walk", rand(7, 9));
    }
    visitsSinceDance++;

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
      // A faster cat can't turn as tightly, so it counts a waypoint as reached from further out
      // (otherwise it can end up circling one forever).
      const reach = Math.max(0.12, vel.speed * 0.3);
      while (task.path.length && pos.distanceTo(task.path[0]) < reach) task.path.shift();
      if (!task.path.length) {
        nextTask();
      } else if (sitW < 0.15) {
        const tgt = task.path[0];
        const desired = Math.atan2(tgt.y - pos.y, tgt.x - pos.x);
        const turn = wrapAngle(desired - heading);
        const maxTurn = (task.hurry ? 4.5 : task.gait === "trot" ? 3 : 2.4) * dt;
        heading += Math.max(-maxTurn, Math.min(maxTurn, turn));
        // Slow down for sharp turns, like a real animal.
        targetSpeed = gait.speed * (task.hurry ? 1.6 : 1) * (1 - Math.min(0.7, Math.abs(turn) / Math.PI));
      }
    } else if (task.type === "face") {
      // Turn on the spot (stepping in place) until facing the target direction.
      const turn = wrapAngle(task.heading - heading);
      const maxTurn = 2.2 * dt;
      heading += Math.max(-maxTurn, Math.min(maxTurn, turn));
      if (Math.abs(turn) < 0.03 || taskTime > task.dur) nextTask();
    } else if (task.type === "stand" || task.type === "sit" || task.type === "away" || task.type === "dance") {
      if (taskTime > task.dur) nextTask();
    }

    vel.speed = smooth(vel.speed, targetSpeed, targetSpeed > vel.speed ? 2.2 : 4, dt);
    pos.x += Math.cos(heading) * vel.speed * dt;
    pos.y += Math.sin(heading) * vel.speed * dt;
    sitW = smooth(sitW, sitTarget, sitTarget ? 2.2 : 3, dt);
    danceW = smooth(danceW, task.type === "dance" ? 1 : 0, 3.5, dt);
    trotW = smooth(trotW, task.gait === "trot" ? 1 : 0, 3, dt);

    root.position.set(pos.x, 0, pos.y);
    root.rotation.y = -heading; // model faces +X; heading is measured in the XZ plane

    // ---- gait
    const speed = vel.speed;
    const amp = THREE.MathUtils.lerp(WALK.amp, TROT.amp, trotW);
    const duty = THREE.MathUtils.lerp(WALK.duty, TROT.duty, trotW);
    // paw travels 2·amp·legLen during stance, which lasts duty/f → f = v·duty / (2·amp·legLen)
    // Turning on the spot still steps the feet.
    const stepSpeed = task.type === "face" ? Math.max(speed, WALK.speed * 0.45) : speed;
    gaitPhase = (gaitPhase + (stepSpeed * duty) / (2 * amp * legLen) * dt) % 1;
    const moveW = Math.min(1, stepSpeed / (WALK.speed * 0.6));

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

    // ---- sit / dance blend
    addPose(SIT_POSE, sitW);
    addPose(DANCE_POSE, danceW);
    // The dance is the Gangnam Style "horse dance", on the music's beat when it's playing
    // (double-time for the slow red track; ~132 BPM otherwise, the song's own tempo).
    let beat = t * 2.2, bounce = 0, sway = 0;
    if (danceW > 0.01) {
      const clock = musicClock();
      if (clock) beat = clock.beat * (clock.bpm < 90 ? 2 : 1);
      const w = danceW;
      const p = beat - Math.floor(beat);            // position within the beat
      const lead = Math.floor(beat) % 2 ? 1 : -1;   // which hind leg comes up this beat (+1 = left)
      const lift = Math.sin(Math.PI * p);           // knee up then down within the beat
      bounce = Math.abs(Math.sin(Math.PI * 2 * p)); // two little hops per beat
      sway = Math.sin(Math.PI * beat);
      const lasso = Math.floor(beat / 8) % 2 === 1; // every other 8 beats, swing the lasso

      // Gallop step: the lifted knee comes up and forward; the standing leg flexes on each hop.
      for (const [side, upper, lower, foot] of [[1, "L_BLeg_Upper", "L_BLeg_Lower", "L_BFoot"], [-1, "R_BLeg_Upper", "R_BLeg_Lower", "R_BFoot"]]) {
        const up = side === lead ? lift : 0;
        add(upper, "z", 0.75 * up * w);
        add(lower, "z", (0.9 * up + 0.2 * bounce) * w);
        add(foot, "z", -0.4 * up * w);
      }
      // Reins: paws held together out front, bouncing with the hops.
      const rein = 0.07 * Math.sin(Math.PI * 2 * p);
      add("L_Leg_Upper", "z", (0.55 + rein) * w);
      add("L_Leg_Upper", "x", -0.25 * w);
      add("L_Leg_Lower", "z", -0.5 * w);
      if (!lasso) {
        add("R_Leg_Upper", "z", (0.55 + rein) * w);
        add("R_Leg_Upper", "x", 0.25 * w);
        add("R_Leg_Lower", "z", -0.5 * w);
      } else {
        // Lasso: right paw raised overhead, circling once per beat.
        const c = Math.PI * 2 * beat;
        add("R_Leg_Upper", "z", (2.3 + 0.3 * Math.cos(c)) * w);
        add("R_Leg_Upper", "x", (-0.45 + 0.4 * Math.sin(c)) * w);
        add("R_Leg_Lower", "z", -0.15 * w);
      }
      // Head: leaned back a touch, nodding on the hops.
      add("Head", "z", (0.12 + 0.08 * Math.sin(Math.PI * 2 * p)) * w);
      add("Head", "x", 0.1 * sway * w);
      ["tail2", "tail3", "tail4"].forEach((n, i) => add(n, "x", 0.4 * Math.sin(Math.PI * beat - i * 0.7) * w));
    }
    pivot.rotation.z = SIT_PITCH * sitW + DANCE_PITCH * danceW;
    pivot.rotation.x = 0.07 * sway * danceW; // slight side-to-side rock
    pivot.position.y = sitDrop * sitW + danceDrop * danceW + 0.02 * bounce * danceW + bob;

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
    if (danceW > 0.5) lookYaw = lookPitch = 0; // eyes front while dancing
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
        return { loaded: !!bones, visible: root.visible, task: task?.type, left: task?.path?.length, x: +pos.x.toFixed(2), z: +pos.y.toFixed(2), speed: +vel.speed.toFixed(2), sit: +sitW.toFixed(2), t: +t.toFixed(3) };
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
    toggleDance,
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
