import { describe, expect, it } from 'vitest';
import {
  binCenterPct,
  denseBins,
  histogramTicks,
  numberToInput,
  pctWithinTenX,
  roundSig,
  scoreTicks,
  valueAtBin,
} from '@/components/game/chartMath';

describe('chartMath', () => {
  it('roundSig keeps two significant digits', () => {
    expect(roundSig(1778279)).toBe(1800000);
    expect(roundSig(0.0123)).toBe(0.012);
    expect(roundSig(0)).toBe(0);
  });

  it('valueAtBin is answer * 10^(bin/4)', () => {
    expect(valueAtBin(1000, 0)).toBe(1000);
    expect(valueAtBin(1000, 4)).toBe(10000);
    expect(valueAtBin(1000, -8)).toBe(10);
    expect(valueAtBin(1000, 12)).toBe(1000000);
  });

  it('histogramTicks spans -12..12 and labels every second tick', () => {
    const t = histogramTicks(500);
    expect(t.map((x) => x.bin)).toEqual([-12, -8, -4, 0, 4, 8, 12]);
    expect(t.filter((x) => x.labelled).map((x) => x.bin)).toEqual([-8, 0, 8]);
    expect(t[3].value).toBe(500);
  });

  it('scoreTicks are 1x, 10x, 100x, 1000x', () => {
    expect(scoreTicks().map((x) => x.multiple)).toEqual([1, 10, 100, 1000]);
  });

  it('denseBins fills gaps and clamps', () => {
    const d = denseBins([{ bin: 2, count: 3 }, { bin: 99, count: 1 }], -2, 3);
    expect(d.map((b) => b.bin)).toEqual([-2, -1, 0, 1, 2, 3]);
    expect(d.find((b) => b.bin === 2)?.count).toBe(3);
    expect(d.find((b) => b.bin === 3)?.count).toBe(1);
  });

  it('binCenterPct centres bins', () => {
    expect(binCenterPct(0, 0, 12)).toBeCloseTo(100 / 26);
    expect(binCenterPct(0, -12, 12)).toBeCloseTo(50);
  });

  it('pctWithinTenX', () => {
    expect(pctWithinTenX([])).toBe(0);
    expect(pctWithinTenX([{ bin: 0, count: 1 }, { bin: 10, count: 1 }])).toBe(50);
  });

  it('numberToInput avoids exponents and grouping', () => {
    expect(numberToInput(5000000)).toBe('5000000');
    expect(numberToInput(0.25)).toBe('0.25');
    expect(numberToInput(1e20)).toBe('100000000000000000000');
    expect(numberToInput(NaN)).toBe('');
  });
});
