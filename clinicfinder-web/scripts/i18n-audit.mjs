// Translation audit. Mode "pseudo": lists visible text that bypasses tx() (pseudo-localization).
// Mode "fr"/"ar": lists visible text identical to the English rendering (likely untranslated).
// Usage: node scripts/i18n-audit.mjs pseudo|fr|ar [baseUrl]
import { chromium } from '@playwright/test';
const mode = process.argv[2] || 'pseudo';
const base = process.argv[3] || 'http://localhost:5173';
const ROUTES = {
  guest: ['/', '/find', '/doctors/d_2', '/verify', '/verify/BAD-CODE', '/login', '/signup', '/signup?role=doctor', '/forgot-password', '/nope'],
  Patient: ['/patient', '/patient/search', '/patient/doctors/d_1', '/patient/appointments', '/patient/appointments?tab=past', '/patient/appointments?tab=cancelled', '/patient/prescriptions', '/patient/prescriptions/rx_2', '/patient/settings', '/patient/settings?tab=health', '/patient/settings?tab=password', '/patient/settings?tab=notifications', '/patient/settings?tab=language', '/patient/settings?tab=account'],
  Doctor: ['/doctor', '/doctor/appointments', '/doctor/appointments?tab=pending', '/doctor/patients', '/doctor/prescriptions', '/doctor/prescriptions/new?patient=u_patient', '/doctor/schedule', '/doctor/profile', '/doctor/settings?tab=notifications'],
  Admin: ['/admin', '/admin/verifications', '/admin/users', '/admin/clinics', '/admin/catalog', '/admin/catalog?x=1'],
};
// Interactions that reveal modals/drawers/menus on some pages
const ACTIONS = {
  '/patient/doctors/d_1': async (p) => { await p.locator('.sticky-book .date-pill:not([disabled])').nth(1).click(); await p.locator('.sticky-book .slot').first().click(); await p.locator('.sticky-book .btn-primary').click(); await p.waitForTimeout(600); },
  '/patient/appointments': async (p) => { await p.locator('.appt-actions .btn-secondary').first().click(); await p.waitForTimeout(900); },
  '/patient/appointments?tab=past': async (p) => { await p.locator('.appt-actions .btn-ghost').first().click(); await p.waitForTimeout(500); },
  '/doctor/appointments?tab=pending': async (p) => { await p.locator('.appt-actions .btn-danger-soft').first().click(); await p.waitForTimeout(500); },
  '/doctor/patients': async (p) => { await p.locator('tbody tr').first().click(); await p.waitForTimeout(900); },
  '/admin/verifications': async (p) => { await p.locator('.appt-actions .btn-ghost').first().click(); await p.waitForTimeout(600); },
  '/admin/clinics': async (p) => { await p.locator('.page-head .btn-primary').click(); await p.waitForTimeout(400); await p.locator('.modal .btn-primary').click(); await p.waitForTimeout(300); },
  '/doctor': async (p) => { await p.locator('.icon-btn[aria-haspopup]').nth(1).click(); await p.waitForTimeout(600); },
  '/admin': async (p) => { await p.locator('.user-chip').click(); await p.waitForTimeout(300); },
  '/admin/catalog?x=1': async (p) => { await p.getByRole('tab').nth(1).click(); await p.waitForTimeout(500); },
  '/signup': async (p) => { await p.locator('form button[type=submit]').click(); await p.waitForTimeout(400); await p.locator('input[type=password]').first().fill('ab'); await p.waitForTimeout(200); },
  '/doctor/prescriptions/new?patient=u_patient': async (p) => { await p.locator('[role=combobox]').first().fill('Amox'); await p.waitForTimeout(300); await p.locator('[role=option]').first().click(); await p.locator('.page-head ~ * .btn-primary, .btn-primary').last().click(); await p.waitForTimeout(500); },
};
const collect = (p) => p.evaluate(() => {
  const out = new Set();
  const walk = (n) => {
    if (n.nodeType === 3) { const s = n.textContent.replace(/\s+/g, ' ').trim(); if (s) out.add(s); return; }
    if (n.nodeType !== 1) return;
    const st = getComputedStyle(n);
    if (st.display === 'none' || st.visibility === 'hidden' || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return;
    for (const a of ['placeholder', 'aria-label', 'title']) { const v = n.getAttribute && n.getAttribute(a); if (v) out.add(v.trim()); }
    if (n.tagName === 'OPTION') { out.add(n.textContent.trim()); return; }
    n.childNodes.forEach(walk);
  };
  walk(document.body);
  return [...out];
});
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' });
async function crawl(lang) {
  const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, reducedMotion: 'reduce', timezoneId: 'Asia/Beirut' });
  const p = await ctx.newPage();
  await p.goto(base + '/login');
  await p.evaluate(([l, m]) => { localStorage.clear(); localStorage.setItem('clinicfinder_lang', l); if (m) localStorage.setItem('clinicfinder_pseudo', '1'); }, [lang, mode === 'pseudo']);
  const res = {};
  for (const [role, routes] of Object.entries(ROUTES)) {
    if (role !== 'guest') {
      await p.goto(base + '/login');
      await p.evaluate(() => { localStorage.removeItem('clinicfinder_token'); sessionStorage.clear(); });
      await p.goto(base + '/login');
      await p.locator('.demo-box button').nth(['Patient', 'Doctor', 'Admin'].indexOf(role)).click();
      await p.waitForTimeout(1200);
      // keep the account's language in line with the audit language
      await p.evaluate((l) => localStorage.setItem('clinicfinder_lang', l), lang);
    }
    for (const r of routes) {
      await p.goto(base + r); await p.waitForTimeout(1300);
      if (ACTIONS[r]) await ACTIONS[r](p).catch((e) => console.error('action failed', r, e.message.split('\n')[0]));
      res[`${role} ${r}`] = await collect(p);
    }
  }
  await ctx.close();
  return res;
}
const looksLikeData = (s) => /^(Dr\.? |RX-|\+961|0\d |https?:|[\w.]+@)/.test(s) || /^[\d\s:.,/$%+()-]+$/.test(s) || s.length < 2;
if (mode === 'pseudo') {
  const res = await crawl('en');
  const seen = new Set();
  for (const [page, texts] of Object.entries(res)) {
    const bad = texts.filter((s) => /[A-Za-z]{2}/.test(s) && !s.includes('⟦') && !looksLikeData(s) && !seen.has(s));
    bad.forEach((s) => seen.add(s));
    if (bad.length) console.log(`\n## ${page}\n` + bad.map((s) => `  ${s}`).join('\n'));
  }
} else {
  const en = await crawl('en'); const other = await crawl(mode);
  const seen = new Set();
  for (const page of Object.keys(en)) {
    const o = new Set(other[page] || []);
    const same = (en[page] || []).filter((s) => o.has(s) && /[A-Za-z]{3}/.test(s) && !looksLikeData(s) && !seen.has(s));
    same.forEach((s) => seen.add(s));
    if (same.length) console.log(`\n## ${page}\n` + same.map((s) => `  ${s}`).join('\n'));
  }
}
await b.close();
