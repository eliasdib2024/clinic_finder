import { test, expect } from '@playwright/test';
import { loginAs, toast, completeHealthProfile } from './helpers';

test('search filters are applied and kept in the URL', async ({ page }) => {
  await loginAs(page, 'Patient');
  await page.goto('/patient/search?specialty=cardiology');
  await expect(page.getByText(/doctors? found/)).toBeVisible();
  const cards = page.locator('.doc-card');
  await expect(cards.first()).toBeVisible();
  for (const t of await cards.allInnerTexts()) expect(t).toContain('Cardiology');
  await page.getByLabel('Governorate').first().selectOption('south');
  await expect(page).toHaveURL(/governorate=south/);
  await expect(page.getByText('1 doctor found')).toBeVisible();
  await page.getByRole('button', { name: 'Reset all' }).click();
  await expect(page).not.toHaveURL(/specialty=/);
});

test('book an appointment end to end', async ({ page }) => {
  // A brand-new patient has no other bookings, so no time can clash.
  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Karim Booker');
  await page.getByLabel('Email').fill('karim.booker@example.lb');
  await page.getByLabel('Mobile number').fill('76 222 111');
  await page.getByLabel('Password', { exact: true }).fill('Strong#Pass26');
  await page.getByLabel('Confirm password').fill('Strong#Pass26');
  await page.getByLabel(/I agree/).check();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await completeHealthProfile(page);
  await page.goto('/patient/doctors/d_2');
  await expect(page.getByRole('heading', { name: 'Dr. Lina Khoury' })).toBeVisible();
  const day = page.locator('.sticky-book .date-pill:not([disabled])').nth(1);
  await day.click();
  const slot = page.locator('.sticky-book .slot').first();
  const time = (await slot.textContent()).trim();
  await slot.click();
  await page.getByRole('button', { name: `Book ${time}` }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason for visit').fill('Itchy rash on both arms for a week');
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(dialog.getByText('Itchy rash on both arms for a week')).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirm booking' }).click();
  await expect(dialog.getByRole('heading', { name: 'Request sent' })).toBeVisible();
  await dialog.getByRole('button', { name: 'View my appointments' }).click();
  await expect(page).toHaveURL(/\/patient\/appointments/);
  await expect(page.locator('.appt-card', { hasText: 'Itchy rash' }).getByText('Pending')).toBeVisible();
  // the booked slot is no longer offered
  await page.goto('/patient/doctors/d_2');
  await page.locator('.sticky-book .date-pill:not([disabled])').nth(1).click();
  await expect(page.locator('.sticky-book .slot', { hasText: time })).toHaveCount(0);
});

test('reschedule returns to pending, then cancel', async ({ page }) => {
  await loginAs(page, 'Patient');
  await page.goto('/patient/appointments');
  const card = page.locator('.appt-card', { hasText: 'Dr. Rami Haddad' }).filter({ hasText: 'Confirmed' }).first();
  await card.getByRole('button', { name: 'Reschedule' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('.date-pill:not([disabled])').nth(2).click();
  await dialog.locator('.slot').first().click();
  await dialog.getByRole('button', { name: /^Move to/ }).click();
  await toast(page, 'Appointment rescheduled');
  const moved = page.locator('.appt-card', { hasText: 'Rescheduled from' }).first();
  await expect(moved.getByText('Pending', { exact: true })).toBeVisible();
  await moved.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel appointment' }).click();
  await toast(page, 'Appointment cancelled');
  await page.getByRole('tab', { name: /Cancelled/ }).click();
  await expect(page.locator('.appt-card', { hasText: 'Dr. Rami Haddad' }).filter({ hasText: 'Cancelled by patient' }).first()).toBeVisible();
});

test('patient opens a printable prescription with a verification code', async ({ page }) => {
  await loginAs(page, 'Patient');
  await page.goto('/patient/prescriptions');
  await page.getByRole('link', { name: /Azithromycin/ }).first().click();
  const code = (await page.locator('.rx-code').textContent()).trim();
  expect(code).toMatch(/^RX-[A-Z0-9]{4}-\d{2}$/);
  await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeVisible();
  await page.goto(`/verify/${code}`);
  await expect(page.getByText('Genuine prescription')).toBeVisible();
});
