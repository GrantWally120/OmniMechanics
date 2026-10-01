'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../src/lib/cam.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} +/- ${tol}, got ${a}`);
const deg = (d) => (d * Math.PI) / 180;

const base = (over) => Object.assign({
  lift: 0.010, rise: deg(70), law: 'cycloidal', rb: 0.025, rr: 0.008,
  mass: 0.05, k: 10000, preload: 100,
}, over || {});

test('cam: each law rises exactly by the lift and starts and ends at rest', () => {
  C.LAWS.forEach((law) => {
    const p = base({ law });
    near(C.motion(p, 0).y, 0, 1e-12, law);
    near(C.motion(p, p.rise).y, p.lift, 1e-12, law + ' top');
    near(C.motion(p, 0).dy, 0, 1e-12, law + ' v0');
    near(C.motion(p, p.rise - 1e-9).dy, 0, 1e-6, law + ' v1');
    // whole revolution: back to zero, and the fall mirrors the rise
    const t1 = p.rise + C.DWELL_TOP;
    near(C.motion(p, t1 + p.rise / 3).y, C.motion(p, (2 * p.rise) / 3).y, 1e-9, law + ' mirror');
    near(C.motion(p, C.TAU - 1e-9).y, 0, 1e-9, law + ' end');
  });
});

test('cam: rise is monotonic and the derivatives agree with finite differences', () => {
  C.LAWS.forEach((law) => {
    const p = base({ law });
    const n = 4000;
    let last = -1;
    for (let i = 1; i < n; i++) {
      const th = (i / n) * C.TAU;
      const m = C.motion(p, th);
      const e = 1e-6;
      const a = C.motion(p, th - e), b = C.motion(p, th + e);
      // skip the few points where the law has a kink in acceleration
      const kink = [0, p.rise, p.rise + C.DWELL_TOP, 2 * p.rise + C.DWELL_TOP].some((k) => Math.abs(th - k) < 1e-4)
        || (law === 'parabolic' && [p.rise / 2, p.rise + C.DWELL_TOP + p.rise / 2].some((k) => Math.abs(th - k) < 1e-4));
      if (!kink) {
        near((b.y - a.y) / (2 * e), m.dy, 2e-6, law + ' dy at ' + th);
        near((b.dy - a.dy) / (2 * e), m.ddy, 2e-3 * Math.max(1, Math.abs(m.ddy)), law + ' ddy at ' + th);
      }
      if (th < p.rise) { assert.ok(m.y >= last - 1e-12, law + ' monotonic'); last = m.y; }
    }
  });
});

test('cam: peak acceleration coefficients 4.0 (parabolic), 4.93 (harmonic), 6.28 (cycloidal)', () => {
  const coef = {};
  C.LAWS.forEach((law) => {
    const p = base({ law });
    const a = C.analyse(p);
    coef[law] = (a.amax * p.rise * p.rise) / p.lift;
  });
  near(coef.parabolic, 4, 1e-6);
  near(coef.harmonic, Math.PI * Math.PI / 2, 1e-3);
  near(coef.cycloidal, Math.PI * 2, 1e-3);
  assert.ok(coef.parabolic < coef.harmonic && coef.harmonic < coef.cycloidal);
});

test('cam: only the cycloidal law has zero acceleration where it meets a dwell', () => {
  const at = (law) => Math.abs(C.motion(base({ law }), 1e-7).ddy);
  // accelerations here are in m per rad^2: a jump of about 0.03 against essentially zero
  assert.ok(at('cycloidal') < 1e-5);
  assert.ok(at('harmonic') > 1e-2);
  assert.ok(at('parabolic') > 1e-2);
});

test('cam: pressure angle falls with a bigger base circle and matches the textbook formula', () => {
  const small = C.analyse(base({ rb: 0.015 })).phimax;
  const large = C.analyse(base({ rb: 0.040 })).phimax;
  assert.ok(small > large);
  const p = base();
  const mid = p.rise / 2;
  const m = C.motion(p, mid);
  near(C.pressureAngle(p, mid), Math.atan(m.dy / (p.rb + p.rr + m.y)), 1e-12);
  near(m.y, p.lift / 2, 1e-12, 'cycloidal is half-way at mid rise');
  // a steeper (shorter) rise gives a bigger angle
  assert.ok(C.analyse(base({ rise: deg(40) })).phimax > C.analyse(base({ rise: deg(100) })).phimax);
});

test('cam: outline never cuts into a roller unless the cam is undercut', () => {
  const p = base();
  const o = C.outline(p, 720);
  assert.equal(o.undercut, false);
  let worst = Infinity;
  for (let i = 0; i < o.pitch.length; i += 9) {
    let min = Infinity;
    for (let j = 0; j < o.cam.length; j++) min = Math.min(min, Math.hypot(o.pitch[i].x - o.cam[j].x, o.pitch[i].y - o.cam[j].y));
    worst = Math.min(worst, min);
    near(min, p.rr, p.rr * 0.01, 'roller just touches the outline at ' + i);
  }
  assert.ok(worst > p.rr * 0.98);
  // a tiny base circle, tall lift and short rise is undercut
  assert.equal(C.outline(base({ rb: 0.008, lift: 0.02, rise: deg(35), law: 'parabolic' })).undercut, true);
});

test('cam: contact force and the speed at which the follower floats', () => {
  const p = base();
  const a = C.analyse(p);
  assert.ok(Number.isFinite(a.floatOmega) && a.floatOmega > 50);
  // bottom dwell: spring preload plus the follower weight
  near(C.contactForce(p, C.TAU - 0.1, 300), p.preload + p.mass * C.G, 1e-9);
  // find the lowest contact force over a revolution just below and above the float speed
  const minForce = (w) => {
    let m = Infinity;
    for (let i = 0; i < 2880; i++) m = Math.min(m, C.contactForce(p, (i / 2880) * C.TAU, w));
    return m;
  };
  assert.ok(minForce(a.floatOmega * 0.98) > 0, 'just below: stays in contact');
  assert.ok(minForce(a.floatOmega * 1.05) < 0, 'just above: would need a pull');
  // a stiffer spring raises the limit, a heavier follower lowers it
  assert.ok(C.analyse(base({ k: 20000 })).floatOmega > a.floatOmega);
  assert.ok(C.analyse(base({ mass: 0.1 })).floatOmega < a.floatOmega);
  // a gentler law with a longer rise floats later
  assert.ok(C.analyse(base({ rise: deg(100) })).floatOmega > a.floatOmega);
});

function settle(p, omega, revs) {
  const st = C.createFollower(p, 0, omega);
  let th = 0, floatSamples = 0, samples = 0, worst = 0;
  const d = 0.02;
  for (let r = 0; r < revs; r++) {
    for (let a = 0; a < C.TAU; a += d) {
      th = C.advance(st, p, th, d, omega);
      if (r >= revs - 1) {
        samples++;
        if (!st.contact) floatSamples++;
        worst = Math.max(worst, st.y - C.motion(p, th).y);
      }
    }
  }
  return { floatSamples, samples, worst, st };
}

test('cam: follower simulation stays on the cam below the float speed and leaves it above', () => {
  const p = base();
  const w = C.analyse(p).floatOmega;
  const calm = settle(p, w * 0.9, 3);
  assert.equal(calm.floatSamples, 0);
  near(calm.worst, 0, 1e-9);
  const fast = settle(p, w * 1.25, 4);
  assert.ok(fast.floatSamples > 0, 'floats at 1.25x');
  assert.ok(fast.worst > 3e-4, 'clear gap at 1.25x: ' + fast.worst);
  assert.ok(fast.st.impact >= 0);
  const wild = settle(p, w * 1.6, 4);
  assert.ok(wild.worst > fast.worst, 'faster means a bigger gap');
  assert.ok(wild.floatSamples > fast.floatSamples, 'and a longer float');
  // whatever happens it never sinks below the cam surface
  const probe = C.createFollower(p, 0, w * 2);
  let th = 0;
  for (let i = 0; i < 2000; i++) {
    th = C.advance(probe, p, th, 0.02, w * 2);
    assert.ok(probe.y >= C.motion(p, th).y - 1e-6, 'never below the cam by more than a micron');
    assert.ok(Number.isFinite(probe.y) && Number.isFinite(probe.v));
  }
});

test('cam: float starts where the contact force first goes negative', () => {
  const p = base();
  const w = C.analyse(p).floatOmega * 1.3;
  // first angle in the revolution where N < 0, from the closed-form force
  let first = null;
  for (let i = 0; i < 7200; i++) {
    const th = (i / 7200) * C.TAU;
    if (C.contactForce(p, th, w) < 0) { first = th; break; }
  }
  assert.ok(first != null, 'the force goes negative somewhere');
  const st = C.createFollower(p, 0, w);
  let th = 0, left = null;
  for (let r = 0; r < 4 && left == null; r++) {
    for (let a = 0; a < C.TAU; a += 0.002) {
      th = C.advance(st, p, th, 0.002, w);
      if (r >= 2 && !st.contact) { left = C.wrap(th); break; }
    }
  }
  assert.ok(left != null, 'the follower leaves the cam');
  near(left, first, 0.02, 'leaves the cam when the force goes negative');
});

test('cam: a follower that is already at rest at the bottom stays put during the dwell', () => {
  const p = base();
  const st = C.createFollower(p, C.TAU - 0.3, 200);
  let th = C.TAU - 0.3;
  th = C.advance(st, p, th, 0.2, 200);
  near(st.y, 0, 1e-12);
  assert.equal(st.contact, true);
});
