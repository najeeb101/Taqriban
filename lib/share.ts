// Spoiler-free share text: no answers, no question text. Each line starts with RLM so RTL renders correctly.
import type { Direction, DigitStyle } from './types';
import { formatMultiple, localizeDigits } from './format';
import { squareFor } from './scoring';

const RLM = '‏';
const ARROW: Record<Direction, string> = { low: '⬇️', high: '⬆️', exact: '🎯' };

export interface ShareInput {
  puzzleNo: number;
  score: number;
  topPct?: number | null;
  streak?: number; // current daily streak; shown from 2 days up
  rows: { multiple: number; direction: Direction }[];
  url: string;
  digits?: DigitStyle;
}

// «سلسلة يومين» / «سلسلة ٥ أيام» / «سلسلة ١٢ يوماً»
function streakLine(n: number, style: DigitStyle): string {
  if (n === 2) return '🔥 سلسلة يومين';
  const unit = n % 100 >= 3 && n % 100 <= 10 ? 'أيام' : 'يوماً';
  return `🔥 سلسلة ${localizeDigits(n, style)} ${unit}`;
}

export function shareText(opts: ShareInput): string {
  const style = opts.digits ?? 'latn';
  const f = (n: number) => formatMultiple(n, style);
  const better = opts.topPct != null ? 100 - opts.topPct : null;
  const head = `تقريباً #${localizeDigits(opts.puzzleNo, style)} 🎯`;
  const line =
    `النتيجة: ${f(opts.score)}` +
    (better != null && better > 0 ? ` · أفضل من ${localizeDigits(better, style)}% من اللاعبين` : '');
  const rows = opts.rows.map((r) => `${squareFor(r.multiple)} ${ARROW[r.direction]} ${f(r.multiple)}`);
  const streak = opts.streak != null && opts.streak >= 2 ? [streakLine(opts.streak, style)] : [];
  return [head, line, ...streak, ...rows, opts.url].map((l) => RLM + l).join('\n');
}
