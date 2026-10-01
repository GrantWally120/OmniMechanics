'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../../src/lib/turbine.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} +/- ${tol}, got ${a}`);

test('turbine: the Betz limit is 16/27 at an induction factor of one third', () => {
  near(T.BETZ, 0.5926, 1e-4);
  near(T.cpIdeal(1 / 3), 16 / 27, 1e-12);
  let bestA = 0, bestC = 0;
  for (let a = 0; a <= 0.5; a += 0.0005) { const c = T.cpIdeal(a); if (c > bestC) { bestC = c; bestA = a; } }
  near(bestA, 1 / 3, 1e-3);
  near(bestC, 16 / 27, 1e-6);
  assert.ok(T.cpIdeal(0) === 0 && T.cpIdeal(1) === 0, 'nothing taken, or the wind stopped dead: no power');
  near(T.ctIdeal(1 / 3), 8 / 9, 1e-12);
});

test('turbine: power from the loss of kinetic energy in the stream equals Cp times the wind power', () => {
  const rho = 1.225, A = 5000, v = 10;
  for (const a of [0.05, 0.2, 1 / 3]) {
    const mdot = rho * A * v * (1 - a);
    const vWake = v * (1 - 2 * a);
    const fromEnergy = 0.5 * mdot * (v * v - vWake * vWake);
    const fromCp = T.cpIdeal(a) * 0.5 * rho * A * v * v * v;
    near(fromEnergy, fromCp, fromCp * 1e-9, 'a = ' + a);
    // thrust on the disc is the momentum lost: it matches Ct
    near(mdot * (v - vWake), T.ctIdeal(a) * 0.5 * rho * A * v * v, 1e-6, 'thrust');
  }
});

test('turbine: the induction factor for a given Cp inverts the momentum relation', () => {
  for (const c of [0.1, 0.3, 0.45, 0.59]) near(T.cpIdeal(T.inductionFor(c)), c, 1e-9);
  assert.equal(T.inductionFor(0.7), null);
  near(T.inductionFor(0), 0, 1e-12);
});

test('turbine: a real rotor peaks near 0.48 at a tip-speed ratio of about 8, below the Betz limit', () => {
  const b = T.bestLambda();
  near(b.lambda, 8.1, 0.3);
  near(b.cp, 0.48, 0.01);
  assert.ok(b.cp < T.BETZ);
  assert.ok(T.cp(3, 0) < b.cp && T.cp(14, 0) < b.cp, 'too slow or too fast loses power');
  assert.equal(T.cp(0, 0), 0);
  assert.ok(T.cp(b.lambda, 3) < T.cp(b.lambda, 0) && T.cp(b.lambda, 10) < T.cp(b.lambda, 3), 'pitching the blades spills power');
});

test('turbine: power goes with the cube of the wind speed', () => {
  near(T.windPower(20, 80) / T.windPower(10, 80), 8, 1e-9);
  near(T.windPower(10, 160) / T.windPower(10, 80), 4, 1e-9);
  // 100 m rotor in a 12 m/s wind: about 8.3 MW in the wind
  near(T.windPower(12, 100) / 1e6, 8.31, 0.05);
  near(T.windPower(10, 80, 1.0) / T.windPower(10, 80, 1.225), 1 / 1.225, 1e-9);
});

test('turbine: the power curve has a cut-in, a cubic climb, a flat top at rated power and a cut-out', () => {
  const D = 100;
  const rated = T.ratedPower(D);
  assert.ok(rated > 3e6 && rated < 4.5e6, 'rated power of a 100 m rotor: ' + rated / 1e6 + ' MW');
  assert.equal(T.operate({ v: 2, D }).power, 0);
  assert.equal(T.operate({ v: 2, D }).state, 'waiting');
  assert.equal(T.operate({ v: 26, D }).power, 0);
  assert.equal(T.operate({ v: 26, D }).state, 'parked');
  let last = 0;
  for (let v = 3; v <= 12; v += 0.5) { const p = T.operate({ v, D }).power; assert.ok(p >= last - 1e-6, 'rises up to rated speed'); last = p; }
  near(T.operate({ v: 12, D }).power, rated, rated * 0.01);
  for (const v of [13, 16, 20, 24.9]) near(T.operate({ v, D }).power, rated, rated * 0.005, 'flat at ' + v);
  assert.equal(T.operate({ v: 16, D }).state, 'limited');
  assert.ok(T.operate({ v: 16, D }).beta > 0 && T.operate({ v: 20, D }).beta > T.operate({ v: 16, D }).beta, 'the blades pitch more as the wind grows');
  // in light winds the controller holds the best ratio; at high winds the tip speed limit takes over
  near(T.operate({ v: 6, D }).lambda, T.bestLambda().lambda, 1e-9);
  near(T.operate({ v: 15, D }).tip, T.TIP_MAX, 1e-6);
  // power never exceeds what the Betz limit allows
  for (let v = 3; v < 25; v += 1) { const o = T.operate({ v, D }); assert.ok(o.power <= o.pAvail * T.BETZ + 1e-6); }
});

test('turbine: a bigger rotor makes more power in the same wind, and a user can detune the tip-speed ratio', () => {
  assert.ok(T.operate({ v: 8, D: 120 }).power > T.operate({ v: 8, D: 60 }).power * 3.9);
  const tuned = T.operate({ v: 8, D: 80, auto: true });
  const slow = T.operate({ v: 8, D: 80, auto: false, lambdaSet: 3 });
  const fast = T.operate({ v: 8, D: 80, auto: false, lambdaSet: 13 });
  assert.ok(tuned.power > slow.power && tuned.power > fast.power);
  assert.ok(slow.rpm < tuned.rpm && tuned.rpm < fast.rpm);
  near(slow.omega * 40, slow.lambda * 8, 1e-9, 'tip speed = lambda v');
});
