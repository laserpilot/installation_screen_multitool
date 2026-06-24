import { describe, expect, it } from 'vitest';
import {
  bandFor,
  coverageField,
  coverageRgb,
  ftFromIn,
  MOUNT_DEFAULTS,
  sensorGeometry,
  sensorMetrics,
  type SensorParams,
} from './sensorMath';

// Azure-Kinect-ish sensor on the ceiling aimed straight down at the floor.
const ceiling: SensorParams = {
  mount: 'ceiling',
  mountAffIn: 108, // 9 ft
  pitchDeg: -90,
  yawDeg: 0,
  hFovDeg: 75,
  vFovDeg: 65,
  minRangeIn: ftFromIn(0) + 0.5 * 39.3701, // ~0.5 m
  maxRangeIn: 5.46 * 39.3701, // ~5.46 m ≈ 18 ft, comfortably past a 9 ft floor
  target: 'floor',
  wallDistIn: 240,
};

describe('sensorGeometry — ceiling aimed straight down', () => {
  const g = sensorGeometry(ceiling);

  it('puts the sensor at the mount height on the back wall', () => {
    expect(g.sensor).toEqual([0, ftFromIn(108), 0]);
  });

  it('aims straight down', () => {
    expect(g.forward[1]).toBeCloseTo(-1, 6);
    expect(g.forward[0]).toBeCloseTo(0, 6);
    expect(g.forward[2]).toBeCloseTo(0, 6);
  });

  it('lands all four corners on the floor (y≈0) within range', () => {
    for (const c of [g.topLeft, g.topRight, g.bottomRight, g.bottomLeft]) {
      expect(c[1]).toBeCloseTo(0, 6);
    }
    expect(g.cornersOnSurface).toEqual([true, true, true, true]);
  });

  it('makes a symmetric footprint centred under the sensor', () => {
    // 75° HFOV from 9 ft → half-width = 9 * tan(37.5°), mirrored across centre.
    const halfW = 9 * Math.tan((37.5 * Math.PI) / 180);
    expect(Math.abs(g.topRight[0])).toBeCloseTo(halfW, 4);
    expect(g.topLeft[0]).toBeCloseTo(-g.topRight[0], 4);
    expect((g.topLeft[0] + g.topRight[0]) / 2).toBeCloseTo(0, 6);
  });
});

describe('range capping', () => {
  it('floats the footprint off the floor when the floor is past max range', () => {
    // Ceiling at 30 ft but the sensor only reaches ~18 ft: it cannot see the floor.
    const tooHigh: SensorParams = { ...ceiling, mountAffIn: 360 };
    const g = sensorGeometry(tooHigh);
    // The straight-down centre would land at 30 ft; capped at max range it floats.
    expect(g.topLeft[1]).toBeGreaterThan(1);
    expect(g.cornersOnSurface).toEqual([false, false, false, false]);
    const m = sensorMetrics(tooHigh);
    expect(m.reachesSurface).toBe(false);
    expect(m.band).toBe('poor');
  });
});

describe('coverageField', () => {
  it('marks cells in range as on-surface and reports the covered band', () => {
    const field = coverageField(ceiling, 24);
    expect(field.fracOnSurface).toBeGreaterThan(0.95);
    // Nearest point is straight down (9 ft); corners are farther.
    expect(field.nearFt).toBeCloseTo(9, 1);
    expect(field.farFt).toBeGreaterThan(field.nearFt);
  });

  it('flags a blind zone when the surface sits inside the min range', () => {
    // Drop the sensor to 1 ft over the floor with a 3 ft min range: all blind.
    const tooClose: SensorParams = {
      ...ceiling,
      mountAffIn: 12,
      minRangeIn: 36,
    };
    const field = coverageField(tooClose, 24);
    expect(field.fracOnSurface).toBe(0);
  });
});

describe('bandFor', () => {
  it('maps coverage fraction to a verdict', () => {
    expect(bandFor(0.9)).toBe('good');
    expect(bandFor(0.6)).toBe('partial');
    expect(bandFor(0.1)).toBe('poor');
  });
});

describe('coverageRgb', () => {
  it('is red inside the blind zone, gray off-surface, green in range', () => {
    expect(coverageRgb(1, true, 2, 10)).toEqual([224, 65, 65]); // blind
    expect(coverageRgb(50, false, 2, 10)).toEqual([70, 78, 92]); // off-surface
    const near = coverageRgb(2, true, 2, 10);
    const far = coverageRgb(10, true, 2, 10);
    expect(near[1]).toBeGreaterThan(near[0]); // greenish
    expect(far[2]).toBeGreaterThan(near[2]); // far edge lighter/bluer
  });
});

describe('MOUNT_DEFAULTS', () => {
  it('aims ceiling down, wall slightly down, floor up', () => {
    expect(MOUNT_DEFAULTS.ceiling.pitchDeg).toBe(-90);
    expect(MOUNT_DEFAULTS.wall.pitchDeg).toBeLessThan(0);
    expect(MOUNT_DEFAULTS.floor.pitchDeg).toBeGreaterThan(0);
  });
});
