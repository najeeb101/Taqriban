import { describe, expect, it } from 'vitest';
import { shareText } from '@/lib/share';

const RLM = '‏';

describe('shareText', () => {
  const base = {
    puzzleNo: 12,
    score: 1.94,
    topPct: 8,
    rows: [
      { multiple: 1.45, direction: 'low' as const },
      { multiple: 2.18, direction: 'high' as const },
      { multiple: 2.3, direction: 'low' as const },
    ],
    url: 'https://taqriban.example',
  };

  it('matches the kickoff example (with tier-threshold squares)', () => {
    const expected = [
      'تقريباً #12 🎯',
      'النتيجة: 1.94× · أفضل من 92% من اللاعبين',
      '🟩 ⬇️ 1.45×',
      '🟨 ⬆️ 2.18×',
      '🟨 ⬇️ 2.30×',
      'https://taqriban.example',
    ]
      .map((l) => RLM + l)
      .join('\n');
    expect(shareText(base)).toBe(expected);
  });

  it('starts every line with RLM and has no answers/questions', () => {
    const lines = shareText(base).split('\n');
    expect(lines).toHaveLength(6);
    for (const l of lines) expect(l.startsWith(RLM)).toBe(true);
  });

  it('omits the percentile when unknown', () => {
    const txt = shareText({ ...base, topPct: null });
    expect(txt).not.toContain('أفضل من');
    expect(txt).toContain('النتيجة: 1.94×');
  });

  it('uses the exact marker and Arabic-Indic digits', () => {
    const txt = shareText({
      ...base,
      digits: 'arab',
      rows: [{ multiple: 1, direction: 'exact' }, ...base.rows.slice(1)],
    });
    expect(txt).toContain('#١٢');
    expect(txt).toContain('١٫٩٤×');
    expect(txt).toContain('٩٢%');
    expect(txt).toContain('🟩 🎯 ١٫٠٠×');
  });
});
