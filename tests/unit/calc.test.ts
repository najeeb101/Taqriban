import { describe, expect, it } from 'vitest';
import { evaluate } from '@/lib/calc';

describe('evaluate', () => {
  it.each([
    ['1+2', 3],
    ['2+3*4', 14],
    ['(2+3)*4', 20],
    ['10/4', 2.5],
    ['10÷4', 2.5],
    ['3×4', 12],
    ['5−2', 3],
    ['-3+5', 2],
    ['2*-3', -6],
    ['--4', 4],
    ['1.5*2', 3],
    ['١٢×٣', 36],
    ['٠٫٥+٠٫٥', 1],
    ['((2))', 2],
    [' 2 + 2 ', 4],
    ['8/2/2', 2],
    ['2-3-4', -5],
  ])('%s = %s', (expr, expected) => {
    expect(evaluate(expr)).toBeCloseTo(expected, 9);
  });

  it.each(['', '   ', '1/0', '2+', '*3', '(1', '1)', '1..2', 'abc', 'alert(1)', '1+1;', '1,000'])(
    'returns null for %j',
    (expr) => {
      expect(evaluate(expr)).toBeNull();
    },
  );

  it('never evaluates code', () => {
    expect(evaluate('process.exit(1)')).toBeNull();
    expect(evaluate('constructor')).toBeNull();
  });
});
