import { describe, expect, it } from 'vitest';
import {
  bandForFc,
  distanceFromWidth,
  frustumGeometry,
  illuminanceField,
  projectionMetrics,
  widthFromDistance,
  FC_MIN_ACCEPTABLE,
  FC_DESIRABLE,
  type FrustumParams,
  type ProjectionInputs,
} from './projectionMath';

const base: ProjectionInputs = {
  throwRatio: 0.5,
  distanceIn: 120, // 10 ft
  aspectW: 16,
  aspectH: 9,
  lumens: 4000,
  projectorCount: 1,
  stackEff: 1, // ideal linear stacking unless a test overrides it
  resW: 1920,
  resH: 1200,
  ambientFc: 0,
  screenGain: 1,
};

describe('throw relation', () => {
  it('width = distance / throwRatio, and the inverse round-trips', () => {
    expect(widthFromDistance(120, 0.5)).toBe(240);
    const w = widthFromDistance(180, 1.5);
    expect(distanceFromWidth(w, 1.5)).toBeCloseTo(180, 6);
  });
});

describe('projectionMetrics', () => {
  it('matches the spreadsheet (throw 0.5, 10 ft ⇒ 20 ft wide, dim)', () => {
    const m = projectionMetrics(base);
    expect(m.widthFt).toBeCloseTo(20, 6);
    expect(m.heightFt).toBeCloseTo(20 * (9 / 16), 6);
    // 4000 lm / (20 × 11.25 = 225 ft²) ≈ 17.8 fc → too dim
    expect(m.footCandles).toBeCloseTo(4000 / 225, 4);
    expect(m.band).toBe('too-dim');
  });

  it('ideal stacking (eff=1) multiplies lumens linearly', () => {
    const one = projectionMetrics(base);
    const two = projectionMetrics({ ...base, projectorCount: 2 });
    expect(two.effectiveLumens).toBe(8000);
    expect(two.footCandles).toBeCloseTo(one.footCandles * 2, 6);
  });

  it('real stacking is sub-linear: each added unit contributes stackEff', () => {
    const two = projectionMetrics({ ...base, projectorCount: 2, stackEff: 0.9 });
    expect(two.effectiveLumens).toBeCloseTo(4000 * 1.9, 6); // not 8000
    const three = projectionMetrics({ ...base, projectorCount: 3, stackEff: 0.9 });
    expect(three.effectiveLumens).toBeCloseTo(4000 * (1 + 2 * 0.9), 6); // 2.8×
  });

  it('foot-Lamberts and nits scale with screen gain', () => {
    const unity = projectionMetrics({ ...base, screenGain: 1 });
    expect(unity.footLamberts).toBeCloseTo(unity.footCandles, 6);
    expect(unity.nits).toBeCloseTo(unity.footCandles * 3.426, 4);
    const hi = projectionMetrics({ ...base, screenGain: 1.5 });
    expect(hi.footLamberts).toBeCloseTo(hi.footCandles * 1.5, 6);
  });

  it('resolution per foot tracks image size', () => {
    const m = projectionMetrics(base);
    expect(m.hPpf).toBeCloseTo(1920 / m.widthFt, 4);
    expect(m.vPpf).toBeCloseTo(1200 / m.heightFt, 4);
  });

  it('contrast ratio reflects ambient light', () => {
    const m = projectionMetrics({ ...base, ambientFc: 5 });
    expect(m.contrastRatio).toBeCloseTo(m.footCandles / 5, 6);
  });
});

describe('bandForFc', () => {
  it('honours the spreadsheet thresholds', () => {
    expect(bandForFc(FC_MIN_ACCEPTABLE - 1)).toBe('too-dim');
    expect(bandForFc(FC_MIN_ACCEPTABLE)).toBe('marginal');
    expect(bandForFc(100)).toBe('good');
    expect(bandForFc(FC_DESIRABLE)).toBe('bright');
  });
});

const frustum: FrustumParams = {
  distanceIn: 180,
  throwRatio: 1.5,
  aspectW: 16,
  aspectH: 9,
  lensAffIn: 90,
  lensShiftPct: 0,
  lensOrigin: 'center',
  tiltDeg: 0,
};

describe('frustumGeometry', () => {
  it('no shift / no tilt lands a clean rectangle centred on the lens', () => {
    const g = frustumGeometry(frustum);
    // width = 180/1.5 = 120 in = 10 ft → corners at ±5 ft in x
    expect(g.topLeft[0]).toBeCloseTo(-5, 4);
    expect(g.topRight[0]).toBeCloseTo(5, 4);
    // rectangle: top edge level, bottom edge level, left/right vertical
    expect(g.topLeft[1]).toBeCloseTo(g.topRight[1], 4);
    expect(g.bottomLeft[1]).toBeCloseTo(g.bottomRight[1], 4);
    // height 10 * 9/16 = 5.625 ft, centred on the lens (7.5 ft)
    expect(g.topLeft[1] - g.bottomLeft[1]).toBeCloseTo(5.625, 3);
    expect(g.imageCenterFt).toBeCloseTo(7.5, 3);
    // all corners on the wall plane
    for (const c of [g.topLeft, g.topRight, g.bottomRight, g.bottomLeft]) {
      expect(c[2]).toBeCloseTo(0, 6);
    }
  });

  it('lens shift moves the image with NO keystone (edges stay equal width)', () => {
    const up = frustumGeometry({ ...frustum, lensShiftPct: 80 });
    const topW = up.topRight[0] - up.topLeft[0];
    const botW = up.bottomRight[0] - up.bottomLeft[0];
    expect(botW).toBeCloseTo(topW, 4); // rectangle preserved
    expect(up.imageCenterFt).toBeGreaterThan(7.5); // +% raises the image
    const down = frustumGeometry({ ...frustum, lensShiftPct: -80 });
    expect(down.imageCenterFt).toBeLessThan(7.5); // −% lowers it
    // ±100% should move the centre by a full half-height (5.625/2 ft)
    const full = frustumGeometry({ ...frustum, lensShiftPct: 100 });
    expect(full.imageCenterFt - 7.5).toBeCloseTo(5.625 / 2, 3);
  });

  it('tilt is what produces the keystone', () => {
    const g = frustumGeometry({ ...frustum, tiltDeg: 10 });
    const topW = g.topRight[0] - g.topLeft[0];
    const botW = g.bottomRight[0] - g.bottomLeft[0];
    expect(Math.abs(botW - topW)).toBeGreaterThan(0.05); // bent into a keystone
  });

  it("'top' lens origin hangs the image below the lens at 0% shift", () => {
    const g = frustumGeometry({ ...frustum, lensOrigin: 'top' });
    // top edge sits at the lens height; whole image is below it
    expect(g.topLeft[1]).toBeCloseTo(7.5, 3);
    expect(g.imageCenterFt).toBeLessThan(7.5);
  });
});

describe('illuminanceField', () => {
  it('on-axis is symmetric and centre-bright (real vignetting), mean = nominal', () => {
    const g = frustumGeometry(frustum);
    const n = 8;
    const field = illuminanceField(g, 100, n);
    // four corners equal by symmetry, and dimmer than the centre
    const tl = field.data[0];
    const tr = field.data[n - 1];
    const bl = field.data[(n - 1) * n];
    const br = field.data[n * n - 1];
    expect(tr).toBeCloseTo(tl, 3);
    expect(bl).toBeCloseTo(tl, 3);
    expect(br).toBeCloseTo(tl, 3);
    const centre = field.data[(n / 2) * n + n / 2];
    expect(centre).toBeGreaterThan(tl);
    const mean = field.data.reduce((a, b) => a + b, 0) / field.data.length;
    expect(mean).toBeCloseTo(100, 2);
  });

  it('mean stays at nominal fc even when shift introduces a gradient', () => {
    // shift puts the lens off the image centre → near edge brighter, far dimmer
    const g = frustumGeometry({ ...frustum, lensShiftPct: 100 });
    const field = illuminanceField(g, 100, 16);
    expect(field.max).toBeGreaterThan(field.min); // real gradient
    const mean =
      field.data.reduce((a, b) => a + b, 0) / field.data.length;
    expect(mean).toBeCloseTo(100, 2);
  });
});
