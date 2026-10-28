import { describe, expect, it } from 'vitest';
import { isValidName, sanitizeName } from '@/lib/sanitize';
import { universityName } from '@/lib/universities';
import { fmt } from '@/lib/i18n';

describe('sanitizeName', () => {
  it('strips bidi overrides, isolates, marks and control chars', () => {
    expect(sanitizeName('‮سعد‬')).toBe('سعد');
    expect(sanitizeName('a⁦b⁩c')).toBe('abc');
    expect(sanitizeName('x‎y‏z')).toBe('xyz');
    expect(sanitizeName('a\u0000b\u0007c')).toBe('abc');
    expect(sanitizeName('a​b')).toBe('ab');
  });
  it('collapses and trims whitespace', () => {
    expect(sanitizeName('  نجيب    عبدي \n ')).toBe('نجيب عبدي');
  });
});

describe('isValidName', () => {
  it('enforces 2..24 characters after sanitising', () => {
    expect(isValidName('ن')).toBe(false);
    expect(isValidName('نج')).toBe(true);
    expect(isValidName('a'.repeat(24))).toBe(true);
    expect(isValidName('a'.repeat(25))).toBe(false);
    expect(isValidName('‮‬ ')).toBe(false);
  });
});

describe('misc helpers', () => {
  it('universityName falls back to the code', () => {
    expect(universityName('qu')).toBe('جامعة قطر');
    expect(universityName('zzz')).toBe('zzz');
    expect(universityName(null)).toBe('');
  });
  it('fmt fills placeholders', () => {
    expect(fmt('أقل بـ {x}×', { x: '1.45' })).toBe('أقل بـ 1.45×');
    expect(fmt('{a}-{b}', { a: 1 })).toBe('1-{b}');
  });
});
