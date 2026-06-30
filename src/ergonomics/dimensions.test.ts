import { describe, expect, it } from 'vitest';
import { sizeFromDiagonal } from './engine';
import {
  setAspect,
  setDiagonalIn,
  setHeightIn,
  setWidthIn,
  swapAspect,
  type Dims,
} from './dimensions';

// A 65" 16:9 screen as the baseline.
const base: Dims = { diagonal: 65, aspectW: 16, aspectH: 9 };
const size = (d: Dims) => sizeFromDiagonal(d.diagonal, d.aspectW, d.aspectH);
const ratio = (d: Dims) => d.aspectW / d.aspectH;

describe('locked edits preserve the aspect', () => {
  it('setWidthIn(locked) hits the target width and keeps the ratio', () => {
    const next = setWidthIn(base, 100, true);
    expect(size(next).width).toBeCloseTo(100, 6);
    expect(ratio(next)).toBeCloseTo(16 / 9, 6);
  });

  it('setHeightIn(locked) hits the target height and keeps the ratio', () => {
    const next = setHeightIn(base, 40, true);
    expect(size(next).height).toBeCloseTo(40, 6);
    expect(ratio(next)).toBeCloseTo(16 / 9, 6);
  });

  it('setDiagonalIn always keeps the aspect', () => {
    const next = setDiagonalIn(base, 120);
    expect(next.diagonal).toBe(120);
    expect(ratio(next)).toBeCloseTo(16 / 9, 6);
  });
});

describe('unlocked edits change the shape but keep the other side', () => {
  it('setWidthIn(unlocked) changes width, leaves height, reshapes aspect', () => {
    const before = size(base);
    const next = setWidthIn(base, before.width * 2, false);
    expect(size(next).width).toBeCloseTo(before.width * 2, 4);
    expect(size(next).height).toBeCloseTo(before.height, 4);
    expect(ratio(next)).toBeCloseTo((before.width * 2) / before.height, 4);
  });

  it('setHeightIn(unlocked) changes height, leaves width', () => {
    const before = size(base);
    const next = setHeightIn(base, before.height * 2, false);
    expect(size(next).height).toBeCloseTo(before.height * 2, 4);
    expect(size(next).width).toBeCloseTo(before.width, 4);
  });
});

describe('aspect helpers keep the diagonal', () => {
  it('setAspect reshapes at the same diagonal', () => {
    const next = setAspect(base, 4, 3);
    expect(next.diagonal).toBe(65);
    expect(ratio(next)).toBeCloseTo(4 / 3, 6);
  });

  it('swapAspect flips W/H, keeps diagonal', () => {
    const next = swapAspect(base);
    expect(next.diagonal).toBe(65);
    expect(next.aspectW).toBe(9);
    expect(next.aspectH).toBe(16);
  });
});

describe('guards', () => {
  it('ignores non-positive / non-finite input', () => {
    expect(setWidthIn(base, 0, true)).toEqual(base);
    expect(setWidthIn(base, -5, false)).toEqual(base);
    expect(setHeightIn(base, NaN, true)).toEqual(base);
    expect(setDiagonalIn(base, Infinity)).toEqual(base);
    expect(setAspect(base, 0, 9)).toEqual(base);
  });

  it('falls back to exact storage when current size is degenerate', () => {
    const degenerate: Dims = { diagonal: 10, aspectW: 0, aspectH: 0 };
    const next = setWidthIn(degenerate, 50, true);
    expect(Number.isFinite(next.diagonal)).toBe(true);
    expect(next.diagonal).toBeGreaterThan(0);
  });
});
