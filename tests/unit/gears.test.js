'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../../src/lib/gears.js');

function inside(poly, p) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function distToPoly(poly, p) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
  }
  return best;
}
function place(N, cx, cy, ang) {
  const o = G.outline(N).pts;
  const c = Math.cos(ang), s = Math.sin(ang);
  return o.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}
// deepest penetration of gear B's vertices into gear A
function penetration(A, B) {
  let worst = 0;
  for (const p of B) if (inside(A, p)) worst = Math.max(worst, distToPoly(A, p));
  return worst;
}

test('speed and torque trade off; power is kept minus mesh losses', () => {
  const r = G.analyse([{ drive: 12, driven: 36 }], 1200, 5);
  assert.equal(r.ratio, 3);
  assert.equal(r.rpmOut, 400);
  assert.ok(Math.abs(r.torqueOut - 5 * 3 * 0.98) < 1e-9);
  assert.ok(Math.abs(r.pOut / r.pIn - 0.98) < 1e-9);
  assert.equal(r.reversed, true);
  const two = G.analyse([{ drive: 12, driven: 36 }, { drive: 15, driven: 30 }], 1200, 5);
  assert.equal(two.ratio, 6);
  assert.equal(two.reversed, false);
});

test('involute teeth never overlap when meshed with meshAngle()', () => {
  for (const [Na, Nb, alpha] of [[12, 20, 0], [20, 30, 0.6], [17, 41, -1.1], [24, 24, 2.4], [40, 13, 0.3]]) {
    const dist = (Na + Nb) / 2;
    const A0 = [0, 0];
    const B0 = [dist * Math.cos(alpha), dist * Math.sin(alpha)];
    // alpha is the direction from A to B; meshAngle wants the direction from B's
    // point of view as used in the derivation, so pass the A->B angle.
    let worst = 0;
    for (let k = 0; k < 90; k++) {
      const thA = (k / 90) * (2 * Math.PI / Na) * 3.1;
      const thB = G.meshAngle(thA, alpha, Na, Nb);
      const A = place(Na, A0[0], A0[1], thA);
      const B = place(Nb, B0[0], B0[1], thB);
      worst = Math.max(worst, penetration(A, B), penetration(B, A));
    }
    assert.ok(worst < 0.05, `teeth ${Na}/${Nb} penetrate by ${worst.toFixed(3)} module`);
  }
});

test('the overlap check is meaningful: a wrong phase does overlap', () => {
  const Na = 20, Nb = 30, dist = 25;
  let worst = 0;
  for (let k = 0; k < 40; k++) {
    const thA = (k / 40) * 0.3;
    const thB = G.meshAngle(thA, 0, Na, Nb) + Math.PI / Nb; // half a pitch out of phase
    worst = Math.max(worst, penetration(place(Na, 0, 0, thA), place(Nb, dist, 0, thB)));
  }
  assert.ok(worst > 0.3, `expected clear overlap, got ${worst}`);
});

test('outline sizes follow module 1', () => {
  const o = G.outline(30);
  assert.equal(o.pitchR, 15);
  assert.equal(o.tipR, 16);
  assert.equal(o.rootR, 13.75);
  for (const [x, y] of o.pts) {
    const r = Math.hypot(x, y);
    assert.ok(r >= 13.7 && r <= 16.01, `radius ${r}`);
  }
});
