'use strict';
// Checks the features around the mechanisms: shareable links, Reset and Copy buttons, keyboard shortcuts and
// their off switch, the help list, Surprise me, the progress summary, and the opt-in clock sound.
// Usage: node tests/e2e/features.cjs
const path = require('node:path');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const FILE = 'file://' + path.resolve(__dirname, '../../OmniMechanics.html');
(async () => {
  const browser = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  const ok = (c, m) => { if (!c) { console.log('FAIL', m); process.exitCode = 1; } else console.log('ok  ', m); };
  // 1. shared setup is applied
  await page.goto(FILE + '#cam?rpm=3500&law=harmonic&rise=90&bogus=1&lift=999');
  await page.waitForSelector('.sheet');
  let v = await page.evaluate(() => OM.debug.stage.values());
  ok(v.rpm === 3500 && v.law === 'harmonic' && v.rise === 90, 'link values applied: ' + JSON.stringify({ rpm: v.rpm, law: v.law, rise: v.rise }));
  ok(v.lift === 16, 'out-of-range value is clamped (lift 999 -> ' + v.lift + ')');
  // 2. changing a control rewrites the link
  await page.fill('input[type=range][id$="-k"]', '20').catch(() => {});
  await page.evaluate(() => { const i = document.querySelector('[data-id="k"] input'); i.value = 20; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(400);
  const h1 = await page.evaluate(() => location.hash);
  ok(/k=20/.test(h1) && /rpm=3500/.test(h1) && !/bogus/.test(h1), 'link follows the controls: ' + h1);
  // 3. copy link
  await page.click('text=Copy link to this setup');
  await page.waitForTimeout(200);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  ok(clip === (await page.evaluate(() => location.href)), 'clipboard holds the link');
  ok((await page.textContent('.ctl-status')).includes('copied'), 'status says link copied');
  // 4. reset
  await page.click('text=Reset controls');
  await page.waitForTimeout(300);
  v = await page.evaluate(() => OM.debug.stage.values());
  ok(v.rpm === 600 && v.law === 'cycloidal', 'reset restores defaults');
  ok(!/\?/.test(await page.evaluate(() => location.hash)), 'link is plain again: ' + (await page.evaluate(() => location.hash)));
  // 5. reload the shared link restores state
  await page.goto(FILE + '#water?sea=12&ridge=900');
  await page.reload();
  await page.waitForSelector('.sheet');
  v = await page.evaluate(() => OM.debug.stage.values());
  ok(v.sea === 12 && v.ridge === 900, 'reload keeps the setup');
  // 6. keyboard
  await page.goto(FILE + '#cam');
  await page.waitForSelector('.sheet');
  const playing = () => page.evaluate(() => OM.debug.stage.getPlaying());
  const p0 = await playing();
  await page.keyboard.press('k'); const p1 = await playing();
  await page.keyboard.press('k'); const p2 = await playing();
  ok(p0 !== p1 && p2 === p0, 'k toggles play');
  await page.keyboard.press(']'); await page.waitForTimeout(200);
  ok((await page.evaluate(() => location.hash)).startsWith('#escapement'), '] goes to the next mechanism (hash ' + (await page.evaluate(() => location.hash)) + ')');
  await page.keyboard.press('['); await page.waitForTimeout(200);
  ok((await page.evaluate(() => location.hash)).startsWith('#cam'), '[ goes back');
  await page.keyboard.press('x'); await page.waitForTimeout(200);
  ok((await page.evaluate(() => location.hash)) !== '#cam', 'x picks another mechanism');
  await page.keyboard.press('g'); await page.waitForTimeout(200);
  ok(await page.$('.view-home') !== null, 'g goes to the library');
  await page.keyboard.press('/'); ok(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'lib-search', '/ focuses the search');
  await page.keyboard.type('motor'); await page.waitForTimeout(100);
  ok((await page.evaluate(() => document.querySelectorAll('.card').length)) >= 1 && await page.evaluate(() => document.activeElement.id) === 'lib-search', 'typing in the box does not trigger shortcuts');
  await page.fill('#lib-search', '');
  await page.evaluate(() => document.activeElement.blur());
  // 7. help dialog and off switch
  await page.keyboard.press('?'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => !!document.querySelector('dialog.help[open]')), '? opens the shortcut list');
  await page.click('#keys-on'); await page.keyboard.press('Escape'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => !document.querySelector('dialog.help[open]')), 'Esc closes it');
  await page.goto(FILE + '#cam'); await page.waitForSelector('.sheet');
  const q0 = await playing(); await page.keyboard.press('k'); const q1 = await playing();
  ok(q0 === q1, 'shortcuts are off after switching them off');
  await page.click('#help-btn'); await page.click('#keys-on'); await page.click('dialog.help .btn');
  // 8. progress and surprise
  await page.goto(FILE + '#'); await page.waitForSelector('.card');
  ok((await page.textContent('.lib-progress-t')).includes('0 of'), 'progress summary shows');
  await page.click('#surprise'); await page.waitForTimeout(200);
  ok((await page.evaluate(() => location.hash)).length > 1, 'Surprise me opens a mechanism');
  // 9. the clock sound is opt-in and ticks once a beat
  await page.goto(FILE + '#escapement'); await page.waitForSelector('.sheet');
  await page.evaluate(() => { window.__ticks = 0; const o = window.AudioContext.prototype.createOscillator; window.AudioContext.prototype.createOscillator = function () { window.__ticks++; return o.call(this); }; });
  await page.evaluate(() => OM.debug.stage.advance(4));
  ok((await page.evaluate(() => window.__ticks)) === 0, 'no sound while the switch is off');
  await page.click('[data-id="sound"] button');
  await page.evaluate(() => OM.debug.stage.advance(6));
  const ticks = await page.evaluate(() => window.__ticks);
  ok(ticks >= 5 && ticks <= 7, 'a tick per beat with sound on (' + ticks + ' in 6 s)');
  if (errs.length) process.exitCode = 1;
  console.log(errs.length ? 'CONSOLE: ' + errs.join(' | ') : 'no console errors');
  await browser.close();
})();
