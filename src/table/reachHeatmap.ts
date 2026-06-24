import * as THREE from 'three';

// A reach heatmap painted over the screen: how easily the user at the table edge
// can touch each point. Green = comfortable, amber → red toward the arm's limit,
// faint grey beyond reach. The reach origin is the table's outer edge (centre of
// the near side); the screen is offset back by the border `bezel`, so points are
// measured from `bezel` in. Mirrors the projection heatmap's CanvasTexture style.

type RGBA = [number, number, number, number];

// Comfort ramp by normalized reach t = distance / maxReach.
function rampColor(t: number): RGBA {
  if (t > 1) return [120, 130, 140, 70]; // beyond reach — faint grey
  const a = 150; // translucent so the content shows through
  if (t <= 0.6) {
    // easy: green → yellow-green
    const k = t / 0.6;
    return [Math.round(40 + 180 * k), Math.round(170 + 20 * k), 60, a];
  }
  if (t <= 0.85) {
    // reaching: yellow → orange
    const k = (t - 0.6) / 0.25;
    return [Math.round(220 + 20 * k), Math.round(190 - 70 * k), 50, a];
  }
  // straining: orange → red at the limit
  const k = (t - 0.85) / 0.15;
  return [Math.round(240 - 20 * k), Math.round(120 - 70 * k), Math.round(50 - 10 * k), a];
}

/**
 * A reach origin on the screen in inches: `x` from the screen centre (+ toward
 * one side), `dn` depth from the near edge (negative = before it, on the border).
 */
export interface ReachOrigin {
  x: number;
  dn: number;
}

/**
 * Each seated/standing user's reach origin, at their TABLE EDGE (the reach model
 * measures from the edge, not the feet). Mirrors TableScene's seatPositions:
 * front→back→left→right, up to 2 per long side and 1 per short side.
 */
export function seatReachOrigins(
  n: number,
  widthIn: number,
  depthIn: number,
  bezelIn: number,
): ReachOrigin[] {
  const counts = { front: 0, back: 0, left: 0, right: 0 };
  const order: (keyof typeof counts)[] = ['front', 'back', 'left', 'right', 'front', 'back'];
  for (let i = 0; i < Math.min(Math.max(n, 0), 6); i++) counts[order[i]]++;

  const longX = (c: number) => (c <= 0 ? [] : c === 1 ? [0] : [-widthIn / 4, widthIn / 4]);
  const origins: ReachOrigin[] = [];
  for (const x of longX(counts.front)) origins.push({ x, dn: -bezelIn }); // near edge
  for (const x of longX(counts.back)) origins.push({ x, dn: depthIn + bezelIn }); // far edge
  if (counts.left) origins.push({ x: -(widthIn / 2 + bezelIn), dn: depthIn / 2 });
  if (counts.right) origins.push({ x: widthIn / 2 + bezelIn, dn: depthIn / 2 });
  return origins;
}

/**
 * @param widthIn   screen width (along the near edge)
 * @param depthIn   screen depth (reach-across dimension)
 * @param origins   each user's reach origin on the screen (inches)
 * @param maxReachIn  max horizontal reach from a user's edge (TableReach.depthMax)
 *
 * Union of every user's reach: each pixel is coloured by how comfortably the
 * NEAREST user can reach it (green → amber → red, transparent beyond all reach).
 */
export function makeReachHeatmap(
  widthIn: number,
  depthIn: number,
  origins: ReachOrigin[],
  maxReachIn: number,
): THREE.CanvasTexture {
  const W = 220;
  const H = Math.max(24, Math.min(220, Math.round((W * depthIn) / Math.max(1, widthIn))));
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const maxR = Math.max(1e-3, maxReachIn);
  const pts = origins.length ? origins : [{ x: 0, dn: 0 }];

  for (let py = 0; py < H; py++) {
    // py = 0 is the NEAR edge (front-user side); depth grows downward.
    const dn = (py / (H - 1 || 1)) * depthIn;
    for (let px = 0; px < W; px++) {
      const x = (px / (W - 1 || 1) - 0.5) * widthIn;
      let nearest = Infinity;
      for (const o of pts) {
        const d = Math.hypot(x - o.x, dn - o.dn);
        if (d < nearest) nearest = d;
      }
      const [r, g, b, a] = rampColor(nearest / maxR);
      const i = (py * W + px) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false; // row 0 = near edge, aligned by the plane orientation
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
