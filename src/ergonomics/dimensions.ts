// Pure dimension math for the shared DimensionControls. The store keeps a screen
// as diagonal + aspectW + aspectH; these helpers translate width/height/diagonal/
// aspect edits into a new {diagonal, aspectW, aspectH} patch, honoring an aspect
// lock. No React — unit-tested in dimensions.test.ts.

import { sizeFromDiagonal } from './engine';

export interface Dims {
  diagonal: number;
  aspectW: number;
  aspectH: number;
}

const ok = (n: number) => Number.isFinite(n) && n > 0;

/** Exact-size storage: encode the raw width/height (inches) as the aspect itself,
 *  with the diagonal as their hypotenuse, so both read back precisely. */
function exact(wIn: number, hIn: number): Dims {
  return { diagonal: Math.hypot(wIn, hIn), aspectW: wIn, aspectH: hIn };
}

/** Set the width (inches). Locked: keep the aspect, scale the diagonal so the
 *  width lands on the target (height follows). Unlocked: keep the current height,
 *  reshape to width×height. Ignores non-positive/non-finite input. */
export function setWidthIn(cur: Dims, wIn: number, lock: boolean): Dims {
  if (!ok(wIn)) return cur;
  const size = sizeFromDiagonal(cur.diagonal, cur.aspectW, cur.aspectH);
  if (lock && size.width > 0) {
    return { ...cur, diagonal: cur.diagonal * (wIn / size.width) };
  }
  return exact(wIn, size.height > 0 ? size.height : wIn);
}

/** Set the height (inches). Mirror of setWidthIn. */
export function setHeightIn(cur: Dims, hIn: number, lock: boolean): Dims {
  if (!ok(hIn)) return cur;
  const size = sizeFromDiagonal(cur.diagonal, cur.aspectW, cur.aspectH);
  if (lock && size.height > 0) {
    return { ...cur, diagonal: cur.diagonal * (hIn / size.height) };
  }
  return exact(size.width > 0 ? size.width : hIn, hIn);
}

/** Set the diagonal (inches). Always proportional — diagonal alone can't define a
 *  shape, so the aspect is preserved regardless of the lock. */
export function setDiagonalIn(cur: Dims, dIn: number): Dims {
  if (!ok(dIn)) return cur;
  return { ...cur, diagonal: dIn };
}

/** Reshape to a given aspect (e.g. a preset chip) while keeping the diagonal. */
export function setAspect(cur: Dims, aw: number, ah: number): Dims {
  if (!ok(aw) || !ok(ah)) return cur;
  return { ...cur, aspectW: aw, aspectH: ah };
}

/** Flip portrait ↔ landscape: swap the aspect, keep the diagonal. */
export function swapAspect(cur: Dims): Dims {
  return { ...cur, aspectW: cur.aspectH, aspectH: cur.aspectW };
}
