import type { Stage } from "./stage/stage";

const smoothstep = (edge0: number, edge1: number, value: number) => {
  const amount = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return amount * amount * (3 - 2 * amount);
};

// Writes a style only when it changed, so a still camera costs no style work
function setStyle(element: HTMLElement, property: "opacity" | "transform", value: string): void {
  if (element.style[property] !== value) element.style[property] = value;
}

/**
 * Each section's text fades in as the camera reaches the section's shot and out as it leaves,
 * in the stage's own frame loop, so text and camera move together
 */
export function linkPageToStage(stage: Stage): void {
  const blocks = [...document.querySelectorAll<HTMLElement>("[data-presence]")].map((element) => {
    const key = element.closest<HTMLElement>("[data-stage-key]")?.dataset.stageKey ?? "";
    return { element, key, at: stage.progressOf(key) };
  });

  stage.onFrame((frame) => {
    for (const block of blocks) {
      const presence = smoothstep(0.1, 0.55, stage.weightOf(block.key));
      // Before its shot the text rises from slightly below, after it the text leaves upward
      const direction = frame.progress < block.at ? 1 : -1;
      setStyle(block.element, "opacity", presence.toFixed(2));
      setStyle(
        block.element,
        "transform",
        presence > 0.995 ? "none" : `translate3d(0, ${((1 - presence) * 16 * direction).toFixed(1)}px, 0)`,
      );
    }
  });
}
