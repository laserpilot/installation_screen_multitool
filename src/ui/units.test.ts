import { describe, expect, it } from 'vitest';
import { fmtDist, fmtLen, fromInches, toInches } from './units';

describe('unit conversion round-trips', () => {
  it.each([0, 12, 24, 48, 96, 175])('US passes %i inches through unchanged', (inches) => {
    expect(toInches(fromInches(inches, 'us'), 'us')).toBeCloseTo(inches, 6);
  });
  it.each([0, 12, 24, 48, 96, 175])('metric round-trips %i inches', (inches) => {
    expect(toInches(fromInches(inches, 'metric'), 'metric')).toBeCloseTo(inches, 6);
  });
  it('fromInches converts to cm in metric', () => {
    expect(fromInches(10, 'metric')).toBeCloseTo(25.4, 4);
  });
});

describe('fmtLen', () => {
  it('US shows inches', () => expect(fmtLen(48, 'us')).toBe('48.0"'));
  it('metric shows cm', () => expect(fmtLen(48, 'metric')).toBe('122 cm'));
});

describe('fmtDist', () => {
  it('US uses feet for larger spans', () => expect(fmtDist(96, 'us')).toBe('8.0 ft'));
  it('US uses inches for short spans', () => expect(fmtDist(18, 'us')).toBe('18"'));
  it('metric uses metres for larger spans', () => expect(fmtDist(96, 'metric')).toBe('2.44 m'));
  it('metric uses cm for short spans', () => expect(fmtDist(18, 'metric')).toBe('46 cm'));
});
