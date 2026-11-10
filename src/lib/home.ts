import { prefersReducedMotion, stageMode } from "./motion/device";
import type { Motion } from "./motion/motion";
import { linkPageToStage } from "./stage-link";
import type { Stage } from "./stage/stage";

// The loader never stays longer than this, ready or not
const LOADER_MAX_MS = 1500;

function afterFirstPaint(callback: () => void): void {
  requestAnimationFrame(() => setTimeout(callback, 0));
}

export function startHome(): void {
  const root = document.documentElement;
  const shell = document.getElementById("stage");
  const canvas = document.getElementById("stage-canvas") as HTMLCanvasElement | null;
  const scope = document.getElementById("stage-scope");
  const loader = document.getElementById("loader");
  const counter = document.getElementById("loader-count");

  const reduced = prefersReducedMotion();
  const mode = canvas && shell ? stageMode() : "none";
  const withLoader = root.classList.contains("show-loader") && loader !== null && counter !== null;

  let stage: Stage | undefined;
  let motion: Motion | undefined;
  let stageSettled = mode === "none";
  let motionSettled = reduced;
  let dropped = !withLoader;

  function connect(): void {
    if (stage && motion) motion.bindStage(stage);
  }

  function drop(): void {
    if (dropped || !loader || !counter) return;
    dropped = true;
    counter.textContent = "100";
    motion?.heroIntro();
    stage?.playIntro();
    loader.classList.add("is-done");
    const remove = () => loader.remove();
    loader.addEventListener("transitionend", remove, { once: true });
    setTimeout(remove, 1500);
  }

  // The counter runs toward 100 as the stage and motion arrive, and drops at the latest after LOADER_MAX_MS
  if (withLoader && counter) {
    const started = performance.now();
    let shown = 0;
    const step = () => {
      const elapsed = performance.now() - started;
      const ready = stageSettled && motionSettled;
      const target = ready ? 100 : Math.min(92, (elapsed / LOADER_MAX_MS) * 100);
      shown += (target - shown) * 0.18;
      counter.textContent = String(Math.round(shown)).padStart(3, "0");
      if ((ready && shown > 98.5) || elapsed >= LOADER_MAX_MS) {
        drop();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  if (mode === "none") shell?.classList.add("is-fallback");

  afterFirstPaint(() => {
    if (!reduced) {
      import("./motion/motion")
        .then(({ startMotion }) => startMotion())
        .then((instance) => {
          motion = instance;
          connect();
        })
        .catch(() => undefined)
        .finally(() => {
          motionSettled = true;
        });
    }

    if (mode !== "none" && canvas && shell) {
      import("./stage/stage")
        .then(({ createStage }) => {
          const created = createStage(canvas, { quality: mode, animated: !reduced });
          stage = created;
          created.onFirstFrame(() => shell.classList.add("is-ready"));
          created.onLost(() => {
            shell.classList.remove("is-ready");
            shell.classList.add("is-fallback");
          });
          // Without the loader the camera still settles in from above, over content that is already readable
          if (dropped) created.playIntro();
          // A still frame cannot carry labels or move the windows, so the page stays as it is without motion
          if (!reduced) linkPageToStage(created);
          if (scope) {
            new IntersectionObserver(([entry]) => created.setActive(entry.isIntersecting)).observe(scope);
          }
          connect();
        })
        .catch(() => shell.classList.add("is-fallback"))
        .finally(() => {
          stageSettled = true;
        });
    }
  });
}
