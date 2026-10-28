// Puzzle day = 00:00-24:00 in Asia/Qatar (UTC+3, no DST). Server decides liveness; this is for display only.
export const TZ = 'Asia/Qatar';

/** YYYY-MM-DD of the given instant in Qatar. */
export function todayInQatar(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(now);
}

export function msUntilNextPuzzle(now: Date = new Date()): number {
  const [y, m, d] = todayInQatar(now).split('-').map(Number);
  // Next Qatar midnight == 21:00 UTC of the current Qatar date
  const nextMidnightUtc = Date.UTC(y, m - 1, d + 1, -3, 0, 0);
  return nextMidnightUtc - now.getTime();
}
