import { describe, expect, it } from 'vitest';
import {
  dailyScore,
  direction,
  histogramBin,
  multiple,
  roundHalfAway,
  scoreBin,
  squareFor,
  tier,
  TIER_SQUARE,
} from '@/lib/scoring';

describe('multiple', () => {
  it('computes how many times off', () => {
    expect(multiple(1245, 1800)).toBeCloseTo(1.446, 3);
    expect(multiple(3600, 1800)).toBe(2);
  });
  it('is symmetric', () => {
    expect(multiple(900, 1800)).toBe(2);
    expect(multiple(900, 1800)).toBe(multiple(3600, 1800));
  });
  it('is 1 for an exact guess and throws for non-positive input', () => {
    expect(multiple(5, 5)).toBe(1);
    expect(() => multiple(0, 5)).toThrow();
    expect(() => multiple(5, -1)).toThrow();
  });
});

describe('direction', () => {
  it('classifies', () => {
    expect(direction(1, 2)).toBe('low');
    expect(direction(3, 2)).toBe('high');
    expect(direction(2, 2)).toBe('exact');
  });
});

describe('dailyScore', () => {
  it('is the geometric mean (Fermi example)', () => {
    expect(dailyScore([1.45, 2.18, 2.3])).toBeCloseTo(1.94, 2);
  });
  it('throws on empty input', () => {
    expect(() => dailyScore([])).toThrow();
  });
});

describe('tier / squares', () => {
  it('uses the kickoff thresholds', () => {
    expect(tier(1)).toBe('sniper');
    expect(tier(1.25)).toBe('sniper');
    expect(tier(1.26)).toBe('great');
    expect(tier(2)).toBe('great');
    expect(tier(2.01)).toBe('close');
    expect(tier(5)).toBe('close');
    expect(tier(5.01)).toBe('practice');
    expect(tier(20)).toBe('practice');
    expect(tier(20.01)).toBe('dark');
  });
  it('maps tiers to squares', () => {
    expect(TIER_SQUARE.sniper).toBe('🟩');
    expect(squareFor(2)).toBe('🟩');
    expect(squareFor(3)).toBe('🟨');
    expect(squareFor(10)).toBe('🟧');
    expect(squareFor(50)).toBe('🟥');
  });
});

describe('histogramBin', () => {
  it('is centred', () => {
    expect(histogramBin(1800, 1800)).toBe(0);
    expect(Object.is(histogramBin(1800, 1800), 0)).toBe(true);
  });
  it('is symmetric: bin(g,a) === -bin(a,g)', () => {
    const pairs: [number, number][] = [
      [1, 10],
      [3, 7],
      [1245, 1800],
      [5e6, 12],
      [1.3, 1],
      [1.34, 1],
      [0.001, 1e9],
    ];
    for (const [g, a] of pairs) {
      expect(histogramBin(g, a)).toBe(-histogramBin(a, g) || 0);
    }
  });
  it('bins four per decade and rounds', () => {
    expect(histogramBin(10, 1)).toBe(4);
    expect(histogramBin(1, 10)).toBe(-4);
    expect(histogramBin(1.3, 1)).toBe(0); // within +/-1.33x
    expect(histogramBin(1.4, 1)).toBe(1);
    expect(histogramBin(0.7, 1)).toBe(-1);
  });
  it('clamps to +/-12', () => {
    expect(histogramBin(1e9, 1)).toBe(12);
    expect(histogramBin(1, 1e9)).toBe(-12);
  });
});

describe('scoreBin / roundHalfAway', () => {
  it('bins daily scores into 0..12', () => {
    expect(scoreBin(1)).toBe(0);
    expect(scoreBin(10)).toBe(4);
    expect(scoreBin(1e6)).toBe(12);
    expect(scoreBin(1.94)).toBe(1);
  });
  it('rounds half away from zero', () => {
    expect(roundHalfAway(0.5)).toBe(1);
    expect(roundHalfAway(-0.5)).toBe(-1);
    expect(roundHalfAway(2.4)).toBe(2);
    expect(Object.is(roundHalfAway(-0.2), 0)).toBe(true);
  });
});
