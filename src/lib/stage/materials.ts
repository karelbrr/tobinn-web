import {
  CanvasTexture,
  Color,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";

// The stage is black and white: every light and glow is white, the objects are greys
export const WHITE = new Color(0xffffff);

/** White pushed above 1, so the bloom pass catches it */
export function glowColor(strength: number, target = new Color()): Color {
  return target.copy(WHITE).multiplyScalar(strength);
}

function canvasTexture(size: number, draw: (context: CanvasRenderingContext2D, size: number) => void): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) draw(context, size);
  // Small, unfiltered and without mipmaps, like a console's texture memory allowed
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

// Vinyl from above: a few crisp tracks rather than fine grooves, to match the faceted models
function trackTexture(): CanvasTexture {
  return canvasTexture(64, (context, size) => {
    const center = size / 2;
    context.fillStyle = "#101012";
    context.fillRect(0, 0, size, size);
    for (const [radius, shade] of [[31, "#1c1c1f"], [26, "#09090a"], [20, "#1a1a1d"], [15, "#09090a"]] as const) {
      context.fillStyle = shade;
      context.beginPath();
      context.arc(center, center, radius, 0, Math.PI * 2);
      context.fill();
    }
  });
}

// Record label: the name on a band, so the spin reads
export function labelTexture(background: string, ink: string): CanvasTexture {
  return canvasTexture(64, (context, size) => {
    const center = size / 2;
    context.fillStyle = background;
    context.fillRect(0, 0, size, size);
    context.fillStyle = ink;
    context.fillRect(center - 23, center - 16, 46, 9);
    context.fillRect(center - 14, center + 10, 28, 4);
    context.fillStyle = background;
    context.font = "bold 7px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("TOBINN", center, center - 11);
  });
}

// Floor tiles with dark grout, repeated across the club
function tileTexture(): CanvasTexture {
  const texture = canvasTexture(64, (context, size) => {
    context.fillStyle = "#151517";
    context.fillRect(0, 0, size, size);
    for (const [x, y, shade] of [[0, 0, "#1c1c1f"], [32, 0, "#141416"], [0, 32, "#121214"], [32, 32, "#1a1a1d"]] as const) {
      context.fillStyle = shade;
      context.fillRect(x + 1, y + 1, 30, 30);
    }
    context.fillStyle = "#060607";
    context.fillRect(0, 31, size, 2);
    context.fillRect(31, 0, 2, size);
  });
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(20, 20);
  return texture;
}

// Soft round dot for the dust and the light pools on the floor
export function dotTexture(): CanvasTexture {
  return canvasTexture(32, (context, size) => {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  });
}

const faceted = (color: number, roughness: number, metalness: number) =>
  new MeshStandardMaterial({ color, roughness, metalness, flatShading: true });

export function createMaterials() {
  return {
    body: faceted(0x3a3a3f, 0.6, 0.25),
    matte: faceted(0x232326, 0.9, 0.05),
    panel: faceted(0x4d4d52, 0.75, 0.1),
    rubber: faceted(0x111112, 1, 0),
    metal: faceted(0xb4b4ba, 0.35, 0.8),
    darkMetal: faceted(0x5c5c62, 0.45, 0.7),
    knob: faceted(0x6a6a70, 0.6, 0.2),
    paper: faceted(0xe6e6e2, 0.7, 0),
    vinyl: new MeshStandardMaterial({ map: trackTexture(), roughness: 0.35, metalness: 0.2, flatShading: true }),
    floor: new MeshStandardMaterial({ map: tileTexture(), roughness: 0.6, metalness: 0.3, flatShading: true }),
    glow: new MeshBasicMaterial({ color: glowColor(2.2), toneMapped: false }),
  };
}

export type Materials = ReturnType<typeof createMaterials>;
