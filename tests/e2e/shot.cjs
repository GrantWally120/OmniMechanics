'use strict';
// Usage: node tests/e2e/shot.cjs <route> <width> <height> <light|dark> <out.png> [advanceSeconds] [fullPage]
const path = require('node:path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }

(async () => {
  const [route = '', w = '1280', hgt = '900', theme = 'light', out = 'shot.png', adv = '0', full = ''] = process.argv.slice(2);
  const file = 'file://' + path.resolve(__dirname, '../../OmniMechanics.html');
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: +w, height: +hgt }, colorScheme: theme, deviceScaleFactor: +(process.env.DSF || 1) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(file + (route ? '#' + route : ''));
  await page.waitForTimeout(700);
  if (+adv > 0) {
    await page.evaluate((s) => { if (OM.debug.stage) OM.debug.stage.advance(s); }, +adv);
    await page.waitForTimeout(150);
  }
  const opt = { path: out, fullPage: !!full };
  if (process.env.SEL) {
    const el = await page.$(process.env.SEL);
    await el.screenshot({ path: out });
  } else await page.screenshot(opt);
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
  await browser.close();
})();
