/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  addDays, anonClient, cleanupAll, close, createPuzzle, guess, newUser, ok, playAll, purgeFixtures, puzzleAt,
  qatarToday, rpc, seedUsers, svc, type FixturePuzzle, type TestUser,
} from './helpers';

let archive: FixturePuzzle; // 2001-01-01, answers 1000 / 50000 / 2,000,000
let future: FixturePuzzle;
let draft: FixturePuzzle;
let a: TestUser;

beforeAll(async () => {
  await purgeFixtures();
  archive = await createPuzzle(90001, '2001-01-01');
  future = await createPuzzle(90002, addDays(qatarToday(), 30));
  draft = await createPuzzle(90003, '2001-01-02', [10, 20, 30], 'draft');
  a = await newUser();
});
afterAll(cleanupAll);

describe('1. get_puzzle and privileges', () => {
  it('returns 3 questions with no answer fields; unknown/future/draft -> null', async () => {
    const p = await ok(a, 'get_puzzle', { p_number: 90001 });
    expect(p.number).toBe(90001);
    expect(p.publish_date).toBe('2001-01-01');
    expect(p.is_daily).toBe(false);
    expect(p.questions).toHaveLength(3);
    expect(p.questions.map((q: any) => q.position)).toEqual([1, 2, 3]);
    expect(Object.keys(p.questions[0]).sort()).toEqual(['category', 'id', 'position', 'text', 'unit']);
    expect(JSON.stringify(p)).not.toMatch(/answer|explanation|source/);
    expect(p.reveals).toEqual([]);
    expect(p.daily_score).toBeNull();

    expect((await rpc(a, 'get_puzzle', { p_number: 90002 })).data).toBeNull();
    expect((await rpc(a, 'get_puzzle', { p_number: 90003 })).data).toBeNull();
    expect((await rpc(a, 'get_puzzle', { p_number: 99999999 })).data).toBeNull();
  });

  it("today's puzzle (no arg) matches publish_date = Qatar today when present", async () => {
    const t = await puzzleAt(0);
    const p = await ok(a, 'get_puzzle');
    expect(p.puzzle_id).toBe(t.id);
    expect(p.is_daily).toBe(true);
  });

  it('anon key cannot read or write tables directly', async () => {
    const anon = anonClient();
    for (const t of ['question_answers', 'guesses', 'players', 'daily_results', 'groups', 'group_members',
      'questions', 'puzzles', 'submissions', 'rate_events', 'question_histogram']) {
      const r = await anon.from(t).select('*').limit(1);
      expect(r.error, `anon select ${t}`).not.toBeNull();
      const r2 = await a.client.from(t).select('*').limit(1);
      // authenticated: either an error or no rows (RLS) - never data
      expect(r2.error !== null || (r2.data ?? []).length === 0, `authed select ${t}`).toBe(true);
    }
    const ins = await a.client.from('guesses').insert({ player_id: a.id, question_id: archive.questions[0].id, guess: 1, multiple: 1, direction: 'exact', bin: 0, is_daily: true });
    expect(ins.error).not.toBeNull();
    const upd = await a.client.from('players').update({ display_name: 'hacker' }).eq('id', a.id);
    expect(upd.error !== null || upd.count === 0).toBe(true);
  });

  it('anon cannot call RPCs; private helpers and admin_stats are not callable', async () => {
    const anon = anonClient();
    expect((await anon.rpc('get_puzzle', {})).error).not.toBeNull();
    expect((await a.client.rpc('admin_stats')).error).not.toBeNull();
    expect((await a.client.rpc('check_rate', { p_player: a.id, p_action: 'x', p_max: 1, p_window: '1 day' })).error).not.toBeNull();
    expect((await a.client.schema('private' as any).from('question_stats').select('*')).error).not.toBeNull();
    expect((await svc.rpc('admin_stats')).error).toBeNull();
  });
});

describe('2. submit_guess scoring and idempotency', () => {
  it('computes multiple/direction and the geometric-mean score (1.45/2.18/2.30 -> 1.94)', async () => {
    const u = await newUser();
    const qs = archive.questions;
    const r1 = await ok(u, 'submit_guess', { p_question_id: qs[0].id, p_guess: qs[0].answer / 1.45 });
    expect(r1.direction).toBe('low');
    expect(close(r1.multiple, 1.45, 1e-9)).toBe(true);
    expect(r1.answer).toBe(1000);
    expect(r1.already_guessed).toBe(false);
    expect(r1.daily_score).toBeNull();
    expect(r1.explanation).toContain('الحساب');
    expect(r1.source_url).toBe('https://example.com/src');
    expect(r1.source_name).toBe('Example');
    expect(r1.as_of).toBe('2024');
    expect(r1.closer_than_pct).toBeNull();
    expect(r1.players).toBe(1);
    expect(typeof r1.multiple).toBe('number');
    const r2 = await ok(u, 'submit_guess', { p_question_id: qs[1].id, p_guess: qs[1].answer * 2.18 });
    expect(r2.direction).toBe('high');
    expect(r2.daily_score).toBeNull();
    const r3 = await ok(u, 'submit_guess', { p_question_id: qs[2].id, p_guess: qs[2].answer / 2.3 });
    expect(Math.abs(r3.daily_score - 1.94)).toBeLessThan(0.01);
    const expected = Math.exp((Math.log(1.45) + Math.log(2.18) + Math.log(2.3)) / 3);
    expect(close(r3.daily_score, expected, 1e-9)).toBe(true);
  });

  it('exact guess -> direction exact, multiple 1', async () => {
    const u = await newUser();
    const r = await ok(u, 'submit_guess', { p_question_id: archive.questions[0].id, p_guess: 1000 });
    expect(r.direction).toBe('exact');
    expect(r.multiple).toBe(1);
  });

  it('second call returns the same reveal, already_guessed true, no new row (also when concurrent)', async () => {
    const u = await newUser();
    const q = archive.questions[1];
    const [x, y] = await Promise.all([guess(u, q.id, 40000), guess(u, q.id, 99999)]);
    expect(x.error).toBeNull();
    expect(y.error).toBeNull();
    expect([x.data.already_guessed, y.data.already_guessed].sort()).toEqual([false, true]);
    expect(x.data.guess).toBe(y.data.guess);
    const again = await ok(u, 'submit_guess', { p_question_id: q.id, p_guess: 123 });
    expect(again.already_guessed).toBe(true);
    expect(again.guess).toBe(x.data.guess);
    const { count } = await svc.from('guesses').select('*', { count: 'exact', head: true }).eq('player_id', u.id);
    expect(count).toBe(1);
  });

  it('invalid guesses and unknown / unavailable questions', async () => {
    const q = archive.questions[0].id;
    for (const bad of [0, -5, null]) {
      expect((await guess(a, q, bad as any)).error?.message).toBe('invalid_guess');
    }
    expect((await guess(a, 99999999, 5)).error?.message).toBe('unknown_question');
    expect((await guess(a, future.questions[0].id, 5)).error?.message).toBe('puzzle_not_live');
    expect((await guess(a, draft.questions[0].id, 5)).error?.message).toBe('puzzle_not_live');
    expect((await anonClient().rpc('submit_guess', { p_question_id: q, p_guess: 5 })).error).not.toBeNull();
  });

  it('get_histogram / get_results require completion', async () => {
    const u = await newUser();
    expect((await rpc(u, 'get_histogram', { p_question_id: archive.questions[0].id })).error?.message).toBe('not_completed');
    expect((await rpc(u, 'get_results', { p_puzzle_id: archive.id })).error?.message).toBe('not_completed');
    await guess(u, archive.questions[0].id, 5);
    expect((await rpc(u, 'get_results', { p_puzzle_id: archive.id })).error?.message).toBe('not_completed');
    expect((await rpc(u, 'get_histogram', { p_question_id: archive.questions[0].id })).error).toBeNull();
  });
});

describe('3. percentiles and histograms (isolated fixture puzzle)', () => {
  let p: FixturePuzzle;
  let first: TestUser;
  let seeds: string[];

  beforeAll(async () => {
    p = await createPuzzle(90010, '2001-02-01', [100, 100, 100]);
    seeds = await seedUsers(20);
  });

  async function seedGuess(playerId: string, qid: number, g: number) {
    const { error } = await svc.from('guesses').insert({ player_id: playerId, question_id: qid, guess: g, is_daily: false });
    if (error) throw error;
  }

  it('closer_than_pct is null below 20 other players, correct from 20 others', async () => {
    first = await newUser();
    const q = p.questions[0];
    // 10 seeds mult 3 (guess 300), 9 seeds mult 1.2 (guess 120) -> 19 others after the next step
    for (let i = 0; i < 10; i++) await seedGuess(seeds[i], q.id, 300);
    for (let i = 10; i < 19; i++) await seedGuess(seeds[i], q.id, 120);
    const r1 = await ok(first, 'submit_guess', { p_question_id: q.id, p_guess: 50 }); // mult 2; 19 others
    expect(r1.closer_than_pct).toBeNull();
    expect(r1.players).toBe(20);
    await seedGuess(seeds[19], q.id, 120); // now 20 other players for the next guesser
    const second = await newUser();
    const r2 = await ok(second, 'submit_guess', { p_question_id: q.id, p_guess: 150 }); // mult 1.5
    // others: 10 x3.0 (worse), first x2.0 (worse), 10 x1.2 (better) -> 11/21
    expect(r2.players).toBe(22);
    expect(r2.closer_than_pct).toBe(Math.round((100 * 11) / 21));
  });

  it('histogram: counts, total, my_bin; decrements when a user is deleted', async () => {
    const q = p.questions[0];
    const h = await ok(first, 'get_histogram', { p_question_id: q.id });
    expect(h.bins).toHaveLength(25);
    expect(h.bins[0].bin).toBe(-12);
    expect(h.bins[24].bin).toBe(12);
    expect(h.total).toBe(22);
    // guess 50 / answer 100 -> log10(0.5)*4 = -1.204 -> bin -1
    expect(h.my_bin).toBe(-1);
    const byBin = Object.fromEntries(h.bins.map((b: any) => [b.bin, b.count]));
    expect(byBin[-1]).toBe(1);
    expect(byBin[2]).toBe(10 + 0); // 300/100 -> log10(3)*4 = 1.91 -> 2
    expect(byBin[0]).toBe(10); // 1.2x -> 0.32 -> 0 (10 seeds); 1.5x -> 0.7 -> 1
    expect(byBin[1]).toBe(1);

    const { data: users } = await svc.auth.admin.listUsers({ perPage: 1 });
    expect(users).toBeTruthy();
    const before = (await svc.from('question_histogram').select('count').eq('question_id', q.id)).data!.reduce((s, r) => s + r.count, 0);
    expect(before).toBe(22);
    await svc.auth.admin.deleteUser(first.id);
    const after = (await svc.from('question_histogram').select('count').eq('question_id', q.id)).data!.reduce((s, r) => s + r.count, 0);
    expect(after).toBe(21);
    const rows = (await svc.from('question_histogram').select('bin,count').eq('question_id', q.id).eq('bin', -1)).data!;
    expect(rows[0]?.count ?? 0).toBe(0);
  });

  it('histogram bin is symmetric (round half away from zero)', async () => {
    const u = await newUser();
    const r = await ok(u, 'submit_guess', { p_question_id: p.questions[1].id, p_guess: 100 * 10 ** (0.125 + 0.0001) });
    const h = await ok(u, 'get_histogram', { p_question_id: p.questions[1].id });
    expect(r.direction).toBe('high');
    expect(h.my_bin).toBe(1);
    const u2 = await newUser();
    await ok(u2, 'submit_guess', { p_question_id: p.questions[1].id, p_guess: 100 / 10 ** (0.125 + 0.0001) });
    expect((await ok(u2, 'get_histogram', { p_question_id: p.questions[1].id })).my_bin).toBe(-1);
    const u3 = await newUser();
    await ok(u3, 'submit_guess', { p_question_id: p.questions[1].id, p_guess: 1e12 });
    expect((await ok(u3, 'get_histogram', { p_question_id: p.questions[1].id })).my_bin).toBe(12);
  });

  it('top_pct null below 20 daily results; hypothetical rank for archive plays with >= 20', async () => {
    const pz = await createPuzzle(90011, '2001-03-01', [100, 100, 100]);
    const u = await newUser();
    await playAll(u, pz, 2);
    const small = await ok(u, 'get_results', { p_puzzle_id: pz.id });
    expect(small.top_pct).toBeNull();
    expect(small.is_daily).toBe(false);
    expect(small.players).toBe(0); // archive plays are not daily results

    // 20 daily results: 5 with score 1.2, 15 with score 3
    for (let i = 0; i < 20; i++) {
      const { error } = await svc.from('daily_results').insert({ player_id: seeds[i], puzzle_id: pz.id, score: i < 5 ? 1.2 : 3, is_daily: true });
      if (error) throw error;
    }
    const big = await ok(u, 'get_results', { p_puzzle_id: pz.id });
    expect(big.players).toBe(20);
    expect(big.top_pct).toBe(Math.ceil((100 * (5 + 1)) / 21));
    expect(big.score).toBeCloseTo(2, 9);
    expect(big.distribution).toHaveLength(13);
    expect(big.distribution.reduce((s: number, b: any) => s + b.count, 0)).toBe(20);
    expect(big.my_bin).toBe(1); // log10(2)*4 = 1.2 -> 1
    expect(big.rows).toHaveLength(3);
    expect(big.rows[0]).toMatchObject({ position: 1, guess: 200, answer: 100, direction: 'high' });
  });
});

describe('4. resume', () => {
  it('get_puzzle after 1 guess returns 1 reveal', async () => {
    const u = await newUser();
    const q = archive.questions[0];
    await ok(u, 'submit_guess', { p_question_id: q.id, p_guess: 500 });
    const p = await ok(u, 'get_puzzle', { p_number: 90001 });
    expect(p.reveals).toHaveLength(1);
    expect(p.reveals[0].question_id).toBe(q.id);
    expect(p.reveals[0].answer).toBe(1000);
    expect(p.daily_score).toBeNull();
    await playAll(u, archive, 1.5).catch(() => null);
    const done = await ok(u, 'get_puzzle', { p_number: 90001 });
    expect(done.reveals).toHaveLength(3);
    expect(done.daily_score).not.toBeNull();
  });
});

describe('5. archive vs daily, rollover', () => {
  it('archive play -> is_daily false and excluded from the day leaderboard', async () => {
    const u = await newUser();
    await playAll(u, archive, 2);
    const { data: dr } = await svc.from('daily_results').select('is_daily,score').eq('player_id', u.id).eq('puzzle_id', archive.id).single();
    expect(dr!.is_daily).toBe(false);
    const { data: gs } = await svc.from('guesses').select('is_daily').eq('player_id', u.id);
    expect(gs!.every((g) => g.is_daily === false)).toBe(true);
    const board = await ok(u, 'get_leaderboard', { p_scope: 'day' });
    expect(board.entries.find((e: any) => e.is_me)).toBeUndefined();
    expect(board.me).toBeNull();
    const results = await ok(u, 'get_results', { p_puzzle_id: archive.id });
    expect(results.is_daily).toBe(false);
  });

  it("today's puzzle is daily", async () => {
    const t = await puzzleAt(0);
    const u = await newUser();
    await playAll(u, t, 1.5);
    const res = await ok(u, 'get_results', { p_puzzle_id: t.id });
    expect(res.is_daily).toBe(true);
    expect(res.score).toBeCloseTo(1.5, 9);
    const board = await ok(u, 'get_leaderboard', { p_scope: 'day' });
    expect(board.me.is_me).toBe(true);
    expect(board.me.score).toBeCloseTo(1.5, 9);
  });

  it("rollover: started yesterday's puzzle as daily, finishing today still counts as daily", async () => {
    const t = await puzzleAt(0);
    const y = await puzzleAt(-1);
    expect(y.date).toBe(addDays(qatarToday(), -1));
    expect(t.number).toBeGreaterThan(0);
    const u = await newUser();
    // simulate "yesterday's" daily guess on Q1
    const q1 = y.questions[0];
    const { error } = await svc.from('guesses').insert({ player_id: u.id, question_id: q1.id, guess: q1.answer * 2, is_daily: true });
    expect(error).toBeNull();
    // get_puzzle reports yesterday's puzzle as daily for a player who started it as daily
    expect((await ok(u, 'get_puzzle', { p_number: y.number })).is_daily).toBe(true);
    expect((await ok(await newUser(), 'get_puzzle', { p_number: y.number })).is_daily).toBe(false);
    const r2 = await ok(u, 'submit_guess', { p_question_id: y.questions[1].id, p_guess: y.questions[1].answer * 2 });
    await ok(u, 'submit_guess', { p_question_id: y.questions[2].id, p_guess: y.questions[2].answer * 2 });
    const { data: gs } = await svc.from('guesses').select('is_daily').eq('player_id', u.id);
    expect(gs!.map((g) => g.is_daily)).toEqual([true, true, true]);
    expect(r2.already_guessed).toBe(false);
    const { data: dr } = await svc.from('daily_results').select('is_daily').eq('player_id', u.id).eq('puzzle_id', y.id).single();
    expect(dr!.is_daily).toBe(true);

    // a player who never started yesterday's puzzle gets an archive play
    const v = await newUser();
    await ok(v, 'submit_guess', { p_question_id: q1.id, p_guess: q1.answer * 2 });
    const { data: vg } = await svc.from('guesses').select('is_daily').eq('player_id', v.id);
    expect(vg![0].is_daily).toBe(false);
  });

  it('daily top_pct matches the oracle once >= 20 daily results exist', async () => {
    const y = await puzzleAt(-1);
    const seeds = await seedUsers(21);
    for (const id of seeds) {
      const { error } = await svc.from('daily_results').insert({ player_id: id, puzzle_id: y.id, score: 1.5 + Math.random(), is_daily: true });
      if (error) throw error;
    }
    const u = await newUser();
    const q1 = y.questions[0];
    await svc.from('guesses').insert({ player_id: u.id, question_id: q1.id, guess: q1.answer * 1.01, is_daily: true });
    await playAll(u, { ...y, questions: y.questions.slice(1) }, 1.01);
    const res = await ok(u, 'get_results', { p_puzzle_id: y.id });
    expect(res.is_daily).toBe(true);
    const { data: all } = await svc.from('daily_results').select('score').eq('puzzle_id', y.id).eq('is_daily', true);
    const mine = Number(res.score);
    const le = all!.filter((r) => Number(r.score) <= mine + 1e-12).length;
    expect(res.players).toBe(all!.length);
    expect(res.top_pct).toBe(Math.ceil((100 * le) / all!.length));
  });
});
