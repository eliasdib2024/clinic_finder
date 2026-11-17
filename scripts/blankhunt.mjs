import { chromium } from '@playwright/test';
const base = process.argv[2] || 'http://localhost:5173';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 860 }, timezoneId: 'Asia/Beirut' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
const visible = async () => p.evaluate(() => {
  const m = document.querySelector('main');
  if (!m) return { ok: false, why: 'no <main>' };
  const kids = [...m.querySelectorAll(':scope > div')];
  const op = kids.map((k) => getComputedStyle(k).opacity);
  const txt = m.innerText.trim().length;
  return { ok: txt > 40 && op.some((o) => Number(o) > 0.9), op: op.join(','), txt, n: kids.length };
});
const report = async (label) => {
  await p.waitForTimeout(2500);
  const v = await visible();
  console.log(`${v.ok ? 'OK   ' : 'BLANK'} ${label.padEnd(40)} ${p.url().replace(base, '')} opacity=[${v.op}] text=${v.txt}${errs.length ? ' ERR ' + errs.join(' | ') : ''}`);
  errs.length = 0;
};
for (const role of ['Patient', 'Doctor', 'Admin']) {
  await p.goto(base + '/login');
  await p.evaluate(() => { localStorage.removeItem('clinicfinder_token'); sessionStorage.clear(); });
  await p.goto(base + '/login');
  await p.getByRole('button', { name: role, exact: true }).click();
  await p.waitForTimeout(1500);
  const links = await p.locator('nav.sidebar.desktop a.side-link').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  // rapid clicking: 120ms between clicks, then settle
  for (let i = 0; i < links.length; i++) {
    for (const delay of [60, 150, 300]) {
      await p.locator(`nav.sidebar.desktop a.side-link[href="${links[i]}"]`).click();
      await p.waitForTimeout(delay);
      await p.locator(`nav.sidebar.desktop a.side-link[href="${links[(i + 1) % links.length]}"]`).click();
      await report(`${role} fast ${links[i]}→${links[(i + 1) % links.length]} (${delay}ms)`);
    }
  }
}
await b.close();
