import {
  UV_ZONES,
  UV_CANVAS_SIZE,
  UV_BG_COLOR,
  UV_ZONE_COLOR,
} from "./zones";

/** Parse SVG path d-string into array of [x, y] points */
function parseSvgPath(d: string): [number, number][] {
  const cmds = d.match(/[MLZmlz][^MLZmlz]*/g) || [];
  const pts: [number, number][] = [];
  for (const cmd of cmds) {
    if (cmd[0] === "z" || cmd[0] === "Z") continue;
    const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      if (!isNaN(nums[i]) && !isNaN(nums[i + 1])) {
        pts.push([nums[i], nums[i + 1]]);
      }
    }
  }
  return pts;
}

/** Draw a single zone path filled with given color */
function fillZone(
  ctx: CanvasRenderingContext2D,
  pathData: string,
  color: string
): void {
  const pts = parseSvgPath(pathData);
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0], pts[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Generate a UV mask canvas.
 * Active zones = white (design area), inactive = red (masked).
 *
 * @param activeZones - Record of zone IDs to boolean (true = active/white)
 * @returns OffscreenCanvas or HTMLCanvasElement (2048x2048)
 */
export function generateUVMask(
  activeZones: Record<string, boolean>
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = UV_CANVAS_SIZE;
  canvas.height = UV_CANVAS_SIZE;
  const ctx = canvas.getContext("2d")!;

  // Fill entire canvas with red (masked area)
  ctx.fillStyle = UV_BG_COLOR;
  ctx.fillRect(0, 0, UV_CANVAS_SIZE, UV_CANVAS_SIZE);

  // Fill active zones with white
  for (const [zoneId, zone] of Object.entries(UV_ZONES)) {
    if (activeZones[zoneId]) {
      fillZone(ctx, zone.path, UV_ZONE_COLOR);
    }
  }

  return canvas;
}

/**
 * Generate the initial full UV mask (all zones active).
 * Used for first-time design generation.
 */
export function generateFullMask(): HTMLCanvasElement {
  const allActive: Record<string, boolean> = {};
  for (const key of Object.keys(UV_ZONES)) {
    allActive[key] = true;
  }
  return generateUVMask(allActive);
}

/**
 * Generate editing mask — only specified zones are active (white),
 * rest are masked (red). Used for partial design edits.
 *
 * @param editZones - Array of zone IDs to keep active for editing
 */
export function generateEditMask(editZones: string[]): HTMLCanvasElement {
  const activeZones: Record<string, boolean> = {};
  for (const key of Object.keys(UV_ZONES)) {
    activeZones[key] = editZones.includes(key);
  }
  return generateUVMask(activeZones);
}

/**
 * Composite two UV textures: base design + edit overlay.
 * The edit overlay's red areas become transparent,
 * and the design parts are placed on top of the base.
 *
 * @param baseCanvas - Previous full design texture
 * @param editCanvas - New generated texture (with red masked areas)
 * @param editZones - Which zones were edited (to know what to cut)
 * @returns Composited canvas
 */
export function compositeTextures(
  baseCanvas: HTMLCanvasElement,
  editCanvas: HTMLCanvasElement,
  editZones: string[]
): HTMLCanvasElement {
  const result = document.createElement("canvas");
  result.width = UV_CANVAS_SIZE;
  result.height = UV_CANVAS_SIZE;
  const ctx = result.getContext("2d")!;

  // Step 1: Draw base design
  ctx.drawImage(baseCanvas, 0, 0);

  // Step 2: Create a clipping mask from edit zones, then draw edit texture
  ctx.save();
  ctx.beginPath();
  for (const zoneId of editZones) {
    const zone = UV_ZONES[zoneId];
    if (!zone) continue;
    const pts = parseSvgPath(zone.path);
    if (pts.length < 2) continue;
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
  }
  ctx.clip();

  // Step 3: Draw edit texture only within clipped zones
  ctx.drawImage(editCanvas, 0, 0);
  ctx.restore();

  return result;
}

/**
 * Export canvas as PNG data URL
 */
export function canvasToDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

/**
 * Export canvas as Blob (for sending to API)
 */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      "image/png"
    );
  });
}