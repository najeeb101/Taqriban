import { test, expect, newPlayer } from './helpers';

const ROUTES = ['/', '/play', '/play/1', '/leaderboard', '/groups', '/profile', '/settings', '/archive', '/submit'];

for (const route of ROUTES) {
  test(`route ${route} renders without console errors`, async ({ browser }) => {
    const { ctx, page } = await newPlayer(browser);
    const res = await page.goto(route);
    expect(res!.status()).toBe(200);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('main')).toBeVisible();
    // no horizontal overflow at phone width
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await ctx.close();
  });
}

test('unknown route renders the 404 page', async ({ browser, allowErrors }) => {
  allowErrors(/404/);
  const { ctx, page } = await newPlayer(browser);
  const res = await page.goto('/no-such-page');
  expect(res!.status()).toBe(404);
  await expect(page.getByText('الصفحة غير موجودة').first()).toBeVisible();
  await ctx.close();
});

test('unknown group code shows not-found state', async ({ browser }) => {
  const { ctx, page } = await newPlayer(browser);
  await page.goto('/groups/ZZZZZZ');
  await expect(page.getByText('لم نجد هذه المجموعة')).toBeVisible();
  await ctx.close();
});

test('manifest.webmanifest is valid', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.lang).toBe('ar');
  expect(m.dir).toBe('rtl');
  expect(m.icons.length).toBeGreaterThan(0);
});
