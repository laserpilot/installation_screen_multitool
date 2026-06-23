// Geometry for a HORIZONTAL table touchscreen — a flat interactive surface at a
// fixed height, with the screen lying face-up. This is deliberately separate from
// screenGeometry (the vertical-wall / tilt model): a table is a different problem
// (reach is a DEPTH problem, viewing is look-down) so it gets its own helper and
// its own tests, leaving the wall model and its invariants untouched.
//
// All values in INCHES. World axes match the rest of the app: +x right, +y up
// (AFF), +z toward the user. The user stands/sits at the NEAR edge (depth 0) and
// the surface extends away from them to the FAR edge (depth = `depth`).

import type { Point3 } from './screenGeometry';

export interface TableGeometry {
  /** Surface height off the finished floor. */
  surfaceY: number;
  /** Depth of the near edge from the user (0 — the edge they stand at). */
  nearEdgeDepth: number;
  /** Depth of the far edge from the user (the reach-across distance). */
  farEdgeDepth: number;
  /** Center of the surface in world space. */
  center: Point3;
  /** Outward face normal — straight up. */
  normal: Point3;
  /** A point on the surface at a given depth from the near edge. */
  pointAtDepth: (d: number) => Point3;
}

export function tableGeometry(params: {
  tableHeight: number;
  /** Screen dimension lying away from the user (the side reached across). */
  depth: number;
}): TableGeometry {
  const { tableHeight, depth } = params;
  return {
    surfaceY: tableHeight,
    nearEdgeDepth: 0,
    farEdgeDepth: depth,
    center: [0, tableHeight, depth / 2],
    normal: [0, 1, 0],
    pointAtDepth: (d) => [0, tableHeight, d],
  };
}
