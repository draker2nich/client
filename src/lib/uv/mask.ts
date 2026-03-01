import {
  UV_ZONES,
  UV_CANVAS_SIZE,
  UV_BG_COLOR,
  UV_ZONE_COLOR,
} from "./zones";

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
 * Active zones = white, inactive = red.
 * Returns null on server (no document available).
 */
export function generateUVMask(
  activeZones: Record<string, boolean>
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = UV_CANVAS_SIZE;
  canvas.height = UV_CANVAS_SIZE;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = UV_BG_COLOR;
  ctx.fillRect(0, 0, UV_CANVAS_SIZE, UV_CANVAS_SIZE);

  for (const [zoneId, zone] of Object.entries(UV_ZONES)) {
    if (activeZones[zoneId]) {
      fillZone(ctx, zone.path, UV_ZONE_COLOR);
    }
  }

  return canvas;
}

/** All zones active — for initial generation */
export function generateFullMask(): HTMLCanvasElement | null {
  const allActive: Record<string, boolean> = {};
  for (const key of Object.keys(UV_ZONES)) {
    allActive[key] = true;
  }
  return generateUVMask(allActive);
}

/** Only specified zones active — for partial edits */
export function generateEditMask(editZones: string[]): HTMLCanvasElement | null {
  const activeZones: Record<string, boolean> = {};
  for (const key of Object.keys(UV_ZONES)) {
    activeZones[key] = editZones.includes(key);
  }
  return generateUVMask(activeZones);
}

/**
 * Composite base design + edit overlay.
 * Edit zones get new design, rest keeps base.
 */
export function compositeTextures(
  baseCanvas: HTMLCanvasElement,
  editCanvas: HTMLCanvasElement,
  editZones: string[]
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;

  const result = document.createElement("canvas");
  result.width = UV_CANVAS_SIZE;
  result.height = UV_CANVAS_SIZE;
  const ctx = result.getContext("2d")!;

  ctx.drawImage(baseCanvas, 0, 0);

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
  ctx.drawImage(editCanvas, 0, 0);
  ctx.restore();

  return result;
}

export function canvasToDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png");
}

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