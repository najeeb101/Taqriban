'use client';
// Countdown — «اللغز القادم بعد 05:32:10», ticking every second until Qatar midnight (msUntilNextPuzzle).
// At 0 (or when the Qatar date changes) it shows «لغز جديد متاح» with a reload button.
// Props: className?, label? (template with {t}, defaults to t.game.nextPuzzleIn).
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Num } from '@/components/ui/Num';
import { cn } from '@/components/ui/cn';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { formatCountdown } from '@/lib/format';
import { t } from '@/lib/i18n';
import { msUntilNextPuzzle, todayInQatar } from '@/lib/puzzleClock';
import { fmtNode } from './richText';

export function Countdown({ className, label }: { className?: string; label?: string }) {
  const { digitStyle } = usePrefs();
  const startDay = useRef<string | null>(null);
  const [ms, setMs] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (startDay.current === null) startDay.current = todayInQatar();
    const tick = () => {
      if (todayInQatar() !== startDay.current) {
        setExpired(true);
        return;
      }
      setMs(msUntilNextPuzzle());
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (expired) {
    return (
      <div className={cn('flex flex-col items-center gap-3 text-center', className)} role="status">
        <p className="font-medium">{t.game.newPuzzleReady}</p>
        <Button size="sm" onClick={() => window.location.reload()}>
          {t.game.reload}
        </Button>
      </div>
    );
  }

  return (
    <p className={cn('text-center text-muted', className)}>
      {fmtNode(label ?? t.game.nextPuzzleIn, {
        t: (
          <Num className="inline-block min-w-[5.5ch] font-medium text-ink">
            {ms === null ? '--:--:--' : formatCountdown(ms, digitStyle)}
          </Num>
        ),
      })}
    </p>
  );
}
