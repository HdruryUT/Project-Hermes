// A cattleman cowboy hat, shared by the hologram stand-in and the cat: a crown with a crease
// down the middle and pinched at the front, a hat band, and a brim that curls up at the sides.
// Front is +Z, the brim sits at y = 0 and the crown rises along +Y.
import * as THREE from "three";

export function buildCowboyHat({ brimR, crownR, crownH, felt, band }) {
  const g = new THREE.Group();

  // Brim: a thin lathed ring, then curled up at the sides (±X) and dipped front and back.
  const brimProfile = [
    new THREE.Vector2(crownR * 0.9, brimR * 0.012),
    new THREE.Vector2(brimR * 0.98, brimR * 0.01),
    new THREE.Vector2(brimR, 0),
    new THREE.Vector2(brimR * 0.98, -brimR * 0.012),
    new THREE.Vector2(crownR * 0.9, -brimR * 0.016),
  ];
  const brim = new THREE.LatheGeometry(brimProfile, 48);
  const bp = brim.attributes.position;
  for (let i = 0; i < bp.count; i++) {
    const x = bp.getX(i), z = bp.getZ(i);
    const side = Math.pow(Math.abs(x) / brimR, 2.6);
    const ends = Math.pow(Math.abs(z) / brimR, 2);
    bp.setY(i, bp.getY(i) + brimR * (0.32 * side - 0.05 * ends));
  }
  brim.computeVertexNormals();
  g.add(new THREE.Mesh(brim, felt));

  // Crown: a lathed dome, then the cattleman crease and the front pinch pressed in.
  const crownProfile = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    const y = crownH * (u < 0.8 ? u : 0.8 + 0.2 * Math.sin(((u - 0.8) / 0.2) * Math.PI / 2));
    const r = crownR * (u < 0.8 ? 1 - u * 0.08 : 0.92 * Math.cos(((u - 0.8) / 0.2) * Math.PI / 2) ** 0.6);
    crownProfile.push(new THREE.Vector2(Math.max(r, 1e-4), y));
  }
  const crown = new THREE.LatheGeometry(crownProfile, 40);
  const cp = crown.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i);
    const top = Math.max(0, (y / crownH - 0.55) / 0.45); // 0 below the upper crown, 1 at the top
    const crease = Math.exp(-((x / (crownR * 0.32)) ** 2)) * top * crownH * 0.28;
    const pinch = z > 0 ? 1 - 0.28 * (z / crownR) * top : 1;
    cp.setXYZ(i, x * pinch, y - crease, z);
  }
  crown.computeVertexNormals();
  g.add(new THREE.Mesh(crown, felt));

  const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(crownR * 1.015, crownR * 1.025, crownH * 0.2, 40, 1, true), band);
  hatBand.position.y = crownH * 0.12;
  g.add(hatBand);
  return g;
}
