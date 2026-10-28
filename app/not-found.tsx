import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { t } from '@/lib/i18n';

export default function NotFound() {
  return (
    <EmptyState
      icon="target"
      title={t.social.notFound.title}
      description={t.social.notFound.body}
      action={
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/play">{t.social.notFound.playCta}</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            {t.common.errors.backHome}
          </ButtonLink>
        </div>
      }
    />
  );
}
