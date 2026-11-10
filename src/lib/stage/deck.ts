import {
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";
import type { Beat } from "../motion/beat";
import { glowColor, labelTexture, type Materials } from "./materials";
import { chamferedSlab, outline, part, rod, segments } from "./shapes";

const TABLE_HEIGHT = 1.0;
const PLINTH_HEIGHT = 0.13;
const RECORD_SPEED = (33.3 / 60) * Math.PI * 2;
const METER_STEPS = 10;
const LED_OFF = new Color(0.045, 0.045, 0.048);

interface Turntable {
  group: Group;
  spinner: Group;
  arm: Group;
}

function createTurntable(materials: Materials, detail: number, label: MeshStandardMaterial): Turntable {
  const group = new Group();
  const round = (count: number) => segments(count, detail);

  group.add(outline(part(chamferedSlab(1.3, 1.0, PLINTH_HEIGHT, 0.08), materials.body)));

  // Platter, record and label turn together
  const spinner = new Group();
  spinner.position.set(-0.12, PLINTH_HEIGHT, 0);
  spinner.add(part(new CylinderGeometry(0.47, 0.47, 0.035, round(64)), materials.metal, [0, 0.0175, 0]));
  spinner.add(part(new CylinderGeometry(0.45, 0.45, 0.008, round(64)), materials.rubber, [0, 0.039, 0]));
  const record = part(new CircleGeometry(0.45, round(72)), materials.vinyl, [0, 0.0435, 0]);
  record.rotation.x = -Math.PI / 2;
  spinner.add(record);
  const sticker = part(new CircleGeometry(0.14, round(48)), label, [0, 0.0445, 0]);
  sticker.rotation.x = -Math.PI / 2;
  spinner.add(sticker);
  spinner.add(part(new CylinderGeometry(0.008, 0.008, 0.035, 8), materials.metal, [0, 0.06, 0]));
  group.add(spinner);

  // Tonearm from its pivot to a point over the grooves
  const pivot = new Vector3(0.43, PLINTH_HEIGHT, -0.32);
  group.add(part(new CylinderGeometry(0.06, 0.07, 0.05, round(24)), materials.darkMetal, [pivot.x, pivot.y + 0.025, pivot.z]));
  const arm = new Group();
  arm.position.set(pivot.x, pivot.y + 0.075, pivot.z);
  const reach = new Vector3(0.12 - pivot.x, 0, 0.22 - pivot.z);
  const length = reach.length();
  arm.rotation.y = Math.atan2(-reach.z, reach.x);
  arm.add(rod(new Vector3(-0.08, 0, 0), new Vector3(length, 0, 0), 0.011, materials.metal, 8));
  arm.add(part(new CylinderGeometry(0.03, 0.03, 0.06, round(16)), materials.darkMetal, [-0.1, 0, 0]).rotateZ(Math.PI / 2));
  arm.add(part(new BoxGeometry(0.09, 0.02, 0.05), materials.knob, [length, -0.012, 0]));
  arm.add(part(new BoxGeometry(0.02, 0.012, 0.014), materials.glow, [length + 0.03, -0.026, 0]));
  group.add(arm);

  // Pitch fader and start button
  group.add(part(new BoxGeometry(0.03, 0.006, 0.36), materials.rubber, [0.5, PLINTH_HEIGHT, 0.12]));
  group.add(part(new BoxGeometry(0.07, 0.03, 0.035), materials.knob, [0.5, PLINTH_HEIGHT + 0.015, 0.1]));
  group.add(part(new BoxGeometry(0.11, 0.02, 0.07), materials.knob, [-0.5, PLINTH_HEIGHT + 0.01, 0.4]));
  group.add(part(new IcosahedronGeometry(0.012, 0), materials.glow, [-0.42, PLINTH_HEIGHT + 0.012, 0.4]));

  return { group, spinner, arm };
}

interface Mixer {
  group: Group;
  knobs: Mesh[];
  channelCaps: Mesh[];
  crossfaderCap: Mesh;
  meters: InstancedMesh;
}

function createMixer(materials: Materials, detail: number): Mixer {
  const group = new Group();
  const round = (count: number) => segments(count, detail);
  const top = 0.11;

  group.add(outline(part(chamferedSlab(0.78, 1.0, top, 0.06), materials.panel)));
  group.add(part(new BoxGeometry(0.72, 0.004, 0.94), materials.matte, [0, top + 0.002, 0]));

  // Two channel strips of EQ knobs, each with a white pointer
  const knobs: Mesh[] = [];
  const knobGeometry = new CylinderGeometry(0.03, 0.034, 0.04, round(20));
  const pointerGeometry = new BoxGeometry(0.004, 0.003, 0.024);
  for (const x of [-0.17, 0.17]) {
    for (const z of [-0.4, -0.29, -0.18, -0.07]) {
      const knob = part(knobGeometry, materials.knob, [x, top + 0.02, z]);
      knob.add(part(pointerGeometry, materials.paper, [0, 0.021, -0.014]));
      knob.rotation.y = Math.random() * 2 - 1;
      knobs.push(knob);
      group.add(knob);
    }
  }

  // Level meters between the strips
  const meters = new InstancedMesh(
    new BoxGeometry(0.024, 0.006, 0.026),
    new MeshBasicMaterial({ toneMapped: false }),
    METER_STEPS * 2,
  );
  const placement = new Object3D();
  for (let column = 0; column < 2; column++) {
    for (let step = 0; step < METER_STEPS; step++) {
      placement.position.set(column ? 0.035 : -0.035, top + 0.006, -0.06 - step * 0.036);
      placement.updateMatrix();
      meters.setMatrixAt(column * METER_STEPS + step, placement.matrix);
      meters.setColorAt(column * METER_STEPS + step, LED_OFF);
    }
  }
  group.add(meters);

  // Channel faders and the crossfader
  const channelCaps: Mesh[] = [];
  for (const x of [-0.17, 0.17]) {
    group.add(part(new BoxGeometry(0.012, 0.004, 0.24), materials.rubber, [x, top + 0.004, 0.2]));
    const cap = part(new BoxGeometry(0.05, 0.035, 0.026), materials.knob, [x, top + 0.02, 0.2]);
    cap.add(part(new BoxGeometry(0.046, 0.002, 0.004), materials.paper, [0, 0.018, 0]));
    channelCaps.push(cap);
    group.add(cap);
  }
  group.add(part(new BoxGeometry(0.26, 0.004, 0.012), materials.rubber, [0, top + 0.004, 0.43]));
  const crossfaderCap = part(new BoxGeometry(0.026, 0.035, 0.05), materials.knob, [0, top + 0.02, 0.43]);
  group.add(crossfaderCap);

  return { group, knobs, channelCaps, crossfaderCap, meters };
}

export interface Deck {
  group: Group;
  /** Where the camera looks at the whole booth, and at the left record up close */
  focus: Object3D;
  platterFocus: Object3D;
  update(dt: number, time: number, beat: Beat, boost: number): void;
}

export function createDeck(materials: Materials, detail: number): Deck {
  const group = new Group();

  // The booth: table top, front panel and sides, with a light strip across the front
  const panelHeight = TABLE_HEIGHT - 0.08;
  group.add(outline(part(new BoxGeometry(4.6, 0.08, 1.7), materials.matte, [0, TABLE_HEIGHT - 0.04, 0])));
  group.add(outline(part(new BoxGeometry(4.6, panelHeight, 0.06), materials.body, [0, panelHeight / 2, 0.82])));
  for (const side of [-1, 1]) {
    group.add(part(new BoxGeometry(0.06, panelHeight, 1.64), materials.body, [side * 2.27, panelHeight / 2, 0]));
  }
  const stripMaterial = new MeshBasicMaterial({ color: glowColor(1), toneMapped: false });
  const strip = new Mesh(new BoxGeometry(4.3, 0.022, 0.012), stripMaterial);
  strip.position.set(0, TABLE_HEIGHT - 0.2, 0.856);
  group.add(strip);

  const labels = [
    new MeshStandardMaterial({ map: labelTexture("#e8e8e2", "#050505"), roughness: 0.7, flatShading: true }),
    new MeshStandardMaterial({ map: labelTexture("#3a3a3e", "#f4f4f0"), roughness: 0.7, flatShading: true }),
  ];
  const turntables = [-1.38, 1.38].map((x, index) => {
    const turntable = createTurntable(materials, detail, labels[index]);
    turntable.group.position.set(x, TABLE_HEIGHT, 0.05);
    group.add(turntable.group);
    return turntable;
  });

  const mixer = createMixer(materials, detail);
  mixer.group.position.set(0, TABLE_HEIGHT, 0.05);
  group.add(mixer.group);

  const focus = new Object3D();
  focus.position.set(0, TABLE_HEIGHT + 0.1, 0.05);
  const platterFocus = new Object3D();
  platterFocus.position.set(-1.5, TABLE_HEIGHT + 0.15, 0.05);
  group.add(focus, platterFocus);

  const armRest = turntables.map((turntable) => turntable.arm.rotation.y);
  const capRest = mixer.channelCaps.map((cap) => cap.position.z);
  const lit = new Color();

  function paintMeter(column: number, level: number): void {
    const steps = Math.round(Math.min(1, level) * METER_STEPS);
    for (let step = 0; step < METER_STEPS; step++) {
      const color = step < steps ? glowColor(step >= METER_STEPS - 2 ? 3.2 : 1.6, lit) : LED_OFF;
      mixer.meters.setColorAt(column * METER_STEPS + step, color);
    }
  }

  return {
    group,
    focus,
    platterFocus,
    update(dt, time, beat, boost) {
      const seconds = time / 1000;
      const speed = RECORD_SPEED * (1 + boost * 1.8);
      turntables.forEach((turntable, index) => {
        turntable.spinner.rotation.y -= speed * dt;
        turntable.arm.rotation.y = armRest[index] + Math.sin(seconds * 0.4 + index) * 0.012;
      });

      mixer.knobs.forEach((knob, index) => {
        knob.rotation.y += Math.sin(seconds * 0.7 + index * 1.7) * dt * 0.4;
      });
      mixer.channelCaps.forEach((cap, index) => {
        cap.position.z = capRest[index] + Math.sin(seconds * 0.35 + index * 2) * 0.06;
      });
      mixer.crossfaderCap.position.x = Math.sin(seconds * 0.5) * 0.09;

      const echo = Math.exp(-((beat.phase + 0.92) % 1) * 7);
      // A hovered mix drives the meters into the top LEDs
      paintMeter(0, 0.2 + beat.kick * 0.7 + beat.hat * 0.12 + boost * 0.6);
      paintMeter(1, 0.18 + echo * 0.68 + beat.hat * 0.1 + boost * 0.6);
      if (mixer.meters.instanceColor) mixer.meters.instanceColor.needsUpdate = true;

      glowColor(0.55 + beat.kick * 2.4 + boost, stripMaterial.color);
    },
  };
}
