import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Mesh,
  Points,
  PointsMaterial,
  ShaderMaterial,
  Vector3,
} from "three";
import { NOISE_GLSL, OUTPUT_GLSL, TEXT_GUARD_GLSL, type SharedUniforms } from "./effects";
import { dotTexture } from "./materials";

export interface Dust {
  points: Points;
  update(dt: number, time: number): void;
}

/** Dust hanging in the light, drifting slowly */
export function createDust(count: number): Dust {
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    positions[index * 3] = (Math.random() - 0.5) * 14;
    positions[index * 3 + 1] = 0.2 + Math.random() * 5.8;
    positions[index * 3 + 2] = (Math.random() - 0.5) * 13;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  const points = new Points(
    geometry,
    new PointsMaterial({
      map: dotTexture(),
      color: 0xffffff,
      size: 0.035,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );

  return {
    points,
    update(dt, time) {
      points.rotation.y += dt * 0.012;
      points.position.y = Math.sin(time * 0.00018) * 0.18;
    },
  };
}

const CONE_LENGTH = 4.6;
const DOWN = new Vector3(0, -1, 0);

export interface BeamCone {
  mesh: Mesh;
  /** spread narrows the cone: 1 is the wide spotlight, below 1 a tighter moving head; color tints the haze */
  update(apex: Vector3, target: Vector3, opacity: number, spread?: number, color?: Color): void;
}

/** The visible cone of a light in the haze: bright at the lamp, fading toward the floor and at its silhouette */
export function createBeamCone(shared: SharedUniforms, sides = 12): BeamCone {
  const geometry = new ConeGeometry(1.15, CONE_LENGTH, sides, 1, true);
  geometry.translate(0, -CONE_LENGTH / 2, 0);
  const material = new ShaderMaterial({
    uniforms: { ...shared, uOpacity: { value: 0 }, uLength: { value: CONE_LENGTH }, uColor: { value: new Color(1, 1, 1) } },
    vertexShader: /* glsl */ `
      uniform float uLength;
      varying float vAlong;
      varying vec3 vNormalView;
      varying vec3 vViewDirection;
      varying vec3 vWorld;
      void main() {
        vAlong = -position.y / uLength;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 viewPosition = viewMatrix * world;
        vNormalView = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uColor;
      uniform float uTime;
      varying float vAlong;
      varying vec3 vNormalView;
      varying vec3 vViewDirection;
      varying vec3 vWorld;
      ${TEXT_GUARD_GLSL}
      ${NOISE_GLSL}
      void main() {
        float facing = pow(abs(dot(normalize(vNormalView), normalize(vViewDirection))), 1.6);
        float fade = pow(1.0 - clamp(vAlong, 0.0, 1.0), 1.3);
        float haze = 0.45 + 0.75 * fbm(vWorld.xy * 0.9 + vec2(uTime * 0.12, -uTime * 0.07));
        gl_FragColor = vec4(uColor * (uOpacity * facing * fade * haze * textGuard()), 1.0);
        ${OUTPUT_GLSL}
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  const direction = new Vector3();

  return {
    mesh,
    update(apex, target, opacity, spread = 1, color) {
      if (color) material.uniforms.uColor.value.copy(color);
      const length = Math.max(0.01, apex.distanceTo(target)) / CONE_LENGTH;
      mesh.position.copy(apex);
      mesh.scale.set(length * spread, length, length * spread);
      direction.subVectors(target, apex).normalize();
      mesh.quaternion.setFromUnitVectors(DOWN, direction);
      material.uniforms.uOpacity.value = opacity;
      mesh.visible = opacity > 0.002;
    },
  };
}
