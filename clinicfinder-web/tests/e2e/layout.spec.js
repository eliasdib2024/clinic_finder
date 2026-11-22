import { test, expect } from '@playwright/test';

// Regression checks for layout bugs found during the final UI review.

async function signIn(page, index, lang) {
  await page.goto('/login');
  await page.evaluate((l) => localStorage.setItem('clinicfinder_lang', l), lang);
  await page.reload();
  await page.locator('.demo-box button').nth(index).click(); // 0 patient · 1 doctor · 2 admin
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

const pageWidth = (page) => page.evaluate(() => document.documentElement.scrollWidth);

for (const lang of ['en', 'ar']) {
  test(`${lang}: pages fit a phone screen without sideways scrolling`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, 0, lang);
    for (const path of ['/patient', '/patient/search', '/patient/doctors/d_1', '/patient/appointments', '/patient/settings']) {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
      expect(await pageWidth(page), path).toBeLessThanOrEqual(390);
    }
  });
}

test('Arabic admin charts keep their labels inside the panel', async ({ page }) => {
  await signIn(page, 2, 'ar');
  const panel = page.locator('section[aria-labelledby="gov-h"]');
  await expect(panel.locator('svg text').first()).toBeVisible();
  const box = await panel.boundingBox();
  const labels = await panel.locator('svg text').evaluateAll((els) => els.map((e) => {
    const r = e.getBoundingClientRect();
    return { text: e.textContent, left: r.left, right: r.right };
  }));
  expect(labels.length).toBeGreaterThan(5);
  for (const l of labels) {
    expect(l.left, `"${l.text}" starts outside the panel`).toBeGreaterThanOrEqual(box.x);
    expect(l.right, `"${l.text}" ends outside the panel`).toBeLessThanOrEqual(box.x + box.width);
  }
});
