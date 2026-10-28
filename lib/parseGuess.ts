// Parses what a player types into a positive number (Western / Arabic-Indic / Persian digits, number words).
const EASTERN = '٠١٢٣٤٥٦٧٨٩'; // Arabic-Indic
const PERSIAN = '۰۱۲۳۴۵۶۷۸۹';

const SCALES: Record<string, number> = {
  ألف: 1e3,
  الف: 1e3,
  آلاف: 1e3,
  الاف: 1e3,
  مليون: 1e6,
  ملايين: 1e6,
  مليار: 1e9,
  بليون: 1e9,
  مليارات: 1e9,
  تريليون: 1e12,
  تريليونات: 1e12,
  k: 1e3,
  m: 1e6,
  b: 1e9,
};

export const MAX_GUESS = 1e18;

/** Converts all digit styles to ASCII, Arabic decimal mark to '.', and strips separators/spaces. */
export function normalizeDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(EASTERN.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/[٬,،\s_]/g, '');
}

export function parseGuess(raw: string): number | null {
  const s = normalizeDigits(raw.trim()).toLowerCase();
  const m = s.match(/^(\d+(?:\.\d+)?|\.\d+)(\p{L}+)?$/u);
  if (!m) return null;
  const base = parseFloat(m[1]);
  const scale = m[2] ? SCALES[m[2]] : 1;
  if (scale === undefined) return null;
  const n = base * scale;
  return Number.isFinite(n) && n > 0 && n <= MAX_GUESS ? n : null;
}
