export type StageQuality = "full" | "lite";
export type StageMode = StageQuality | "none";

interface NavigatorHints {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Full scene on a capable desktop, a lighter one on phones and weak machines, none without WebGL 2
export function stageMode(): StageMode {
  if (!("WebGL2RenderingContext" in window)) return "none";

  const hints = navigator as Navigator & NavigatorHints;
  const weak =
    (navigator.hardwareConcurrency ?? 8) <= 4 ||
    (hints.deviceMemory ?? 8) <= 4 ||
    hints.connection?.saveData === true;
  const mobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

  return weak || mobile ? "lite" : "full";
}
