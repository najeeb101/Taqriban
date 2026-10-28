import { describe, expect, it } from 'vitest';
import {
  compactArabic,
  formatCountdown,
  formatDateAr,
  formatMultiple,
  formatNumber,
  formatPct,
  localizeDigits,
} from '@/lib/format';

describe('formatNumber', () => {
  it('uses Western digits with commas by default', () => {
    expect(formatNumber(5000000)).toBe('5,000,000');
    expect(formatNumber(1234.567)).toBe('1,234.57');
  });
  it('supports Arabic-Indic digits', () => {
    expect(formatNumber(1245, 'arab')).toBe('١٬٢٤٥');
  });
  it('keeps small numbers readable', () => {
    expect(formatNumber(0.18)).toBe('0.18');
    expect(formatNumber(0.005)).toBe('0.005');
  });
});

describe('formatMultiple', () => {
  it('rounds by magnitude', () => {
    expect(formatMultiple(1.4456)).toBe('1.45×');
    expect(formatMultiple(12.34)).toBe('12.3×');
    expect(formatMultiple(187.6)).toBe('188×');
  });
  it('caps at +1,000×', () => {
    expect(formatMultiple(5000)).toBe('+1,000×');
  });
  it('arab digits', () => {
    expect(formatMultiple(1.94, 'arab')).toBe('١٫٩٤×');
  });
});

describe('compactArabic', () => {
  it('uses Arabic number words', () => {
    expect(compactArabic(1800)).toBe('1.8 ألف');
    expect(compactArabic(18000)).toBe('18 ألف');
    expect(compactArabic(2_000_000)).toBe('2 مليون');
    expect(compactArabic(3e9)).toBe('3 مليار');
    expect(compactArabic(180)).toBe('180');
  });
});

describe('localizeDigits / formatPct', () => {
  it('converts only when arab', () => {
    expect(localizeDigits('a12', 'latn')).toBe('a12');
    expect(localizeDigits('a12', 'arab')).toBe('a١٢');
    expect(formatPct(61.6)).toBe('62%');
    expect(formatPct(61.6, 'arab')).toBe('٦٢%');
  });
});

describe('formatDateAr', () => {
  it('formats the Gregorian date with Arabic month names', () => {
    expect(formatDateAr('2026-10-28', 'latn')).toBe('الأربعاء 28 أكتوبر');
    expect(formatDateAr('2026-10-28', 'arab')).toBe('الأربعاء ٢٨ أكتوبر');
  });
});

describe('formatCountdown', () => {
  it('formats HH:MM:SS', () => {
    expect(formatCountdown(5 * 3600_000 + 32 * 60_000 + 10_000)).toBe('05:32:10');
    expect(formatCountdown(-5)).toBe('00:00:00');
    expect(formatCountdown(1000, 'arab')).toBe('٠٠:٠٠:٠١');
  });
});
