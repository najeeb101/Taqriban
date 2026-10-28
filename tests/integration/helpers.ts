/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !ANON || !SERVICE) throw new Error('Missing Supabase env (.env.local)');

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

export const svc: SupabaseClient = createClient(URL, SERVICE, opts);
export const anonClient = (): SupabaseClient => createClient(URL, ANON, opts);

export const FIXTURE_MIN = 90000;

export function qatarToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar' }).format(new Date());
}
export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export interface TestUser {
  id: string;
  client: SupabaseClient;
}
const users: TestUser[] = [];
const adminUserIds: string[] = [];

export async function newUser(): Promise<TestUser> {
  const client = createClient(URL, ANON, opts);
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.user) throw error ?? new Error('anon sign-in failed');
  const u = { id: data.user.id, client };
  users.push(u);
  return u;
}

/** Creates N players through the admin API (for seeding data directly via the service role). */
export async function seedUsers(n: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < n; i += 5) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(5, n - i) }, async (_, k) => {
        const { data, error } = await svc.auth.admin.createUser({
          email: `seed-${Date.now()}-${i + k}-${Math.random().toString(36).slice(2, 8)}@test.invalid`,
          email_confirm: true,
        });
        if (error || !data.user) throw error ?? new Error('createUser failed');
        adminUserIds.push(data.user.id);
        return data.user.id;
      }),
    );
    ids.push(...batch);
  }
  return ids;
}

export async function rpc<T = any>(u: TestUser | SupabaseClient, fn: string, args?: Record<string, unknown>) {
  const client = 'client' in u ? u.client : u;
  const { data, error } = await client.rpc(fn, args ?? {});
  return { data: data as T, error };
}
/** Calls an RPC and throws if it errors. */
export async function ok<T = any>(u: TestUser, fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc<T>(u, fn, args);
  if (error) throw new Error(`${fn} failed: ${error.message}`);
  return data;
}

export interface FixtureQuestion {
  id: number;
  position: number;
  answer: number;
}
export interface FixturePuzzle {
  id: number;
  number: number;
  date: string;
  questions: FixtureQuestion[];
  created: boolean;
}
const createdPuzzleIds: number[] = [];

export async function purgeFixtures() {
  await svc.from('puzzles').delete().gte('number', FIXTURE_MIN);
}

export async function loadPuzzleByDate(date: string): Promise<FixturePuzzle | null> {
  const { data: p } = await svc.from('puzzles').select('id,number,publish_date').eq('publish_date', date).maybeSingle();
  if (!p) return null;
  const { data: qs } = await svc.from('questions').select('id,position,question_answers(answer)').eq('puzzle_id', p.id).order('position');
  return {
    id: p.id,
    number: p.number,
    date,
    created: false,
    questions: (qs ?? []).map((q: any) => ({
      id: q.id,
      position: q.position,
      answer: Number(Array.isArray(q.question_answers) ? q.question_answers[0].answer : q.question_answers.answer),
    })),
  };
}

export async function createPuzzle(
  number: number,
  date: string,
  answers: [number, number, number] = [1000, 50000, 2_000_000],
  status = 'scheduled',
): Promise<FixturePuzzle> {
  const { data: p, error } = await svc.from('puzzles').insert({ number, publish_date: date, status }).select('id').single();
  if (error) throw new Error(`createPuzzle ${number}/${date}: ${error.message}`);
  createdPuzzleIds.push(p.id);
  const questions: FixtureQuestion[] = [];
  for (let i = 0; i < 3; i++) {
    const { data: q, error: e2 } = await svc
      .from('questions')
      .insert({ puzzle_id: p.id, position: i + 1, text_ar: `سؤال اختبار ${number}-${i + 1}`, unit_ar: 'وحدة', category: 'test' })
      .select('id')
      .single();
    if (e2) throw e2;
    const { error: e3 } = await svc.from('question_answers').insert({
      question_id: q.id,
      answer: answers[i],
      source_url: 'https://example.com/src',
      source_name: 'Example',
      as_of: '2024',
      explanation_ar: `شرح **الحساب** ${i + 1}`,
    });
    if (e3) throw e3;
    questions.push({ id: q.id, position: i + 1, answer: answers[i] });
  }
  return { id: p.id, number, date, questions, created: true };
}

/**
 * Puzzle on `today + offset`: an existing (imported) one if present, else a fixture whose number is
 * (today's number) + offset so streak arithmetic works. Fixtures are deleted by cleanupAll().
 */
export async function puzzleAt(offset: number): Promise<FixturePuzzle> {
  const today = qatarToday();
  const date = addDays(today, offset);
  const existing = await loadPuzzleByDate(date);
  if (existing) return existing;
  const todays = offset === 0 ? null : await loadPuzzleByDate(today);
  const base = todays ? todays.number : FIXTURE_MIN + 100;
  return createPuzzle(base + offset, date);
}

export async function guess(u: TestUser, qid: number, value: number) {
  return rpc(u, 'submit_guess', { p_question_id: qid, p_guess: value });
}
export async function playAll(u: TestUser, p: FixturePuzzle, factor: number | number[]) {
  const out: any[] = [];
  for (const q of p.questions) {
    const f = Array.isArray(factor) ? factor[q.position - 1] : factor;
    const r = await rpc(u, 'submit_guess', { p_question_id: q.id, p_guess: q.answer * f });
    if (r.error) throw new Error(`playAll: ${r.error.message}`);
    out.push(r.data);
  }
  return out;
}

export async function cleanupAll() {
  for (const u of users) await svc.auth.admin.deleteUser(u.id);
  for (const id of adminUserIds) await svc.auth.admin.deleteUser(id);
  users.length = 0;
  adminUserIds.length = 0;
  if (createdPuzzleIds.length) await svc.from('puzzles').delete().in('id', createdPuzzleIds);
  createdPuzzleIds.length = 0;
  await svc.from('puzzles').delete().gte('number', FIXTURE_MIN);
}

export const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(b));
