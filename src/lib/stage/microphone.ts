import {
  CatmullRomCurve3,
  Color,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WireframeGeometry,
} from "three";
import type { Materials } from "./materials";
import { part, rod, segments } from "./shapes";

const UP = new Vector3(0, 1, 0);
const MIC_SCALE = 2.4;
const GRILLE_COLOR = new Color(0x8c8c94);

export interface Microphone {
  group: Group;
}

export function createMicrophone(materials: Materials, detail: number): Microphone {
  const group = new Group();
  const round = (count: number) => segments(count, detail);

  // Tripod and pole
  const hub = new Vector3(0, 0.5, 0);
  for (let leg = 0; leg < 3; leg++) {
    const angle = (leg / 3) * Math.PI * 2;
    group.add(rod(hub, new Vector3(Math.cos(angle) * 0.42, 0.01, Math.sin(angle) * 0.42), 0.012, materials.darkMetal));
  }
  const poleTop = new Vector3(0, 1.35, 0);
  group.add(rod(new Vector3(0, 0.06, 0), poleTop, 0.014, materials.metal));
  group.add(part(new IcosahedronGeometry(0.032, 0), materials.darkMetal, [poleTop.x, poleTop.y, poleTop.z]));

  // Boom arm reaching toward the booth, with a counterweight behind the joint
  const boomEnd = new Vector3(0.78, 1.64, 0);
  const boomDirection = boomEnd.clone().sub(poleTop).normalize();
  group.add(rod(poleTop, boomEnd, 0.01, materials.metal));
  group.add(rod(poleTop.clone().addScaledVector(boomDirection, -0.28), poleTop, 0.01, materials.metal));
  group.add(part(new IcosahedronGeometry(0.05, 0), materials.darkMetal, poleTop.clone().addScaledVector(boomDirection, -0.3).toArray()));

  // The microphone along the boom: tapered handle, ring and the grille ball
  const mic = new Group();
  mic.position.copy(boomEnd);
  mic.quaternion.setFromUnitVectors(UP, boomDirection);
  mic.scale.setScalar(MIC_SCALE);
  const handle = new LatheGeometry(
    [[0, 0], [0.016, 0], [0.019, 0.05], [0.022, 0.13], [0.025, 0.16], [0.027, 0.166]].map(([r, y]) => new Vector2(r, y)),
    round(32),
  );
  mic.add(part(handle, materials.body));
  mic.add(part(new TorusGeometry(0.027, 0.004, 4, round(32)), materials.metal, [0, 0.166, 0]).rotateX(Math.PI / 2));
  mic.add(part(new IcosahedronGeometry(0.033, 1), materials.rubber, [0, 0.2, 0]));
  const grilleMaterial = new LineBasicMaterial({ color: GRILLE_COLOR, toneMapped: false });
  const grille = new LineSegments(new WireframeGeometry(new IcosahedronGeometry(0.037, 1)), grilleMaterial);
  grille.position.y = 0.2;
  mic.add(grille);
  group.add(mic);

  // Cable from the handle down the pole and across the floor
  const handleEnd = boomEnd.clone().addScaledVector(boomDirection, -0.02);
  const cable = new CatmullRomCurve3([
    handleEnd,
    new Vector3(0.5, 1.3, 0.04),
    new Vector3(0.08, 0.85, 0.05),
    new Vector3(0.1, 0.08, 0.15),
    new Vector3(0.7, 0.012, 0.6),
    new Vector3(1.6, 0.012, 0.4),
  ]);
  group.add(part(new TubeGeometry(cable, 24, 0.008, 4), materials.rubber));

  return { group };
}
