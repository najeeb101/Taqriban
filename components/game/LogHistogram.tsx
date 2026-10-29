'use client';
// LogHistogram — how everyone guessed relative to the answer (bins -12..12 from getHistogram).
// Props: histogram (Histogram), answer (number, used for the axis labels answer*10^k), className?.
// Low -> high left -> right (LTR island), end labels «أقل» / «أكثر», markers «أنت» (my_bin) and «الإجابة» (bin 0).
import { Num } from '@/components/ui/Num';
import { cn } from '@/components/ui/cn';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { compactArabic, formatNumber } from '@/lib/format';
import { fmt, t } from '@/lib/i18n';
import type { Histogram } from '@/lib/types';
import { BinChart, type ChartMarker } from './BinChart';
import { denseBins, histogramTicks, pctWithinTenX } from './chartMath';

export function LogHistogram({
  histogram,
  answer,
  className,
  tone = 'default',
}: {
  histogram: Histogram;
  answer: number;
  className?: string;
  tone?: 'default' | 'onHero';
}) {
  const { digitStyle } = usePrefs();
  const dense = denseBins(histogram.bins, -12, 12);
  const myBin = Math.min(12, Math.max(-12, histogram.my_bin));
  const total = dense.reduce((s, b) => s + b.count, 0);

  const where = myBin === 0 ? t.game.histWhereNear : myBin < 0 ? t.game.histWhereLow : t.game.histWhereHigh;
  const summary = fmt(t.game.histAlt, {
    total: formatNumber(histogram.total || total, digitStyle),
    pct: formatNumber(pctWithinTenX(dense), digitStyle),
    where,
  });

  const markers: ChartMarker[] =
    myBin === 0
      ? [{ bin: 0, label: `${t.game.histYou} = ${t.game.histAnswer}`, row: 0, tone: 'accent' }]
      : [
          { bin: 0, label: t.game.histAnswer, row: 0, tone: 'ink' },
          { bin: myBin, label: t.game.histYou, row: 1, tone: 'accent' },
        ];

  return (
    <figure className={cn('m-0 flex flex-col gap-2', className)}>
      <figcaption className={tone === 'onHero' ? 'font-display text-lg font-semibold text-hero-ink' : 'text-sm text-muted'}>
        {t.game.howEveryone}
      </figcaption>
      <BinChart
        tone={tone}
        bins={dense}
        min={-12}
        max={12}
        highlightBin={myBin}
        markers={markers}
        ticks={histogramTicks(answer).map((tk) => ({
          bin: tk.bin,
          label: tk.labelled ? <Num>{compactArabic(tk.value, digitStyle)}</Num> : undefined,
        }))}
        endLabels={{ start: t.game.histLess, end: t.game.histMore }}
        ariaLabel={`${t.game.histAltLabel}. ${summary}`}
      />
    </figure>
  );
}
