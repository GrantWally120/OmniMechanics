'use strict';
// Checks the Google Drive starter page (loader/OmniMechanics-loader.html): online load, offline reload from the
// saved copy, rejection of a bad download, and recovery. Usage: node tests/e2e/loader.cjs
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const FILE = path.resolve(__dirname, '../../OmniMechanics.html');
const LOADER = 'file://' + path.resolve(__dirname, '../../loader/OmniMechanics-loader.html');
function serve(port) {
  return new Promise((ok) => {
    const s = http.createServer((q, r) => {
      if (q.url.startsWith('/app.html')) { r.writeHead(200, { 'content-type': 'text/plain', 'access-control-allow-origin': '*' }); r.end(fs.readFileSync(FILE)); }
      else if (q.url.startsWith('/bad.html')) { r.writeHead(200, { 'content-type': 'text/plain', 'access-control-allow-origin': '*' }); r.end('<html><title>404</title></html>'); }
      else { r.writeHead(404, { 'access-control-allow-origin': '*' }); r.end('no'); }
    }).listen(port, () => ok(s));
  });
}
(async () => {
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
  let s = await serve(4188);
  const errs = [];
  // 1. online first load
  let page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  await page.goto(LOADER + '?src=' + encodeURIComponent('http://127.0.0.1:4188/app.html') + '#cam');
  await page.waitForSelector('.sheet', { timeout: 15000 });
  console.log('1 online: cards/sheet ok, mechanisms =', await page.evaluate(() => OM.mods.length), 'route', await page.evaluate(() => location.hash));
  await page.close();
  // 2. offline reload uses the saved copy
  await new Promise((r) => s.close(r));
  page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  const t0 = Date.now();
  await page.goto(LOADER + '?src=' + encodeURIComponent('http://127.0.0.1:4188/app.html') + '#engine');
  await page.waitForSelector('.sheet', { timeout: 15000 });
  console.log('2 offline: loaded from saved copy in', Date.now() - t0, 'ms; mechanisms =', await page.evaluate(() => OM.mods.length));
  await page.close();
  // 3. an error page is rejected, and with no saved copy (fresh context) the failure screen shows
  const ctx2 = await browser.newContext();
  s = await serve(4188);
  page = await ctx2.newPage();
  await page.goto(LOADER + '?src=' + encodeURIComponent('http://127.0.0.1:4188/bad.html'));
  await page.waitForSelector('#fail:not([hidden])', { timeout: 40000 });
  console.log('3 bad page, no saved copy: failure screen shown:', (await page.textContent('#msg')));
  // 4. retry works once the real file is available (swap the source by reloading)
  await page.goto(LOADER + '?src=' + encodeURIComponent('http://127.0.0.1:4188/app.html'));
  await page.waitForSelector('.card', { timeout: 15000 });
  console.log('4 recovered: cards =', await page.evaluate(() => document.querySelectorAll('.card').length));
  console.log(errs.length ? 'ERRORS ' + errs.join('; ') : 'no page errors');
  if (errs.length) process.exitCode = 1;
  await new Promise((r) => s.close(r));
  await browser.close();
})();
