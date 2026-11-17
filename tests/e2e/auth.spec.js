import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test('guests are redirected to sign in and back to the page they wanted', async ({ page }) => {
  await page.goto('/patient/appointments');
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('Email').fill('patient@clinicfinder.lb');
  await page.getByLabel('Password', { exact: true }).fill('Patient@123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/patient\/appointments$/);
});

test('a user opening another role’s area is sent to their own', async ({ page }) => {
  await loginAs(page, 'Patient');
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/patient$/);
  await page.goto('/doctor');
  await expect(page).toHaveURL(/\/patient$/);
});

test('wrong password shows an error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('patient@clinicfinder.lb');
  await page.getByLabel('Password', { exact: true }).fill('Wrong@123');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Incorrect email or password' })).toBeVisible();
});

test('patient registration validates and creates an account', async ({ page }) => {
  await page.goto('/signup');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Full name is required.')).toBeVisible();
  await page.getByLabel('Full name').fill('Maya Test');
  await page.getByLabel('Email').fill('maya.test@example.lb');
  await page.getByLabel('Mobile number').fill('+1 415 555 0101');
  await page.getByLabel('Password', { exact: true }).fill('Strong#Pass26');
  await page.getByLabel('Confirm password').fill('Strong#Pass26');
  await page.getByLabel(/I agree/).check();
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText(/valid Lebanese number/)).toBeVisible();
  await page.getByLabel('Mobile number').fill('71 123 456');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  // Step 2: the new patient is taken to the health profile, and the app stays locked until it's saved.
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole('heading', { name: 'Welcome, Maya' })).toBeVisible();
  await page.goto('/patient/appointments');
  await expect(page).toHaveURL(/\/welcome$/);

  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByText('Enter your date of birth.')).toBeVisible();
  await expect(page.getByText('Choose a governorate.')).toBeVisible();
  await expect(page.getByText('Add your allergies, or confirm you have none.')).toBeVisible();

  await page.getByLabel('Date of birth').fill('1994-07-02');
  await page.getByLabel('Blood type').selectOption('A+');
  await expect(page.getByLabel('City')).toBeDisabled();
  await page.getByLabel('Governorate').selectOption('north');
  await page.getByLabel('City').selectOption('Batroun');
  await page.getByLabel('Insurance').selectOption('globemed');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByText('Enter your policy or membership number.')).toBeVisible();
  await page.getByLabel('Policy or membership number').fill('GLO-445566');
  await page.getByLabel('Allergies', { exact: true }).fill('Penicillin');
  await page.getByLabel('Allergies', { exact: true }).press('Enter');
  await expect(page.getByText('I have no known allergies')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save and continue' }).click();

  await expect(page).toHaveURL(/\/patient$/);
  await expect(page.getByRole('heading', { name: /Maya\./ })).toBeVisible();
  // Everything entered is in Settings → Health, ready to edit later.
  await page.goto('/patient/settings?tab=health');
  await expect(page.getByLabel('Blood type')).toHaveValue('A+');
  await expect(page.getByLabel('Governorate')).toHaveValue('north');
  await expect(page.getByLabel('City')).toHaveValue('Batroun');
  await expect(page.getByLabel('Policy or membership number')).toHaveValue('GLO-445566');
  await expect(page.getByText('Penicillin')).toBeVisible();
});

test('doctor registration has a second step and starts pending verification', async ({ page }) => {
  await page.goto('/signup?role=doctor');
  await page.getByLabel('Full name').fill('Ramzi Test');
  await page.getByLabel('Email').fill('ramzi@example.lb');
  await page.getByLabel('Mobile number').fill('03 456 789');
  await page.getByLabel('Password', { exact: true }).fill('Strong#Pass26');
  await page.getByLabel('Confirm password').fill('Strong#Pass26');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Specialty').selectOption('neurology');
  await page.getByLabel('Order of Physicians license number').fill('48213');
  await page.getByLabel('Governorate').selectOption('north');
  await page.getByLabel('City').selectOption('Tripoli');
  await page.getByLabel(/I agree/).check();
  await page.getByRole('button', { name: 'Submit for verification' }).click();
  await expect(page).toHaveURL(/\/doctor$/);
  await expect(page.getByText('Your profile is under review')).toBeVisible();
});

test('forgot password: email, 6-digit code, new password', async ({ page }) => {
  await page.goto('/forgot-password');
  await page.getByLabel('Email').fill('doctor@clinicfinder.lb');
  await page.getByRole('button', { name: 'Send code' }).click();
  const code = await page.getByRole('region', { name: 'Notifications' }).locator('code').textContent();
  await page.getByLabel('Digit 1').focus();
  await page.keyboard.type(code.trim());
  await page.getByRole('button', { name: 'Verify code' }).click();
  await page.getByLabel('New password', { exact: true }).fill('Fresh#Pass2026');
  await page.getByLabel('Confirm new password').fill('Fresh#Pass2026');
  await page.getByRole('button', { name: 'Update password' }).click();
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByLabel('Email').fill('doctor@clinicfinder.lb');
  await page.getByLabel('Password', { exact: true }).fill('Fresh#Pass2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/doctor$/);
});

test('logout ends the session', async ({ page }) => {
  await loginAs(page, 'Admin');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
});
