import { chromium } from '@playwright/test';
const base = 'http://localhost:5173';
const [,, mode = 'desktop', ...paths] = process.argv;
const vp = mode === 'mobile' ? { width: 375, height: 800 } : { width: 1440, height: 900 };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE ${m.text()}`); });
for (const item of paths) {
  const [role, path, full] = item.split('|');
  if (role !== 'guest') {
    await page.goto(base + '/login');
    await page.evaluate(() => { localStorage.removeItem('clinicfinder_token'); sessionStorage.clear(); });
    await page.goto(base + '/login');
    await page.getByRole('button', { name: role[0].toUpperCase() + role.slice(1), exact: true }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  }
  await page.goto(base + path);
  await page.waitForTimeout(1800);
  const name = `${mode}-${role}-${path.replace(/[/?=&]/g, '_') || 'home'}.png`;
  await page.screenshot({ path: `/tmp/shots/${name}`, fullPage: full === 'full' });
  console.log('shot', name);
}
console.log(errors.slice(0, 20).join('\n') || 'no errors');
await browser.close();
