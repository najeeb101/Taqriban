// Number / date formatting. Western digits by default; 'arab' switches to Arabic-Indic digits.
import type { DigitStyle } from './types';

const AR_INDIC = '٠١٢٣٤٥٦٧٨٩';

/** Replaces ASCII digits with Arabic-Indic digits when style is 'arab'. */
export function localizeDigits(text: string | number, style: DigitStyle = 'latn'): string {
  const s = String(text);
  return style === 'arab' ? s.replace(/[0-9]/g, (d) => AR_INDIC[Number(d)]) : s;
}

function numberLocale(style: DigitStyle): string {
  return style === 'arab' ? 'ar-EG-u-nu-arab' : 'ar-QA-u-nu-latn';
}

export function formatNumber(n: number, style: DigitStyle = 'latn'): string {
  if (!Number.isFinite(n)) return '';
  const opts: Intl.NumberFormatOptions =
    n !== 0 && Math.abs(n) < 1 ? { maximumSignificantDigits: 2 } : { maximumFractionDigits: 2 };
  return new Intl.NumberFormat(numberLocale(style), opts).format(n);
}

/** 1.45× / 12.3× / 187× ; capped at +1,000×. */
export function formatMultiple(m: number, style: DigitStyle = 'latn'): string {
  if (m >= 1000) return `+${formatNumber(1000, style)}×`;
  const digits = m < 10 ? 2 : m < 100 ? 1 : 0;
  const locale = style === 'arab' ? 'ar-EG-u-nu-arab' : 'en-u-nu-latn';
  const f = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${f.format(m)}×`;
}

/** Compact big numbers for chart axes: «1.8 ألف», «2 مليون». */
export function compactArabic(n: number, style: DigitStyle = 'latn'): string {
  const units: [number, string][] = [
    [1e12, 'تريليون'],
    [1e9, 'مليار'],
    [1e6, 'مليون'],
    [1e3, 'ألف'],
  ];
  for (const [v, w] of units) if (Math.abs(n) >= v) return `${formatNumber(n / v, style)} ${w}`;
  return formatNumber(n, style);
}

export function formatPct(p: number, style: DigitStyle = 'latn'): string {
  return localizeDigits(`${Math.round(p)}%`, style);
}

/** '2026-10-28' -> «الأربعاء 28 أكتوبر» (Gregorian, Arabic month names). */
export function formatDateAr(ymd: string, style: DigitStyle = 'latn'): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const parts = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
    timeZone: 'UTC',
    calendar: 'gregory',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return localizeDigits(`${get('weekday')} ${get('day')} ${get('month')}`, style);
}

/** ms -> «05:32:10» */
export function formatCountdown(ms: number, style: DigitStyle = 'latn'): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  const p = (x: number) => String(x).padStart(2, '0');
  return localizeDigits(`${p(h)}:${p(mm)}:${p(ss)}`, style);
}
