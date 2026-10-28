'use client';
// Tabs — segmented control (role=tablist). Arrow keys move selection (RTL-aware), Home/End jump.
// Props: items ({ value, label, disabled? }[]), value, onChange(value), ariaLabel?, fullWidth? (default true),
//   idPrefix? (tab ids are `${idPrefix}-tab-${value}`; give panels role="tabpanel" aria-labelledby that id), className?.
import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from './cn';

export interface TabItem<V extends string = string> {
  value: V;
  label: ReactNode;
  disabled?: boolean;
}

export function Tabs<V extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  fullWidth = true,
  idPrefix = 'tabs',
  className,
}: {
  items: TabItem<V>[];
  value: V;
  onChange: (value: V) => void;
  ariaLabel?: string;
  fullWidth?: boolean;
  idPrefix?: string;
  className?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const enabled = items.filter((i) => !i.disabled);
    const idx = enabled.findIndex((i) => i.value === value);
    if (idx < 0) return;
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    let next = idx;
    if (e.key === 'ArrowRight') next = idx + (rtl ? -1 : 1);
    else if (e.key === 'ArrowLeft') next = idx + (rtl ? 1 : -1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = enabled.length - 1;
    else return;
    e.preventDefault();
    next = (next + enabled.length) % enabled.length;
    const target = enabled[next];
    onChange(target.value);
    refs.current[target.value]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        'flex gap-1 rounded-xl border border-line bg-ink/5 p-1',
        fullWidth ? 'w-full' : 'w-fit',
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[item.value] = el;
            }}
            id={`${idPrefix}-tab-${item.value}`}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className={cn(
              'min-h-11 flex-1 rounded-lg px-3 text-[0.9375rem] font-medium whitespace-nowrap transition',
              'disabled:opacity-40',
              selected ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
