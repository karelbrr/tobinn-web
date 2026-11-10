import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Group,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector4,
  type Vector3,
} from "three";
import { NOISE_GLSL, OUTPUT_GLSL, TEXT_GUARD_GLSL, type SharedUniforms } from "./effects";

const MAX_LIGHTS = 8;
const WHITE = new Color(1, 1, 1);
// Low sheets thicken the haze near the floor (the height fog); the curtain hangs behind the truss
const LAYER_HEIGHTS = [0.18, 0.6, 1.15];

export interface Smoke {
  group: Group;
  /** Positions that light the smoke around them, each with a strength and the colour it lends the haze */
  update(lights: { position: Vector3; strength: number; color?: Color }[]): void;
}

export function createSmoke(shared: SharedUniforms, layers: number, withCurtain: boolean): Smoke {
  const lightUniform = Array.from({ length: MAX_LIGHTS }, () => new Vector4());
  const colorUniform = Array.from({ length: MAX_LIGHTS }, () => new Color(1, 1, 1));
  const material = new ShaderMaterial({
    uniforms: { ...shared, uLights: { value: lightUniform }, uLightColors: { value: colorUniform } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec4 uLights[${MAX_LIGHTS}];
      uniform vec3 uLightColors[${MAX_LIGHTS}];
      varying vec3 vWorld;
      ${TEXT_GUARD_GLSL}
      ${NOISE_GLSL}
      void main() {
        // Smoke is only seen where light hits it: a faint base, brighter around each light
        vec2 drift = vec2(uTime * 0.035, uTime * 0.022);
        float density = fbm(vWorld.xz * 0.32 + vWorld.y * 2.7 + drift) * fbm(vWorld.xy * 0.25 - drift);
        float smoke = smoothstep(0.08, 0.42, density);
        vec3 lit = vec3(0.02);
        for (int index = 0; index < ${MAX_LIGHTS}; index++) {
          vec4 light = uLights[index];
          vec3 offset = vWorld - light.xyz;
          lit += uLightColors[index] * light.w * exp(-dot(offset, offset) / 3.2);
        }
        float edge = 1.0 - smoothstep(8.0, 15.0, length(vWorld.xz));
        gl_FragColor = vec4(lit * (smoke * edge * 0.5 * textGuard()), 1.0);
        ${OUTPUT_GLSL}
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });

  const group = new Group();
  for (const height of LAYER_HEIGHTS.slice(0, layers)) {
    const sheet = new Mesh(new PlaneGeometry(32, 32), material);
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.y = height;
    group.add(sheet);
  }
  if (withCurtain) {
    const curtain = new Mesh(new PlaneGeometry(26, 9), material);
    curtain.position.set(0, 4, -3.4);
    group.add(curtain);
  }

  return {
    group,
    update(lights) {
      lightUniform.forEach((slot, index) => {
        const light = lights[index];
        if (light) slot.set(light.position.x, light.position.y, light.position.z, light.strength);
        else slot.set(0, 0, 0, 0);
        colorUniform[index].copy(light?.color ?? WHITE);
      });
    },
  };
}
