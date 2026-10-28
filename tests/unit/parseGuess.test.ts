import { describe, expect, it } from 'vitest';
import { normalizeDigits, parseGuess } from '@/lib/parseGuess';

describe('parseGuess', () => {
  it.each([
    ['1,245', 1245],
    ['١٢٤٥', 1245],
    ['1245', 1245],
    ['5 مليون', 5_000_000],
    ['٢٫٥ مليار', 2_500_000_000],
    ['١٫٥ مليون', 1_500_000],
    ['3k', 3000],
    ['3K', 3000],
    ['2M', 2_000_000],
    ['1.5B', 1_500_000_000],
    ['۱۲۳', 123],
    ['3 آلاف', 3000],
    ['3 الاف', 3000],
    ['2 ألف', 2000],
    ['2 تريليون', 2e12],
    ['1٬245', 1245],
    ['0.5', 0.5],
    ['  42  ', 42],
  ])('parses %s', (input, expected) => {
    expect(parseGuess(input)).toBeCloseTo(expected, 6);
  });

  it.each(['0', '-3', 'abc', '', '   ', '5 foo', '5 مليونات', '1.2.3', 'مليون'])('rejects %s', (input) => {
    expect(parseGuess(input)).toBeNull();
  });

  it('caps at 1e18', () => {
    expect(parseGuess('1000000 تريليون')).toBe(1e18);
    expect(parseGuess('1000001 تريليون')).toBeNull();
    expect(parseGuess('9'.repeat(40))).toBeNull();
  });

  it('treats a lone comma as thousands separator', () => {
    expect(parseGuess('1,5')).toBe(15);
  });
});

describe('normalizeDigits', () => {
  it('converts digit styles and strips separators', () => {
    expect(normalizeDigits('١٢٣٫٥')).toBe('123.5');
    expect(normalizeDigits('1 234_567')).toBe('1234567');
  });
});
