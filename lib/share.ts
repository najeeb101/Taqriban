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
  rows: { multiple: number; direction: Direction }[];
  url: string;
  digits?: DigitStyle;
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
  return [head, line, ...rows, opts.url].map((l) => RLM + l).join('\n');
}
