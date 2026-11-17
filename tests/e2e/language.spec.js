import { test, expect } from '@playwright/test';

test('choosing French before signing in keeps the whole app in French', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Language/ }).click();
  await page.getByRole('menuitemradio', { name: 'Français' }).click();
  await expect(page.getByRole('heading', { name: 'Se connecter' })).toBeVisible();
  await page.locator('.demo-box button').first().click(); // patient demo account (English in its profile)
  await expect(page).toHaveURL(/\/patient$/);
  await expect(page.getByRole('link', { name: 'Trouver un médecin' }).first()).toBeVisible();
  await expect(page.getByText('Prochain rendez-vous')).toBeVisible();
  await page.goto('/patient/appointments');
  await expect(page.getByRole('heading', { name: 'Mes rendez-vous' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /À venir/ })).toBeVisible();
  // reload keeps the language
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mes rendez-vous' })).toBeVisible();
});

test('switching to Arabic flips the layout and translates the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.locator('.demo-box button').nth(1).click(); // doctor
  await expect(page).toHaveURL(/\/doctor$/);
  await page.getByRole('button', { name: /Language/ }).click();
  await page.getByRole('menuitemradio', { name: 'العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('link', { name: 'المواعيد' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'جدول اليوم' })).toBeVisible();
  await page.goto('/doctor/schedule');
  await expect(page.getByRole('heading', { name: 'أوقات العمل' })).toBeVisible();
  await expect(page.getByRole('switch', { name: /الاثنين/ })).toBeVisible();
});
