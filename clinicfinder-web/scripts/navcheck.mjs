// Clicks through every sidebar / header link like a user and reports pages whose main area is empty.
import { chromium } from '@playwright/test';
const base = process.argv[2] || 'http://localhost:5173';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 860 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
const check = async (label) => {
  await p.waitForTimeout(1400);
  const txt = (await p.locator('main').innerText().catch(() => '')).trim();
  const ok = txt.length > 40;
  console.log(`${ok ? 'OK   ' : 'BLANK'} ${label.padEnd(34)} ${p.url().replace(base, '')} (${txt.length} chars)${errs.length ? ' ERR: ' + errs.join(' | ') : ''}`);
  errs.length = 0;
};
const go = (path) => p.goto(base + (base.includes('#') ? '' : '') + path);
for (const role of ['Patient', 'Doctor', 'Admin']) {
  await go('/login');
  await p.evaluate(() => { localStorage.removeItem('clinicfinder_token'); sessionStorage.clear(); });
  await go('/login');
  await p.getByRole('button', { name: role, exact: true }).click();
  await p.waitForTimeout(1500);
  await check(`${role} landing`);
  const links = await p.locator('nav.sidebar.desktop a.side-link').evaluateAll((as) => as.map((a) => a.textContent.trim()));
  for (let round = 0; round < 2; round++) {
    for (const name of links) {
      await p.locator('nav.sidebar.desktop a.side-link', { hasText: name }).first().click();
      await check(`${role} → ${name}${round ? ' (again)' : ''}`);
    }
  }
  // back / forward
  await p.goBack(); await check(`${role} back`);
  await p.goForward(); await check(`${role} forward`);
}
// public header
await p.evaluate(() => { localStorage.removeItem('clinicfinder_token'); sessionStorage.clear(); });
await go('/');
await check('Public home');
for (const name of ['Find a doctor', 'Verify a prescription', 'Specialties', 'How it works']) {
  await p.locator('.site-links a', { hasText: name }).first().click();
  await check(`Public → ${name}`);
}
await p.locator('.doc-card a').first().click().catch(() => {});
await go('/find'); await p.waitForTimeout(1200);
await p.locator('.doc-card h3 a').first().click();
await check('Public → doctor profile');
await p.getByRole('link', { name: 'Sign in' }).first().click();
await check('Public → sign in');
await p.getByRole('link', { name: 'Create an account' }).click();
await check('Sign in → sign up');
await p.getByRole('link', { name: 'Back to ClinicFinder' }).click();
await check('Auth → home');
await b.close();
