// Pure geometry + classification for the sensor-coverage tab. No React, no WebGL
// — just where a camera / depth-sensor's USABLE frustum lands on a target
// surface (floor or facing wall), shared by the 3D scene, the coverage texture,
// and the readout so they can never disagree.
//
// This is the projection-tab frustum generalised: a projector lands a light cone
// on one wall; a sensor lands a *sensing* cone on whichever surface you point it
// at. Two things a sensor needs that a projector doesn't:
//   • an arbitrary MOUNT POSE — ceiling / wall / floor, with pan (yaw) as well as
//     tilt (pitch), so it can aim anywhere in the room, and
//   • a USABLE DEPTH RANGE (min/max) — a depth cam is blind closer than ~0.5 m
//     and noisy past a few metres, so coverage is the cone clipped to that slab.
//
// World units are FEET (matching the rest of the app). The store keeps lengths
// in INCHES and angles in DEGREES; convert at the boundary with `ftFromIn`.

export type Vec3 = [number, number, number];

export const IN_PER_FT = 12;
export const ftFromIn = (inches: number): number => inches / IN_PER_FT;
export const inFromFt = (ft: number): number => ft * IN_PER_FT;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): Vec3 => {
  const l = len(a);
  return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
};

export type SensorMount = 'ceiling' | 'wall' | 'floor';
export type SensorTarget = 'floor' | 'wall';

export interface SensorParams {
  mount: SensorMount;
  /** Sensor height above the floor, INCHES (ceiling height, wall height, or 0). */
  mountAffIn: number;
  /** Elevation aim, degrees. 0 = horizontal, −90 = straight down, +90 = up. */
  pitchDeg: number;
  /** Pan about vertical, degrees. 0 = facing into the room (+z). */
  yawDeg: number;
  hFovDeg: number;
  vFovDeg: number;
  /** Closest usable depth, INCHES (blind nearer than this). */
  minRangeIn: number;
  /** Farthest usable depth, INCHES. */
  maxRangeIn: number;
  target: SensorTarget;
  /** Distance from the mount wall to the facing wall, INCHES (target='wall'). */
  wallDistIn: number;
}

// --- mount presets: sensible defaults so picking a mount just works ----------

export interface MountDefaults {
  mountAffIn: number;
  pitchDeg: number;
  target: SensorTarget;
}

export const MOUNT_DEFAULTS: Record<SensorMount, MountDefaults> = {
  // Overhead, aimed straight down at the floor — top-down tracking.
  ceiling: { mountAffIn: 108, pitchDeg: -90, target: 'floor' },
  // Eye-ish height on a wall, tipped down to watch the floor in front of it.
  wall: { mountAffIn: 96, pitchDeg: -20, target: 'floor' },
  // On the deck, tipped up to watch the facing wall / a standing body.
  floor: { mountAffIn: 4, pitchDeg: 35, target: 'wall' },
};

// --- sensor presets: real published FOV + depth ranges -----------------------

export interface SensorPreset {
  label: string;
  hFovDeg: number;
  vFovDeg: number;
  /** Usable depth window, METRES (converted to inches on apply). */
  minM: number;
  maxM: number;
}

const M_TO_IN = 39.3701;
export const mToIn = (m: number): number => m * M_TO_IN;

export const SENSOR_PRESETS: SensorPreset[] = [
  { label: 'Azure Kinect — NFOV', hFovDeg: 75, vFovDeg: 65, minM: 0.5, maxM: 3.86 },
  { label: 'Azure Kinect — WFOV', hFovDeg: 120, vFovDeg: 120, minM: 0.25, maxM: 2.88 },
  { label: 'Kinect v2', hFovDeg: 70, vFovDeg: 60, minM: 0.5, maxM: 4.5 },
  { label: 'RealSense D435', hFovDeg: 87, vFovDeg: 58, minM: 0.3, maxM: 3.0 },
  { label: 'RealSense D455', hFovDeg: 87, vFovDeg: 58, minM: 0.6, maxM: 6.0 },
  { label: 'Orbbec Femto Bolt', hFovDeg: 75, vFovDeg: 65, minM: 0.25, maxM: 5.46 },
  { label: 'ZED 2 (stereo)', hFovDeg: 110, vFovDeg: 70, minM: 0.3, maxM: 20 },
];

// --- the frustum basis + ray landing ----------------------------------------

interface Basis {
  sensor: Vec3;
  forward: Vec3;
  right: Vec3;
  up: Vec3;
  tanX: number;
  tanY: number;
  /** Target plane: point on it + unit normal. */
  p0: Vec3;
  n: Vec3;
  minRangeFt: number;
  maxRangeFt: number;
}

const DEG = Math.PI / 180;

function makeBasis(p: SensorParams): Basis {
  // Mount position: ceiling/wall ride the back wall (z=0); floor sits on z=0 too.
  const sensor: Vec3 = [0, ftFromIn(p.mountAffIn), 0];

  // Aim from yaw + pitch (elevation). yaw=0 → +z; pitch=−90 → straight down.
  const yaw = p.yawDeg * DEG;
  const pitch = p.pitchDeg * DEG;
  const cp = Math.cos(pitch);
  const forward: Vec3 = [cp * Math.sin(yaw), Math.sin(pitch), cp * Math.cos(yaw)];

  // A reference up to build the image frame. When the sensor looks nearly
  // straight up/down, world-up is degenerate (parallel to forward), so fall back
  // to the horizontal aim direction — that also lets pan rotate the footprint.
  const refUp: Vec3 =
    Math.abs(forward[1]) > 0.999 ? [Math.sin(yaw), 0, Math.cos(yaw)] : [0, 1, 0];
  const right = norm(cross(forward, refUp));
  const up = norm(cross(right, forward));

  const tanX = Math.tan((p.hFovDeg * DEG) / 2);
  const tanY = Math.tan((p.vFovDeg * DEG) / 2);

  // Target plane: floor (y=0) or the facing wall (z=wallDist, facing the sensor).
  const p0: Vec3 =
    p.target === 'floor' ? [0, 0, 0] : [0, 0, ftFromIn(p.wallDistIn)];
  const n: Vec3 = p.target === 'floor' ? [0, 1, 0] : [0, 0, -1];

  return {
    sensor,
    forward,
    right,
    up,
    tanX,
    tanY,
    p0,
    n,
    minRangeFt: ftFromIn(p.minRangeIn),
    maxRangeFt: ftFromIn(p.maxRangeIn),
  };
}

export interface Landing {
  point: Vec3;
  /** Slant distance from the sensor to `point`, feet. */
  dist: number;
  /** The ray reached the target plane within the usable range (vs. range-capped). */
  onSurface: boolean;
}

/**
 * Cast one frustum ray and land it. (a,b) range over [−1,1]: a = left→right,
 * b = bottom→top. The ray stops at the target plane if it hits in front within
 * max range; otherwise it is capped at max range (so the patch is always bounded
 * and the un-landed edge floats off the surface, which is the honest picture).
 */
function landRay(B: Basis, a: number, b: number): Landing {
  const dir = norm(
    add(B.forward, add(scale(B.right, a * B.tanX), scale(B.up, b * B.tanY))),
  );
  const denom = dot(dir, B.n);
  let tPlane = Infinity;
  if (Math.abs(denom) > 1e-6) {
    const t = dot(sub(B.p0, B.sensor), B.n) / denom;
    if (t > 0) tPlane = t;
  }
  const onSurface = tPlane <= B.maxRangeFt;
  const t = onSurface ? tPlane : B.maxRangeFt;
  return { point: add(B.sensor, scale(dir, t)), dist: t, onSurface };
}

export interface SensorGeometry {
  sensor: Vec3;
  forward: Vec3;
  topLeft: Vec3;
  topRight: Vec3;
  bottomRight: Vec3;
  bottomLeft: Vec3;
  /** Per-corner: did it land on the surface in range? [TL,TR,BR,BL]. */
  cornersOnSurface: boolean[];
}

export function sensorGeometry(p: SensorParams): SensorGeometry {
  const B = makeBasis(p);
  const tl = landRay(B, -1, +1);
  const tr = landRay(B, +1, +1);
  const br = landRay(B, +1, -1);
  const bl = landRay(B, -1, -1);
  return {
    sensor: B.sensor,
    forward: B.forward,
    topLeft: tl.point,
    topRight: tr.point,
    bottomRight: br.point,
    bottomLeft: bl.point,
    cornersOnSurface: [tl.onSurface, tr.onSurface, br.onSurface, bl.onSurface],
  };
}

// --- coverage field across the patch (drives the texture) --------------------

export interface CoverageField {
  n: number;
  /** Slant distance per cell, feet. Row 0 = top (b=+1). Row-major. */
  dist: Float32Array;
  /** 1 where the cell lands on the surface in range, else 0. */
  onSurface: Uint8Array;
  minRangeFt: number;
  maxRangeFt: number;
  /** Fraction of cells that land on the surface within range. */
  fracOnSurface: number;
  /** Min / max slant distance among on-surface cells (the covered band). */
  nearFt: number;
  farFt: number;
}

export function coverageField(p: SensorParams, n = 40): CoverageField {
  const B = makeBasis(p);
  const dist = new Float32Array(n * n);
  const onSurface = new Uint8Array(n * n);
  let onCount = 0;
  let near = Infinity;
  let far = 0;
  for (let row = 0; row < n; row++) {
    const b = 1 - 2 * ((row + 0.5) / n); // +1 at top → −1 at bottom
    for (let col = 0; col < n; col++) {
      const a = 2 * ((col + 0.5) / n) - 1; // −1 left → +1 right
      const L = landRay(B, a, b);
      const k = row * n + col;
      dist[k] = L.dist;
      const inRange = L.onSurface && L.dist >= B.minRangeFt;
      if (inRange) {
        onSurface[k] = 1;
        onCount++;
        if (L.dist < near) near = L.dist;
        if (L.dist > far) far = L.dist;
      }
    }
  }
  return {
    n,
    dist,
    onSurface,
    minRangeFt: B.minRangeFt,
    maxRangeFt: B.maxRangeFt,
    fracOnSurface: onCount / (n * n),
    nearFt: onCount > 0 ? near : 0,
    farFt: far,
  };
}

// --- headline metrics for the readout ----------------------------------------

export type CoverageBand = 'good' | 'partial' | 'poor';

export interface SensorMetrics {
  /** Patch extent along the surface's two in-plane axes, feet.
   *  floor → (width = x, depth = z); wall → (width = x, height = y). */
  spanW: number;
  spanD: number;
  /** Approximate covered area, ft² (the landed quad). */
  areaSqFt: number;
  nearFt: number;
  farFt: number;
  fracOnSurface: number;
  reachesSurface: boolean;
  band: CoverageBand;
}

/** Area of the quad via two triangles. */
function quadArea(g: SensorGeometry): number {
  const tri = (a: Vec3, b: Vec3, c: Vec3) =>
    0.5 * len(cross(sub(b, a), sub(c, a)));
  return (
    tri(g.topLeft, g.topRight, g.bottomRight) +
    tri(g.topLeft, g.bottomRight, g.bottomLeft)
  );
}

export function bandFor(frac: number): CoverageBand {
  if (frac >= 0.8) return 'good';
  if (frac >= 0.4) return 'partial';
  return 'poor';
}

export const BAND_TONE: Record<CoverageBand, 'good' | 'caution' | 'bad'> = {
  good: 'good',
  partial: 'caution',
  poor: 'bad',
};

export const BAND_LABEL: Record<CoverageBand, string> = {
  good: 'Good coverage',
  partial: 'Partial coverage',
  poor: 'Poor coverage',
};

export function sensorMetrics(p: SensorParams): SensorMetrics {
  const g = sensorGeometry(p);
  const field = coverageField(p, 32);
  const corners = [g.topLeft, g.topRight, g.bottomRight, g.bottomLeft];
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const zs = corners.map((c) => c[2]);
  const range = (v: number[]) => Math.max(...v) - Math.min(...v);
  const spanW = range(xs);
  const spanD = p.target === 'floor' ? range(zs) : range(ys);
  return {
    spanW,
    spanD,
    areaSqFt: quadArea(g),
    nearFt: field.nearFt,
    farFt: field.farFt,
    fracOnSurface: field.fracOnSurface,
    reachesSurface: g.cornersOnSurface.some(Boolean) || field.fracOnSurface > 0,
    band: bandFor(field.fracOnSurface),
  };
}

// --- colour ramp: blind (red) → in-range (green, near→far) -------------------

type RGB = [number, number, number];

const BLIND: RGB = [224, 65, 65]; // closer than min range — unusable
const OFF: RGB = [70, 78, 92]; // within the FOV but off-surface / past max range
const NEAR: RGB = [39, 150, 90]; // usable, near edge
const FAR: RGB = [150, 233, 224]; // usable, far edge

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Colour for a cell: gray off-surface, red if blind, else green near→far. */
export function coverageRgb(
  distFt: number,
  onSurface: boolean,
  minRangeFt: number,
  maxRangeFt: number,
): RGB {
  if (!onSurface) return OFF;
  if (distFt < minRangeFt) return BLIND;
  const span = maxRangeFt - minRangeFt;
  const t = span > 0 ? Math.min(1, Math.max(0, (distFt - minRangeFt) / span)) : 0;
  return lerpRgb(NEAR, FAR, t);
}

export function coverageColor(
  distFt: number,
  onSurface: boolean,
  minRangeFt: number,
  maxRangeFt: number,
): string {
  const [r, g, b] = coverageRgb(distFt, onSurface, minRangeFt, maxRangeFt);
  return `rgb(${r}, ${g}, ${b})`;
}

/** CSS gradient for the legend bar: near → far across the usable band. */
export function rampGradientCss(): string {
  const n = `rgb(${NEAR[0]}, ${NEAR[1]}, ${NEAR[2]})`;
  const f = `rgb(${FAR[0]}, ${FAR[1]}, ${FAR[2]})`;
  return `linear-gradient(90deg, ${n} 0%, ${f} 100%)`;
}
