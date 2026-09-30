'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../../src/lib/fridge.js');
const O = require('../../src/lib/orbit.js');
const S = require('../../src/lib/gps.js');
const W = require('../../src/lib/airfoil.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} +/- ${tol}, got ${a}`);
const rel = (a, b, tol, msg) => near(a / b, 1, tol, msg);

// ---------------------------------------------------------------- fridge
test('fridge: R-134a saturation pressures match table values', () => {
  rel(F.psat(-10), 2.006, 0.01);
  rel(F.psat(0), 2.928, 0.02);
  rel(F.psat(40), 10.17, 0.01);
  rel(F.psat(50), 13.18, 0.02);
  rel(F.psat(60), 16.82, 0.02);
});

test('fridge: cycle is below Carnot, energy balances, and is plausible', () => {
  const c = F.cycle(-10, 40);
  assert.ok(c.cop > 2 && c.cop < 3.5, `COP ${c.cop}`);
  assert.ok(c.cop < c.carnot);
  near(c.qCond, c.qEvap + c.wComp, 1e-9, 'first law on the loop');
  assert.ok(c.x4 > 0.15 && c.x4 < 0.5, `quality after valve ${c.x4}`);
  assert.ok(c.qCool > 100 && c.qCool < 350, `cooling power ${c.qCool}`);
  near(c.qReject, c.qCool + c.wElec, 1e-6, 'heat rejected = cooling + work');
  assert.ok(F.cycle(-10, 55).cop < F.cycle(-10, 40).cop, 'hotter room, worse COP');
  assert.ok(F.cycle(-20, 40).cop < F.cycle(-5, 40).cop, 'colder inside, worse COP');
});

test('fridge: thermostat holds the cabinet in its band', () => {
  let s = { tCab: 22, on: false };
  const p = { setpoint: 4, tRoom: 28, door: false };
  let onTime = 0, n = 0, min = 99, max = -99;
  for (let t = 0; t < 12 * 3600; t += 5) {
    s = F.step(s, 5, p);
    if (t > 6 * 3600) { n++; if (s.on) onTime++; min = Math.min(min, s.tCab); max = Math.max(max, s.tCab); }
  }
  assert.ok(min > 2.5 && max < 5.5, `band ${min}..${max}`);
  const duty = onTime / n;
  assert.ok(duty > 0.15 && duty < 0.7, `duty ${duty}`);
  // an open door raises the duty cycle
  s = { tCab: 4, on: false };
  let on2 = 0, n2 = 0;
  for (let t = 0; t < 6 * 3600; t += 5) { s = F.step(s, 5, { ...p, door: true }); if (t > 3600) { n2++; if (s.on) on2++; } }
  assert.ok(on2 / n2 > duty);
});

// ---------------------------------------------------------------- orbit
test('orbit: circular speed and period at 400 km, g is still about 89 percent', () => {
  const r = O.RE + 400;
  near(O.circularSpeed(r), 7.67, 0.01);
  const el = O.elements({ x: r, y: 0, vx: 0, vy: O.circularSpeed(r) });
  near(el.period / 60, 92.4, 0.5, 'period minutes');
  near(el.e, 0, 1e-9);
  near(O.gAt(400) / O.G0, 0.885, 0.005);
  near(O.escapeSpeed(O.RE), 11.19, 0.01);
});

test('orbit: energy is conserved over many circular and elliptical orbits', () => {
  const r = O.RE + 400;
  let s = { x: r, y: 0, vx: 0, vy: O.circularSpeed(r) };
  const e0 = O.energy(s);
  const T = O.elements(s).period;
  for (let i = 0; i < 10 * 200; i++) assert.equal(O.advance(s, T / 200), false);
  rel(O.energy(s), e0, 1e-6, 'circular energy');

  s = { x: O.RE + 300, y: 0, vx: 0, vy: 9.0 };
  const el = O.elements(s);
  assert.ok(el.e > 0.2 && el.bound);
  const e1 = O.energy(s);
  const steps = 400;
  for (let i = 0; i < 5 * steps; i++) O.advance(s, el.period / steps);
  rel(O.energy(s), e1, 1e-5, 'elliptical energy');
  // after whole periods it is back where it started
  near(s.x, O.RE + 300, 60, 'x after 5 periods');
  near(s.y, 0, 60, 'y after 5 periods');
});

test('orbit: slow shots hit the ground, escape speed leaves for good', () => {
  let s = { x: O.RE + 1, y: 0, vx: 0, vy: 3 };
  let hit = false;
  for (let i = 0; i < 2000 && !hit; i++) hit = O.advance(s, 5);
  assert.equal(hit, true);
  const el = O.elements({ x: O.RE + 300, y: 0, vx: 0, vy: 11 });
  assert.equal(el.bound, false);
  const path = O.conic(el, 200000, 200);
  assert.ok(path.length > 50);
});

// ---------------------------------------------------------------- gps
test('gps: recovers position and clock bias exactly from three satellites', () => {
  const sats = [{ x: -8, y: 9 }, { x: 10, y: 8 }, { x: 1, y: -10 }];
  const pos = { x: 2.5, y: 1.2 };
  const bias = 1.7;
  const rho = S.pseudoranges(sats, pos, bias);
  const r = S.solve(sats, rho);
  assert.ok(r.ok);
  near(r.x, pos.x, 1e-6);
  near(r.y, pos.y, 1e-6);
  near(r.b, bias, 1e-6);
  assert.ok(r.rms < 1e-6);
});

test('gps: noise leaves a residual, more satellites average it down, bad geometry is flagged', () => {
  const sats = [{ x: -8, y: 9 }, { x: 10, y: 8 }, { x: 1, y: -10 }, { x: 12, y: -4 }, { x: -11, y: -3 }];
  const pos = { x: 0.5, y: 0.5 };
  const noise = [0.15, -0.2, 0.1, -0.1, 0.05];
  const rho = S.pseudoranges(sats, pos, 0.4, noise);
  const four = S.solve(sats.slice(0, 4), rho.slice(0, 4));
  assert.ok(four.rms > 0);
  assert.ok(Math.hypot(four.x - pos.x, four.y - pos.y) < 1);
  assert.equal(S.solve(sats.slice(0, 2), rho.slice(0, 2)).ok, false);
  const line = [{ x: -5, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 0 }];
  const bad = S.solve(line, S.pseudoranges(line, { x: 2, y: 0 }, 0), { x: 1, y: 0.0001, b: 0 });
  assert.ok(!bad.ok || bad.pdop > 50);
  near(S.driftKmPerDay, 11.54, 0.05, 'uncorrected relativistic drift');
});

// ---------------------------------------------------------------- airfoil
test('airfoil: symmetric foil at zero angle gives no lift; lift slope is about 2 pi', () => {
  const z = W.make({ eps: 0.1, kappa: 0, aoaDeg: 0 });
  near(z.cl, 0, 1e-9);
  const f5 = W.make({ eps: 0.1, kappa: 0, aoaDeg: 5 });
  const slope = f5.cl / ((5 * Math.PI) / 180);
  assert.ok(slope > 6.2 && slope < 7.4, `slope ${slope}`);
  near(f5.thickness, 0.13, 0.02, 'thickness ratio');
});

test('airfoil: camber shifts the zero-lift angle negative and adds lift at 0 degrees', () => {
  const c = W.make({ eps: 0.1, kappa: 0.08, aoaDeg: 0 });
  assert.ok(c.cl > 0.3, `camber CL at 0 deg = ${c.cl}`);
  const zl = W.make({ eps: 0.1, kappa: 0.08, aoaDeg: -4 });
  assert.ok(zl.cl > -0.2 && zl.cl < 0.15);
});

test('airfoil: integrating surface pressure reproduces the Kutta-Joukowski lift', () => {
  for (const [eps, kappa, aoa] of [[0.1, 0, 5], [0.1, 0.08, 3], [0.12, 0.05, 10], [0.08, 0, -3]]) {
    const f = W.make({ eps, kappa, aoaDeg: aoa });
    const cp = f.cpLift(4000);
    near(cp.cl, f.cl, Math.max(0.02, Math.abs(f.cl) * 0.02), `CL eps=${eps} k=${kappa} aoa=${aoa}`);
    near(cp.cd, 0, 0.02, 'd Alembert: no drag in potential flow');
  }
});

test('airfoil: flow leaves the trailing edge smoothly (Kutta) and follows the surface', () => {
  const f = W.make({ eps: 0.1, kappa: 0.05, aoaDeg: 6 });
  const te = f.toScreen(2, 0);
  for (const d of [0.05, 0.1, 0.2]) {
    const v = f.velocityScreen(te[0] + d, te[1]);
    assert.ok(Math.hypot(v.u, v.v) < 1.6, `TE speed ${Math.hypot(v.u, v.v)}`);
  }
  // No flow through the body: just outside the surface (the image of a slightly
  // larger circle) the speed matches the surface speed.
  const surf = f.surface(72);
  for (let i = 0; i < surf.length; i += 5) {
    const p = surf[i];
    const zeta = [f.z0[0] + (f.a + 1e-4) * Math.cos(p.t), f.z0[1] + (f.a + 1e-4) * Math.sin(p.t)];
    const d = zeta[0] * zeta[0] + zeta[1] * zeta[1];
    const zo = [zeta[0] + zeta[0] / d, zeta[1] - zeta[1] / d];
    const vel = f.velocity(zo[0], zo[1]);
    assert.equal(vel.inside, false, `sample ${i} is outside the body`);
    near(Math.hypot(vel.u, vel.v), p.speed, 0.03 * Math.max(p.speed, 0.3), `surface speed at ${i}`);
  }
  const far = f.velocityScreen(-30, 20);
  near(Math.hypot(far.u, far.v), 1, 0.05, 'free stream far away');
});

test('airfoil: the air over the top gets there first (no equal-transit-time)', () => {
  const f = W.make({ eps: 0.1, kappa: 0.05, aoaDeg: 5 });
  const r = W.race(f);
  assert.ok(r.top.t < r.bottom.t, `top ${r.top.t} bottom ${r.bottom.t}`);
  assert.ok(r.bottom.t / r.top.t < 1.6 && r.bottom.t / r.top.t > 1.01);
});

test('airfoil: stall model peaks at the stall angle then drops', () => {
  const f = W.make({ eps: 0.1, kappa: 0.05, aoaDeg: 0 });
  const a14 = W.stallModel(f, 14).cl;
  const a15 = W.stallModel(f, W.STALL_DEG).cl;
  const a20 = W.stallModel(f, 20);
  assert.ok(a15 > a14);
  assert.ok(a20.stalled && a20.cl < a15);
});

test('orbit: a dropped object is a radial orbit with a finite highest point', () => {
  const el = O.elements({ x: O.RE + 400, y: 0, vx: 0, vy: 0 });
  assert.equal(el.bound, true);
  assert.ok(Number.isFinite(el.ra) && Number.isFinite(el.rp));
  near(el.ra, O.RE + 400, 1, 'it only rises as high as it started');
  assert.equal(el.rp, 0);
});
