import { expect } from '@playwright/test';

export async function loginAs(page, role) {
  await page.goto('/login');
  await page.getByRole('button', { name: role, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${role.toLowerCase()}$`));
}

export async function toast(page, text) {
  await expect(page.getByRole('region', { name: 'Notifications' }).getByText(text).first()).toBeVisible();
}

/** Step 2 of patient sign-up: fill the health profile and land on the dashboard. */
export async function completeHealthProfile(page, { allergies = [] } = {}) {
  await expect(page).toHaveURL(/\/welcome$/);
  await page.getByLabel('Date of birth').fill('1992-03-14');
  await page.getByLabel('Governorate').selectOption('beirut');
  await page.getByLabel('City').selectOption('Hamra');
  if (allergies.length) {
    for (const a of allergies) { await page.getByLabel('Allergies', { exact: true }).fill(a); await page.getByLabel('Allergies', { exact: true }).press('Enter'); }
  } else {
    await page.getByLabel('I have no known allergies').check();
  }
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page).toHaveURL(/\/patient$/);
}
