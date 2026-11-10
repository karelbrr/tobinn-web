import {
  AdditiveBlending,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Beat } from "../motion/beat";
import { NOISE_GLSL, OUTPUT_GLSL, TEXT_GUARD_GLSL, type SharedUniforms } from "./effects";
import { LASER_COLORS, LASER_TINT } from "./palette";

export interface LaserEmitter {
  position: Vector3;
  /** Turns the whole fan sideways, so side emitters cross toward the middle */
  yaw: number;
}

const BEAM_LENGTH = 16;
const BEAM_WIDTH = 0.07;
const BEATS_PER_PATTERN = 8;
const UP = new Vector3(0, 1, 0);

type Pattern = (index: number, count: number, time: number) => [yaw: number, pitch: number];

const spread = (index: number, count: number, width: number) =>
  count > 1 ? (index / (count - 1) - 0.5) * 2 * width : 0;

// A new figure every eight beats: fan, rotating cone, tight bundle, zigzag
const PATTERNS: Pattern[] = [
  (index, count, time) => [spread(index, count, 0.9) * (0.7 + 0.3 * Math.sin(time * 0.9)), 0.26 + 0.06 * Math.sin(time * 1.3)],
  (index, count, time) => {
    const angle = (index / count) * Math.PI * 2 + time * 1.4;
    return [Math.cos(angle) * 0.55, 0.42 + Math.sin(angle) * 0.28];
  },
  (index, count, time) => [Math.sin(time * 0.7) * 0.8 + spread(index, count, 0.05), 0.22 + (index % 2) * 0.03],
  (index, count, time) => [spread(index, count, 0.75), 0.3 + (index % 2 ? 1 : -1) * 0.18 * Math.sin(time * 2.2)],
];

const smoothstep = (value: number) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};

export interface Lasers {
  mesh: InstancedMesh;
  /** speed: 1 normally, higher while a date is hovered; level brightens on a hovered mix */
  update(dt: number, beat: Beat, speed: number, level: number): void;
}

export function createLasers(emitters: LaserEmitter[], beamsPerEmitter: number, shared: SharedUniforms): Lasers {
  // Two crossed strips along +y, so a beam reads from any side without turning to the camera
  const strip = new PlaneGeometry(1, 1);
  strip.translate(0, 0.5, 0);
  const geometry = mergeGeometries([strip, strip.clone().rotateY(Math.PI / 2)]);

  const material = new ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: /* glsl */ `
      attribute float aIntensity;
      attribute vec3 aTint;
      varying vec2 vUv;
      varying float vIntensity;
      varying vec3 vTint;
      void main() {
        vUv = uv;
        vIntensity = aIntensity;
        vTint = aTint;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying float vIntensity;
      varying vec3 vTint;
      ${TEXT_GUARD_GLSL}
      ${NOISE_GLSL}
      void main() {
        float across = abs(vUv.x - 0.5) * 2.0;
        // A hard core and only a faint halo: at the low resolution a beam is a line of pixels, not a soft glow
        float core = (1.0 - smoothstep(0.18, 0.32, across)) * 1.1 + exp(-across * across * 6.0) * 0.05;
        float along = vUv.y;
        float fade = smoothstep(0.0, 0.015, along) * (1.0 - smoothstep(0.35, 1.0, along));
        float haze = 0.4 + 0.6 * fbm(vec2(along * 9.0 - uTime * 0.5, vIntensity * 7.0));
        gl_FragColor = vec4(vTint * (core * fade * haze * vIntensity * textGuard()), 1.0);
        ${OUTPUT_GLSL}
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });

  const count = emitters.length * beamsPerEmitter;
  const intensities = new InstancedBufferAttribute(new Float32Array(count), 1);
  intensities.setUsage(DynamicDrawUsage);
  geometry.setAttribute("aIntensity", intensities);

  // Each emitter fires two colours on alternate beams; every new figure moves the colours one step on
  const tints = new InstancedBufferAttribute(new Float32Array(count * 3), 3);
  tints.setUsage(DynamicDrawUsage);
  geometry.setAttribute("aTint", tints);
  const tint = new Color();
  function paintTints(step: number): void {
    for (let index = 0; index < count; index++) {
      const emitter = Math.floor(index / beamsPerEmitter);
      const beam = index % beamsPerEmitter;
      tint.setRGB(1, 1, 1).lerp(LASER_COLORS[(emitter + (beam % 2) * 2 + step) % LASER_COLORS.length], LASER_TINT);
      tints.setXYZ(index, tint.r, tint.g, tint.b);
    }
    tints.needsUpdate = true;
  }
  paintTints(0);
  const mesh = new InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;

  const matrix = new Matrix4();
  const rotation = new Quaternion();
  const direction = new Vector3();
  const scale = new Vector3(BEAM_WIDTH, BEAM_LENGTH, BEAM_WIDTH);
  let patternTime = 0;
  let current = -1;
  let previous = 0;
  let morph = 1;

  return {
    mesh,
    update(dt, beat, speed, level) {
      patternTime += dt * speed;
      const beats = beat.count + beat.phase;
      const target = Math.floor(beats / BEATS_PER_PATTERN) % PATTERNS.length;
      if (current < 0) current = target;
      if (target !== current) {
        previous = current;
        current = target;
        morph = 0;
        paintTints(current);
      }
      // About half a second to morph from the last figure into the new one
      morph = Math.min(1, morph + dt * 2.2);
      const blend = smoothstep(morph);
      const pulse = (0.5 + 0.5 * beat.kick) * (0.6 + 0.4 * blend) * level;

      emitters.forEach((emitter, emitterIndex) => {
        for (let beam = 0; beam < beamsPerEmitter; beam++) {
          const index = emitterIndex * beamsPerEmitter + beam;
          const time = patternTime + emitterIndex * 0.7;
          const [fromYaw, fromPitch] = PATTERNS[previous](beam, beamsPerEmitter, time);
          const [toYaw, toPitch] = PATTERNS[current](beam, beamsPerEmitter, time);
          const yaw = emitter.yaw + fromYaw + (toYaw - fromYaw) * blend;
          const pitch = fromPitch + (toPitch - fromPitch) * blend;
          direction.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
          rotation.setFromUnitVectors(UP, direction);
          matrix.compose(emitter.position, rotation, scale);
          mesh.setMatrixAt(index, matrix);
          intensities.setX(index, pulse * (0.75 + 0.25 * Math.sin(beam * 1.9 + emitterIndex)));
        }
      });
      mesh.instanceMatrix.needsUpdate = true;
      intensities.needsUpdate = true;
    },
  };
}
