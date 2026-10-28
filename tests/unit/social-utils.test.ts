import { describe, expect, it } from 'vitest';
import {
  codeFromInput,
  inviteUrl,
  isValidEmail,
  isValidGroupName,
  isValidHttpUrl,
  isValidJoinCode,
  normalizeJoinCode,
  parseScope,
  sortMembersToday,
  splitBoard,
  whatsappUrl,
} from '@/components/social/utils';
import type { LeaderboardEntry } from '@/lib/types';

const entry = (o: Partial<LeaderboardEntry>): LeaderboardEntry => ({
  rank: 1,
  player_id: 'p',
  display_name: 'x',
  university: null,
  score: 1.5,
  days: 3,
  streak: 1,
  is_me: false,
  ...o,
});

describe('join codes', () => {
  it('normalises case, spaces and dashes', () => {
    expect(normalizeJoinCode(' ab c-234 ')).toBe('ABC234');
    expect(normalizeJoinCode('abcdefgh')).toBe('ABCDEF');
  });
  it('validates length 6', () => {
    expect(isValidJoinCode('ABC234')).toBe(true);
    expect(isValidJoinCode('ABC23')).toBe(false);
  });
  it('extracts a code from an invite link', () => {
    expect(codeFromInput('https://taqriban.app/groups/abc234')).toBe('ABC234');
    expect(codeFromInput('abc 234')).toBe('ABC234');
  });
});

describe('links', () => {
  it('builds invite and whatsapp urls', () => {
    expect(inviteUrl('https://x.app/', 'ABC234')).toBe('https://x.app/groups/ABC234');
    expect(whatsappUrl('a b')).toBe('https://wa.me/?text=a%20b');
  });
  it('validates urls and emails', () => {
    expect(isValidHttpUrl('https://example.com/a')).toBe(true);
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isValidHttpUrl('example')).toBe(false);
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
  });
});

describe('misc', () => {
  it('validates group names', () => {
    expect(isValidGroupName('a')).toBe(false);
    expect(isValidGroupName('شلة الهندسة')).toBe(true);
    expect(isValidGroupName('x'.repeat(41))).toBe(false);
  });
  it('parses scope', () => {
    expect(parseScope('week')).toBe('week');
    expect(parseScope('nope')).toBe('day');
    expect(parseScope(null)).toBe('day');
  });
  it('splits the board and pins me only when hidden', () => {
    const me = entry({ player_id: 'me', is_me: true, rank: 150 });
    const lb = { entries: [entry({ player_id: 'a' }), entry({ player_id: 'b', rank: null, score: null })], me };
    const s = splitBoard(lb);
    expect(s.ranked).toHaveLength(1);
    expect(s.unranked).toHaveLength(1);
    expect(s.pinnedMe).toBe(me);
    expect(splitBoard({ entries: [me], me }).pinnedMe).toBeNull();
  });
  it('sorts members: finished by score, then unfinished', () => {
    const m = (display_name: string, finished_today: boolean, today_score: number | null) => ({
      display_name,
      finished_today,
      today_score,
    });
    const out = sortMembersToday([m('c', false, null), m('b', true, 3), m('a', true, 1.2)]);
    expect(out.map((x) => x.display_name)).toEqual(['a', 'b', 'c']);
  });
});
