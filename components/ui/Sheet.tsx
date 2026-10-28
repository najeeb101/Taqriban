'use client';
// Sheet — accessible modal: bottom sheet (default) or side drawer from the inline-end edge.
// Props: open, onClose, title (visible heading; always used as the dialog label), hideTitle? (sr-only title),
//   side? ('bottom' | 'end', default 'bottom'), children, footer? (sticky area under the content), className?.
// Behaviour: focus trap, Esc closes, backdrop click closes, body scroll locked, focus restored on close, aria-modal.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '@/lib/i18n';
import { cn } from './cn';
import { Icon } from './Icon';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  title,
  hideTitle = false,
  side = 'bottom',
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  hideTitle?: boolean;
  side?: 'bottom' | 'end';
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus inside: first focusable that is not the close button, else the panel itself.
    const items = panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    (items.find((el) => el.dataset.sheetClose === undefined) ?? items[0] ?? panel)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const f = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (f.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-ink/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'absolute flex flex-col bg-surface text-ink shadow-2xl outline-none',
          side === 'bottom'
            ? 'inset-x-0 bottom-0 mx-auto max-h-[90dvh] w-full max-w-[32rem] animate-sheet-up rounded-t-3xl border border-b-0 border-line'
            : 'inset-y-0 end-0 w-[min(20rem,86vw)] animate-sheet-end border-s border-line',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
          <h2 id={titleId} className={cn('text-xl', hideTitle && 'sr-only')}>
            {title}
          </h2>
          <button
            type="button"
            data-sheet-close=""
            onClick={onClose}
            aria-label={t.common.actions.close}
            className="-me-2 ms-auto grid size-11 place-items-center rounded-full text-muted hover:bg-ink/5 hover:text-ink"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer ? <div className="border-t border-line px-5 py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
