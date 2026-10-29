'use client';
// Calculator — bottom-sheet calculator for napkin math.
// Props: open, onClose(), onUse(value: number) — called with the result only when it is a positive finite number.
// Keypad grid is an LTR island; supports the physical keyboard (incl. Arabic-Indic digits, * / - x, Enter/=, Backspace, Delete/c).
import { useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/components/ui/cn';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { formatNumber, localizeDigits } from '@/lib/format';
import { evaluate } from '@/lib/calc';
import { t } from '@/lib/i18n';
import { normalizeDigits } from '@/lib/parseGuess';
import { numberToInput } from './chartMath';

type KeyKind = 'digit' | 'op' | 'fn';
interface Key {
  label: string;
  insert?: string;
  action?: 'clear' | 'back' | 'equals';
  kind: KeyKind;
  aria?: string;
}

const K = t.game.calcKeys;
const KEYS: Key[] = [
  { label: 'C', action: 'clear', kind: 'fn', aria: t.game.calcClear },
  { label: '(', insert: '(', kind: 'fn', aria: K.open },
  { label: ')', insert: ')', kind: 'fn', aria: K.close },
  { label: '÷', insert: '÷', kind: 'op', aria: K.div },
  { label: '7', insert: '7', kind: 'digit' },
  { label: '8', insert: '8', kind: 'digit' },
  { label: '9', insert: '9', kind: 'digit' },
  { label: '×', insert: '×', kind: 'op', aria: K.mul },
  { label: '4', insert: '4', kind: 'digit' },
  { label: '5', insert: '5', kind: 'digit' },
  { label: '6', insert: '6', kind: 'digit' },
  { label: '−', insert: '−', kind: 'op', aria: K.sub },
  { label: '1', insert: '1', kind: 'digit' },
  { label: '2', insert: '2', kind: 'digit' },
  { label: '3', insert: '3', kind: 'digit' },
  { label: '+', insert: '+', kind: 'op', aria: K.add },
  { label: '0', insert: '0', kind: 'digit' },
  { label: '.', insert: '.', kind: 'digit', aria: K.dot },
  { label: '⌫', action: 'back', kind: 'fn', aria: t.game.calcBackspace },
  { label: '=', action: 'equals', kind: 'op', aria: t.game.calcEquals },
];

const CHAR_MAP: Record<string, string> = { '*': '×', x: '×', X: '×', '/': '÷', '-': '−', '+': '+', '(': '(', ')': ')', '.': '.', ',': '.' };

export function Calculator({
  open,
  onClose,
  onUse,
}: {
  open: boolean;
  onClose: () => void;
  onUse: (value: number) => void;
}) {
  const { digitStyle } = usePrefs();
  const [expr, setExpr] = useState('');

  const close = () => {
    setExpr('');
    onClose();
  };

  const result = expr.trim() === '' ? null : evaluate(expr);
  const usable = result !== null && Number.isFinite(result) && result > 0;

  function press(key: Key) {
    if (key.insert) setExpr((e) => e + key.insert);
    else if (key.action === 'clear') setExpr('');
    else if (key.action === 'back') setExpr((e) => e.slice(0, -1));
    else if (key.action === 'equals') {
      if (result !== null && Number.isFinite(result)) setExpr(numberToInput(result));
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'Enter' || k === '=') {
      e.preventDefault();
      if (result !== null && Number.isFinite(result)) setExpr(numberToInput(result));
      return;
    }
    if (k === 'Backspace') {
      e.preventDefault();
      setExpr((x) => x.slice(0, -1));
      return;
    }
    if (k === 'Delete' || k === 'c' || k === 'C') {
      e.preventDefault();
      setExpr('');
      return;
    }
    if (k.length !== 1) return;
    const digit = normalizeDigits(k);
    if (/^[0-9]$/.test(digit)) {
      e.preventDefault();
      setExpr((x) => x + digit);
    } else if (k in CHAR_MAP) {
      e.preventDefault();
      setExpr((x) => x + CHAR_MAP[k]);
    } else if (k === '٫') {
      e.preventDefault();
      setExpr((x) => x + '.');
    }
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title={t.game.calcTitle}
      footer={
        <Button
          fullWidth
          size="lg"
          disabled={!usable}
          onClick={() => {
            if (usable && result !== null) {
              onUse(result);
              close();
            }
          }}
        >
          {t.game.calcUse}
        </Button>
      }
    >
      <div onKeyDown={onKeyDown} className="flex flex-col gap-3" dir="ltr">
        <div className="rounded-xl border border-line bg-bg/60 px-4 py-3 text-end" aria-live="polite">
          <div
            className="num min-h-8 overflow-x-auto text-xl break-all text-muted"
            aria-label={t.game.calcExpression}
            role="textbox"
            aria-readonly="true"
          >
            {expr === '' ? ' ' : localizeDigits(expr, digitStyle)}
          </div>
          {result !== null && Number.isFinite(result) && result > 0 ? (
            <div className="num min-h-10 text-3xl font-medium text-ink" aria-label={t.game.calcResult}>
              {formatNumber(result, digitStyle)}
            </div>
          ) : (
            <p dir="rtl" className="flex min-h-10 items-end text-sm text-muted">
              {expr === '' ? t.game.calcHint : result === null ? t.game.calcIncomplete : t.game.calcNeedPositive}
            </p>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label={t.game.calcTitle}>
          {KEYS.map((key) => (
            <button
              key={key.label}
              type="button"
              aria-label={key.aria}
              onClick={() => press(key)}
              className={cn(
                'num h-[clamp(2.75rem,7dvh,3.5rem)] rounded-xl border text-2xl font-medium transition active:translate-y-px',
                key.kind === 'digit' && 'border-line bg-surface text-ink hover:border-ink/40',
                key.kind === 'op' && 'border-accent/30 bg-accent/10 text-accent hover:bg-accent/20',
                key.kind === 'fn' && 'border-line bg-ink/5 text-ink hover:bg-ink/10',
                key.action === 'equals' && 'border-transparent bg-accent text-accent-ink hover:bg-accent hover:brightness-110',
              )}
            >
              {key.kind === 'digit' ? localizeDigits(key.label, digitStyle) : key.label}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
