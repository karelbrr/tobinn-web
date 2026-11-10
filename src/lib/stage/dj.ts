import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import type { Beat } from "../motion/beat";
import { part } from "./shapes";

const UP = new Vector3(0, 1, 0);
const UPPER_ARM = 0.31;
const FOREARM = 0.29;
// Larger than life, so he holds the closing shot and reads from across the club
const SCALE = 1.22;
// Where his hands rest on the booth, measured from where he stands and not scaled with him: he faces +z
const MIXER = new Vector3(0.12, 1.2, 0.55).divideScalar(SCALE);
const DECK = new Vector3(-0.38, 1.2, 0.5).divideScalar(SCALE);
// Gestures toward his own body scale with him
const EAR = new Vector3(-0.13, 1.58, 0.12);
const RAISED = new Vector3(-0.36, 1.95, 0.25);
const HEAD_HEIGHT = 1.6;

const faceted = (color: number, roughness = 0.75) =>
  new MeshStandardMaterial({ color, roughness, metalness: 0.05, flatShading: true });

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const amount = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return amount * amount * (3 - 2 * amount);
};

/** A six-sided limb from one point to another, re-aimed every frame */
function limb(radius: number, material: MeshStandardMaterial) {
  const geometry = new CylinderGeometry(radius * 0.9, radius, 1, 6);
  geometry.translate(0, 0.5, 0);
  const mesh = part(geometry, material);
  const direction = new Vector3();
  return {
    mesh,
    set(from: Vector3, to: Vector3): void {
      direction.subVectors(to, from);
      mesh.position.copy(from);
      mesh.scale.set(1, Math.max(0.001, direction.length()), 1);
      mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
    },
  };
}

const direction = new Vector3();
const bend = new Vector3();

/** Two-bone reach: the elbow bends toward the pole, the hand stops where the arm runs out */
function reach(shoulder: Vector3, target: Vector3, pole: Vector3, elbow: Vector3, hand: Vector3): void {
  direction.subVectors(target, shoulder);
  const distance = Math.min(UPPER_ARM + FOREARM - 0.001, Math.max(0.05, direction.length()));
  direction.normalize();
  const along = (UPPER_ARM * UPPER_ARM + distance * distance - FOREARM * FOREARM) / (2 * distance);
  const height = Math.sqrt(Math.max(0, UPPER_ARM * UPPER_ARM - along * along));
  bend.copy(pole).addScaledVector(direction, -pole.dot(direction)).normalize();
  elbow.copy(shoulder).addScaledVector(direction, along).addScaledVector(bend, height);
  hand.copy(shoulder).addScaledVector(direction, distance);
}

export interface Dj {
  group: Group;
  /** His head, where the closing shot and the beam aim */
  focus: Object3D;
  /** focus: 0 normally, 1 while the booking form is open, when he looks up into the camera */
  update(beat: Beat, time: number, focus: number, camera: Vector3): void;
}

export function createDj(): Dj {
  const group = new Group();
  group.scale.setScalar(SCALE);
  const shirt = faceted(0xb2b2ae, 0.9);
  const jeans = faceted(0x6c6c72, 0.9);
  const skin = faceted(0x8e8e92, 0.75);
  const hair = faceted(0x1b1b1d, 0.9);
  const cap = faceted(0x111113, 0.8);
  const dark = faceted(0x2a2a2e, 0.5);

  // Legs and shoes stand still behind the booth
  for (const side of [-1, 1]) {
    const leg = limb(0.075, jeans);
    leg.set(new Vector3(side * 0.1, 0.92, 0), new Vector3(side * 0.11, 0.08, 0.02));
    group.add(leg.mesh);
    group.add(part(new BoxGeometry(0.11, 0.08, 0.25), dark, [side * 0.11, 0.04, 0.06]));
  }
  group.add(part(new BoxGeometry(0.36, 0.1, 0.2), jeans, [0, 0.9, 0]));

  // Torso pivots at the hips: the white t-shirt, short sleeves, neck, headphones round the neck
  const torso = new Group();
  torso.position.set(0, 0.9, 0);
  group.add(torso);
  // A four-sided taper: shoulders wider than the waist reads as a body, a box does not
  torso.add(part(new CylinderGeometry(0.29, 0.22, 0.52, 4).rotateY(Math.PI / 4).scale(1, 1, 0.55), shirt, [0, 0.27, 0]));
  for (const side of [-1, 1]) {
    torso.add(part(new CylinderGeometry(0.068, 0.072, 0.16, 6), shirt, [side * 0.235, 0.44, 0]).rotateZ(side * 0.35));
  }
  torso.add(part(new CylinderGeometry(0.05, 0.055, 0.09, 6), skin, [0, 0.57, 0]));
  torso.add(part(new TorusGeometry(0.095, 0.018, 4, 10), dark, [0, 0.54, 0.01]).rotateX(Math.PI / 2 - 0.25));
  for (const side of [-1, 1]) {
    torso.add(part(new CylinderGeometry(0.045, 0.045, 0.035, 8), dark, [side * 0.1, 0.52, 0.07]).rotateZ(Math.PI / 2));
  }

  // Head pivots at the neck: a chamfer-free block, curls spilling forward under a snapback worn backwards
  const head = new Group();
  head.position.set(0, 0.61, 0);
  torso.add(head);
  head.add(part(new BoxGeometry(0.19, 0.23, 0.21), skin, [0, 0.12, 0]));
  const crown = part(new SphereGeometry(0.122, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), cap, [0, 0.19, -0.01]);
  crown.scale.set(1, 0.72, 1.05);
  head.add(crown);
  head.add(part(new BoxGeometry(0.17, 0.016, 0.12), cap, [0, 0.2, -0.16]));
  const curls: [number, number, number, number][] = [
    [-0.075, 0.2, 0.1, 0.052],
    [0, 0.21, 0.115, 0.056],
    [0.075, 0.2, 0.1, 0.052],
    [-0.035, 0.165, 0.123, 0.046],
    [0.04, 0.16, 0.124, 0.046],
    [-0.105, 0.15, 0.06, 0.046],
    [0.105, 0.15, 0.06, 0.046],
    [-0.11, 0.1, 0.01, 0.04],
    [0.11, 0.1, 0.01, 0.04],
    [-0.1, 0.17, -0.07, 0.05],
    [0.1, 0.17, -0.07, 0.05],
  ];
  for (const [x, y, z, radius] of curls) head.add(part(new IcosahedronGeometry(radius, 0), hair, [x, y, z]));

  // Arms: upper arm, forearm and hand, solved toward a target every frame
  const arms = [-1, 1].map((side) => {
    const upper = limb(0.048, skin);
    const fore = limb(0.04, skin);
    const hand = part(new BoxGeometry(0.07, 0.09, 0.04), skin);
    group.add(upper.mesh, fore.mesh, hand);
    return {
      side,
      upper,
      fore,
      hand,
      shoulder: new Vector3(),
      elbow: new Vector3(),
      wrist: new Vector3(),
      target: new Vector3(),
      pole: new Vector3(side * 0.7, -0.5, -0.6).normalize(),
    };
  });

  const focusPoint = new Object3D();
  focusPoint.position.set(0, 1.52, 0.05);
  group.add(focusPoint);

  const localCamera = new Vector3();
  const handDirection = new Vector3();
  const blend = new Vector3();

  return {
    group,
    focus: focusPoint,
    update(beat, time, focus, camera) {
      const beats = beat.count + beat.phase;
      const seconds = time / 1000;

      // Shoulders sway every two beats, the body dips on the kick, the head nods
      torso.rotation.set(0.14 + beat.kick * 0.04, 0, Math.sin(beats * Math.PI) * 0.035);
      torso.position.y = 0.9 - beat.kick * 0.012;

      // With the form open he looks up into the camera
      localCamera.copy(camera);
      group.worldToLocal(localCamera);
      const yaw = Math.max(-0.7, Math.min(0.7, Math.atan2(localCamera.x, localCamera.z)));
      const pitch = -Math.atan2(localCamera.y - HEAD_HEIGHT, Math.hypot(localCamera.x, localCamera.z)) - 0.14;
      const nod = 0.1 + beat.kick * 0.18;
      head.rotation.x = nod + (pitch + beat.kick * 0.05 - nod) * focus;
      head.rotation.y = Math.sin(beats * Math.PI * 0.5) * 0.08 * (1 - focus) + yaw * focus;

      // Right hand rides the mixer; the left goes deck, headphones, a hand up to the crowd, every 16 beats
      const cycle = beats % 16;
      const toEar = smoothstep(8, 9, cycle) - smoothstep(11.5, 12.5, cycle);
      const toCrowd = smoothstep(12, 13, cycle) - smoothstep(15, 16, cycle);
      torso.updateMatrix();
      for (const arm of arms) {
        arm.shoulder.set(arm.side * 0.22, 0.47, 0).applyMatrix4(torso.matrix);
        if (arm.side > 0) {
          arm.target.copy(MIXER).add(blend.set(Math.sin(seconds * 1.1) * 0.04, Math.max(0, Math.sin(seconds * 2.3)) * 0.02, Math.sin(seconds * 0.7) * 0.03));
        } else {
          arm.target.copy(DECK).add(blend.set(Math.sin(seconds * 3.1) * 0.02, 0, 0));
          arm.target.lerp(EAR, toEar).lerp(RAISED, toCrowd);
        }
        reach(arm.shoulder, arm.target, arm.pole, arm.elbow, arm.wrist);
        arm.upper.set(arm.shoulder, arm.elbow);
        arm.fore.set(arm.elbow, arm.wrist);
        handDirection.subVectors(arm.wrist, arm.elbow).normalize();
        arm.hand.position.copy(arm.wrist).addScaledVector(handDirection, 0.04);
        arm.hand.quaternion.setFromUnitVectors(UP, handDirection);
      }
    },
  };
}
