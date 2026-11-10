import type { Stage } from "../stage/stage";

// Wraps every letter in its own span, kept together by its word, so the name can rise letter by letter
function splitLetters(element: HTMLElement): HTMLElement[] {
  const pieces: HTMLElement[] = [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    for (const token of (node.textContent ?? "").split(/(\s+)/)) {
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        fragment.append(token);
        continue;
      }
      const mask = document.createElement("span");
      mask.className = "split-mask";
      for (const letter of token) {
        const piece = document.createElement("span");
        piece.className = "split-piece";
        piece.textContent = letter;
        mask.append(piece);
        pieces.push(piece);
      }
      fragment.append(mask);
    }
    node.replaceWith(fragment);
  }
  return pieces;
}

function on(element: Element, events: string[], handler: () => void): void {
  for (const event of events) element.addEventListener(event, handler);
}

export async function startMotion() {
  const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
    import("lenis"),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  // Lenis drives the scroll, GSAP's ticker drives Lenis, ScrollTrigger listens to Lenis
  const lenis = new Lenis({ autoRaf: false, anchors: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  const heroLetters = [...document.querySelectorAll<HTMLElement>("[data-split]")].flatMap(splitLetters);

  // The booking form changes the page height; the triggers below it have to move
  window.addEventListener("tobinn:booking", () => requestAnimationFrame(() => ScrollTrigger.refresh()));

  return {
    /** Runs while the loader still covers the page, so the name is hidden before anyone sees it */
    heroIntro(): void {
      const timeline = gsap.timeline();
      timeline.from(heroLetters, { yPercent: 110, duration: 1, ease: "expo.out", stagger: 0.03 }, 0.15);
      timeline.from("[data-hero-fade]", { y: 12, autoAlpha: 0, duration: 0.8, ease: "power3.out", stagger: 0.08 }, 0.45);
    },

    /** Each section owns a shot; scrolling between two section centres travels between their shots */
    bindStage(stage: Stage): void {
      const sections = [...document.querySelectorAll<HTMLElement>("[data-stage-key]")];
      const segments = sections.slice(0, -1).map((section, index) => {
        const from = stage.progressOf(section.dataset.stageKey ?? "");
        const to = stage.progressOf(sections[index + 1].dataset.stageKey ?? "");
        const trigger = ScrollTrigger.create({
          trigger: section,
          start: "center center",
          endTrigger: sections[index + 1],
          end: "center center",
          onUpdate: (self) => stage.setProgress(from + (to - from) * self.progress),
        });
        return { trigger, from, to };
      });

      // A reload in the middle of the page starts on the right shot instead of flying there
      const scroll = window.scrollY;
      const current = [...segments].reverse().find(({ trigger }) => scroll >= trigger.start) ?? segments[0];
      if (current) {
        const span = Math.max(1, current.trigger.end - current.trigger.start);
        const amount = Math.min(1, Math.max(0, (scroll - current.trigger.start) / span));
        stage.setProgress(current.from + (current.to - current.from) * amount, true);
      }

      // Three quiet ties to the scene: a date lights the speaker, a mix lifts the crowd, the form turns the DJ to you
      document.querySelectorAll("[data-stage-spot]").forEach((element) => {
        on(element, ["pointerenter", "focusin"], () => stage.setSpot(1));
        on(element, ["pointerleave", "focusout"], () => stage.setSpot(0));
      });
      document.querySelectorAll("[data-stage-boost]").forEach((element) => {
        on(element, ["pointerenter", "focusin"], () => stage.setBoost(1));
        on(element, ["pointerleave", "focusout"], () => stage.setBoost(0));
      });
      window.addEventListener("tobinn:booking", (event) => {
        stage.setDjFocus((event as CustomEvent<{ open: boolean }>).detail.open ? 1 : 0);
      });
    },
  };
}

export type Motion = Awaited<ReturnType<typeof startMotion>>;
