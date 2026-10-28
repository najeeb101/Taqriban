'use client';
// HomeSections — static explanatory sections of the home page (how to play, what is a Fermi question, suggest, FAQ).
// Client component only so digits follow the player's digit-style preference.
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { usePrefs } from '@/components/providers/PrefsProvider';
import { localizeDigits } from '@/lib/format';
import { formatNumber } from '@/lib/format';
import { t } from '@/lib/i18n';

export function HomeSections() {
  const { digitStyle } = usePrefs();
  const L = (s: string) => localizeDigits(s, digitStyle);
  const steps = [t.game.step1, t.game.step2, t.game.step3];
  const S = t.game.homeSections;

  return (
    <>
      <section aria-labelledby="how-to-play" className="flex flex-col gap-3">
        <h2 id="how-to-play">{t.game.howToPlay}</h2>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {steps.map((s, i) => (
            <li key={i}>
              <Card padding="md" className="flex items-start gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-ink">
                  <span className="num">{formatNumber(i + 1, digitStyle)}</span>
                </span>
                <p className="m-0 leading-[1.8]">{L(s)}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="what-is-fermi" className="flex flex-col gap-3">
        <h2 id="what-is-fermi">{S.fermiTitle}</h2>
        <Card padding="lg" className="flex flex-col gap-4 leading-[1.9]">
          <p className="m-0">{L(S.fermiP1)}</p>
          <p className="m-0">{L(S.fermiP2)}</p>
        </Card>
      </section>

      <section aria-labelledby="suggest">
        <Card tone="accent" padding="lg" className="flex flex-col items-start gap-3">
          <h2 id="suggest" className="flex items-center gap-2">
            <Icon name="lightbulb" size={24} className="text-accent" />
            {S.suggestTitle}
          </h2>
          <p className="m-0">{S.suggestBody}</p>
          <ButtonLink href="/submit" variant="secondary">
            {S.suggestCta}
          </ButtonLink>
        </Card>
      </section>

      <section aria-labelledby="faq" className="flex flex-col gap-3">
        <h2 id="faq">{S.faqTitle}</h2>
        <div className="flex flex-col gap-2">
          {t.game.faq.map((item) => (
            <details key={item.q} className="group rounded-xl border border-line bg-surface shadow-card">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium">
                <span>{L(item.q)}</span>
                <Icon
                  name="arrowDown"
                  size={18}
                  className="shrink-0 text-muted transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="m-0 border-t border-line px-4 py-3 leading-[1.9] text-muted">{L(item.a)}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
