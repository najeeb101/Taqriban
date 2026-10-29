// ShareCard — the 1080x1350 RTL image rendered by html-to-image (always the light "paper" look, fixed pixel sizes).
// Props: puzzleNo, score, tierKey (Tier), rows ({multiple, direction}[]), url, digits (DigitStyle), ref (the node to capture).
// It is mounted off-screen by ShareButtons; do not rely on Tailwind theme colours here so dark mode can't change the image.
import type { Ref } from 'react';
import { formatMultiple, localizeDigits } from '@/lib/format';
import { fmt, t } from '@/lib/i18n';
import { squareFor, tier } from '@/lib/scoring';
import type { DigitStyle, Direction, Tier } from '@/lib/types';

const INK = '#1F1C17';
const MUTED = '#6E675C';
const PAPER = '#F4EFE6';
const SURFACE = '#FBF8F2';
const LINE = '#DDD5C7';
const ACCENT = '#8A1538';
const TIER_HEX: Record<Tier, string> = {
  sniper: '#2F9E44',
  great: '#2F9E44',
  close: '#C99A06',
  practice: '#E8590C',
  dark: '#C92A2A',
};

function Arrow({ direction, color }: { direction: Direction; color: string }) {
  if (direction === 'exact') {
    return (
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    );
  }
  const d = direction === 'low' ? 'M12 5v14M19 12l-7 7-7-7' : 'M12 19V5M5 12l7-7 7 7';
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function ShareCard({
  puzzleNo,
  score,
  tierKey,
  rows,
  url,
  digits,
  ref,
}: {
  puzzleNo: number;
  score: number;
  tierKey: Tier;
  rows: { multiple: number; direction: Direction }[];
  url: string;
  digits: DigitStyle;
  ref?: Ref<HTMLDivElement>;
}) {
  const shownUrl = url.replace(/^https?:\/\//, '');
  return (
    <div
      ref={ref}
      dir="rtl"
      lang="ar"
      style={{
        width: 1080,
        height: 1350,
        background: PAPER,
        color: INK,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '84px 80px 72px',
        boxSizing: 'border-box',
        fontFamily: 'var(--font-readex), ui-sans-serif, system-ui, sans-serif',
        lineHeight: 1.4,
        border: `10px solid ${ACCENT}`,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-messiri), var(--font-readex), sans-serif', fontSize: 130, fontWeight: 700, color: ACCENT }}>
          {t.common.appName}
        </div>
        <div style={{ fontSize: 40, color: MUTED, marginTop: 8 }}>
          {fmt(t.game.shareCardLabel, { n: localizeDigits(puzzleNo, digits) })}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, color: MUTED }}>{t.game.scoreLabel}</div>
        <div dir="ltr" style={{ fontSize: 210, fontWeight: 700, lineHeight: 1.1, color: TIER_HEX[tierKey] }}>
          {formatMultiple(score, digits)}
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, marginTop: 6 }}>{t.game.tiers[tierKey]}</div>
      </div>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {rows.map((r, i) => {
          const tr = tier(r.multiple);
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                background: SURFACE,
                border: `3px solid ${LINE}`,
                borderRadius: 28,
                padding: '24px 36px',
              }}
            >
              <span
                aria-hidden="true"
                data-square={squareFor(r.multiple)}
                style={{ width: 64, height: 64, borderRadius: 14, background: TIER_HEX[tr], flexShrink: 0 }}
              />
              <Arrow direction={r.direction} color={INK} />
              <span style={{ fontSize: 52, fontWeight: 700, marginInlineStart: 'auto' }} dir="ltr">
                {formatMultiple(r.direction === 'exact' ? 1 : r.multiple, digits)}
              </span>
            </div>
          );
        })}
      </div>

      <div dir="ltr" style={{ fontSize: 40, color: MUTED, fontWeight: 500 }}>
        {shownUrl}
      </div>
    </div>
  );
}
