import { CatmullRomCurve3, Vector3 } from "three";

// The shots in scroll order; each home page section names the one it shows
export const STAGE_KEYS = [
  "deck-wide",
  "deck-close",
  "booth-high",
  "speaker",
  "crowd",
  "booth-wide",
  "dj",
] as const;

export type StageKey = (typeof STAGE_KEYS)[number];

export interface Shot {
  subject: Vector3;
  camera: Vector3;
  /** How far the subject moves right of the centre on a wide screen, leaving the left side to the text */
  offsetX: number;
  /** How far the subject sits below the centre on a wide screen */
  offsetY: number;
  fog: number;
}

export interface Framing {
  subject: Vector3;
  camera: Vector3;
  target: Vector3;
  fog: number;
}

const UP = new Vector3(0, 1, 0);
// A portrait phone steps back so the object fits, and keeps it in the upper half above the text
const PORTRAIT_DISTANCE = 1.5;
const PORTRAIT_OFFSET_Y = -0.7;

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

function smoothstep(edge0: number, edge1: number, value: number): number {
  const amount = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return amount * amount * (3 - 2 * amount);
}

export function createFraming(): Framing {
  return { subject: new Vector3(), camera: new Vector3(), target: new Vector3(), fog: 0 };
}

export function createRig(shots: Record<StageKey, Shot>) {
  const list = STAGE_KEYS.map((key) => shots[key]);
  const last = list.length - 1;
  const cameraPath = new CatmullRomCurve3(list.map((shot) => shot.camera), false, "centripetal");
  const subjectPath = new CatmullRomCurve3(list.map((shot) => shot.subject), false, "centripetal");
  const forward = new Vector3();
  const right = new Vector3();

  function progressOf(key: StageKey): number {
    return STAGE_KEYS.indexOf(key) / last;
  }

  return {
    progressOf,

    /** 1 at the shot, falling to 0 at the neighbouring shots */
    weightOf(key: StageKey, progress: number): number {
      return Math.max(0, 1 - Math.abs(progress - progressOf(key)) * last);
    },

    frame(progress: number, aspect: number, out: Framing): Framing {
      const t = Math.min(1, Math.max(0, progress));
      const position = t * last;
      const index = Math.min(last - 1, Math.floor(position));
      const blend = position - index;
      const from = list[index];
      const to = list[index + 1];
      const portrait = smoothstep(1.15, 0.8, aspect);

      subjectPath.getPoint(t, out.subject);
      cameraPath.getPoint(t, out.camera);
      out.camera.sub(out.subject).multiplyScalar(1 + (PORTRAIT_DISTANCE - 1) * portrait).add(out.subject);

      forward.subVectors(out.subject, out.camera).normalize();
      right.crossVectors(forward, UP).normalize();
      const offsetX = lerp(from.offsetX, to.offsetX, blend) * (1 - portrait);
      const offsetY = lerp(from.offsetY, to.offsetY, blend) * (1 - portrait) + PORTRAIT_OFFSET_Y * portrait;
      out.target.copy(out.subject).addScaledVector(right, -offsetX).addScaledVector(UP, offsetY);
      out.fog = lerp(from.fog, to.fog, blend);
      return out;
    },
  };
}

export type Rig = ReturnType<typeof createRig>;
