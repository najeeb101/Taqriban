/* eslint-disable react-hooks/rules-of-hooks, @typescript-eslint/no-explicit-any */
import { test as base, expect, type Page, type BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export interface TodayQuestion {
  id: number;
  position: number;
  answer: number;
  text: string;
}
export interface TodayPuzzle {
  id: number;
  number: number;
  questions: TodayQuestion[];
}

export function qatarToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Qatar' }).format(new Date());
}

export async function puzzleByDate(date: string): Promise<TodayPuzzle> {
  const { data: p, error } = await svc.from('puzzles').select('id,number').eq('publish_date', date).single();
  if (error) throw new Error(`no puzzle for ${date}: ${error.message}`);
  const { data: qs } = await svc
    .from('questions')
    .select('id,position,text_ar,question_answers(answer)')
    .eq('puzzle_id', p.id)
    .order('position');
  return {
    id: p.id,
    number: p.number,
    questions: (qs ?? []).map((q: any) => ({
      id: q.id,
      position: q.position,
      text: q.text_ar,
      answer: Number(Array.isArray(q.question_answers) ? q.question_answers[0].answer : q.question_answers.answer),
    })),
  };
}
export const todaysPuzzle = () => puzzleByDate(qatarToday());

/** Collects unexpected console errors / page errors; asserted empty at the end of each test. */
export const test = base.extend<{ errors: string[]; allowErrors: (re: RegExp) => void }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      attachErrorCollector(page, errors);
      await use(errors);
    },
    { auto: true },
  ],
  allowErrors: async ({ errors }, use) => {
    await use((re: RegExp) => {
      for (let i = errors.length - 1; i >= 0; i--) if (re.test(errors[i])) errors.splice(i, 1);
      allowed.push(re);
    });
  },
});
const allowed: RegExp[] = [];

export function attachErrorCollector(page: Page, errors: string[]) {
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (allowed.some((re) => re.test(text))) return;
    errors.push(`console.error: ${text}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
}

test.afterEach(async ({ errors }) => {
  allowed.length = 0;
  expect(errors, 'unexpected console errors').toEqual([]);
});

export async function newPlayer(browser: import('@playwright/test').Browser): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'ar',
    timezoneId: 'Asia/Qatar',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await ctx.newPage();
  return { ctx, page };
}

/** Types a guess for the current question and locks it. */
export async function lockGuess(page: Page, text: string) {
  const input = page.locator('input[inputmode="decimal"]');
  await input.fill(text);
  await page.getByRole('button', { name: 'ثبّت إجابتك' }).click();
}

export const toAscii = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** Plays every remaining question of the current game flow with the given multipliers of the true answer. */
export async function playThrough(page: Page, puzzle: TodayPuzzle, factors: number[], startAt = 0) {
  for (let i = startAt; i < puzzle.questions.length; i++) {
    const q = puzzle.questions[i];
    const g = q.answer * factors[i];
    await lockGuess(page, String(Number(g.toPrecision(6))));
    const next = i < puzzle.questions.length - 1 ? 'السؤال التالي' : 'شاهد نتيجتك';
    await page.getByRole('button', { name: next }).click();
  }
}
export { expect };
