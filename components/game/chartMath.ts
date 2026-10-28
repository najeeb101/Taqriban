// Pure helpers for the log-scale charts (no React). Unit-tested in tests/unit/game-chartMath.test.ts.
import type { Bin } from '@/lib/types';

/** Rounds to `sig` significant digits (axis labels like 1,800,000 rather than 1,778,279). */
export function roundSig(n: number, sig = 2): number {
  if (!Number.isFinite(n) || n === 0) return n;
  return Number(n.toPrecision(sig));
}

/** Value that sits at histogram bin `bin` for a given answer: answer * 10^(bin/4). */
export function valueAtBin(answer: number, bin: number): number {
  return roundSig(answer * Math.pow(10, bin / 4), 2);
}

/** Tick marks for the guess histogram (bins -12..12). `labelled` ticks get a text label. */
export function histogramTicks(answer: number): { bin: number; value: number; labelled: boolean }[] {
  const out: { bin: number; value: number; labelled: boolean }[] = [];
  for (let bin = -12; bin <= 12; bin += 4) {
    out.push({ bin, value: valueAtBin(answer, bin), labelled: bin % 8 === 0 });
  }
  return out;
}

/** Tick marks for the daily-score distribution (bins 0..12): 1x, 10x, 100x, 1000x. */
export function scoreTicks(): { bin: number; multiple: number }[] {
  return [0, 4, 8, 12].map((bin) => ({ bin, multiple: Math.round(Math.pow(10, bin / 4)) }));
}

/** Expands sparse bins to a dense array over [min, max] (missing bins = 0; out-of-range bins are clamped in). */
export function denseBins(bins: Bin[], min: number, max: number): Bin[] {
  const counts = new Map<number, number>();
  for (const b of bins) {
    const k = Math.min(max, Math.max(min, b.bin));
    counts.set(k, (counts.get(k) ?? 0) + b.count);
  }
  const out: Bin[] = [];
  for (let bin = min; bin <= max; bin++) out.push({ bin, count: counts.get(bin) ?? 0 });
  return out;
}

/** Horizontal centre of a bin as a percentage of the chart width. */
export function binCenterPct(bin: number, min: number, max: number): number {
  const n = max - min + 1;
  return ((bin - min + 0.5) / n) * 100;
}

/** Share (0-100, rounded) of all guesses falling in bins [-4, 4], i.e. within 10x of the answer. */
export function pctWithinTenX(bins: Bin[]): number {
  const total = bins.reduce((s, b) => s + b.count, 0);
  if (total <= 0) return 0;
  const near = bins.filter((b) => b.bin >= -4 && b.bin <= 4).reduce((s, b) => s + b.count, 0);
  return Math.round((near / total) * 100);
}

/** Plain decimal string for putting a computed number back into a text input (no exponent, no grouping). */
export function numberToInput(n: number): string {
  if (!Number.isFinite(n)) return '';
  if (Number.isInteger(n) && Math.abs(n) < 1e21) return n.toLocaleString('en-US', { useGrouping: false });
  return n.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 10 });
}
