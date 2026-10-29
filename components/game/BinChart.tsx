// BinChart — shared presentational bar chart over integer bins (used by LogHistogram and ScoreDistribution).
// Always an LTR island: low -> high, left -> right. Bars are SVG (stretchy), all text is HTML so it stays crisp.
// Props: bins (dense, one per integer in [min,max]), min, max, highlightBin?, markers? ({bin,label,row,tone}),
//   ticks ({bin,label?}), endLabels? ({start,end}), ariaLabel (accessible summary), className?.
import type { ReactNode } from 'react';
import type { Bin } from '@/lib/types';
import { cn } from '@/components/ui/cn';
import { binCenterPct } from './chartMath';

export interface ChartMarker {
  bin: number;
  label: ReactNode;
  row: 0 | 1;
  tone: 'accent' | 'ink';
}
export interface ChartTick {
  bin: number;
  label?: ReactNode;
}

const ROW_H = 24;

function alignFor(pct: number): { left: string; translate: string } {
  if (pct < 9) return { left: `${pct}%`, translate: '0%' };
  if (pct > 91) return { left: `${pct}%`, translate: '-100%' };
  return { left: `${pct}%`, translate: '-50%' };
}

export function BinChart({
  bins,
  min,
  max,
  highlightBin = null,
  markers = [],
  ticks,
  endLabels,
  ariaLabel,
  className,
  tone = 'default',
}: {
  bins: Bin[];
  min: number;
  max: number;
  highlightBin?: number | null;
  markers?: ChartMarker[];
  ticks: ChartTick[];
  endLabels?: { start: string; end: string };
  ariaLabel: string;
  className?: string;
  /** 'onHero' = white/sand marks for the flat maroon card. */
  tone?: 'default' | 'onHero';
}) {
  const hero = tone === 'onHero';
  const n = max - min + 1;
  const maxCount = Math.max(1, ...bins.map((b) => b.count));
  const rows = markers.length ? Math.max(...markers.map((m) => m.row)) + 1 : 0;
  const top = rows * ROW_H + (rows ? 4 : 0);

  return (
    <div dir="ltr" role="img" aria-label={ariaLabel} className={cn('w-full select-none', className)}>
      <div className="relative" style={{ paddingTop: top }}>
        {markers.map((m) => {
          const pct = binCenterPct(m.bin, min, max);
          const a = alignFor(pct);
          const cls = hero
            ? m.tone === 'accent'
              ? 'border-sand text-sand'
              : 'border-hero-ink/70 text-hero-ink'
            : m.tone === 'accent'
              ? 'border-accent text-accent'
              : 'border-ink/50 text-ink';
          return (
            <div key={`${m.tone}-${m.bin}`} aria-hidden="true">
              <span
                className={cn(
                  'absolute z-10 rounded-full border px-2 text-xs leading-5 font-medium whitespace-nowrap',
                  hero ? 'bg-hero' : 'bg-surface',
                  cls,
                )}
                style={{ top: m.row * ROW_H, left: a.left, transform: `translateX(${a.translate})` }}
              >
                <span dir="rtl">{m.label}</span>
              </span>
              <span
                className={cn('absolute bottom-0 border-s border-dashed', cls)}
                style={{ top: m.row * ROW_H + 20, left: `${pct}%` }}
              />
            </div>
          );
        })}
        <svg
          viewBox={`0 0 ${n} 100`}
          preserveAspectRatio="none"
          className={cn('block w-full overflow-visible', hero ? 'h-[clamp(4.5rem,13dvh,7rem)]' : 'h-28')}
          aria-hidden="true"
          focusable="false"
        >
          <line x1="0" y1="100" x2={n} y2="100" className={hero ? 'stroke-hero-ink/40' : 'stroke-line'} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {bins.map((b, i) => {
            const h = b.count > 0 ? Math.max(4, (b.count / maxCount) * 96) : 1.5;
            const hi = highlightBin !== null && b.bin === highlightBin;
            return (
              <rect
                key={b.bin}
                x={i + 0.12}
                y={100 - h}
                width={0.76}
                height={h}
                className={
                  hero
                    ? hi
                      ? 'fill-sand'
                      : b.count > 0
                        ? 'fill-hero-ink/40'
                        : 'fill-hero-ink/15'
                    : hi
                      ? 'fill-accent'
                      : b.count > 0
                        ? 'fill-muted/45'
                        : 'fill-muted/20'
                }
              />
            );
          })}
        </svg>
      </div>
      <div className="relative mt-1 h-7" aria-hidden="true">
        {ticks.map((tk) => {
          const pct = binCenterPct(tk.bin, min, max);
          const a = alignFor(pct);
          return (
            <span
              key={tk.bin}
              className={cn('absolute top-0 flex flex-col text-xs', hero ? 'text-hero-ink/75' : 'text-muted')}
              style={{
                left: a.left,
                transform: `translateX(${a.translate})`,
                alignItems: a.translate === '0%' ? 'flex-start' : a.translate === '-100%' ? 'flex-end' : 'center',
              }}
            >
              <span className={cn('h-1.5 w-px', hero ? 'bg-hero-ink/40' : 'bg-line')} />
              {tk.label ? (
                <span dir="rtl" className="whitespace-nowrap">
                  {tk.label}
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
      {endLabels ? (
        <div className={cn('mt-0.5 flex justify-between text-xs', hero ? 'text-hero-ink/75' : 'text-muted')} aria-hidden="true">
          <span dir="rtl">{endLabels.start}</span>
          <span dir="rtl">{endLabels.end}</span>
        </div>
      ) : null}
    </div>
  );
}
