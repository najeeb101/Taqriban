import { test, expect, newPlayer } from './helpers';

test('guess input parsing preview + calculator', async ({ browser }) => {
  const { ctx, page } = await newPlayer(browser);
  await page.goto('/play');
  const input = page.locator('input[inputmode="decimal"]');
  await expect(input).toBeVisible();
  const preview = page.getByText('سيتم تسجيل:');

  for (const [typed, shown] of [
    ['5 مليون', '5,000,000'],
    ['١٢٤٥', '1,245'],
    ['2.5k', '2,500'],
    ['1,500', '1,500'],
    ['250 ألف', '250,000'],
  ] as const) {
    await input.fill(typed);
    await expect(preview, typed).toContainText(shown);
  }

  for (const bad of ['0', 'abc']) {
    await input.fill(bad);
    await expect(page.getByText('أدخل رقماً أكبر من صفر').first(), bad).toBeVisible();
    await expect(input).toHaveAttribute('aria-invalid', 'true');
  }

  // empty submit -> invalid message, nothing locked
  await input.fill('');
  await page.getByRole('button', { name: 'ثبّت إجابتك' }).click();
  await expect(page.getByText('أدخل رقماً أكبر من صفر').first()).toBeVisible();
  await expect(page.getByText('الإجابة الصحيحة')).toHaveCount(0);

  // calculator
  await page.getByRole('button', { name: 'الآلة الحاسبة' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await page.keyboard.type('3*(4+5)');
  await expect(dialog.getByLabel('النتيجة')).toContainText('27');
  await dialog.getByRole('button', { name: 'استخدم النتيجة' }).click();
  await expect(dialog).toBeHidden();
  await expect(input).toHaveValue('27');

  // calculator via keypad buttons
  await page.getByRole('button', { name: 'الآلة الحاسبة' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'مسح الكل' }).click();
  for (const k of ['8', 'ضرب', '5']) await page.getByRole('dialog').getByRole('button', { name: k, exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('النتيجة')).toContainText('40');

  // Esc closes the sheet and focus goes back to the input
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(input).toBeFocused();
  await ctx.close();
});
