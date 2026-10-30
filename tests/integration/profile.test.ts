/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  anonClient, cleanupAll, createPuzzle, newAccountUser, newUser, ok, playAll, purgeFixtures, puzzleAt, rpc, svc, type FixturePuzzle,
} from './helpers';

let t: FixturePuzzle;
let y: FixturePuzzle;
let y2: FixturePuzzle;

beforeAll(async () => {
  await purgeFixtures();
  t = await puzzleAt(0);
  y = await puzzleAt(-1);
  y2 = await puzzleAt(-2);
});
afterAll(cleanupAll);

describe('8. profile', () => {
  it('default profile, name sanitising, validation', async () => {
    const u = await newUser();
    const p = await ok(u, 'get_profile');
    expect(p.id).toBe(u.id);
    expect(p.display_name).toMatch(/^لاعب \d{4}$/);
    expect(p).toMatchObject({ university: null, digit_style: 'latn', games: 0, avg_score: null, best_score: null, current_streak: 0, best_streak: 0 });
    expect(p.distribution).toHaveLength(13);

    const r = await ok(u, 'update_profile', { p_display_name: '  أحمد‮​   علي\n ' });
    expect(r.display_name).toBe('أحمد علي');
    for (const bad of ['', ' x ', 'ا'.repeat(25), 'fuck you', '​​​', 'شرموط']) {
      expect((await rpc(u, 'update_profile', { p_display_name: bad })).error?.message, JSON.stringify(bad)).toBe('invalid_name');
    }
    expect((await ok(u, 'get_profile')).display_name).toBe('أحمد علي');
    expect((await ok(u, 'update_profile', { p_display_name: 'ا'.repeat(24) })).display_name).toHaveLength(24);
  });

  it('university and digit style validation; null = unchanged, empty string clears', async () => {
    const u = await newUser();
    expect((await ok(u, 'update_profile', { p_university: 'qu' })).university).toBe('qu');
    expect((await rpc(u, 'update_profile', { p_university: 'harvard' })).error?.message).toBe('invalid_input');
    expect((await ok(u, 'update_profile', { p_digit_style: 'arab' })).digit_style).toBe('arab');
    const same = await ok(u, 'update_profile', {});
    expect(same).toMatchObject({ university: 'qu', digit_style: 'arab' });
    expect((await rpc(u, 'update_profile', { p_digit_style: 'roman' })).error?.message).toBe('invalid_input');
    expect((await ok(u, 'update_profile', { p_university: '' })).university).toBeNull();
  });

  it('update_profile rate limit (30/hour)', async () => {
    const u = await newUser();
    for (let i = 0; i < 30; i++) await ok(u, 'update_profile', { p_digit_style: 'latn' });
    expect((await rpc(u, 'update_profile', { p_digit_style: 'latn' })).error?.message).toBe('rate_limited');
  });

  it('stats and streaks', async () => {
    const u = await newUser();
    await playAll(u, t, 2); // score 2 today
    for (const [p, s] of [[y, 1.5], [y2, 3]] as const) {
      await svc.from('daily_results').insert({ player_id: u.id, puzzle_id: p.id, score: s, is_daily: true });
    }
    const p = await ok(u, 'get_profile');
    expect(p.games).toBe(3);
    expect(p.current_streak).toBe(3);
    expect(p.best_streak).toBe(3);
    expect(p.best_score).toBeCloseTo(1.5, 9);
    expect(p.avg_score).toBeCloseTo(Math.exp((Math.log(2) + Math.log(1.5) + Math.log(3)) / 3), 6);
    expect(p.distribution.reduce((s: number, b: any) => s + b.count, 0)).toBe(3);
    expect(typeof p.avg_score).toBe('number');

    // broken streak: today + 2 days ago (gap yesterday)
    const v = await newUser();
    await playAll(v, t, 2);
    await svc.from('daily_results').insert({ player_id: v.id, puzzle_id: y2.id, score: 2, is_daily: true });
    const pv = await ok(v, 'get_profile');
    expect(pv.current_streak).toBe(1);
    expect(pv.best_streak).toBe(1);

    // archive plays count for games but not streaks
    const w = await newUser();
    const old = await createPuzzle(90020, '2001-04-01');
    await playAll(w, old, 2);
    const pw = await ok(w, 'get_profile');
    expect(pw.games).toBe(1);
    expect(pw.current_streak).toBe(0);
    expect(pw.best_streak).toBe(0);
  });

  it('streak is dead when the last result is older than yesterday', async () => {
    const u = await newUser();
    await svc.from('daily_results').insert({ player_id: u.id, puzzle_id: y2.id, score: 2, is_daily: true });
    const p = await ok(u, 'get_profile');
    expect(p.current_streak).toBe(0);
    expect(p.best_streak).toBe(1);
  });
});

describe('9. archive, submissions, delete_my_data', () => {
  it('get_archive: newest first, excludes future/draft, my progress', async () => {
    const old = await createPuzzle(90030, '2001-05-01');
    await createPuzzle(90031, '2999-01-01');
    await createPuzzle(90032, '2001-05-02', [1, 2, 3], 'draft');
    const u = await newUser();
    await ok(u, 'submit_guess', { p_question_id: old.questions[0].id, p_guess: old.questions[0].answer * 2 });
    const a = await ok(u, 'get_archive');
    const dates = a.map((x: any) => x.publish_date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(a[0].publish_date).toBe(t.date);
    expect(a[0].is_today).toBe(true);
    expect(a.some((x: any) => x.number === 90031 || x.number === 90032)).toBe(false);
    const row = a.find((x: any) => x.number === 90030);
    expect(row).toMatchObject({ puzzle_id: old.id, answered: 1, total: 3, score: null, played_daily: null });
    await playAll(u, old, 2);
    const row2 = (await ok(u, 'get_archive')).find((x: any) => x.number === 90030);
    expect(row2).toMatchObject({ answered: 3, total: 3, played_daily: false });
    expect(row2.score).toBeCloseTo(2, 9);
    expect((await rpc(anonClient(), 'get_archive')).error).not.toBeNull();
  });

  it('submit_question: validation, stored row, rate limit 5/day', async () => {
    const u = await newUser();
    const r = await ok(u, 'submit_question', {
      p_text: 'كم عدد الأشجار في مدينة الدوحة تقريباً؟', p_unit: 'شجرة', p_answer: 1000000,
      p_source_url: 'https://example.com/x', p_napkin: 'حساب', p_credit_name: 'سارة',
    });
    expect(typeof r.id).toBe('number');
    const { data } = await svc.from('submissions').select('*').eq('id', r.id).single();
    expect(data).toMatchObject({ player_id: u.id, status: 'new', unit_ar: 'شجرة', credit_name: 'سارة', source_url: 'https://example.com/x' });
    expect(Number(data!.proposed_answer)).toBe(1000000);

    expect((await rpc(u, 'submit_question', { p_text: 'قصير' })).error?.message).toBe('invalid_input');
    expect((await rpc(u, 'submit_question', { p_text: 'سؤال طويل بما يكفي هنا', p_source_url: 'javascript:alert(1)' })).error?.message).toBe('invalid_input');
    expect((await rpc(u, 'submit_question', { p_text: 'سؤال طويل بما يكفي هنا', p_answer: -4 })).error?.message).toBe('invalid_input');
    // minimal payload is fine (text only)
    await ok(u, 'submit_question', { p_text: 'سؤال بسيط بدون أي تفاصيل أخرى', p_source_url: '' });
    for (let i = 0; i < 3; i++) await ok(u, 'submit_question', { p_text: `سؤال رقم ${i} طويل بما يكفي` });
    expect((await rpc(u, 'submit_question', { p_text: 'السؤال السادس طويل بما يكفي' })).error?.message).toBe('rate_limited');
  });

  it('delete_my_data cascades: user, guesses (histogram), groups ownership', async () => {
    const old = await createPuzzle(90040, '2001-06-01');
    const keeper = await newAccountUser(); // groups need an account
    const leaver = await newAccountUser();
    await playAll(leaver, old, 2);
    await ok(keeper, 'submit_guess', { p_question_id: old.questions[0].id, p_guess: old.questions[0].answer * 3 });

    const shared = await ok(leaver, 'create_group', { p_name: 'مجموعة مشتركة', p_kind: 'friends' });
    await ok(keeper, 'join_group', { p_code: shared.join_code });
    const solo = await ok(leaver, 'create_group', { p_name: 'مجموعة وحيدة', p_kind: 'club' });
    await ok(leaver, 'submit_question', { p_text: 'سؤال سيبقى بعد الحذف بدون صاحب' });

    const histTotal = async () =>
      (await svc.from('question_histogram').select('count').eq('question_id', old.questions[0].id)).data!.reduce((s, r) => s + r.count, 0);
    expect(await histTotal()).toBe(2);

    await ok(leaver, 'delete_my_data');

    expect(await histTotal()).toBe(1);
    expect((await svc.auth.admin.getUserById(leaver.id)).data.user).toBeNull();
    expect((await svc.from('players').select('id').eq('id', leaver.id)).data).toEqual([]);
    expect((await svc.from('guesses').select('id').eq('player_id', leaver.id)).data).toEqual([]);
    expect((await svc.from('daily_results').select('player_id').eq('player_id', leaver.id)).data).toEqual([]);
    expect((await svc.from('groups').select('id').eq('id', solo.id)).data).toEqual([]);
    const g = await ok(keeper, 'get_group', { p_code: shared.join_code });
    expect(g.is_owner).toBe(true);
    expect(g.member_count).toBe(1);
    const { data: subs } = await svc.from('submissions').select('player_id').like('text_ar', 'سؤال سيبقى%');
    expect(subs!.every((s) => s.player_id === null)).toBe(true);
    await svc.from('submissions').delete().like('text_ar', 'سؤال سيبقى%');
  });

  it('cleanup of submissions created by these tests', async () => {
    // submissions keep their rows (player_id set null) when users are deleted: remove what the tests created
    await svc.from('submissions').delete().in('text_ar', ['كم عدد الأشجار في مدينة الدوحة تقريباً؟', 'سؤال بسيط بدون أي تفاصيل أخرى']);
    await svc.from('submissions').delete().like('text_ar', 'سؤال رقم % طويل بما يكفي');
    await svc.from('submissions').delete().like('text_ar', 'السؤال السادس%');
    expect(true).toBe(true);
  });
});
