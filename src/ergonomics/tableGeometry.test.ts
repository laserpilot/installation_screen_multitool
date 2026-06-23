import { describe, expect, it } from 'vitest';
import { tableGeometry } from './tableGeometry';

describe('tableGeometry — flat horizontal surface', () => {
  const g = tableGeometry({ tableHeight: 34, depth: 24 });

  it('near edge is at the user (depth 0), far edge at the surface depth', () => {
    expect(g.nearEdgeDepth).toBe(0);
    expect(g.farEdgeDepth).toBe(24);
  });
  it('surface sits at the table height', () => {
    expect(g.surfaceY).toBe(34);
  });
  it('center is mid-depth at the surface height', () => {
    expect(g.center).toEqual([0, 34, 12]);
  });
  it('normal points straight up', () => {
    expect(g.normal).toEqual([0, 1, 0]);
  });
  it('a surface point stays at the table height at its depth', () => {
    expect(g.pointAtDepth(18)).toEqual([0, 34, 18]);
  });
});
