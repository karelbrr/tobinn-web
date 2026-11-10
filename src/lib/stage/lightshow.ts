import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Beat } from "../motion/beat";
import { createBeamCone, type BeamCone } from "./atmosphere";
import type { SharedUniforms } from "./effects";
import { dotTexture, type Materials } from "./materials";
import { PASTELS } from "./palette";
import { part } from "./shapes";

const UP = new Vector3(0, 1, 0);
const TRUSS_Y = 4.6;
const TRUSS_Z = -2.0;
const TRUSS_HALF = 4.8;
const TRUSS_SIZE = 0.3;
const HEAD_SPREAD = 0.42;
const PHRASE_BEATS = 32;

// One merged geometry for every tube of the truss: a single draw call
function trussGeometry(): BufferGeometry {
  const tubes: BufferGeometry[] = [];
  const matrix = new Matrix4();
  const rotation = new Quaternion();
  const unit = new Vector3(1, 1, 1);

  function tube(from: Vector3, to: Vector3, radius: number): void {
    const direction = to.clone().sub(from);
    const geometry = new CylinderGeometry(radius, radius, direction.length(), 6);
    rotation.setFromUnitVectors(UP, direction.clone().normalize());
    matrix.compose(from.clone().addScaledVector(direction, 0.5), rotation, unit);
    tubes.push(geometry.applyMatrix4(matrix));
  }

  const half = TRUSS_SIZE / 2;
  // Horizontal span: four chords, zigzag braces on the front and the bottom face
  const corners = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ] as const;
  for (const [dy, dz] of corners) {
    tube(new Vector3(-TRUSS_HALF, TRUSS_Y + dy, TRUSS_Z + dz), new Vector3(TRUSS_HALF, TRUSS_Y + dy, TRUSS_Z + dz), 0.025);
  }
  const step = 0.6;
  for (let x = -TRUSS_HALF; x < TRUSS_HALF - 0.01; x += step) {
    const flip = Math.round((x + TRUSS_HALF) / step) % 2 === 0 ? 1 : -1;
    tube(new Vector3(x, TRUSS_Y - half * flip, TRUSS_Z + half), new Vector3(x + step, TRUSS_Y + half * flip, TRUSS_Z + half), 0.012);
    tube(new Vector3(x, TRUSS_Y - half, TRUSS_Z - half * flip), new Vector3(x + step, TRUSS_Y - half, TRUSS_Z + half * flip), 0.012);
  }

  // Two towers carrying the span
  for (const side of [-1, 1]) {
    const x = side * TRUSS_HALF;
    for (const [dx, dz] of corners) {
      tube(new Vector3(x + dx, 0, TRUSS_Z + dz), new Vector3(x + dx, TRUSS_Y + half, TRUSS_Z + dz), 0.025);
    }
    for (let y = 0; y < TRUSS_Y - 0.01; y += step) {
      const flip = Math.round(y / step) % 2 === 0 ? 1 : -1;
      tube(new Vector3(x - half * flip, y, TRUSS_Z + half), new Vector3(x + half * flip, y + step, TRUSS_Z + half), 0.012);
    }
  }

  return mergeGeometries(tubes);
}

interface MovingHead {
  base: Vector3;
  head: Group;
  cone: BeamCone;
  pool: Mesh;
  color: Color;
  target: Vector3;
  phase: number;
}

export interface LightShow {
  group: Group;
  /** Where the light pools are, for the smoke to glow around them */
  poolPositions: Vector3[];
  /** The pastel each head shines now, for the smoke around its pool */
  poolColors: Color[];
  update(time: number, beat: Beat, level: number): void;
}

export function createLightShow(materials: Materials, shared: SharedUniforms, headCount: number): LightShow {
  const group = new Group();
  const truss = new Mesh(trussGeometry(), materials.darkMetal);
  group.add(truss);

  const poolMaterial = new MeshBasicMaterial({
    map: dotTexture(),
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const yoke = new BoxGeometry(0.34, 0.06, 0.2);
  const arm = new BoxGeometry(0.04, 0.26, 0.16);
  const body = new CylinderGeometry(0.12, 0.16, 0.34, 8);
  body.translate(0, -0.17, 0);
  const lens = new CircleGeometry(0.11, 8);
  lens.rotateX(Math.PI / 2);
  lens.translate(0, -0.345, 0);

  const heads: MovingHead[] = Array.from({ length: headCount }, (_, index) => {
    const x = headCount > 1 ? (index / (headCount - 1) - 0.5) * 6.6 : 0;
    const base = new Vector3(x, TRUSS_Y - TRUSS_SIZE / 2 - 0.36, TRUSS_Z + 0.1);
    group.add(part(yoke, materials.body, [x, TRUSS_Y - TRUSS_SIZE / 2 - 0.03, TRUSS_Z + 0.1]));
    for (const side of [-1, 1]) group.add(part(arm, materials.body, [x + side * 0.15, base.y + 0.2, base.z]));
    const head = new Group();
    head.position.copy(base);
    head.add(part(body, materials.knob));
    head.add(new Mesh(lens, materials.glow));
    group.add(head);
    const cone = createBeamCone(shared, 8);
    group.add(cone.mesh);
    const pool = new Mesh(new CircleGeometry(1, 16).rotateX(-Math.PI / 2), poolMaterial.clone());
    pool.position.y = 0.02;
    group.add(pool);
    return { base, head, cone, pool, target: new Vector3(), phase: index * 1.7, color: PASTELS[index % PASTELS.length].clone() };
  });

  const wander = new Vector3();
  const cross = new Vector3();
  const aim = new Vector3();
  const DOWN = new Vector3(0, -1, 0);

  return {
    group,
    poolPositions: heads.map((head) => head.target),
    poolColors: heads.map((head) => head.color),
    update(time, beat, level) {
      const seconds = time / 1000;
      const beats = beat.count + beat.phase;
      // The second half of each 32-beat phrase is the chorus: every head swings across the middle
      const inPhrase = beats % PHRASE_BEATS;
      const chorus = Math.min(1, Math.max(0, inPhrase - 16) / 2) * Math.min(1, Math.max(0, PHRASE_BEATS - inPhrase) / 2);
      // Each phrase the pastels move one head along, blending over its last four beats
      const phrase = Math.floor(beats / PHRASE_BEATS);
      const shift = Math.min(1, Math.max(0, inPhrase - (PHRASE_BEATS - 4)) / 4);

      heads.forEach((head, index) => {
        const from = PASTELS[(index + phrase) % PASTELS.length];
        const to = PASTELS[(index + phrase + 1) % PASTELS.length];
        head.color.lerpColors(from, to, shift * shift * (3 - 2 * shift));
        wander.set(
          head.base.x * 0.5 + Math.sin(seconds * 0.35 + head.phase) * 2.2,
          0,
          1.4 + Math.sin(seconds * 0.27 + head.phase * 1.3) * 2.0,
        );
        cross.set(-head.base.x * 0.85, 0, 1.8 + Math.sin(head.phase) * 0.6);
        head.target.lerpVectors(wander, cross, chorus);

        aim.subVectors(head.target, head.base).normalize();
        head.head.quaternion.setFromUnitVectors(DOWN, aim);

        const glow = level * (0.65 + 0.35 * beat.kick);
        head.cone.update(head.base, head.target, 0.26 * glow, HEAD_SPREAD, head.color);
        const radius = head.base.distanceTo(head.target) * 0.25 * HEAD_SPREAD * 1.4;
        head.pool.position.set(head.target.x, 0.02, head.target.z);
        head.pool.scale.setScalar(radius);
        const poolMaterial = head.pool.material as MeshBasicMaterial;
        poolMaterial.opacity = 0.35 * glow;
        poolMaterial.color.copy(head.color);
      });
    },
  };
}
