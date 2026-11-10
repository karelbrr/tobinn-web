// One beat for the whole page: the 3D stage and the HTML layer read the same clock
export const BPM = 124;
const BEAT_MS = 60_000 / BPM;

export interface Beat {
  /** Whole beats since the page started */
  count: number;
  /** Position inside the current beat, from 0 to 1 */
  phase: number;
  /** Kick drum envelope: 1 on the beat, decaying until the next one */
  kick: number;
  /** Off-beat hi-hat envelope */
  hat: number;
}

export function beatAt(timeMs: number): Beat {
  const beats = timeMs / BEAT_MS;
  const count = Math.floor(beats);
  const phase = beats - count;
  return {
    count,
    phase,
    kick: Math.exp(-phase * 7),
    hat: phase >= 0.5 ? Math.exp(-(phase - 0.5) * 16) : 0,
  };
}
