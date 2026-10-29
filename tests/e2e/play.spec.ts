import { test, expect, newPlayer, todaysPuzzle, lockGuess, toAscii, playThrough } from './helpers';

const RLM = '‏';
const containsNumber = (body: string, n: number) => new RegExp(`(?<![\d.])${String(n).replace('.', '\.')}(?![\d.])`).test(body);

test('fresh visitor plays today end-to-end (no answer leaks, resume, reveal, results, share)', async ({ browser }) => {
  const puzzle = await todaysPuzzle();
  const { ctx, page } = await newPlayer(browser);
  const bodies: string[] = [];
  page.on('response', async (res) => {
    if (!res.url().includes('/rest/v1/rpc/')) return;
    try {
      bodies.push(await res.text());
    } catch {
      /* ignore */
    }
  });
  const assertNoLeak = (fromIdx: number) => {
    for (const b of bodies) for (const q of puzzle.questions.slice(fromIdx)) expect(containsNumber(b, q.answer), `answer of Q${q.position} leaked`).toBe(false);
  };
  // browsers without share support so the image goes through the download path
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'share', { value: undefined, configurable: true });
    Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined, configurable: true });
  });

  await page.goto('/');
  await expect(page.getByRole('link', { name: 'العب اليوم' })).toBeVisible();
  await page.getByRole('link', { name: 'العب اليوم' }).click();
  await expect(page).toHaveURL(/\/play$/);

  // Q1
  await expect(page.getByText(puzzle.questions[0].text)).toBeVisible();
  assertNoLeak(0);
  await lockGuess(page, String(puzzle.questions[0].answer * 2));
  await expect(page.getByText('الإجابة الصحيحة')).toBeVisible();
  await expect(page.getByText(/أكثر من الإجابة بـ/).first()).toBeVisible();
  await expect(page.getByText('لا يوجد عدد كافٍ من اللاعبين بعد', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: /توزيع/ }).first()).toBeVisible();
  await page.getByText('حساب على الورقة').click();
  await expect(page.getByText('طول ضلع القاعدة')).toBeVisible();
  await expect(page.getByRole('link', { name: /Wikipedia/ })).toBeVisible();
  assertNoLeak(1);
  await page.getByRole('button', { name: 'السؤال التالي' }).click();

  // refresh mid-puzzle -> resumes at Q2
  await expect(page.getByText(puzzle.questions[1].text)).toBeVisible();
  await page.reload();
  await expect(page.getByText(puzzle.questions[1].text)).toBeVisible();
  await expect(page.getByText(/2\s*\/\s*3|٢\s*\/\s*٣/)).toBeVisible();
  assertNoLeak(1);

  // Q2 low, Q3 exact
  await lockGuess(page, String(puzzle.questions[1].answer / 2));
  await expect(page.getByText(/أقل من الإجابة بـ/).first()).toBeVisible();
  assertNoLeak(2);
  await page.getByRole('button', { name: 'السؤال التالي' }).click();
  await lockGuess(page, String(puzzle.questions[2].answer));
  await expect(page.getByText('إصابة دقيقة!', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'شاهد نتيجتك' }).click();

  // results: geometric mean of (2, 2, 1) = 1.59
  await expect(page.getByText('نتيجة اليوم')).toBeVisible();
  await expect(page.locator('main')).toContainText(/1\.59/);
  await expect(page.getByText('لا يوجد عدد كافٍ من اللاعبين بعد', { exact: true })).toBeVisible();
  await expect(page.getByText('تفاصيل أسئلتك')).toBeVisible();

  // copy text
  await page.getByRole('button', { name: 'شارك نتيجتك' }).click();
  await expect(page.getByText('تم نسخ النص')).toBeVisible();
  const clip = toAscii(await page.evaluate(() => navigator.clipboard.readText()));
  const lines = clip.split('\n');
  expect(lines.length).toBe(6); // head, score, 3 rows, url
  for (const l of lines) expect(l.startsWith(RLM)).toBe(true);
  expect(lines[0]).toContain(`تقريباً #${puzzle.number}`);
  expect(lines[1]).toContain('النتيجة: 1.59');
  expect(lines[2]).toMatch(/^‏[🟩🟨🟧🟥] ⬆️ 2/u);
  expect(lines[3]).toMatch(/^‏[🟩🟨🟧🟥] ⬇️ 2/u);
  expect(lines[4]).toMatch(/^‏🟩 🎯/u);
  for (const q of puzzle.questions) {
    expect(clip).not.toContain(q.text);
    expect(containsNumber(clip, q.answer)).toBe(false);
  }

  // share image generation doesn't throw (download path)
  const download = page.waitForEvent('download', { timeout: 30_000 });
  await page.getByRole('button', { name: 'صورة النتيجة' }).click();
  const dl = await download;
  await dl.saveAs('test-results/share-card.png');
  await expect(page.getByText('تعذّر إنشاء الصورة')).toHaveCount(0);

  // home finished state
  await page.goto('/');
  await expect(page.getByText('أنهيت لغز اليوم')).toBeVisible();
  await ctx.close();
});

test('refresh keeps finished puzzle on results', async ({ browser }) => {
  const puzzle = await todaysPuzzle();
  const { ctx, page } = await newPlayer(browser);
  await page.goto('/play');
  await playThrough(page, puzzle, [1.1, 0.9, 1.2]);
  await expect(page.getByText('نتيجة اليوم')).toBeVisible();
  await page.reload();
  await expect(page.getByText('نتيجة اليوم')).toBeVisible();
  await ctx.close();
});
