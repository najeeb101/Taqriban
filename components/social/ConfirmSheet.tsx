'use client';
// ConfirmSheet — confirmation bottom sheet for destructive actions.
// Props: open, onClose, title, body (ReactNode), confirmLabel, onConfirm(), loading?, confirmDisabled?,
//   children? (extra content under the body, e.g. a confirmation field). Cancel closes. Confirm is styled as a danger action.
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { t } from '@/lib/i18n';

export function ConfirmSheet({
  open,
  onClose,
  title,
  body,
  confirmLabel,
  onConfirm,
  loading = false,
  confirmDisabled = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
  confirmDisabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={loading}>
            {t.common.actions.cancel}
          </Button>
          <Button
            fullWidth
            loading={loading}
            disabled={confirmDisabled}
            onClick={onConfirm}
            className="!bg-tier-red !text-white"
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="text-muted">{body}</div>
        {children}
      </div>
    </Sheet>
  );
}
