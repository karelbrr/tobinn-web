import { Vector2 } from "three";

// Uniforms every light effect shares, updated once per frame by the stage
export interface SharedUniforms {
  uTime: { value: number };
  uResolution: { value: Vector2 };
  uPortrait: { value: number };
}

export function createSharedUniforms(): SharedUniforms {
  return {
    uTime: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uPortrait: { value: 0 },
  };
}

// Dims an effect where the page text sits: the left column and the header strip of a wide screen,
// the lower part of a phone
export const TEXT_GUARD_GLSL = /* glsl */ `
  uniform vec2 uResolution;
  uniform float uPortrait;
  float textGuard() {
    vec2 screen = gl_FragCoord.xy / uResolution;
    float wide = mix(0.08, 1.0, smoothstep(0.34, 0.66, screen.x)) * mix(0.35, 1.0, smoothstep(0.97, 0.88, screen.y));
    float tall = mix(0.3, 1.0, smoothstep(0.3, 0.62, screen.y));
    return mix(wide, tall, uPortrait);
  }
`;

// Value noise and a four-octave sum of it, for smoke drifting through the beams
export const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 4; octave++) {
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }
`;

// Light effects add to the image; these two lines keep them consistent with the rest of the render
export const OUTPUT_GLSL = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;
