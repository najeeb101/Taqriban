import { test, expect, newPlayer, todaysPuzzle, playThrough } from './helpers';

test('groups: create, invite link, join, spoiler protection, leaderboard filter', async ({ browser }) => {
  const puzzle = await todaysPuzzle();
  const suffix = Math.floor(Math.random() * 9000 + 1000);
  const nameA = `سلمى${suffix}`;
  const nameB = `خالد${suffix}`;
  const A = await newPlayer(browser);
  const B = await newPlayer(browser);

  // names
  for (const [p, n] of [
    [A.page, nameA],
    [B.page, nameB],
  ] as const) {
    await p.goto('/profile');
    await p.getByLabel('الاسم الظاهر').fill(n);
    await p.getByRole('button', { name: 'حفظ التغييرات' }).click();
    await expect(p.getByText('تم حفظ ملفك')).toBeVisible();
  }

  // A finishes today and creates a group
  await A.page.goto('/play');
  await playThrough(A.page, puzzle, [1.5, 1.5, 1.5]);
  await expect(A.page.getByText('نتيجة اليوم')).toBeVisible();
  await A.page.goto('/groups');
  await A.page.getByLabel('اسم المجموعة').fill(`شلة ${suffix}`);
  await A.page.getByRole('button', { name: 'إنشاء المجموعة' }).click();
  await expect(A.page).toHaveURL(/\/groups\/[A-Z0-9]{6}$/);
  const code = A.page.url().split('/').pop()!;
  await expect(A.page.getByText(code).first()).toBeVisible();
  await A.page.getByRole('button', { name: 'انسخ رابط الدعوة' }).click();
  const link = await A.page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain(`/groups/${code}`);
  await expect(A.page.getByRole('link', { name: /واتساب/ })).toHaveAttribute('href', /wa\.me|whatsapp/);

  // B opens the invite link, joins
  await B.page.goto(`/groups/${code}`);
  await expect(B.page.getByText('تمت دعوتك إلى مجموعة')).toBeVisible();
  await B.page.getByRole('button', { name: 'انضم إلى المجموعة' }).click();
  await expect(B.page.getByText('أكمل لغز اليوم لترى نتائج الأعضاء.')).toBeVisible();
  await expect(B.page.getByText('1.5', { exact: false })).toHaveCount(0); // A's score hidden

  // B finishes -> scores visible
  await B.page.goto('/play');
  await playThrough(B.page, puzzle, [2, 2, 2]);
  await B.page.goto(`/groups/${code}`);
  await expect(B.page.getByText('أكمل لغز اليوم لترى نتائج الأعضاء.')).toHaveCount(0);
  await expect(B.page.getByText(nameA).first()).toBeVisible();
  await expect(B.page.getByText(nameB).first()).toBeVisible();
  await expect(B.page.getByText(/1\.50/).first()).toBeVisible();

  // leaderboard group filter lists both
  await B.page.goto('/leaderboard');
  await B.page.getByRole('button', { name: `شلة ${suffix}` }).click();
  await expect(B.page.getByText(nameA).first()).toBeVisible();
  await expect(B.page.getByText(nameB).first()).toBeVisible();

  await A.ctx.close();
  await B.ctx.close();
});
