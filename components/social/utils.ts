// Pure helpers for the social screens (unit-tested in tests/unit/social-utils.test.ts).
import { universityShort } from '@/i18n/ar/social';
import type { Leaderboard, LeaderboardEntry, LeaderboardScope } from '@/lib/types';

export const GROUP_NAME_MIN = 2;
export const GROUP_NAME_MAX = 40;
export const JOIN_CODE_LENGTH = 6;
export const MIN_DAYS: Record<LeaderboardScope, number> = { day: 0, week: 3, all: 10, streak: 0 };

/** Upper-cases and strips everything that is not a letter/digit (spaces, dashes, RTL marks). */
export function normalizeJoinCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, JOIN_CODE_LENGTH);
}

export function isValidJoinCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

/** Accepts a full invite link or a bare code; returns the normalised code. */
export function codeFromInput(raw: string): string {
  const m = raw.match(/\/groups\/([A-Za-z0-9]+)/);
  return normalizeJoinCode(m ? m[1] : raw);
}

export function inviteUrl(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}/groups/${code}`;
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function isValidHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
}

export function groupNameLength(name: string): number {
  return Array.from(name.trim().replace(/\s+/g, ' ')).length;
}

export function isValidGroupName(name: string): boolean {
  const n = groupNameLength(name);
  return n >= GROUP_NAME_MIN && n <= GROUP_NAME_MAX;
}

export function parseScope(raw: string | null | undefined): LeaderboardScope {
  return raw === 'week' || raw === 'all' || raw === 'streak' || raw === 'day' ? raw : 'day';
}

export function universityLabel(code: string | null | undefined): string {
  if (!code) return '';
  return universityShort[code] ?? code;
}

export interface SplitBoard {
  ranked: LeaderboardEntry[];
  unranked: LeaderboardEntry[];
  /** `me` row to pin below the list, or null when I'm already visible (or have no row). */
  pinnedMe: LeaderboardEntry | null;
}

/** Ranked entries first, unranked group members after; pins `me` when it isn't in the visible list. */
export function splitBoard(lb: Pick<Leaderboard, 'entries' | 'me'>): SplitBoard {
  const ranked = lb.entries.filter((e) => e.rank !== null);
  const unranked = lb.entries.filter((e) => e.rank === null);
  const visible = lb.entries.some((e) => e.is_me);
  return { ranked, unranked, pinnedMe: lb.me && !visible ? lb.me : null };
}

/** Groups pending-vs-done members: finished first (by score asc, then name), then the rest by name. */
export function sortMembersToday<T extends { finished_today: boolean; today_score: number | null; display_name: string }>(
  members: T[],
): T[] {
  return [...members].sort((a, b) => {
    if (a.finished_today !== b.finished_today) return a.finished_today ? -1 : 1;
    if (a.finished_today) {
      const as = a.today_score ?? Infinity;
      const bs = b.today_score ?? Infinity;
      if (as !== bs) return as - bs;
    }
    return a.display_name.localeCompare(b.display_name, 'ar');
  });
}
