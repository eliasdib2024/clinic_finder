import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

// Regression: navigating while a page transition was still running left the new page
// rendered but invisible (opacity 0). Run with animations enabled to reproduce real use.
test.use({ reducedMotion: 'no-preference' });

for (const role of ['Patient', 'Doctor', 'Admin']) {
  test(`${role}: fast navigation never leaves a page invisible`, async ({ page }) => {
    await loginAs(page, role);
    const links = await page.locator('nav.sidebar.desktop a.side-link').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    for (const href of [...links, ...links]) {
      await page.locator(`nav.sidebar.desktop a.side-link[href="${href}"]`).click();
      await page.waitForTimeout(80); // click again before the previous transition finishes
    }
    await page.locator(`nav.sidebar.desktop a.side-link[href="${links[0]}"]`).click();
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect.poll(() => page.locator('main > div').first().evaluate((el) => Number(getComputedStyle(el).opacity))).toBe(1);
  });
}
