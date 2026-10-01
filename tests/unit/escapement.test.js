'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../src/lib/escapement.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} +/- ${tol}, got ${a}`);
const D = E.DEG;

function run(st, seconds, drive, dt) {
  dt = dt || 0.01;
  for (let t = 0; t < seconds; t += dt) E.step(st, dt, drive);
}

test('pendulum: exact period ratio at large amplitude matches the standard values', () => {
  near(E.periodRatio(0), 1, 1e-12);
  near(E.periodRatio(30 * D), 1.0174, 2e-4);
  near(E.periodRatio(60 * D), 1.0732, 2e-4);
  near(E.periodRatio(90 * D), 1.1803, 2e-4);
  // small swings follow 1 + A^2/16
  near(E.periodRatio(5 * D), 1 + (5 * D) ** 2 / 16, 1e-6);
  let last = 1;
  for (let a = 5; a <= 120; a += 5) { const r = E.periodRatio(a * D); assert.ok(r > last); last = r; }
});

test('pendulum: a one second beat needs 0.994 m, and mass plays no part', () => {
  const L = E.lengthForPeriod(2, E.G_EARTH);
  near(L, 0.9936, 1e-4);
  near(E.period0(L, E.G_EARTH), 2, 1e-12);
  // the Moon has one sixth of the gravity, so the period is about 2.45 times longer
  near(E.period0(L, 1.62) / 2, Math.sqrt(E.G_EARTH / 1.62), 1e-12);
  const a = E.create(L, E.G_EARTH), b = E.create(L, E.G_EARTH);
  a.th = b.th = 0.2;
  run(a, 10, 0); run(b, 10, 0);
  assert.equal(a.th, b.th);
});

test('pendulum: the rate error grows with amplitude, about 11 seconds a day from 3 to 4 degrees', () => {
  near(E.secondsLostPerDay(0), 0, 1e-9);
  near(E.secondsLostPerDay(3 * D), 86400 * (3 * D) ** 2 / 16, 0.2);
  const d = E.secondsLostPerDay(4 * D) - E.secondsLostPerDay(3 * D);
  assert.ok(d > 10 && d < 13, 'got ' + d);
});

test('pendulum: free swing with no drive and almost no drag keeps its period and energy', () => {
  const L = 1, g = E.G_EARTH, A = 20 * D;
  const st = E.create(L, g, { q: 1e9, thetaI: 0.0001 * D });
  st.th = A; st.side = 1;
  const energy = () => 0.5 * st.w * st.w + (g / L) * (1 - Math.cos(st.th));
  const e0 = energy();
  // time between two upward zero crossings of the velocity (two turning points)
  let turns = [], lastW = st.w;
  for (let i = 0; i < 40000; i++) {
    E.step(st, 0.0005, 0);
    if (lastW < 0 && st.w >= 0) turns.push(st.t);
    lastW = st.w;
    if (turns.length >= 3) break;
  }
  near(turns[2] - turns[1], E.period(L, g, A), E.period(L, g, A) * 1e-3, 'period');
  near(energy(), e0, e0 * 1e-4, 'energy');
});

test('pendulum: drive and drag settle at the amplitude the energy balance predicts', () => {
  const L = E.lengthForPeriod(2, E.G_EARTH);
  const p = E.DEFAULTS;
  const d = E.driveFor(5 * D, p);
  const st = E.create(L, E.G_EARTH);
  st.th = 4 * D;
  run(st, 400, d, 0.02);
  const A = E.steadyAmplitude(d, p);
  near(st.amp, A, A * 0.06, 'amplitude');
  // per half swing, energy given equals energy lost
  near(st.lastIn, st.lastOut, st.lastOut * 0.05, 'energy books');
  assert.ok(st.lastIn > 0);
});

test('escapement: the wheel turns once a minute on a 2 second pendulum', () => {
  const L = E.lengthForPeriod(2, E.G_EARTH);
  const st = E.create(L, E.G_EARTH);
  const d = E.driveFor(5 * D);
  st.th = E.steadyAmplitude(d);
  run(st, 120, d, 0.01); // settle
  const b0 = st.beats, t0 = st.t, w0 = E.wheelAngle(st);
  run(st, 60, d, 0.01);
  const beats = st.beats - b0;
  const T = E.period(L, E.G_EARTH, st.amp);
  // two beats per period, and two beats per tooth
  near(beats, (60 / T) * 2, 2, 'beats in 60 s');
  near(E.wheelAngle(st) - w0, beats * E.HALF, E.HALF, 'wheel angle');
  const turns = (E.wheelAngle(st) - w0) / E.TAU;
  near(turns, 60 / (E.TEETH * T), 0.03, 'wheel turns');
  assert.ok(st.t - t0 > 59.9);
});

test('escapement: the wheel never runs backwards and only jumps by the drop at each beat', () => {
  const L = E.lengthForPeriod(2, E.G_EARTH);
  const st = E.create(L, E.G_EARTH);
  const d = E.driveFor(6 * D);
  st.th = E.steadyAmplitude(d);
  run(st, 60, d, 0.01);
  let last = E.wheelAngle(st);
  for (let i = 0; i < 6000; i++) {
    E.step(st, 0.002, d);
    const w = E.wheelAngle(st);
    assert.ok(w >= last - 1e-9, 'wheel turned back at t=' + st.t);
    assert.ok(w - last < 0.5 * E.DEFAULTS.drop + 0.2 * D, 'wheel jumped: ' + (w - last));
    last = w;
  }
});

test('escapement: too little swing and the clock stops; it has to be started with a real swing', () => {
  const L = E.lengthForPeriod(2, E.G_EARTH);
  const dead = E.create(L, E.G_EARTH);
  dead.th = 4 * D;
  run(dead, 600, 0, 0.02);
  const b = dead.beats;
  run(dead, 60, 0, 0.02);
  assert.equal(dead.beats, b, 'no beats once the swing is below the impulse arc');
  assert.ok(Math.abs(dead.th) < E.DEFAULTS.thetaI);
  // a clock has to be started by hand: from a swing that clears the impulse arc it builds up to its working amplitude
  const go = E.create(L, E.G_EARTH);
  go.th = 3 * D;
  run(go, 400, E.driveFor(5 * D), 0.02);
  near(go.amp, 5 * D, 0.5 * D, 'built up to ' + go.amp / D);
  // but from a swing inside the arc the drive only holds the anchor to one side, and the clock stays stopped
  const stuck = E.create(L, E.G_EARTH);
  stuck.th = 1 * D;
  run(stuck, 400, E.driveFor(5 * D), 0.02);
  assert.ok(stuck.amp < E.DEFAULTS.thetaI, 'stuck at ' + stuck.amp / D);
});

test('escapement: bigger drive, bigger swing, bigger rate error', () => {
  const L = 1;
  const amps = [3, 5, 8].map((deg) => {
    const st = E.create(L, E.G_EARTH);
    const d = E.driveFor(deg * D);
    st.th = 0.02;
    run(st, 500, d, 0.02);
    return st.amp;
  });
  assert.ok(amps[0] < amps[1] && amps[1] < amps[2]);
  assert.ok(E.secondsLostPerDay(amps[2]) > E.secondsLostPerDay(amps[0]) * 4);
});

// ------------------------------------------------------------- geometry
test('escapement geometry: locked wheel pushes straight at the pivot (no torque on the anchor)', () => {
  ['left', 'right'].forEach((pal) => {
    const pts = E.face(pal, {}, 10 * D, 20);
    pts.filter((q) => q.kind === 'lock').forEach((q) => {
      const th = q.th;
      const c = Math.cos(th), s = Math.sin(th);
      const nw = { x: q.n.x * c - q.n.y * s, y: q.n.x * s + q.n.y * c };
      const w = E.anchorToWorld(q.q, th);
      const torque = (w.x - E.PIV.x) * nw.y - (w.y - E.PIV.y) * nw.x;
      const deep = Math.abs(th) > E.DEFAULTS.thetaI + 1e-9 && Math.abs(th) < 10 * D - 1e-9;
      if (deep) near(torque, 0, 1e-3, pal + ' lock torque at ' + th / D);
      // the tooth tip is held at a fixed point while the anchor swings
      near(Math.hypot(w.x, w.y), 1, 1e-12, 'tip stays on the wheel rim');
    });
  });
});

test('escapement geometry: each impulse pushes the anchor the way the pendulum is already moving', () => {
  [['left', -1], ['right', 1]].forEach(([pal, dir]) => {
    const pts = E.face(pal, {}, 10 * D, 20).filter((q) => q.kind === 'impulse');
    pts.forEach((q) => {
      const th = q.th;
      const c = Math.cos(th), s = Math.sin(th);
      const nw = { x: q.n.x * c - q.n.y * s, y: q.n.x * s + q.n.y * c };
      const w = E.anchorToWorld(q.q, th);
      const tauAnchor = (w.x - E.PIV.x) * nw.y - (w.y - E.PIV.y) * nw.x;
      const tauWheel = -((w.x - E.W.x) * nw.y - (w.y - E.W.y) * nw.x); // the pallet's reaction on the tooth
      assert.ok(tauAnchor * dir > 0.3, pal + ' pushes with the swing: ' + tauAnchor);
      assert.ok(tauWheel > 0.3, pal + ' resists the wheel');
      // frictionless contact: power in equals power out, so the torque ratio is d(wheel angle)/d(anchor angle)
      const ratio = (E.HALF - E.DEFAULTS.drop) / (2 * E.DEFAULTS.thetaI);
      near(Math.abs(tauAnchor / tauWheel), ratio, ratio * 0.04, pal + ' torque ratio');
    });
  });
});

test('escapement geometry: the two pallets span 7.5 teeth, and a beat is half a pitch', () => {
  near(E.LOCK_A - E.LOCK_B, 7.5 * E.PITCH, 1e-12);
  near(E.HALF * 2, E.PITCH, 1e-12);
  assert.equal(E.TEETH, 30);
  // the pivot sits where the tangents at both locking points meet
  ['left', 'right'].forEach((pal) => {
    const tip = pal === 'left' ? E.tipAt(E.LOCK_A) : E.tipAt(E.LOCK_B);
    const radial = tip; // the radius to the tip
    const toPivot = { x: E.PIV.x - tip.x, y: E.PIV.y - tip.y };
    near(radial.x * toPivot.x + radial.y * toPivot.y, 0, 1e-12, 'pivot lies on the tangent');
    near(Math.hypot(toPivot.x, toPivot.y), 1, 1e-12, 'lock radius');
  });
});

test('escapement geometry: no pallet ever passes through a tooth, over the whole working swing', () => {
  const inside = (pt, poly) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  };
  const dist = (p, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };
  const depth = (p, poly) => Math.min(...poly.map((a, i) => dist(p, a, poly[(i + 1) % poly.length])));
  const pokes = (A, B) => {
    const probe = (P, Q) => {
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length];
        for (const pt of [a, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }]) if (inside(pt, Q) && depth(pt, Q) > 0.004) return true;
      }
      return false;
    };
    return probe(A, B) || probe(B, A);
  };
  const ti = E.DEFAULTS.thetaI;
  const stones = [E.stonePolygon('left'), E.stonePolygon('right')];
  let checked = 0;
  for (let d = -7; d <= 7.001; d += 0.25) {
    const th = d * D;
    const states = th > ti ? [[1, 0]] : th < -ti ? [[-1, 0]] : [[1, (ti - th) / (2 * ti)], [-1, (th + ti) / (2 * ti)]];
    for (const [side, u] of states) {
      const phi = E.wheelAngle({ beats: side === 1 ? 0 : 1, u, lag: 0, p: E.DEFAULTS });
      const world = stones.map((s) => s.map((q) => E.anchorToWorld(q, th)));
      for (let i = 0; i < E.TEETH; i++) {
        const tooth = E.toothPolygon(i, phi);
        world.forEach((w, k) => {
          checked++;
          assert.ok(!pokes(tooth, w), `pallet ${k ? 'right' : 'left'} cuts tooth ${i} at swing ${d} deg (side ${side}, u ${u.toFixed(2)})`);
        });
      }
    }
  }
  assert.ok(checked > 1000);
});
