// /play/[puzzleNo] — any live puzzle (archive play).
import { GameFlow } from '@/components/game/GameFlow';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { t } from '@/lib/i18n';

export default async function ArchivePlayPage({ params }: { params: Promise<{ puzzleNo: string }> }) {
  const { puzzleNo } = await params;
  const n = /^\d{1,6}$/.test(puzzleNo) ? Number(puzzleNo) : NaN;
  if (!Number.isInteger(n) || n < 1) {
    return (
      <EmptyState
        icon="calc"
        title={t.game.puzzleNotFoundTitle}
        description={t.game.puzzleNotFoundBody}
        action={
          <ButtonLink href="/archive" variant="secondary">
            {t.game.browseArchive}
          </ButtonLink>
        }
      />
    );
  }
  return <GameFlow key={n} puzzleNo={n} />;
}
