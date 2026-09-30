'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/lib/engine.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} +/- ${tol}, got ${a}`);

test('geometry: displacement is half a litre and compression ratio matches', () => {
  near(E.GEO.Vd * 1e6, 500, 1, 'displacement cc');
  for (const cr of [7, 10, 13]) {
    near(E.volume(180, cr) / E.volume(0, cr), cr, 1e-9, 'CR');
  }
});

test('piston motion is symmetric about TDC and reaches the full stroke', () => {
  for (const t of [10, 45, 90, 135]) near(E.pistonY(t), E.pistonY(360 - t), 1e-12);
  near(E.pistonY(0) - E.pistonY(180), E.GEO.stroke, 1e-12, 'stroke');
});

test('full-throttle cycle gives realistic pressure and work', () => {
  const r = E.cycle({ cr: 10, load: 1, spark: 28, timing: 'real' });
  assert.ok(r.stats.pMaxBar > 38 && r.stats.pMaxBar < 70, `peak ${r.stats.pMaxBar}`);
  assert.ok(r.stats.peakAtdc > 5 && r.stats.peakAtdc < 25, `peak at ${r.stats.peakAtdc} ATDC`);
  assert.ok(r.stats.imepNet > 7 && r.stats.imepNet < 13, `imep ${r.stats.imepNet}`);
  assert.ok(r.stats.imepPump < 0, 'pumping work is a loss');
  assert.ok(r.stats.tMax > 1800 && r.stats.tMax < 3000, `Tmax ${r.stats.tMax}`);
  for (const p of r.P) assert.ok(Number.isFinite(p) && p > 0.2e5);
});

test('closing the throttle cuts work and grows the pumping loss', () => {
  const wide = E.cycle({ load: 1 }).stats;
  const idle = E.cycle({ load: 0.15 }).stats;
  assert.ok(idle.imepNet < wide.imepNet * 0.5);
  assert.ok(idle.imepPump < wide.imepPump, 'pumping loss should get more negative');
});

test('spark timing: best work near 30 deg BTDC, worse when very late', () => {
  const w = (spark) => E.cycle({ spark }).stats.imepNet;
  assert.ok(w(30) > w(5));
  assert.ok(w(30) > w(0));
  assert.ok(E.cycle({ spark: 40 }).stats.pMaxBar > E.cycle({ spark: 20 }).stats.pMaxBar);
  assert.ok(E.cycle({ spark: 5 }).stats.peakAtdc > E.cycle({ spark: 30 }).stats.peakAtdc);
});

test('higher compression ratio gives more work from the same fuel', () => {
  assert.ok(E.cycle({ cr: 12 }).stats.imepNet > E.cycle({ cr: 8 }).stats.imepNet);
});

test('valve overlap exists in real timing but not in textbook timing', () => {
  const both = (res) => {
    let n = 0;
    for (let i = 0; i < res.N; i++) if (res.ivLift[i] > 0 && res.evLift[i] > 0) n++;
    return n;
  };
  assert.ok(both(E.cycle({ timing: 'real' })) > 10);
  assert.equal(both(E.cycle({ timing: 'textbook' })), 0);
});

test('interpolated state and power', () => {
  const r = E.cycle({});
  const s = E.at(r, 400);
  assert.equal(s.stroke, 2);
  assert.ok(s.P > 1e5);
  const kw = E.powerKw(r, 6000);
  assert.ok(kw > 10 && kw < 40, `power ${kw}`);
});
