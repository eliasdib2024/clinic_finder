import { test, expect } from '@playwright/test';
import { loginAs, toast } from './helpers';

test('admin approves and rejects doctor applications', async ({ page }) => {
  await loginAs(page, 'Admin');
  await page.goto('/admin/verifications');
  await expect(page.locator('.appt-card')).toHaveCount(3);
  await page.locator('.appt-card', { hasText: 'Dr. Sana Itani' }).getByRole('button', { name: 'Approve' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Approve and publish' }).click();
  await toast(page, 'is verified');
  await page.locator('.appt-card', { hasText: 'Dr. Jad Moussawi' }).getByRole('button', { name: 'Reject' }).click();
  await page.getByRole('dialog').getByLabel('Reason shown to the doctor').fill('License number does not match the registry.');
  await page.getByRole('dialog').getByRole('button', { name: 'Reject application' }).click();
  await toast(page, 'Application rejected');
  await expect(page.locator('.appt-card')).toHaveCount(1);
  // approved doctor is now searchable
  await page.goto('/find?q=Sana');
  await expect(page.getByText('Dr. Sana Itani')).toBeVisible();
});

test('admin suspends a user, who can no longer sign in', async ({ page }) => {
  await loginAs(page, 'Admin');
  await page.goto('/admin/users?role=patient');
  await page.getByLabel('Search users').fill('Nadine');
  await page.getByRole('button', { name: 'Suspend Nadine Khalil' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Internal reason').fill('Testing suspension');
  await dialog.getByRole('button', { name: 'Suspend user' }).click();
  await toast(page, 'Nadine Khalil suspended');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Patient', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'suspended' })).toBeVisible();
});

test('catalog changes reach the search filters', async ({ page }) => {
  await loginAs(page, 'Admin');
  await page.goto('/admin/catalog');
  await page.getByLabel('New specialty name').fill('Rheumatology');
  await page.getByRole('button', { name: 'Add specialty' }).click();
  await toast(page, 'Rheumatology added');
  await page.goto('/find');
  await expect(page.getByLabel('Specialty').first().locator('option', { hasText: 'Rheumatology' })).toHaveCount(1);
});

test('admin creates a clinic with validation', async ({ page }) => {
  await loginAs(page, 'Admin');
  await page.goto('/admin/clinics');
  await page.getByRole('button', { name: 'Add clinic' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Create clinic' }).click();
  await expect(dialog.getByText('Enter the clinic name (3+ characters).')).toBeVisible();
  await dialog.getByLabel('Clinic name').fill('Harbour Family Clinic');
  await dialog.getByLabel('Governorate').selectOption('south');
  await dialog.getByLabel('City').selectOption('Tyre');
  await dialog.getByLabel('Street address').fill('Port road, Bldg 7');
  await dialog.getByLabel('Phone').fill('07 345 678');
  await dialog.getByRole('button', { name: 'Create clinic' }).click();
  await toast(page, 'Clinic created');
  await expect(page.getByRole('cell', { name: /Harbour Family Clinic/ }).first()).toBeVisible();
});
