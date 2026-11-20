import { test, expect, devices } from '@playwright/test';

// Regression: on phones, navigating through the slide-out menu used to leave the drawer's
// invisible overlay on screen, so the app "froze" and ignored every tap.
test.use({ ...devices['Pixel 5'] });

for (const [index, role] of [[0, 'patient'], [1, 'doctor'], [2, 'admin']]) {
  test(`${role}: every menu link can be tapped on a phone without freezing the app`, async ({ page }) => {
    await page.goto('/login');
    await page.locator('.demo-box button').nth(index).tap();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));

    await page.locator('.menu-toggle').tap();
    const count = await page.locator('.drawer nav a').count();
    await page.locator('.drawer .icon-btn').tap();
    await expect(page.locator('.overlay')).toHaveCount(0);

    for (let i = 0; i < count; i += 1) {
      await page.locator('.menu-toggle').tap();
      const link = page.locator('.drawer nav a').nth(i);
      const href = await link.getAttribute('href');
      await link.tap();
      await expect(page).toHaveURL(new RegExp(`${href.replace(/[?]/g, '\\?')}$`));
      // The drawer and its overlay must be gone, and scrolling unlocked.
      await expect(page.locator('.overlay')).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
      // The page is interactive again: the menu button receives the tap.
      const hit = await page.evaluate(() => {
        const b = document.querySelector('.menu-toggle').getBoundingClientRect();
        return document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('.menu-toggle') !== null;
      });
      expect(hit, `screen blocked after opening ${href}`).toBe(true);
    }
  });
}
