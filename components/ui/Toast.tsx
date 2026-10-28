'use client';
// Toast — transient messages. Mount <ToastProvider> once (Providers does); call const { toast } = useToast().
// toast(message, { tone?: 'default' | 'success' | 'error', durationMs?: number (default 3500) })
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { cn } from './cn';
import { Icon } from './Icon';

export type ToastTone = 'default' | 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}
interface ToastApi {
  toast: (message: string, opts?: { tone?: ToastTone; durationMs?: number }) => void;
}

const ToastContext = createContext<ToastApi>({ toast: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);

  const toast = useCallback<ToastApi['toast']>(
    (message, opts) => {
      const id = nextId.current++;
      setItems((xs) => [...xs.slice(-2), { id, message, tone: opts?.tone ?? 'default' }]);
      setTimeout(() => dismiss(id), opts?.durationMs ?? 3500);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="region"
        aria-label={t.common.a11y.toastRegion}
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-[26rem] animate-toast-in items-center gap-3 rounded-xl border px-4 py-3 text-[0.9375rem] shadow-card',
              item.tone === 'error'
                ? 'border-tier-red/50 bg-surface text-ink'
                : item.tone === 'success'
                  ? 'border-tier-green/50 bg-surface text-ink'
                  : 'border-line bg-ink text-bg',
            )}
          >
            {item.tone === 'success' ? <Icon name="check" className="text-tier-green" /> : null}
            {item.tone === 'error' ? <Icon name="alert" className="text-tier-red" /> : null}
            <span className="flex-1">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label={t.common.a11y.dismiss}
              className="-me-2 grid size-9 place-items-center rounded-full opacity-70 hover:opacity-100"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
