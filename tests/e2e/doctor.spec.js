import { test, expect } from '@playwright/test';
import { loginAs, toast } from './helpers';

test('doctor accepts one request and declines another with a reason', async ({ page }) => {
  await loginAs(page, 'Doctor');
  await page.goto('/doctor/appointments?tab=pending');
  const first = page.locator('.appt-card').first();
  const name = (await first.locator('strong').first().textContent()).trim();
  await first.getByRole('button', { name: 'Accept' }).click();
  await toast(page, 'Appointment confirmed');
  await expect(page.locator('.appt-card', { hasText: name })).toHaveCount(0);
  await page.locator('.appt-card').first().getByRole('button', { name: 'Decline' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Decline request' }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await dialog.getByLabel('Message to the patient').fill('Fully booked that day, please pick next week.');
  await dialog.getByRole('button', { name: 'Decline request' }).click();
  await toast(page, 'Request declined');
});

test('doctor issues a prescription with an allergy warning', async ({ page }) => {
  await loginAs(page, 'Doctor');
  await page.goto('/doctor/prescriptions/new?patient=u_patient');
  await expect(page.getByText('Penicillin').first()).toBeVisible();
  // The diagnosis is required.
  await page.getByRole('button', { name: 'Sign & issue' }).click();
  await expect(page.getByText('Enter the diagnosis.')).toBeVisible();
  await page.getByLabel('Primary diagnosis').fill('Acute bacterial sinusitis');
  const med = page.getByLabel('Medication 1', { exact: true });
  await med.fill('Amoxi');
  await page.getByRole('option', { name: /Amoxicillin 500 mg/ }).click();
  await expect(page.getByText(/Possible allergy conflict/)).toBeVisible();
  await page.getByLabel('Dose', { exact: true }).fill('1 capsule');
  await page.getByLabel('Frequency', { exact: true }).selectOption('Three times daily');
  await page.getByLabel('Duration', { exact: true }).selectOption('7 days');
  // Optional follow-up: switched on, a date is required.
  await page.getByLabel('Schedule a follow-up visit').check();
  await page.getByRole('button', { name: 'Sign & issue' }).click();
  await expect(page.getByText('Choose a follow-up date.')).toBeVisible();
  await page.getByRole('button', { name: 'In 2 weeks' }).click();
  await page.getByLabel('Follow-up note').fill('Bring your sinus X-ray');
  await page.getByRole('button', { name: 'Sign & issue' }).click();
  await expect(page.getByText('Confirm you reviewed the allergy warning.')).toBeVisible();
  await page.getByLabel(/I reviewed the warning/).check();
  await page.getByRole('button', { name: 'Sign & issue' }).click();
  await expect(page).toHaveURL(/\/doctor\/prescriptions\/rx_/);
  await expect(page.locator('.rx-code')).toHaveText(/^RX-[A-Z0-9]{4}-\d{2}$/);
  await expect(page.locator('.rx-dx-text')).toHaveText('Acute bacterial sinusitis');
  await expect(page.locator('.rx-followup')).toContainText('Bring your sinus X-ray');
  // Both are part of the printed / PDF version too.
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.rx-dx-text')).toBeVisible();
  await expect(page.locator('.rx-followup')).toBeVisible();
  await expect(page.locator('.sidebar')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
});

test('availability changes update bookable slots', async ({ page }) => {
  await loginAs(page, 'Doctor');
  await page.goto('/doctor/schedule');
  const before = Number(await page.locator('.slot-counter').textContent());
  await page.getByRole('switch', { name: /Monday/ }).click();
  await expect(page.getByText('You have unsaved changes to your availability.')).toBeVisible();
  const after = Number(await page.locator('.slot-counter').textContent());
  expect(after).toBeLessThan(before);
  // leaving with unsaved changes asks first
  await page.getByRole('link', { name: 'Patients' }).click();
  await expect(page.getByRole('dialog', { name: 'Leave without saving?' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep as is' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await toast(page, 'Availability saved');
  await page.reload();
  await expect(page.locator('.slot-counter')).toHaveText(String(after));
});

test('practice profile has no picture upload and no name field; the name is changed in Settings with a live preview', async ({ page }) => {
  await loginAs(page, 'Doctor');
  await page.goto('/doctor/profile');
  await expect(page.getByRole('heading', { name: 'Practice profile' })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /photo/i })).toHaveCount(0);
  await expect(page.getByLabel('Full name')).toHaveCount(0);
  await page.getByRole('link', { name: 'Change your name in Settings' }).click();
  await expect(page).toHaveURL(/\/doctor\/settings/);

  // Typing updates the name and initials beside the avatar on every keystroke, before saving.
  const name = page.getByLabel('Full name');
  const preview = page.locator('.live-name');
  await name.fill('');
  await expect(preview.locator('.live-name-text')).toHaveText('Dr. ');
  for (const [typed, initials] of [['S', 'S'], ['Sa', 'S'], ['Sami', 'S'], ['Sami K', 'SK'], ['Sami Kh', 'SK']]) {
    await name.fill(typed);
    await expect(preview.locator('.live-name-text')).toHaveText(`Dr. ${typed.replace(/ /g, ' ')}`);
    await expect(preview.locator('.avatar')).toHaveCount(1); // the initials swap animation has settled
    await expect(preview.locator('.avatar')).toHaveText(initials);
  }
  await expect(preview.getByText('Preview')).toBeVisible();
  // The top bar still shows the saved name until the form is saved.
  await expect(page.locator('.topbar')).not.toContainText('Sami');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('region', { name: 'Notifications' }).getByText('Profile saved')).toBeVisible();
  await expect(preview.getByText('Preview')).toHaveCount(0);
  await expect(page.locator('.topbar .avatar').first()).toHaveText('SK');
});
