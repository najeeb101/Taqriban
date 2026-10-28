'use client';
// ScoreDistribution — histogram of players' daily scores (bins 0..12; x axis 1x, 10x, 100x, 1000x).
// Props: bins (sparse or dense Bin[] of scoreBin values), myBin? (marks «أنت»), label? (accessible title, defaults to the
//   standard caption), className?. Safe with empty / all-zero bins. Used by the results screen and the profile page.
import { Num } from '@/components/ui/Num';
import { cn } from '@/components/ui/cn';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { formatNumber } from '@/lib/format';
import { fmt, t } from '@/lib/i18n';
import type { Bin } from '@/lib/types';
import { BinChart } from './BinChart';
import { denseBins, scoreTicks } from './chartMath';

export function ScoreDistribution({
  bins,
  myBin,
  label,
  className,
}: {
  bins: Bin[];
  myBin?: number | null;
  label?: string;
  className?: string;
}) {
  const { digitStyle } = usePrefs();
  const dense = denseBins(bins ?? [], 0, 12);
  const total = dense.reduce((s, b) => s + b.count, 0);
  const clampedMe = myBin === null || myBin === undefined ? null : Math.min(12, Math.max(0, myBin));

  const summary =
    total > 0
      ? fmt(clampedMe !== null ? t.game.distAlt : t.game.distAltNoMe, { n: formatNumber(total, digitStyle) })
      : t.game.distEmpty;

  return (
    <figure className={cn('m-0 flex flex-col gap-2', className)}>
      <figcaption className="text-sm text-muted">{label ?? t.game.distTitle}</figcaption>
      <BinChart
        bins={dense}
        min={0}
        max={12}
        highlightBin={clampedMe}
        markers={clampedMe !== null ? [{ bin: clampedMe, label: t.game.distYou, row: 0, tone: 'accent' }] : []}
        ticks={scoreTicks().map((tk) => ({
          bin: tk.bin,
          label: <Num>{formatNumber(tk.multiple, digitStyle)}×</Num>,
        }))}
        ariaLabel={`${label ?? t.game.distTitle}. ${summary}`}
      />
      {total === 0 ? <p className="text-center text-sm text-muted">{t.game.distEmpty}</p> : null}
    </figure>
  );
}
