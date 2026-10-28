'use client';
// ShareButtons — «شارك نتيجتك» (Web Share API with shareText, else copy), «انسخ النص», «صورة النتيجة» (html-to-image card).
// Props: puzzleNo, score, topPct (number | null), rows ({multiple, direction}[] in question order), className?.
// The 1080x1350 card is mounted off-screen; the PNG is shared as a file when navigator.canShare({files}) allows, else downloaded.
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/components/ui/cn';
import { useToast } from '@/components/ui/Toast';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { track } from '@/lib/analytics';
import { fmt, t } from '@/lib/i18n';
import { shareText } from '@/lib/share';
import { tier } from '@/lib/scoring';
import type { Direction } from '@/lib/types';
import { ShareCard } from './ShareCard';
import { siteUrl } from './siteUrl';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const isAbort = (e: unknown) => (e as { name?: string } | null)?.name === 'AbortError';

export function ShareButtons({
  puzzleNo,
  score,
  topPct,
  rows,
  className,
}: {
  puzzleNo: number;
  score: number;
  topPct: number | null;
  rows: { multiple: number; direction: Direction }[];
  className?: string;
}) {
  const { digitStyle } = usePrefs();
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const text = () => shareText({ puzzleNo, score, topPct, rows, url: siteUrl(), digits: digitStyle });

  async function copyText(silent = false) {
    const ok = await copyToClipboard(text());
    if (ok) {
      if (!silent) toast(t.game.shareTextCopied, { tone: 'success' });
    } else {
      toast(t.game.shareCopyFailed, { tone: 'error' });
    }
    return ok;
  }

  async function onShare() {
    track('share', { kind: 'text' });
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: text() });
        return;
      } catch (e) {
        if (isAbort(e)) return;
      }
    }
    await copyText();
  }

  async function onImage() {
    if (busy || !cardRef.current) return;
    setBusy(true);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const { toPng } = await import('html-to-image');
      // Two passes: the first warms up fonts/images (Safari often renders blank on the first call).
      await toPng(cardRef.current, { pixelRatio: 1, width: 1080, height: 1350, cacheBust: true }).catch(() => null);
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 1, width: 1080, height: 1350, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const name = fmt(t.game.shareCardFile, { n: puzzleNo });
      const file = new File([blob], name, { type: 'image/png' });
      track('share', { kind: 'image' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (e) {
          if (isAbort(e)) return;
        }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast(t.game.shareImageSaved, { tone: 'success' });
    } catch {
      toast(t.game.shareImageError, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Button size="lg" fullWidth icon={<Icon name="share" />} onClick={onShare}>
        {t.game.share}
      </Button>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" icon={<Icon name="copy" />} onClick={() => void copyText()}>
          {t.game.copyText}
        </Button>
        <Button variant="secondary" icon={<Icon name="download" />} loading={busy} onClick={onImage}>
          {busy ? t.game.shareImageBusy : t.game.shareImage}
        </Button>
      </div>
      {/* Off-screen render target for the PNG */}
      <div aria-hidden="true" style={{ position: 'fixed', top: 0, left: -20000, pointerEvents: 'none' }}>
        <ShareCard
          ref={cardRef}
          puzzleNo={puzzleNo}
          score={score}
          tierKey={tier(score)}
          rows={rows}
          url={siteUrl()}
          digits={digitStyle}
        />
      </div>
    </div>
  );
}
