import { describe, expect, it } from 'vitest';
import { msUntilNextPuzzle, todayInQatar } from '@/lib/puzzleClock';

describe('puzzleClock', () => {
  it('todayInQatar uses UTC+3', () => {
    expect(todayInQatar(new Date('2026-10-28T20:59:59Z'))).toBe('2026-10-28');
    expect(todayInQatar(new Date('2026-10-28T21:00:00Z'))).toBe('2026-10-29');
  });
  it('msUntilNextPuzzle at 23:59:59 Qatar is ~1000 ms', () => {
    expect(msUntilNextPuzzle(new Date('2026-10-28T20:59:59Z'))).toBe(1000);
  });
  it('msUntilNextPuzzle at 00:00:00 Qatar is a full day', () => {
    expect(msUntilNextPuzzle(new Date('2026-10-28T21:00:00Z'))).toBe(86_400_000);
  });
  it('handles month and year rollover', () => {
    expect(msUntilNextPuzzle(new Date('2026-12-31T20:59:59Z'))).toBe(1000);
  });
});
