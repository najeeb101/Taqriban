// Home: today's hero (play / continue / finished) followed by the explainer sections.
import { HomeHero } from '@/components/game/HomeHero';
import { HomeSections } from '@/components/game/HomeSections';
import { HERO_BREAKOUT } from '@/components/ui/layout';

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      <div className={HERO_BREAKOUT}>
        <HomeHero />
      </div>
      <HomeSections />
    </div>
  );
}
