// Pure scoring helpers shared by the UI and the unit tests (the SQL mirrors these rules).
import type { Direction, Tier } from './types';

/** Round half away from zero (matches Postgres `round(numeric)`). Never returns -0. */
export function roundHalfAway(x: number): number {
  const r = Math.sign(x) * Math.floor(Math.abs(x) + 0.5);
  return r === 0 ? 0 : r;
}

/** How many times off the guess is; always >= 1. */
export function multiple(guess: number, answer: number): number {
  if (!(guess > 0) || !(answer > 0)) throw new Error('guess and answer must be > 0');
  return Math.max(guess / answer, answer / guess);
}

export function direction(guess: number, answer: number): Direction {
  if (guess === answer) return 'exact';
  return guess < answer ? 'low' : 'high';
}

/** Geometric mean of the per-question multiples. */
export function dailyScore(multiples: number[]): number {
  if (multiples.length === 0) throw new Error('no multiples');
  const meanLog = multiples.reduce((s, m) => s + Math.log(m), 0) / multiples.length;
  return Math.exp(meanLog);
}

export function tier(score: number): Tier {
  if (score <= 1.25) return 'sniper';
  if (score <= 2) return 'great';
  if (score <= 5) return 'close';
  if (score <= 20) return 'practice';
  return 'dark';
}

export const TIER_SQUARE: Record<Tier, string> = {
  sniper: '🟩',
  great: '🟩',
  close: '🟨',
  practice: '🟧',
  dark: '🟥',
};

/** Emoji square for a multiple (per-question or daily), using the tier thresholds. */
export function squareFor(m: number): string {
  return TIER_SQUARE[tier(m)];
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Histogram bin of a guess relative to the answer: round(log10(guess/answer) * 4), clamped to [-12, 12].
 * Bin 0 = within about +/-1.33x. Antisymmetric: bin(g, a) === -bin(a, g).
 */
export function histogramBin(guess: number, answer: number): number {
  if (!(guess > 0) || !(answer > 0)) throw new Error('guess and answer must be > 0');
  const raw = roundHalfAway((Math.log10(guess) - Math.log10(answer)) * 4);
  return clamp(raw, -12, 12);
}

/** Bin of a daily score (>= 1): round(log10(score) * 4), clamped to [0, 12]. */
export function scoreBin(score: number): number {
  if (!(score > 0)) throw new Error('score must be > 0');
  return clamp(roundHalfAway(Math.log10(score) * 4), 0, 12);
}
