/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  cleanupAll, newAccountUser, newUser, ok, playAll, purgeFixtures, puzzleAt, rpc, svc, type FixturePuzzle, type TestUser,
} from './helpers';

let t: FixturePuzzle;
let y: FixturePuzzle;
let y2: FixturePuzzle;
let p1: TestUser;
let p2: TestUser;
let p3: TestUser;
let p4: TestUser;
let guest: TestUser;
let groupCode: string;
let groupId: string;

async function seedResult(u: TestUser, p: FixturePuzzle, score: number, is_daily = true) {
  const { error } = await svc.from('daily_results').insert({ player_id: u.id, puzzle_id: p.id, score, is_daily });
  if (error) throw error;
}

beforeAll(async () => {
  await purgeFixtures();
  t = await puzzleAt(0);
  y = await puzzleAt(-1);
  y2 = await puzzleAt(-2);
  // p1-p4 have accounts (needed to be ranked on public boards and to use groups); guest is anonymous.
  [p1, p2, p3, p4] = [await newAccountUser(), await newAccountUser(), await newAccountUser(), await newAccountUser()];
  guest = await newUser();
  await ok(p1, 'update_profile', { p_university: 'qu', p_display_name: 'لاعب أول' });
  await ok(p2, 'update_profile', { p_university: 'hbku', p_display_name: 'لاعب ثان' });
  await ok(p3, 'update_profile', { p_display_name: 'لاعب ثالث' });
  await playAll(p1, t, 1.1);
  await playAll(p2, t, 3);
  await playAll(guest, t, 1.05);
  await seedResult(p1, y, 1.5);
  await seedResult(p1, y2, 2.0);
  await seedResult(p2, y, 4);
});
afterAll(cleanupAll);

describe('6. leaderboards', () => {
  it('day: ordered by score, me pinned, university filter', async () => {
    const b = await ok(p1, 'get_leaderboard', { p_scope: 'day' });
    expect(b.scope).toBe('day');
    expect(b.hidden).toBe(false);
    const e1 = b.entries.find((e: any) => e.player_id === p1.id);
    const e2 = b.entries.find((e: any) => e.player_id === p2.id);
    expect(e1.rank).toBeLessThan(e2.rank);
    expect(e1.is_me).toBe(true);
    expect(e1.score).toBeCloseTo(1.1, 9);
    expect(e1.display_name).toBe('لاعب أول');
    expect(e1.university).toBe('qu');
    expect(b.me.player_id).toBe(p1.id);
    expect(b.finishers).toBeGreaterThanOrEqual(2);

    const qu = await ok(p1, 'get_leaderboard', { p_scope: 'day', p_university: 'qu' });
    expect(qu.entries.some((e: any) => e.player_id === p1.id)).toBe(true);
    expect(qu.entries.some((e: any) => e.player_id === p2.id)).toBe(false);
    expect(qu.entries.every((e: any) => e.university === 'qu')).toBe(true);
  });

  it('week (min 3 days) and all (min 10 days)', async () => {
    const w = await ok(p1, 'get_leaderboard', { p_scope: 'week' });
    const me = w.entries.find((e: any) => e.player_id === p1.id);
    expect(me.days).toBe(3);
    expect(me.score).toBeCloseTo(Math.exp((Math.log(1.1) + Math.log(1.5) + Math.log(2)) / 3), 6);
    expect(w.me.rank).toBe(me.rank);
    const w2 = await ok(p2, 'get_leaderboard', { p_scope: 'week' });
    expect(w2.entries.some((e: any) => e.player_id === p2.id)).toBe(false);
    expect(w2.me).toBeNull();
    const all = await ok(p1, 'get_leaderboard', { p_scope: 'all' });
    expect(all.entries.some((e: any) => e.player_id === p1.id)).toBe(false);
  });

  it('streak ranks by current streak', async () => {
    const s = await ok(p1, 'get_leaderboard', { p_scope: 'streak' });
    const e1 = s.entries.find((e: any) => e.player_id === p1.id);
    const e2 = s.entries.find((e: any) => e.player_id === p2.id);
    expect(e1.streak).toBe(3);
    expect(e2.streak).toBe(2);
    expect(e1.rank).toBeLessThan(e2.rank);
    expect(s.entries.some((e: any) => e.player_id === p3.id)).toBe(false);
  });

  it('guests play but are left off public boards (me is null); account holders are ranked', async () => {
    for (const scope of ['day', 'streak']) {
      const b = await ok(guest, 'get_leaderboard', { p_scope: scope });
      expect(b.entries.some((e: any) => e.player_id === guest.id)).toBe(false);
      expect(b.me).toBeNull();
    }
    const b = await ok(p1, 'get_leaderboard', { p_scope: 'day' });
    expect(b.entries.some((e: any) => e.player_id === guest.id)).toBe(false);
    expect(b.finishers).toBeGreaterThanOrEqual(3); // finishers still counts everyone
  });

  it('guests cannot create or join groups (account_required)', async () => {
    expect((await rpc(guest, 'create_group', { p_name: 'مجموعة ضيف', p_kind: 'friends' })).error?.message).toBe(
      'account_required',
    );
    const g = await ok(p1, 'create_group', { p_name: 'للأعضاء', p_kind: 'friends' });
    expect((await rpc(guest, 'join_group', { p_code: g.join_code })).error?.message).toBe('account_required');
    expect((await ok(p1, 'get_group', { p_code: g.join_code })).member_count).toBe(1);
    await ok(p1, 'leave_group', { p_group_id: g.id });
  });

  it('group boards still list guest members who joined before accounts were required', async () => {
    const g = await ok(p1, 'create_group', { p_name: 'ضيوف', p_kind: 'friends' });
    const { error } = await svc.from('group_members').insert({ group_id: g.id, player_id: guest.id });
    if (error) throw error;
    const b = await ok(p1, 'get_leaderboard', { p_scope: 'day', p_group_id: g.id });
    expect(b.entries.some((e: any) => e.player_id === guest.id)).toBe(true);
    await ok(guest, 'leave_group', { p_group_id: g.id });
    await ok(p1, 'leave_group', { p_group_id: g.id });
  });

  it('invalid scope -> invalid_input; non-member group -> not_member', async () => {
    expect((await rpc(p1, 'get_leaderboard', { p_scope: 'month' })).error?.message).toBe('invalid_input');
    const g = await ok(p1, 'create_group', { p_name: 'مجموعة', p_kind: 'friends' });
    expect((await rpc(p4, 'get_leaderboard', { p_scope: 'week', p_group_id: g.id })).error?.message).toBe('not_member');
    await ok(p1, 'leave_group', { p_group_id: g.id });
  });
});

describe('7. groups', () => {
  it('create + join (case-insensitive, trimmed) + summaries', async () => {
    const g = await ok(p1, 'create_group', { p_name: '  شلة   الجامعة ', p_kind: 'class' });
    expect(g.name).toBe('شلة الجامعة');
    expect(g.kind).toBe('class');
    expect(g.join_code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(g.members).toBe(1);
    expect(g.is_owner).toBe(true);
    groupCode = g.join_code;
    groupId = g.id;

    const j = await ok(p2, 'join_group', { p_code: `  ${groupCode.toLowerCase()} ` });
    expect(j.id).toBe(groupId);
    expect(j.is_owner).toBe(false);
    expect(j.members).toBe(2);
    expect((await ok(p2, 'join_group', { p_code: groupCode })).members).toBe(2); // idempotent
    await ok(p3, 'join_group', { p_code: groupCode });
    expect((await rpc(p4, 'join_group', { p_code: 'ZZZZZZ' })).error?.message).toBe('invalid_code');
    const mine = await ok(p1, 'get_my_groups');
    expect(mine.map((x: any) => x.id)).toContain(groupId);
    expect(await ok(p4, 'get_my_groups')).toEqual([]);
  });

  it('create_group validation and rate limit', async () => {
    expect((await rpc(p4, 'create_group', { p_name: 'x', p_kind: 'friends' })).error?.message).toBe('invalid_name');
    expect((await rpc(p4, 'create_group', { p_name: 'اسم جيد', p_kind: 'nope' })).error?.message).toBe('invalid_input');
    const u = await newAccountUser();
    for (let i = 0; i < 10; i++) await ok(u, 'create_group', { p_name: `مجموعة ${i}`, p_kind: 'club' });
    expect((await rpc(u, 'create_group', { p_name: 'زيادة', p_kind: 'club' })).error?.message).toBe('rate_limited');
  });

  it('group leaderboard lists unranked members; day board is hidden until the caller finishes', async () => {
    const day1 = await ok(p1, 'get_leaderboard', { p_scope: 'day', p_group_id: groupId });
    expect(day1.hidden).toBe(false);
    expect(day1.entries).toHaveLength(3);
    expect(day1.entries.map((e: any) => e.player_id).slice(0, 2)).toEqual([p1.id, p2.id]);
    const e3 = day1.entries[2];
    expect(e3.player_id).toBe(p3.id);
    expect(e3.rank).toBeNull();
    expect(e3.score).toBeNull();
    expect(day1.finishers).toBe(2);

    const hidden = await ok(p3, 'get_leaderboard', { p_scope: 'day', p_group_id: groupId });
    expect(hidden.hidden).toBe(true);
    expect(hidden.entries).toEqual([]);
    expect(hidden.finishers).toBe(2);

    const week = await ok(p1, 'get_leaderboard', { p_scope: 'week', p_group_id: groupId });
    expect(week.entries).toHaveLength(3);
    expect(week.entries[0].player_id).toBe(p1.id);
    expect(week.entries[0].rank).toBe(1);
    expect(week.entries[1].rank).toBeNull(); // p2 has only 2 days
    expect(week.me.is_me).toBe(true);
  });

  it('get_group: spoiler protection and non-member view', async () => {
    const asMember = await ok(p1, 'get_group', { p_code: groupCode.toLowerCase() });
    expect(asMember.join_code).toBe(groupCode);
    expect(asMember.is_member).toBe(true);
    expect(asMember.is_owner).toBe(true);
    expect(asMember.member_count).toBe(3);
    expect(asMember.hidden).toBe(false);
    expect(asMember.finishers_today).toBe(2);
    expect(asMember.members).toHaveLength(3);
    const m1 = asMember.members.find((m: any) => m.player_id === p1.id);
    expect(m1).toMatchObject({ is_owner: true, is_me: true, finished_today: true, streak: 3 });
    expect(m1.today_score).toBeCloseTo(1.1, 9);
    expect(asMember.members.find((m: any) => m.player_id === p3.id)).toMatchObject({ finished_today: false, today_score: null });

    const asUnfinished = await ok(p3, 'get_group', { p_code: groupCode });
    expect(asUnfinished.hidden).toBe(true);
    expect(asUnfinished.finishers_today).toBe(2);
    const seen = asUnfinished.members.find((m: any) => m.player_id === p1.id);
    expect(seen.finished_today).toBe(true);
    expect(seen.today_score).toBeNull();

    const outsider = await ok(p4, 'get_group', { p_code: groupCode });
    expect(outsider).toMatchObject({ id: groupId, is_member: false, is_owner: false, join_code: null, members: [], member_count: 3 });
    expect(await ok(p4, 'get_group', { p_code: 'NOPE22' })).toBeNull();

    await playAll(p3, t, 2); // p3 finishes -> scores visible
    const after = await ok(p3, 'get_group', { p_code: groupCode });
    expect(after.hidden).toBe(false);
    expect(after.members.find((m: any) => m.player_id === p1.id).today_score).toBeCloseTo(1.1, 9);
  });

  it('owner-only operations: rename / remove / regenerate', async () => {
    expect((await rpc(p2, 'rename_group', { p_group_id: groupId, p_name: 'اختراق' })).error?.message).toBe('not_owner');
    expect((await rpc(p2, 'remove_member', { p_group_id: groupId, p_player_id: p3.id })).error?.message).toBe('not_owner');
    expect((await rpc(p2, 'regenerate_code', { p_group_id: groupId })).error?.message).toBe('not_owner');
    expect((await rpc(p4, 'rename_group', { p_group_id: groupId, p_name: 'اختراق' })).error?.message).toBe('not_owner');

    await ok(p1, 'rename_group', { p_group_id: groupId, p_name: 'اسم جديد' });
    expect((await ok(p1, 'get_group', { p_code: groupCode })).name).toBe('اسم جديد');
    expect((await rpc(p1, 'rename_group', { p_group_id: groupId, p_name: 'a' })).error?.message).toBe('invalid_name');
    expect((await rpc(p1, 'remove_member', { p_group_id: groupId, p_player_id: p1.id })).error?.message).toBe('invalid_input');

    const newCode = await ok<string>(p1, 'regenerate_code', { p_group_id: groupId });
    expect(newCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(newCode).not.toBe(groupCode);
    expect((await rpc(p4, 'join_group', { p_code: groupCode })).error?.message).toBe('invalid_code');
    groupCode = newCode;

    await ok(p1, 'remove_member', { p_group_id: groupId, p_player_id: p2.id });
    expect((await ok(p1, 'get_group', { p_code: groupCode })).member_count).toBe(2);
    expect(await ok(p2, 'get_my_groups')).toEqual([]);
  });

  it('leave: owner leaving transfers to the oldest member; last member deletes the group', async () => {
    expect((await rpc(p4, 'leave_group', { p_group_id: groupId })).error?.message).toBe('not_member');
    await ok(p1, 'leave_group', { p_group_id: groupId });
    const g = await ok(p3, 'get_group', { p_code: groupCode });
    expect(g.is_owner).toBe(true);
    expect(g.member_count).toBe(1);
    await ok(p3, 'leave_group', { p_group_id: groupId });
    expect(await ok(p3, 'get_group', { p_code: groupCode })).toBeNull();
    const { data } = await svc.from('groups').select('id').eq('id', groupId);
    expect(data).toEqual([]);
  });
});
