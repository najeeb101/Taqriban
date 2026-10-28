// EmptyState — friendly "nothing here" block.
// Props: icon? (IconName), title, description?, action? (ReactNode, e.g. a Button), className?.
import type { ReactNode } from 'react';
import { cn } from './cn';
import { Icon, type IconName } from './Icon';

export function EmptyState({
  icon = 'target',
  title,
  description,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      <span className="grid size-14 place-items-center rounded-full border border-line bg-surface text-muted">
        <Icon name={icon} size={26} />
      </span>
      <h2 className="text-xl">{title}</h2>
      {description ? <p className="max-w-[26rem] text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
