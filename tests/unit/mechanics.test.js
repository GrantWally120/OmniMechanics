'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../../src/lib/pulleys.js');
const H = require('../../src/lib/hydraulics.js');
const M = require('../../src/lib/motor.js');
const T = require('../../src/lib/transformer.js');
const L = require('../../src/lib/logic.js');
const A = require('../../src/lib/anc.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} +/- ${tol}, got ${a}`);

test('pulleys: ideal effort is weight / n, tensions add up to the weight', () => {
  for (let n = 1; n <= 6; n++) {
    const r = P.analyse(100, n, 1);
    near(r.F, (100 * P.G) / n, 1e-9, `n=${n}`);
    const real = P.analyse(100, n, 0.95);
    near(real.tensions.reduce((a, b) => a + b, 0), real.W, 1e-9, 'tension sum');
    assert.ok(real.F >= r.F);
    assert.ok(real.eff <= 1 && real.eff > 0.7);
  }
  assert.ok(P.analyse(100, 6, 0.95).eff < P.analyse(100, 2, 0.95).eff, 'more sheaves lose more');
});

test('hydraulics: force multiplies by the area ratio, work is conserved without air', () => {
  const r = H.respond({ x1: 0.1, d1Mm: 20, d2Mm: 60, massKg: 500, bubbleMl: 0, lever: 1 });
  near(r.ratio, 9, 1e-9);
  near(r.F1, (500 * H.G) / 9, 1e-6, 'pump force');
  near(r.x2, 0.1 / 9, 1e-9, 'slave travel');
  near(r.workIn, r.workOut, 1e-6, 'work in = work out');
});

test('hydraulics: an air bubble adds dead travel and delays lifting', () => {
  const air = H.respond({ x1: 0.02, d1Mm: 20, d2Mm: 60, massKg: 500, bubbleMl: 30, lever: 1 });
  const none = H.respond({ x1: 0.02, d1Mm: 20, d2Mm: 60, massKg: 500, bubbleMl: 0, lever: 1 });
  assert.ok(air.deadTravel > 0);
  assert.ok(air.x2 < none.x2);
  near(H.bubbleLoss(30e-6, 0), 0, 1e-15);
});

test('motor: dynamics settle at the steady-state speed; stall current is V/R', () => {
  const V = 12, tl = 0.1;
  const s = M.steady(V, tl);
  let w = 0;
  for (let i = 0; i < 600; i++) w = M.advance(w, V, tl, 0.01, false);
  near(w, s.w, s.w * 0.01, 'settled speed');
  near(M.steady(V, 10).I, V / M.R, 1e-9, 'stall current');
  assert.equal(M.steady(V, 10).stalled, true);
  near(M.steady(V, 0).w, V / M.K / (1 + (M.B * M.R) / (M.K * M.K)), 1e-6, 'no-load speed');
  assert.ok(s.eff > 0 && s.eff < 1);
  assert.equal(M.advance(50, V, tl, 0.1, true), 0, 'jammed rotor stops');
});

test('motor: torque ripple averages 1 and shrinks with more coils', () => {
  const stats = (n) => {
    let lo = 9, hi = 0, sum = 0;
    const K = 3600;
    for (let i = 0; i < K; i++) {
      const r = M.ripple((i / K) * Math.PI, n);
      lo = Math.min(lo, r); hi = Math.max(hi, r); sum += r;
    }
    return { lo, hi, mean: sum / K };
  };
  for (const n of [1, 2, 3]) near(stats(n).mean, 1, 0.002, `mean n=${n}`);
  assert.ok(stats(3).hi - stats(3).lo < stats(1).hi - stats(1).lo);
  near(stats(1).lo, 0, 1e-3, 'single coil torque hits zero');
});

test('transformer: turns ratio sets voltage, energy is conserved with losses', () => {
  const r = T.analyse({ vrms: 220, f: 60, np: 183, ns: 10, rLoad: 5 });
  near(r.ratio, 10 / 183, 1e-12);
  near(r.v2open, 220 * (10 / 183), 1e-9);
  assert.ok(r.v2 < r.v2open && r.v2 > 0.9 * r.v2open);
  near(r.pIn, r.pOut + r.pCu + r.pCore, 1e-9, 'power balance');
  assert.ok(r.eff > 0.8 && r.eff < 1);
  assert.equal(r.kind, 'step-down');
  assert.equal(r.saturated, false);
  near(r.bMax, 1.5, 0.1, 'design flux density');
});

test('transformer: too few turns saturates the core; DC never induces a lasting voltage', () => {
  const bad = T.analyse({ vrms: 220, f: 60, np: 100, ns: 100, rLoad: 50 });
  assert.equal(bad.saturated, true);
  assert.ok(bad.im > 0.5);
  const early = T.dcStep({ v: 220, np: 183, ns: 10, tSince: 0.001 });
  const late = T.dcStep({ v: 220, np: 183, ns: 10, tSince: 0.05 });
  assert.ok(early.v2 > 10);
  assert.equal(late.v2, 0);
  assert.ok(late.i1 > 30, 'current is limited only by winding resistance');
});

test('logic: 4-bit ripple adder matches integer addition for every input', () => {
  for (let a = 0; a < 16; a++) for (let b = 0; b < 16; b++) for (let c = 0; c < 2; c++) {
    const r = L.add(L.toBits(a, 4), L.toBits(b, 4), c);
    const v = L.toInt(r.sum) + (r.cout << 4);
    assert.equal(v, a + b + c, `${a}+${b}+${c}`);
  }
  const fa = L.fullAdder(1, 1, 1);
  assert.deepEqual([fa.s, fa.cout], [1, 1]);
});

test('active noise cancelling: perfect with no delay, worse at high frequency', () => {
  near(A.electronic(500, 0).amp, 0, 1e-9);
  near(A.electronic(1000, 50).amp, 2 * Math.sin(Math.PI * 1000 * 50e-6), 1e-9);
  near(A.toDb(A.electronic(1000, 50).amp), 10.1, 0.2, 'about 10 dB at 1 kHz with 50 us delay');
  assert.ok(A.electronic(3000, 50).amp > A.electronic(300, 50).amp);
  near(A.residual(1, Math.PI), 0, 1e-12);
  near(A.residual(1, 0), 2, 1e-12);
});
