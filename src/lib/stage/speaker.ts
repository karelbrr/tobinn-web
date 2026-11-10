import {
  AdditiveBlending,
  BoxGeometry,
  ConeGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  RingGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import type { Beat } from "../motion/beat";
import { glowColor, type Materials } from "./materials";
import { outline, part, rod, segments } from "./shapes";

const POLE_TOP = 1.95;
const CABINET = { width: 1.0, height: 1.6, depth: 0.85 };
const FRONT = CABINET.depth / 2;
const WOOFER_Y = -0.28;
const RING_LIFE = 1.1;

/** A profile revolved around the z axis, so the bowl opens toward the front of the cabinet */
function bowl(profile: [number, number][], sides: number): LatheGeometry {
  const geometry = new LatheGeometry(
    profile.map(([radius, depth]) => new Vector2(radius, depth)),
    sides,
  );
  geometry.rotateX(Math.PI / 2);
  return geometry;
}

export interface Speaker {
  group: Group;
  focus: Object3D;
  update(dt: number, beat: Beat, boost: number): void;
}

export function createSpeaker(materials: Materials, detail: number, ringCount: number): Speaker {
  const group = new Group();
  const round = (count: number) => segments(count, detail);

  // Tripod stand
  const hub = new Vector3(0, 0.75, 0);
  for (let leg = 0; leg < 3; leg++) {
    const angle = (leg / 3) * Math.PI * 2 + Math.PI / 6;
    const foot = new Vector3(Math.cos(angle) * 0.58, 0.01, Math.sin(angle) * 0.58);
    group.add(rod(hub, foot, 0.018, materials.darkMetal));
  }
  group.add(rod(new Vector3(0, 0.1, 0), new Vector3(0, POLE_TOP, 0), 0.022, materials.metal, 12));

  // Cabinet
  const cabinet = new Group();
  cabinet.position.y = POLE_TOP + CABINET.height / 2;
  group.add(cabinet);
  cabinet.add(outline(part(new BoxGeometry(CABINET.width, CABINET.height, CABINET.depth), materials.matte)));
  cabinet.add(outline(part(new BoxGeometry(CABINET.width - 0.1, CABINET.height - 0.1, 0.01), materials.body, [0, 0, FRONT + 0.002])));

  // Woofer: frame, then the moving parts (surround, cone, dust cap)
  const frame = part(new TorusGeometry(0.4, 0.03, 4, round(64)), materials.darkMetal, [0, WOOFER_Y, FRONT + 0.01]);
  cabinet.add(frame);
  const coneMaterial = new MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.85, side: DoubleSide, flatShading: true });
  const cone = new Group();
  cone.position.set(0, WOOFER_Y, FRONT + 0.01);
  cone.add(part(new TorusGeometry(0.36, 0.032, 4, round(64)), materials.rubber));
  cone.add(part(bowl([[0.09, -0.13], [0.16, -0.1], [0.25, -0.05], [0.34, 0]], round(64)), coneMaterial));
  const dustCap = part(new ConeGeometry(0.095, 0.05, round(32)), materials.body, [0, 0, -0.105]);
  dustCap.rotation.x = Math.PI / 2;
  cone.add(dustCap);
  cabinet.add(cone);

  // Tweeter horn and its dome
  const hornMaterial = materials.darkMetal.clone();
  hornMaterial.side = DoubleSide;
  const horn = part(bowl([[0.035, -0.08], [0.06, -0.05], [0.12, -0.015], [0.2, 0]], round(48)), hornMaterial, [0, 0.42, FRONT + 0.005]);
  horn.scale.x = 1.4;
  cabinet.add(horn);
  const dome = part(new ConeGeometry(0.035, 0.025, 6), materials.metal, [0, 0.42, FRONT - 0.068]);
  dome.rotation.x = Math.PI / 2;
  cabinet.add(dome);

  // Bass port and power light
  cabinet.add(part(new BoxGeometry(0.62, 0.05, 0.02), materials.rubber, [0, -0.7, FRONT]));
  cabinet.add(part(new IcosahedronGeometry(0.014, 0), materials.glow, [0.38, 0.7, FRONT + 0.01]));

  // Pressure rings pushed out of the woofer on every beat
  const ringGeometry = new RingGeometry(0.4, 0.425, round(64));
  const rings = Array.from({ length: ringCount }, () => {
    const material = new MeshBasicMaterial({
      color: glowColor(1.2),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      side: DoubleSide,
    });
    const ring = new Mesh(ringGeometry, material);
    ring.position.set(0, WOOFER_Y, FRONT + 0.02);
    ring.userData.age = RING_LIFE;
    ring.visible = false;
    cabinet.add(ring);
    return ring;
  });

  const focus = new Object3D();
  cabinet.add(focus);

  let lastBeat = -1;

  return {
    group,
    focus,
    update(dt, beat, boost) {
      // The cone sucks in on the hit and swings back
      cone.position.z = FRONT + 0.01 - beat.kick * (0.035 + boost * 0.03);

      if (beat.count !== lastBeat) {
        lastBeat = beat.count;
        const oldest = rings.reduce((a, b) => (a.userData.age >= b.userData.age ? a : b));
        oldest.userData.age = 0;
        oldest.visible = true;
      }
      for (const ring of rings) {
        const age = ring.userData.age as number;
        if (age >= RING_LIFE) {
          ring.visible = false;
          continue;
        }
        const next = age + dt;
        ring.userData.age = next;
        ring.scale.setScalar(1 + next * 1.1);
        ring.position.z = FRONT + 0.02 + next * 0.9;
        (ring.material as MeshBasicMaterial).opacity = Math.max(0, 1 - next / RING_LIFE) * (0.22 + boost * 0.25);
      }
    },
  };
}
