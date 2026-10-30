/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, giveAccount, newPlayer, todaysPuzzle, playThrough, puzzleByDate, svc } from './helpers';

test('leaderboard tabs, profile edit, settings (digits/theme)', async ({ browser }) => {
  const puzzle = await todaysPuzzle();
  const { ctx, page } = await newPlayer(browser);
  const name = `نور${Math.floor(Math.random() * 9000 + 1000)}`;

  await page.goto('/play');
  await playThrough(page, puzzle, [3, 3, 3]);
  await expect(page.getByText('نتيجة اليوم')).toBeVisible();

  // profile: invalid then valid name
  await page.goto('/profile');
  const field = page.getByLabel('الاسم الظاهر');
  await field.fill('ا');
  await expect(page.getByText('الاسم قصير جداً (حرفان على الأقل).')).toBeVisible();
  await page.getByRole('button', { name: 'حفظ التغييرات' }).click();
  await expect(page.getByText('تم حفظ ملفك')).toHaveCount(0);
  await field.fill(name);
  await page.getByLabel('الجامعة').selectOption('qu');
  await page.getByRole('button', { name: 'حفظ التغييرات' }).click();
  await expect(page.getByText('تم حفظ ملفك')).toBeVisible();
  await expect(page.getByText('ألغاز لُعبت')).toBeVisible();

  // leaderboard: guests are not ranked on public boards and see the «account only» card
  await page.goto('/leaderboard');
  await expect(page.getByText('الترتيب لأصحاب الحسابات فقط')).toBeVisible();
  await expect(page.getByRole('tabpanel').getByText(name)).toHaveCount(0);
  // give this player an account (as confirming the email link would), then they are ranked
  await giveAccount(page);
  await page.reload();

  // leaderboard tabs
  for (const tab of ['اليوم', 'الأسبوع', 'كل الأوقات', 'السلسلة']) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toBeVisible();
  }
  await page.getByRole('tab', { name: 'اليوم' }).click();
  await expect(page.getByRole('tabpanel').getByText(name)).toBeVisible();
  // university filter appears and works
  await page.getByRole('button', { name: 'جامعتي' }).click();
  await expect(page.getByRole('tabpanel').getByText(name)).toBeVisible();

  // settings: digits
  await page.goto('/settings');
  await expect(page.getByText(/معاينة:/)).toContainText('2026');
  await page.getByRole('radiogroup', { name: 'شكل الأرقام' }).getByRole('radio').nth(1).click();
  await expect(page.getByText(/معاينة:/)).toContainText('٢٠٢٦');
  await page.getByRole('radiogroup', { name: 'شكل الأرقام' }).getByRole('radio').nth(0).click();
  await expect(page.getByText(/معاينة:/)).toContainText('2026');

  // theme
  const themeGroup = page.getByRole('radiogroup', { name: 'المظهر' });
  await themeGroup.getByRole('radio', { name: 'داكن' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await themeGroup.getByRole('radio', { name: 'فاتح' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await ctx.close();
});

test('archive lists puzzles 1-3; archive play shows banner and is not on the daily leaderboard', async ({ browser }) => {
  const { ctx, page } = await newPlayer(browser);
  await page.goto('/archive');
  for (const n of [1, 2, 3]) await expect(page.getByText(`اللغز رقم ${n}`).first()).toBeVisible();
  await expect(page.getByText('اللغز رقم 4')).toHaveCount(0);

  await page.getByRole('link', { name: /اللغز رقم 1/ }).first().click();
  await expect(page).toHaveURL(/\/play\/1$/);
  await expect(page.getByText('لعب من الأرشيف — لا يُحتسب في المتصدرين')).toBeVisible();
  const { data: p1 } = await svc.from('puzzles').select('publish_date').eq('number', 1).single();
  const puzzle = await puzzleByDate(p1!.publish_date as string);
  await playThrough(page, puzzle, [2, 2, 2]);
  await expect(page.getByText('هذه نتيجة من الأرشيف ولا تدخل في ترتيب المتصدرين.')).toBeVisible();

  await page.goto('/leaderboard');
  await expect(page.getByRole('tabpanel').getByText('أنت')).toHaveCount(0);
  await ctx.close();
});

test('submit a question (happy path + validation)', async ({ browser }) => {
  const { ctx, page } = await newPlayer(browser);
  const text = `كم عدد كراسي الملعب الرئيسي في الدوحة؟ ${Date.now()}`;
  await page.goto('/submit');
  await page.getByRole('button', { name: 'أرسل السؤال' }).click();
  await expect(page.getByText('نص السؤال يجب أن يكون من 10 إلى 300 حرف.')).toBeVisible();
  await page.getByLabel('نص السؤال').fill(text);
  await page.getByLabel('الوحدة').fill('كرسي');
  await page.getByLabel('رابط المصدر').fill('not a url');
  await page.getByRole('button', { name: 'أرسل السؤال' }).click();
  await expect(page.getByText('أدخل رابطاً صحيحاً يبدأ بـ http:// أو https://')).toBeVisible();
  await page.getByLabel('رابط المصدر').fill('');
  await page.getByRole('button', { name: 'أرسل السؤال' }).click();
  await expect(page.getByText('شكراً لك!')).toBeVisible();
  const { data } = await svc.from('submissions').select('id,source_url').eq('text_ar', text);
  expect((data as any[]).length).toBe(1);
  expect((data as any[])[0].source_url).toBeNull();
  await svc.from('submissions').delete().eq('text_ar', text);
  await ctx.close();
});
