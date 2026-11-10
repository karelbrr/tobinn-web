import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Beat } from "../motion/beat";

// The dance floor in front of the booth, kept clear of the microphone and of the cameras that pass low
const FLOOR = { minX: -3.8, maxX: 4.2, minZ: 2.3, maxZ: 6.2 };
const SPACING = 0.42;

type Part = [geometry: BufferGeometry, position: [number, number, number], rotation?: [number, number, number]];

// One body as one geometry: every part moved into place, then merged, so a variant costs one draw call
function body(parts: Part[]): BufferGeometry {
  const matrix = new Matrix4();
  const placed = parts.map(([geometry, position, rotation = [0, 0, 0]]) => {
    matrix.compose(new Vector3(...position), new Quaternion().setFromEuler(new Euler(...rotation)), new Vector3(1, 1, 1));
    return geometry.clone().applyMatrix4(matrix).toNonIndexed();
  });
  return mergeGeometries(placed);
}

const leg = () => new BoxGeometry(0.13, 0.8, 0.14);
const torso = () => new BoxGeometry(0.36, 0.55, 0.2);
const armGeometry = () => new BoxGeometry(0.07, 0.58, 0.08);
const head = () => new IcosahedronGeometry(0.12, 0);

const base: Part[] = [
  [leg(), [-0.09, 0.4, 0]],
  [leg(), [0.09, 0.4, 0]],
  [torso(), [0, 1.08, 0]],
];
const armsDown: Part[] = [
  [armGeometry(), [-0.24, 1.05, 0], [0, 0, 0.08]],
  [armGeometry(), [0.24, 1.05, 0], [0, 0, -0.08]],
];
const armsUp: Part[] = [
  [armGeometry(), [-0.31, 1.6, 0.02], [0, 0, 0.42]],
  [armGeometry(), [0.31, 1.6, 0.02], [0, 0, -0.42]],
];

// Four bodies: arms down with curly hair, arms down with a cap, both arms up, one arm up holding a phone
const VARIANTS: BufferGeometry[] = [
  body([...base, ...armsDown, [head(), [0, 1.5, 0]], [new IcosahedronGeometry(0.135, 0), [0, 1.55, -0.02]]]),
  body([
    ...base,
    ...armsDown,
    [head(), [0, 1.5, 0]],
    [new CylinderGeometry(0.125, 0.13, 0.07, 8), [0, 1.6, 0]],
    [new BoxGeometry(0.16, 0.02, 0.13), [0, 1.57, 0.13]],
  ]),
  body([...base, ...armsUp, [head(), [0, 1.5, 0]]]),
  body([
    ...base,
    [armGeometry(), [-0.24, 1.05, 0], [0, 0, 0.08]],
    [armGeometry(), [0.27, 1.64, 0.05], [0.25, 0, -0.18]],
    [new BoxGeometry(0.07, 0.13, 0.015), [0.32, 1.98, 0.14]],
    [head(), [0, 1.5, 0]],
  ]),
];
const ARMS_UP = 2;

interface Dancer {
  variant: number;
  slot: number;
  position: Vector3;
  facing: number;
  scale: number;
  phase: number;
  /** Raises the arms (shows its twin in the arms-up variant) once a hovered mix pushes past this */
  excitement: number;
  twinSlot: number;
}

export interface Crowd {
  meshes: InstancedMesh[];
  count: number;
  /** boost: 0 normally, 1 while a mix is hovered: higher jumps and more hands in the air */
  update(dt: number, beat: Beat, boost: number): void;
}

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function createCrowd(count: number): Crowd {
  const random = seeded(124);
  const dancers: Dancer[] = [];
  const slots = VARIANTS.map(() => 0);

  // Scatter on a jittered grid, densest in the middle of the floor
  const cells: Vector3[] = [];
  for (let z = FLOOR.minZ; z <= FLOOR.maxZ; z += SPACING) {
    for (let x = FLOOR.minX; x <= FLOOR.maxX; x += SPACING) {
      cells.push(new Vector3(x + (random() - 0.5) * 0.25, 0, z + (random() - 0.5) * 0.25));
    }
  }
  const ranked = cells
    .map((cell) => ({ cell, score: Math.abs(cell.x - 0.2) + cell.z * 0.4 + random() * 2.5 }))
    .sort((a, b) => a.score - b.score)
    .map(({ cell }) => cell);

  for (const position of ranked.slice(0, count)) {
    const roll = random();
    const variant = roll < 0.4 ? 0 : roll < 0.65 ? 1 : roll < 0.85 ? 2 : 3;
    const calm = variant === 0 || variant === 1;
    dancers.push({
      variant,
      slot: slots[variant]++,
      position,
      // Everyone faces the booth, give or take
      facing: Math.atan2(-position.x, -position.z) + (random() - 0.5) * 0.5,
      scale: 0.92 + random() * 0.16,
      phase: random(),
      excitement: calm && random() < 0.35 ? random() * 0.8 : 2,
      twinSlot: -1,
    });
  }
  // Calm dancers who may raise their arms get a hidden twin in the arms-up variant
  for (const dancer of dancers) {
    if (dancer.excitement <= 1) dancer.twinSlot = slots[ARMS_UP]++;
  }

  const material = new MeshStandardMaterial({ color: 0x3a3a3f, roughness: 0.85, metalness: 0.05, flatShading: true });
  const meshes = VARIANTS.map((geometry, variant) => {
    const mesh = new InstancedMesh(geometry, material, Math.max(1, slots[variant]));
    mesh.count = slots[variant];
    // Instances spread over the whole floor; the base geometry's bounds would cull them wrongly
    mesh.frustumCulled = false;
    return mesh;
  });

  const shade = new Color();
  for (const dancer of dancers) {
    shade.setScalar(0.65 + ((dancer.phase * 7.3) % 1) * 0.6);
    meshes[dancer.variant].setColorAt(dancer.slot, shade);
    if (dancer.twinSlot >= 0) meshes[ARMS_UP].setColorAt(dancer.twinSlot, shade);
  }

  const matrix = new Matrix4();
  const rotation = new Quaternion();
  const euler = new Euler();
  const place = new Vector3();
  const size = new Vector3();
  const hidden = new Matrix4().makeScale(0, 0, 0);
  let swayTime = 0;

  return {
    meshes,
    count: dancers.length,
    update(dt, beat, boost) {
      swayTime += dt;
      for (const dancer of dancers) {
        // Each dancer hits the kick a little early or late, so the floor never moves as one
        const local = (beat.phase + dancer.phase * 0.35) % 1;
        const kick = Math.exp(-local * 6);
        const jump = kick * (0.05 + boost * 0.09) * (0.6 + dancer.phase * 0.8);
        euler.set(kick * 0.12, dancer.facing + Math.sin(swayTime * 1.3 + dancer.phase * 6.28) * 0.12, Math.sin(swayTime * 2.1 + dancer.phase * 9) * 0.05);
        rotation.setFromEuler(euler);
        place.copy(dancer.position).setY(jump);
        size.setScalar(dancer.scale);
        matrix.compose(place, rotation, size);

        const raised = boost > dancer.excitement;
        if (dancer.twinSlot >= 0) {
          meshes[ARMS_UP].setMatrixAt(dancer.twinSlot, raised ? matrix : hidden);
          meshes[dancer.variant].setMatrixAt(dancer.slot, raised ? hidden : matrix);
        } else {
          meshes[dancer.variant].setMatrixAt(dancer.slot, matrix);
        }
      }
      for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
