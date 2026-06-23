import { describe, expect, it } from 'vitest';
import { PERSONAS } from './constants';
import type { ScreenSize } from './engine';
import {
  adaReachOverObstruction,
  tableReach,
  tableSeatedClearance,
  tableVerdict,
  type TableConfig,
} from './tableEngine';

const size = (width: number, height: number): ScreenSize => ({
  width,
  height,
  diagonal: Math.hypot(width, height),
});

describe('tableReach — reach is a depth problem', () => {
  const adult = PERSONAS.adult;

  it('a shallow surface is fully reachable from one edge', () => {
    const r = tableReach(adult, 34, 18);
    expect(r.fullyReachable).toBe(true);
    expect(r.reachableDepthFraction).toBe(1);
  });

  it('a deep surface leaves the far side out of reach', () => {
    const r = tableReach(adult, 34, 40);
    expect(r.fullyReachable).toBe(false);
    expect(r.reachableDepthFraction).toBeLessThan(1);
    // adult: armLen 28.98 + lean 8 = 36.98; drop 22 → depthMax ≈ 29.7"
    expect(r.depthMax).toBeCloseTo(29.72, 1);
  });

  it('a lower surface (bigger vertical drop) reaches less far across', () => {
    const high = tableReach(adult, 34, 60).depthMax;
    const low = tableReach(adult, 20, 60).depthMax;
    expect(low).toBeLessThan(high);
  });
});

describe('adaReachOverObstruction — ADA 308.3.2 depth caps', () => {
  it('≤20" deep keeps the full 48" reach (good)', () => {
    const a = adaReachOverObstruction(18);
    expect(a.level).toBe('good');
    expect(a.allowableHigh).toBe(48);
  });
  it('20–25" deep drops the reach to 44" (caution)', () => {
    const a = adaReachOverObstruction(23);
    expect(a.level).toBe('caution');
    expect(a.allowableHigh).toBe(44);
  });
  it('past 25" deep is not permitted (bad)', () => {
    expect(adaReachOverObstruction(30).level).toBe('bad');
  });
});

describe('tableSeatedClearance — knee/toe clearance to pull under', () => {
  it('28–34" surface is seated-accessible (good)', () => {
    const c = tableSeatedClearance(30);
    expect(c.level).toBe('good');
    expect(c.surfaceInAdaRange).toBe(true);
  });
  it('below 28" has no knee clearance (bad)', () => {
    const c = tableSeatedClearance(26);
    expect(c.level).toBe('bad');
    expect(c.kneeClearOk).toBe(false);
  });
  it('above 34" is standing-only (caution)', () => {
    expect(tableSeatedClearance(40).level).toBe('caution');
  });
});

describe('tableVerdict — overall is the worst reason', () => {
  const base = (over: Partial<TableConfig>): TableConfig => ({
    size: size(24, 18),
    tableHeight: 32,
    personaId: 'adult',
    horizontalPixels: 1920,
    strictness: 'realistic',
    ...over,
  });

  it('a shallow, well-set, crisp table reads good', () => {
    const v = tableVerdict(base({}));
    expect(v.level).toBe('good');
    expect(v.depth).toBe(18);
    expect(v.reach.fullyReachable).toBe(true);
  });

  it('a surface deeper than 25" fails on ADA reach-over-obstruction', () => {
    const v = tableVerdict(base({ size: size(53, 32), tableHeight: 34 }));
    expect(v.ada.level).toBe('bad');
    expect(v.level).toBe('bad');
  });

  it('a too-low surface fails on seated clearance', () => {
    const v = tableVerdict(base({ tableHeight: 24 }));
    expect(v.seated.level).toBe('bad');
    expect(v.level).toBe('bad');
  });

  it('reports a look-down angle below the horizontal', () => {
    const v = tableVerdict(base({}));
    expect(v.lookDownAngle).toBeGreaterThan(0);
    expect(v.lookDownAngle).toBeLessThan(90);
  });
});
