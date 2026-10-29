// CategoryIcon — one simple outline icon per question category slug (content `category:`), currentColor stroke.
// Props: category (slug or null), size? (px, default 24), className?. Unknown slugs fall back to a question mark.
import { cn } from '@/components/ui/cn';

const PATHS: Record<string, string> = {
  architecture: 'M3 21 12 4l9 17z M8 21l4-8 4 8',
  aviation: 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z',
  space: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M3 16c5 3 15-3 18-8',
  sports: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3.5 3.5 3.5 14.5 0 18 M12 3c-3.5 3.5-3.5 14.5 0 18',
  food: 'M5 3v8a2 2 0 0 0 2 2v8 M9 3v8 M7 3v8 M17 21V3c-2.5 1.5-3 5-3 8h3',
  nature: 'M12 22v-8 M12 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12z',
  agriculture: 'M12 22V8 M12 8c-3 0-4-2-4-4 3 0 4 2 4 4z M12 8c3 0 4-2 4-4-3 0-4 2-4 4z M12 14c-3 0-4-2-4-4 3 0 4 2 4 4z M12 14c3 0 4-2 4-4-3 0-4 2-4 4z',
  body: 'M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z',
  construction: 'M3 18h18 M5 18a7 7 0 0 1 14 0 M12 6v5',
  culture: 'M3 9l9-5 9 5 M5 10v8 M9 10v8 M15 10v8 M19 10v8 M3 21h18',
  demographics: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6 M17 11a2.5 2.5 0 1 0 0-5 M21 19c0-2.5-1.7-4.5-4-5',
  education: 'M2 9l10-5 10 5-10 5z M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5',
  energy: 'M13 2 4 14h7l-1 8 9-12h-7z',
  industry: 'M3 21V10l6 4V10l6 4V6h6v15z',
  media: 'M3 6h18v12H3z M10 9v6l5-3z',
  shipping: 'M3 17l2 4h14l2-4z M5 17V11h14v6 M9 11V7h6v4',
  tourism: 'M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  trade: 'M3 7l9-4 9 4v10l-9 4-9-4z M3 7l9 4 9-4 M12 11v10',
  transport: 'M5 3h14v14H5z M5 11h14 M8 21l1.5-4 M16 21l-1.5-4',
  water: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
};
const FALLBACK = 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7 M12 17v.01';

export function CategoryIcon({
  category,
  size = 24,
  className,
}: {
  category: string | null;
  size?: number;
  className?: string;
}) {
  const d = (category && PATHS[category]) || FALLBACK;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <path d={d} />
    </svg>
  );
}
