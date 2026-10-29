// QuestionTabs — «س١ [icon]  س٢ [icon]  س٣ [icon]» row for the top of the flat hero card.
// Props: questions ({id, category}[]), revealedIds (ids already answered), currentIndex (question being shown, or null), className?.
// Current = full sand colour, answered = full white with a check, upcoming = dimmed. Purely informational (not clickable).
import { cn } from '@/components/ui/cn';
import { Icon } from '@/components/ui/Icon';
import { Num } from '@/components/ui/Num';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { formatNumber } from '@/lib/format';
import { fmt, t } from '@/lib/i18n';
import { fmtNode } from './richText';
import { CategoryIcon } from './CategoryIcon';

export function QuestionTabs({
  questions,
  revealedIds,
  currentIndex,
  className,
  preview = false,
}: {
  questions: { id: number; category: string | null }[];
  revealedIds: number[];
  currentIndex: number | null;
  className?: string;
  /** Home-card look: upcoming labels softer but their icons bright (nothing is "current" yet). */
  preview?: boolean;
}) {
  const { digitStyle } = usePrefs();
  const done = revealedIds.length;
  const label = fmt(t.game.progressLabel, {
    done: formatNumber(done, digitStyle),
    total: formatNumber(questions.length, digitStyle),
  });
  return (
    <ol className={cn('flex items-center gap-4 md:gap-6', className)} role="img" aria-label={label}>
      {questions.map((q, i) => {
        const answered = revealedIds.includes(q.id);
        const isCurrent = currentIndex === i;
        return (
          <li
            key={q.id}
            aria-hidden="true"
            className={cn(
              'flex items-center gap-1.5 font-display text-base font-semibold transition-opacity md:text-lg',
              isCurrent ? 'text-sand' : answered ? 'text-hero-ink' : preview ? 'text-hero-ink/65' : 'text-hero-ink/45',
            )}
          >
            <span>{fmtNode(t.game.questionTab, { i: <Num>{formatNumber(i + 1, digitStyle)}</Num> })}</span>
            {answered && !isCurrent ? (
              <Icon name="check" size={18} className={preview ? 'text-sand' : undefined} />
            ) : (
              <CategoryIcon category={q.category} size={22} className={preview ? 'text-hero-ink' : undefined} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
