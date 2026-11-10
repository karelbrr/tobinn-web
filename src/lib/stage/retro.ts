import { Color, Vector2, type Material } from "three";

// What the PS1 could not do, done on purpose: vertices snapped to the pixel grid, textures mapped
// without perspective correction, fog worked out per vertex over a short draw distance
export interface RetroUniforms {
  /** Half the internal resolution: the grid vertices snap to in clip space. Zero turns snapping off */
  uSnap: { value: Vector2 };
  uFogNear: { value: number };
  uFogFar: { value: number };
  uFogColor: { value: Color };
}

export function createRetroUniforms(): RetroUniforms {
  return {
    uSnap: { value: new Vector2() },
    uFogNear: { value: 5 },
    uFogFar: { value: 17 },
    uFogColor: { value: new Color(0x050505) },
  };
}

const VERTEX_DECLARATIONS = /* glsl */ `
  #include <common>
  uniform vec2 uSnap;
  uniform float uFogNear;
  uniform float uFogFar;
  varying float vRetroFog;
  varying vec3 vAffineUv;
`;

const VERTEX_PROJECTION = /* glsl */ `
  #include <project_vertex>
  vRetroFog = clamp((-mvPosition.z - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  #ifdef USE_MAP
    // Carry uv * w and w; dividing them per fragment undoes the perspective correction
    vAffineUv = vec3(vMapUv * gl_Position.w, gl_Position.w);
  #endif
  if (uSnap.x > 0.0) {
    vec2 ndc = gl_Position.xy / gl_Position.w;
    gl_Position.xy = floor(ndc * uSnap + 0.5) / uSnap * gl_Position.w;
  }
`;

const FRAGMENT_DECLARATIONS = /* glsl */ `
  #include <common>
  uniform vec3 uFogColor;
  varying float vRetroFog;
  varying vec3 vAffineUv;
`;

const FRAGMENT_MAP = /* glsl */ `
  #ifdef USE_MAP
    vec4 sampledDiffuseColor = texture2D(map, vAffineUv.xy / vAffineUv.z);
    diffuseColor *= sampledDiffuseColor;
  #endif
`;

const FRAGMENT_FOG = /* glsl */ `
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogColor, vRetroFog);
`;

/** Rewrites a built-in material's shader for the PS1 look; the scene keeps no fog of its own */
export function applyRetro(material: Material, uniforms: RetroUniforms): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", VERTEX_DECLARATIONS)
      .replace("#include <project_vertex>", VERTEX_PROJECTION);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", FRAGMENT_DECLARATIONS)
      .replace("#include <map_fragment>", FRAGMENT_MAP)
      .replace("#include <fog_fragment>", FRAGMENT_FOG);
  };
  material.needsUpdate = true;
}

/**
 * The one post-processing pass over the low resolution frame: a few levels of brightness with 4x4 ordered
 * dithering, film grain, optional scanlines and a vignette like an old television. Only a fraction of the
 * colour survives (uSaturation), added back after the brightness is quantized, so greys stay exactly grey
 * and the dither never turns into coloured noise
 */
export const RetroShader = {
  name: "RetroShader",
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new Vector2(1, 1) },
    uLevels: { value: 24 },
    uGrain: { value: 0.05 },
    uSeed: { value: 0 },
    uScanlines: { value: 0.1 },
    uVignette: { value: 0.85 },
    uSaturation: { value: 0.2 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uLevels;
    uniform float uGrain;
    uniform float uSeed;
    uniform float uScanlines;
    uniform float uVignette;
    uniform float uSaturation;
    varying vec2 vUv;

    const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 pixel = floor(vUv * uResolution);
      vec3 source = texture2D(tDiffuse, vUv).rgb;
      float luma = dot(source, vec3(0.299, 0.587, 0.114));
      vec3 tint = (source - luma) * uSaturation;

      luma += (hash(pixel + uSeed) - 0.5) * uGrain;

      vec2 centred = vUv - 0.5;
      float shade = (1.0 - dot(centred, centred) * uVignette) * (1.0 - uScanlines * mod(pixel.y, 2.0));
      luma *= shade;
      tint *= shade;

      int cell = int(mod(pixel.x, 4.0)) + int(mod(pixel.y, 4.0)) * 4;
      float threshold = (BAYER[cell] + 0.5) / 16.0 - 0.5;
      float steps = uLevels - 1.0;
      luma = floor(clamp(luma, 0.0, 1.0) * steps + 0.5 + threshold) / steps;

      gl_FragColor = vec4(clamp(vec3(clamp(luma, 0.0, 1.0)) + tint, 0.0, 1.0), 1.0);
    }
  `,
};
