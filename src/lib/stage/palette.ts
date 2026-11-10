import { Color } from "three";

// The scene is black and white; colour comes only from the light, as a faint pastel tint.
// Every coloured effect takes its tone from here.

/** One tone per moving head; they shift one head along every 32-beat phrase */
export const PASTELS = [
  new Color("#c8b8ff"), // lavender
  new Color("#b6efd6"), // mint
  new Color("#ffd0b5"), // peach
  new Color("#b5d6ff"), // sky
];

/** The beam over the DJ and over the speaker */
export const CREAM = new Color("#fff0dc");

/** The rim light that pulses on the beat */
export const COOL_WHITE = new Color("#e2eaff");

/** How much colour the retro pass lets through, from 0 (grey) to 1 (full) */
export const SCENE_SATURATION = 0.45;

/** The lasers are the one place with real colour: richer pastels than the heads, still soft after the retro pass */
export const LASER_COLORS = [
  new Color("#a184ff"), // violet
  new Color("#6fe3b4"), // mint
  new Color("#ff9f7a"), // coral
  new Color("#72b6ff"), // blue
];

/** How far a beam leans from white toward its colour; the core stays bright */
export const LASER_TINT = 0.85;
