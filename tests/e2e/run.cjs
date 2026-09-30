'use strict';
/* End-to-end check of the built OmniMechanics.html in a real browser.
 *  - every route loads with no console errors or page errors
 *  - every mechanism survives extreme and random control values with finite state
 *  - readouts never show NaN / undefined / Infinity, canvases are not blank
 *  - drawing stays fast
 *  - phone-width layouts have no horizontal scroll; dark mode renders
 *  - quiz and theme toggles work
 * Usage: node tests/e2e/run.cjs [--shots]   (--shots saves screenshots to tests/e2e/out) */
const path = require('node:path');
const fs = require('node:fs');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }

const FILE = 'file://' + path.resolve(__dirname, '../../OmniMechanics.html');
const OUT = path.resolve(__dirname, 'out');
const SHOTS = process.argv.includes('--shots');
const failures = [];
const fail = (where, msg) => { failures.push(where + ': ' + msg); console.log('  FAIL ' + where + ': ' + msg); };

function watch(page, where) {
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') fail(where, 'console ' + m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => fail(where, 'page error: ' + e.message));
}

// Runs inside the page: stresses one mechanism.
async function stress(id) {
  const st = OM.debug.stage;
  const core = st.core, def = st.def;
  const out = { issues: [], drawMs: 0, filled: 0, controls: def.controls.length };
  let seed = 1234;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const check = (label) => {
    const bad = OM.util.findBadNumbers(core.sim.state || {}, 'state');
    if (bad.length) out.issues.push(label + ': non-finite ' + bad.slice(0, 3).join('; '));
    const ro = core.sim.readouts ? core.sim.readouts() : [];
    ro.forEach((r) => { if (/NaN|undefined|Infinity|null/.test(String(r.v))) out.issues.push(label + ': readout "' + r.k + '" = ' + r.v); });
    if (core.sim.caption) { const c = core.sim.caption(); if (/NaN|undefined/.test(String(c))) out.issues.push(label + ': caption ' + c); }
    if (core.errors) out.issues.push(label + ': simulation errors ' + core.errors);
  };
  st.setPlaying(false);
  const defaults = {};
  def.controls.forEach((c) => { if (c.id) defaults[c.id] = c.value; });
  const values = (c) => {
    if (c.type === 'range') { const s = c.step || 1; return [c.min, c.max, (c.min + c.max) / 2, Math.min(c.max, c.min + s)]; }
    if (c.type === 'seg') return c.options.map((o) => o.v);
    if (c.type === 'toggle') return [true, false];
    return [];
  };
  st.advance(3); check('start');
  for (const c of def.controls) {
    if (!c.id || c.type === 'button' || c.type === 'heading') continue;
    for (const v of values(c)) {
      st.setValue(c.id, v);
      st.advance(2.5);
      check(c.id + '=' + v);
    }
    st.setValue(c.id, defaults[c.id]);
  }
  // buttons
  def.controls.filter((c) => c.type === 'button').forEach((c) => { core.sim.action && core.sim.action(c.id); st.advance(1); check('button ' + c.id); });
  // random combinations
  for (let i = 0; i < 40; i++) {
    def.controls.forEach((c) => {
      if (!c.id || c.type === 'button' || c.type === 'heading') return;
      let v;
      if (c.type === 'range') { v = c.min + rnd() * (c.max - c.min); if (c.step) v = Math.round(v / c.step) * c.step; v = Math.min(c.max, Math.max(c.min, v)); }
      else if (c.type === 'seg') v = c.options[Math.floor(rnd() * c.options.length)].v;
      else v = rnd() > 0.5;
      st.setValue(c.id, v);
    });
    st.advance(1 + rnd() * 4, 1 / 30);
    check('random #' + i);
  }
  // try-this presets
  (def.content.tries || []).forEach((t) => { st.applyPreset(Object.assign({ reset: true }, t)); st.advance(4); check('preset ' + t.label); });
  // reset and a long run
  core.reset(); st.advance(60, 1 / 30); check('long run');
  // non-blank canvas, draw cost
  st.advance(1);
  const cv = st.canvas, g = cv.getContext('2d');
  const d = g.getImageData(0, 0, cv.width, cv.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4 * 7) if (d[i] > 0) n++;
  out.filled = n / (d.length / 28);
  const t0 = performance.now();
  for (let i = 0; i < 30; i++) core.draw();
  out.drawMs = (performance.now() - t0) / 30;
  // steps/phase
  if (core.sim.phase) { const p = core.sim.phase(); if (!(p >= 0 && p < def.content.steps.length)) out.issues.push('phase ' + p + ' outside steps'); }
  return out;
}

(async () => {
  const browser = await pw.chromium.launch();
  if (SHOTS) fs.mkdirSync(OUT, { recursive: true });

  // ---- registry and routes (desktop, light)
  let ids = [];
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const page = await ctx.newPage();
    watch(page, 'home');
    await page.goto(FILE);
    await page.waitForSelector('.card');
    ids = await page.evaluate(() => OM.mods.map((m) => m.id));
    console.log('Mechanisms: ' + ids.length + ' (' + ids.join(', ') + ')');
    if (ids.length !== 13) fail('registry', 'expected 13 mechanisms, found ' + ids.length);
    if (new Set(ids).size !== ids.length) fail('registry', 'duplicate ids');
    await page.waitForTimeout(800);
    const thumbs = await page.evaluate(() => Array.from(document.querySelectorAll('canvas.thumb')).map((c) => { const g = c.getContext('2d'); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 28) if (d[i] > 0) n++; return n / (d.length / 28); }));
    thumbs.forEach((f, i) => { if (f < 0.01) fail('home', 'thumbnail ' + ids[i] + ' is blank'); });
    console.log('  home: ' + thumbs.length + ' thumbnails drawn');
    if (SHOTS) await page.screenshot({ path: path.join(OUT, 'home-1440-light.png'), fullPage: true });
    await ctx.close();
  }

  // ---- per mechanism
  const rows = [];
  for (const id of ids) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
    const page = await ctx.newPage();
    watch(page, id);
    await page.goto(FILE + '#' + id);
    await page.waitForFunction((i) => window.OM && OM.debug.stage && OM.debug.stage.def.id === i, id);
    await page.waitForTimeout(400);
    const r = await page.evaluate(stress, id);
    r.issues.slice(0, 8).forEach((m) => fail(id, m));
    if (r.filled < 0.04) fail(id, 'canvas looks blank (' + (r.filled * 100).toFixed(1) + '% painted)');
    if (r.drawMs > 12) fail(id, 'draw is slow: ' + r.drawMs.toFixed(1) + ' ms');
    // page structure
    const s = await page.evaluate(() => ({
      h1: (document.querySelector('h1') || {}).textContent, steps: document.querySelectorAll('.step').length,
      quiz: document.querySelectorAll('.q').length, ctl: document.querySelectorAll('.ctl').length,
      ro: document.querySelectorAll('.ro').length, title: document.title,
    }));
    if (!s.h1 || s.steps < 3 || s.quiz < 3 || s.ro < 4) fail(id, 'page is missing parts ' + JSON.stringify(s));
    rows.push([id, r.controls, r.filled, r.drawMs, r.issues.length]);
    await ctx.close();
  }
  console.log('\nmechanism      controls  painted  draw ms  issues');
  rows.forEach((r) => console.log(String(r[0]).padEnd(14) + String(r[1]).padStart(8) + (r[2] * 100).toFixed(0).padStart(7) + '%' + r[3].toFixed(1).padStart(9) + String(r[4]).padStart(8)));

  // ---- phone layouts, both themes, plus quiz / theme / keyboard behaviour
  for (const [w, h, scheme] of [[390, 844, 'light'], [390, 844, 'dark'], [768, 1024, 'light'], [1100, 800, 'dark']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 1, hasTouch: w < 800 });
    const page = await ctx.newPage();
    watch(page, w + 'x' + h + ' ' + scheme);
    for (const id of [''].concat(ids, ['about'])) {
      await page.goto(FILE + (id ? '#' + id : ''));
      await page.waitForTimeout(id ? 350 : 700);
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, cw: (document.querySelector('.sheet-canvas') || {}).clientWidth }));
      if (m.sw > m.iw + 1) fail(w + 'x' + h + ' ' + scheme + ' #' + id, 'horizontal scroll: page is ' + m.sw + 'px in a ' + m.iw + 'px window');
      if (SHOTS && ['', 'engine', 'lock', 'wing', 'adder', 'gps'].includes(id)) await page.screenshot({ path: path.join(OUT, (id || 'home') + '-' + w + '-' + scheme + '.png'), fullPage: false });
    }
    await ctx.close();
  }

  // quiz, theme and router behaviour
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    watch(page, 'behaviour');
    await page.goto(FILE + '#engine');
    await page.waitForSelector('.q');
    // answer the first question wrongly then correctly
    const q0 = page.locator('.q').first();
    await q0.locator('.opt').nth(0).click();
    await q0.locator('.opt').nth(2).click();
    if ((await q0.locator('.opt.right').count()) !== 1) fail('quiz', 'right answer not marked');
    // answer the rest correctly by reading the def
    const ans = await page.evaluate(() => OM.getMod('engine').content.quiz.map((q) => q.a));
    for (let i = 1; i < ans.length; i++) await page.locator('.q').nth(i).locator('.opt').nth(ans[i]).click();
    const done = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('omnimech:v2')).progress.engine.done; } catch (e) { return false; } });
    if (!done) fail('quiz', 'completion was not stored');
    // theme button cycles auto, light, dark
    const seq = [];
    for (let i = 0; i < 3; i++) { await page.click('#theme-btn'); seq.push(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))); }
    if (seq.join() !== 'light,dark,') fail('theme', 'unexpected cycle ' + seq.join('|'));
    // unknown route
    await page.goto(FILE + '#does-not-exist');
    await page.waitForSelector('h1');
    if (!/not in the library/i.test(await page.textContent('h1'))) fail('router', 'unknown route should show a not-found page');
    // keyboard: a slider changes with the arrow keys
    await page.goto(FILE + '#gears');
    await page.waitForSelector('input[type=range]');
    const before = await page.evaluate(() => OM.debug.stage.core.ctl.na);
    await page.focus('#gears-na');
    await page.keyboard.press('ArrowRight');
    const after = await page.evaluate(() => OM.debug.stage.core.ctl.na);
    if (after !== before + 1) fail('keyboard', 'slider did not respond to ArrowRight (' + before + ' -> ' + after + ')');
    // reduced motion starts paused
    await ctx.close();
    const rm = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const p2 = await rm.newPage();
    watch(p2, 'reduced-motion');
    await p2.goto(FILE + '#engine');
    await p2.waitForFunction(() => OM.debug.stage);
    if (await p2.evaluate(() => OM.debug.stage.getPlaying())) fail('reduced-motion', 'animation should start paused');
    await rm.close();
  }

  await browser.close();
  console.log('\n' + (failures.length ? failures.length + ' problem(s):\n - ' + failures.join('\n - ') : 'All end-to-end checks passed.'));
  process.exit(failures.length ? 1 : 0);
})();
