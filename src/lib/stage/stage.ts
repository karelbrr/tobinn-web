import {
  ACESFilmicToneMapping,
  BoxGeometry,
  Color,
  HalfFloatType,
  HemisphereLight,
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SpotLight,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
  type Material,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { beatAt } from "../motion/beat";
import type { StageQuality } from "../motion/device";
import { createBeamCone, createDust } from "./atmosphere";
import { createCrowd } from "./crowd";
import { createDeck } from "./deck";
import { createDj } from "./dj";
import { createSharedUniforms } from "./effects";
import { createLasers, type LaserEmitter } from "./lasers";
import { createLightShow } from "./lightshow";
import { createMaterials } from "./materials";
import { createMicrophone } from "./microphone";
import { COOL_WHITE, CREAM, SCENE_SATURATION } from "./palette";
import { applyRetro, createRetroUniforms, RetroShader } from "./retro";
import { createFraming, createRig, STAGE_KEYS, type StageKey } from "./rig";
import { part } from "./shapes";
import { createSmoke } from "./smoke";
import { createSpeaker } from "./speaker";

export interface StageOptions {
  quality: StageQuality;
  /** False renders one still frame, for visitors who asked for less motion */
  animated: boolean;
}

export interface StageFrame {
  progress: number;
}

export interface Stage {
  progressOf(key: string): number;
  /** 1 while the camera holds the section's shot, falling to 0 at the neighbouring shots */
  weightOf(key: string): number;
  setProgress(progress: number, immediate?: boolean): void;
  /** Tour row hovered: the white beam swings onto the speaker and the lasers speed up */
  setSpot(level: number): void;
  /** A mix hovered: records spin faster, the speaker pumps harder, the lights brighten */
  setBoost(level: number): void;
  /** Booking form open: the camera leans in and the DJ looks up into it */
  setDjFocus(level: number): void;
  /** The camera drops into place from above, after the loader */
  playIntro(): void;
  setActive(active: boolean): void;
  /** Called after every rendered frame, so the page text arrives with the camera in the same loop */
  onFrame(callback: (frame: StageFrame) => void): void;
  onFirstFrame(callback: () => void): void;
  onLost(callback: () => void): void;
}

const KEY_OFFSET = new Vector3(1.8, 4.6, 2.6);
const RIM_OFFSET = new Vector3(-1.7, 1.4, -2.3);
const BEAM_HEIGHT = 3.2;
// A soft flash once every 16 beats, about every 7.7 s: far below the three flashes a second WCAG allows
const STROBE_EVERY = 16;
// The shorter side of the internal frame, in pixels: a PS2-era 320 on a desktop, a PS1-era 240 on a phone
const INTERNAL_SHORT_SIDE = { full: 320, lite: 240 };
// Brightness levels after quantization: few enough to band, enough to keep the smoke readable
const GREY_LEVELS = 24;

// Frame-rate independent easing toward a target
const damp = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

function isStageKey(key: string): key is StageKey {
  return (STAGE_KEYS as readonly string[]).includes(key);
}

function portraitAmount(aspect: number): number {
  const amount = Math.min(1, Math.max(0, (1.15 - aspect) / 0.35));
  return amount * amount * (3 - 2 * amount);
}

export function createStage(canvas: HTMLCanvasElement, options: StageOptions): Stage {
  const full = options.quality === "full";
  const detail = full ? 1 : 0.6;
  const strobeOn = full && options.animated;

  // No antialiasing: hard pixel edges are part of the look
  const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = full;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  scene.background = new Color(0x050505);
  const retro = createRetroUniforms();

  // A faint studio environment gives the metal parts something to reflect
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.25;
  pmrem.dispose();

  const camera = new PerspectiveCamera(36, 1, 0.1, 60);
  const shared = createSharedUniforms();

  // Real lights stay few: ambient fill, a key spot over the subject, a white rim on the beat, the beam.
  // The moving heads and lasers are drawn, not lit, so they cost no lighting.
  const hemisphere = new HemisphereLight(0xb4b4bc, 0x050505, 0.35);
  const key = new SpotLight(0xffffff, 380, 16, 0.55, 0.65, 2);
  key.castShadow = full;
  key.shadow.mapSize.set(512, 512);
  key.shadow.bias = -0.0004;
  key.shadow.radius = 3;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 16;
  const rim = new PointLight(COOL_WHITE, 10, 9, 2);
  const beam = new SpotLight(CREAM, 0, 10, 0.3, 0.55, 2);
  scene.add(hemisphere, key, key.target, rim, beam, beam.target);

  const materials = createMaterials();

  // A faceted floor: a coarse grid nudged up and down, so the light breaks on its triangles
  const floorGeometry = new PlaneGeometry(40, 40, 28, 28);
  const floorPositions = floorGeometry.attributes.position;
  for (let index = 0; index < floorPositions.count; index++) {
    floorPositions.setZ(index, (Math.random() - 0.5) * 0.06);
  }
  floorGeometry.computeVertexNormals();
  const floor = new Mesh(floorGeometry, materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const deck = createDeck(materials, detail);
  scene.add(deck.group);

  const speaker = createSpeaker(materials, detail, full ? 6 : 4);
  speaker.group.position.set(3.5, 0, -1.4);
  speaker.group.rotation.y = -0.5;
  scene.add(speaker.group);

  // The microphone stays on the left as set dressing, out of the closing shot
  const microphone = createMicrophone(materials, detail);
  microphone.group.position.set(-3.3, 0, 1.0);
  microphone.group.rotation.y = -0.6;
  scene.add(microphone.group);

  // DJ Tobinn behind the decks, and the crowd on the floor in front of him
  const dj = createDj();
  dj.group.position.set(0, 0, -1.0);
  scene.add(dj.group);
  const crowd = createCrowd(full ? 100 : 32);
  scene.add(...crowd.meshes);

  const lightShow = createLightShow(materials, shared, 4);
  scene.add(lightShow.group);

  // Laser emitters: one on top of the truss, two low behind the booth crossing toward the middle
  const emitters: LaserEmitter[] = [{ position: new Vector3(0, 4.88, -2.0), yaw: 0 }];
  if (full) {
    emitters.push({ position: new Vector3(-1.7, 1.28, -1.1), yaw: 0.3 }, { position: new Vector3(1.7, 1.28, -1.1), yaw: -0.3 });
  }
  const emitterBox = new BoxGeometry(0.32, 0.16, 0.26);
  for (const emitter of emitters) {
    scene.add(part(emitterBox, materials.body, [emitter.position.x, emitter.position.y - 0.08, emitter.position.z - 0.05]));
  }
  const lasers = createLasers(emitters, full ? 10 : 6, shared);
  scene.add(lasers.mesh);

  const smoke = createSmoke(shared, full ? 3 : 1, full);
  scene.add(smoke.group);
  const dust = createDust(full ? 900 : 200);
  scene.add(dust.points);
  const cone = createBeamCone(shared);
  scene.add(cone.mesh);

  // Every built-in material gets the PS1 vertex and fog treatment; the light effects have shaders of their own
  const patched = new Set<Material>();
  scene.traverse((object) => {
    const materials = "material" in object ? [object.material].flat() : [];
    for (const material of materials as Material[]) {
      if (patched.has(material) || material instanceof ShaderMaterial || material instanceof PointsMaterial) continue;
      applyRetro(material, retro);
      patched.add(material);
    }
  });

  scene.updateMatrixWorld(true);
  const at = (object: { getWorldPosition(target: Vector3): Vector3 }) => object.getWorldPosition(new Vector3());
  const deckPoint = at(deck.focus);
  const platterPoint = at(deck.platterFocus);
  const platterB = new Vector3(-platterPoint.x - 0.24, platterPoint.y, platterPoint.z);
  const speakerPoint = at(speaker.focus);
  const djPoint = at(dj.focus);
  const stageFrame: StageFrame = { progress: 0 };

  // The page keeps its text in a narrow column on the left, so every shot puts its object right of centre
  // and keeps the truss, the heads or the lasers in the frame
  const rig = createRig({
    "deck-wide": { subject: deckPoint, camera: new Vector3(0.4, 4.3, 8.8), offsetX: 1.7, offsetY: 0.35, fog: 0.04 },
    // The close-up takes the right-hand record: the microphone stands far to the left, out of the frame
    "deck-close": { subject: platterB, camera: new Vector3(3.5, 2.2, 1.5), offsetX: 0.8, offsetY: 0.2, fog: 0.04 },
    "booth-high": { subject: new Vector3(0.5, 1.6, -0.6), camera: new Vector3(1.8, 5.6, 7.4), offsetX: 1.8, offsetY: 0.6, fog: 0.045 },
    speaker: { subject: speakerPoint, camera: new Vector3(0.6, 2.4, 4.4), offsetX: 1.3, offsetY: 0.5, fog: 0.04 },
    // Over the heads at the back of the crowd, toward the booth and the lights
    crowd: { subject: new Vector3(0.3, 1.5, 2.4), camera: new Vector3(3.0, 3.2, 9.8), offsetX: 1.1, offsetY: 0.2, fog: 0.035 },
    "booth-wide": { subject: new Vector3(0, 1.8, -0.5), camera: new Vector3(-0.6, 3.0, 9.5), offsetX: 1.6, offsetY: 0.3, fog: 0.045 },
    // A medium shot of the DJ from between the booth and the crowd, the lasers and the rig behind him
    dj: { subject: djPoint, camera: new Vector3(1.05, 2.15, 1.75), offsetX: 0.5, offsetY: 0.05, fog: 0.04 },
  });

  // Bloom on the full scene only and kept tight: at the low resolution a wide blur would veil the whole frame.
  // Then tone mapping, then the retro pass
  const composer = new EffectComposer(renderer, new WebGLRenderTarget(1, 1, { type: HalfFloatType }));
  composer.addPass(new RenderPass(scene, camera));
  if (full) composer.addPass(new UnrealBloomPass(new Vector2(1, 1), 0.35, 0.08, 0.9));
  composer.addPass(new OutputPass());
  const retroPass = new ShaderPass(RetroShader);
  retroPass.uniforms.uLevels.value = GREY_LEVELS;
  retroPass.uniforms.uSaturation.value = SCENE_SATURATION;
  retroPass.uniforms.uGrain.value = full ? 0.055 : 0.04;
  retroPass.uniforms.uScanlines.value = full ? 0.1 : 0;
  composer.addPass(retroPass);

  const state = {
    progress: 0,
    progressTarget: 0,
    spot: 0,
    spotTarget: 0,
    boost: 0,
    boostTarget: 0,
    focus: 0,
    focusTarget: 0,
    intro: 0,
    strobe: 0,
    lastBeat: -1,
    pointerX: 0,
    pointerY: 0,
    pointerXTarget: 0,
    pointerYTarget: 0,
  };
  const framing = createFraming();
  const right = new Vector3();
  const back = new Vector3();
  const beamSubject = djPoint.clone();
  const beamApex = new Vector3();
  const UP = new Vector3(0, 1, 0);
  const smokeLights = [
    ...lightShow.poolPositions.map((position, index) => ({ position, strength: 0.9, color: lightShow.poolColors[index] })),
    ...emitters.map((emitter) => ({ position: emitter.position, strength: 0.35 })),
    { position: beamSubject, strength: 0, color: CREAM },
  ];
  const beamLight = smokeLights[smokeLights.length - 1];

  function frame(time: number, dt: number): void {
    const beat = beatAt(time);
    shared.uTime.value = time / 1000;
    state.progress = damp(state.progress, state.progressTarget, 3.5, dt);
    state.spot = damp(state.spot, state.spotTarget, 5, dt);
    state.boost = damp(state.boost, state.boostTarget, 2.5, dt);
    state.focus = damp(state.focus, state.focusTarget, 2.5, dt);
    state.intro = damp(state.intro, 0, 1.4, dt);
    state.pointerX = damp(state.pointerX, state.pointerXTarget, 2.5, dt);
    state.pointerY = damp(state.pointerY, state.pointerYTarget, 2.5, dt);

    if (beat.count !== state.lastBeat) {
      if (strobeOn && state.lastBeat >= 0 && beat.count % STROBE_EVERY === 0) state.strobe = 1;
      state.lastBeat = beat.count;
    }
    state.strobe *= Math.exp(-dt * 22);

    rig.frame(state.progress, camera.aspect, framing);

    // Pointer parallax, the lean toward the microphone and the intro drop all move the camera off its path
    back.subVectors(framing.camera, framing.subject).normalize();
    right.crossVectors(UP, back).normalize();
    camera.position
      .copy(framing.camera)
      .addScaledVector(right, state.pointerX * 0.35)
      .addScaledVector(UP, state.pointerY * 0.2 + state.intro * 2.6)
      .addScaledVector(back, state.intro * 4.5)
      .lerp(framing.subject, state.focus * 0.32);
    camera.lookAt(framing.target);
    // Linear fog over a short draw distance; the camera sees no further than the fog reaches
    const fogFar = 0.7 / (framing.fog + state.intro * 0.05);
    retro.uFogFar.value = fogFar;
    retro.uFogNear.value = fogFar * 0.3;
    camera.far = fogFar + 2;
    camera.updateProjectionMatrix();
    // Fresh grain every frame, frozen for visitors who asked for less motion
    if (options.animated) retroPass.uniforms.uSeed.value = (time % 1000) * 0.731;

    key.position.copy(framing.subject).add(KEY_OFFSET);
    key.target.position.copy(framing.subject);
    rim.position.copy(framing.subject).add(RIM_OFFSET);
    rim.intensity = (8 + beat.kick * 26) * (1 + state.boost * 0.6);
    hemisphere.intensity = 0.35 + state.strobe * 3;
    renderer.toneMappingExposure = 1.05 + state.strobe * 0.45;

    // The beam stands over the DJ in the closing shot, or swings onto the speaker while a date is hovered
    const djWeight = rig.weightOf("dj", state.progress);
    // Half the key light on the DJ: the close shot needs no more, and the white t-shirt would burn out
    key.intensity = 380 * (1 - djWeight * 0.5);
    const beamLevel = Math.max(djWeight * (0.55 + state.focus * 0.45), state.spot);
    const toSpeaker = state.spot / (state.spot + djWeight + 0.0001);
    beamSubject.lerpVectors(djPoint, speakerPoint, toSpeaker);
    beamApex.copy(beamSubject).setY(beamSubject.y + BEAM_HEIGHT);
    beam.position.copy(beamApex);
    beam.target.position.copy(beamSubject);
    // Softer on the DJ than on the speaker: a white t-shirt under a full beam would burn out to a blob
    beam.intensity = beamLevel * (60 + 200 * toSpeaker);
    cone.update(beamApex, beamSubject, beamLevel * (0.04 + 0.38 * toSpeaker), 1, CREAM);
    beamLight.strength = beamLevel * 0.8;

    deck.update(dt, time, beat, state.boost);
    speaker.update(dt, beat, state.boost);
    dj.update(beat, time, state.focus, camera.position);
    crowd.update(dt, beat, state.boost);
    lightShow.update(time, beat, 1 + state.boost * 0.3);
    // The low emitters stand beside the DJ and fire toward his shot, so the lasers dim while the camera is on him
    lasers.update(dt, beat, 1 + state.spot * 1.4, (0.85 + state.boost * 0.4) * (1 - djWeight * 0.65));
    smoke.update(smokeLights);
    dust.update(dt, time);

    composer.render(dt);
    emitFrame();
  }

  let frameCallback: ((frame: StageFrame) => void) | undefined;
  function emitFrame(): void {
    if (!frameCallback) return;
    stageFrame.progress = state.progress;
    frameCallback(stageFrame);
  }

  // Render loop, paused while the tab is hidden or the stage is scrolled away
  let active = true;
  let running = false;
  let lastTime = 0;
  let rendered = false;
  let firstFrame: (() => void) | undefined;
  let lostCallback: (() => void) | undefined;

  function markRendered(): void {
    if (rendered) return;
    rendered = true;
    firstFrame?.();
  }

  function loop(time: number): void {
    const dt = Math.min(0.05, Math.max(0, (time - lastTime) / 1000));
    lastTime = time;
    frame(time, dt);
    markRendered();
  }

  // One frame with the lasers frozen where they stand, for visitors who asked for less motion
  function renderStill(): void {
    state.progress = state.progressTarget;
    frame(performance.now(), 0);
    markRendered();
  }

  function updateLoop(): void {
    const shouldRun = options.animated && active && !document.hidden;
    if (shouldRun === running) return;
    running = shouldRun;
    lastTime = performance.now();
    renderer.setAnimationLoop(shouldRun ? loop : null);
  }

  function resize(): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    // Render small and let CSS stretch the canvas with hard pixels
    const ratio = Math.min(1, INTERNAL_SHORT_SIDE[options.quality] / Math.min(width, height));
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    composer.setPixelRatio(ratio);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.fov = camera.aspect < 1 ? 50 : 36;
    camera.updateProjectionMatrix();
    renderer.getDrawingBufferSize(shared.uResolution.value);
    retroPass.uniforms.uResolution.value.copy(shared.uResolution.value);
    if (options.animated) retro.uSnap.value.copy(shared.uResolution.value).multiplyScalar(0.5);
    shared.uPortrait.value = portraitAmount(camera.aspect);
    if (!running) renderStill();
  }

  new ResizeObserver(resize).observe(canvas);
  document.addEventListener("visibilitychange", updateLoop);
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    active = false;
    updateLoop();
    lostCallback?.();
  });

  if (options.animated && window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener(
      "pointermove",
      (event) => {
        state.pointerXTarget = (event.clientX / window.innerWidth) * 2 - 1;
        state.pointerYTarget = -((event.clientY / window.innerHeight) * 2 - 1);
      },
      { passive: true },
    );
  }

  resize();
  updateLoop();

  return {
    progressOf(name) {
      return isStageKey(name) ? rig.progressOf(name) : 0;
    },
    weightOf(name) {
      return isStageKey(name) ? rig.weightOf(name, state.progress) : 0;
    },
    onFrame(callback) {
      frameCallback = callback;
    },
    setProgress(progress, immediate = false) {
      state.progressTarget = progress;
      if (immediate) state.progress = progress;
      if (!options.animated) renderStill();
    },
    setSpot(level) {
      state.spotTarget = level;
    },
    setBoost(level) {
      state.boostTarget = level;
    },
    setDjFocus(level) {
      state.focusTarget = level;
    },
    playIntro() {
      if (options.animated) state.intro = 1;
    },
    setActive(next) {
      active = next;
      updateLoop();
    },
    onFirstFrame(callback) {
      if (rendered) callback();
      else firstFrame = callback;
    },
    onLost(callback) {
      lostCallback = callback;
    },
  };
}
