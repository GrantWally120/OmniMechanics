'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Ln = require('../../src/lib/lens.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} +/- ${tol}, got ${a}`);

test('lens: the thin lens equation holds for converging and diverging lenses at any distance', () => {
  for (const f of [3, 8, 15, -4, -12]) {
    for (const s of [2, 5.5, 10, 17, 30, 44]) {
      if (Math.abs(s - f) < 1e-6) continue;
      const im = Ln.image(f, s, 3);
      near(1 / s + 1 / im.sp, 1 / f, 1e-12, `f ${f} s ${s}`);
      near(im.m, -im.sp / s, 1e-12);
      near(im.h, im.m * 3, 1e-12);
    }
  }
});

test('lens: Newton\'s form x x\' = f squared, and the special cases at 2f and far away', () => {
  const f = 8;
  for (const s of [10, 12, 16, 25, 40]) { const im = Ln.image(f, s); near((s - f) * (im.sp - f), f * f, 1e-9); }
  const two = Ln.image(f, 2 * f);
  near(two.sp, 2 * f, 1e-12); near(two.m, -1, 1e-12);
  near(Ln.image(f, 1e7).sp, f, 1e-4);
  assert.equal(Ln.image(f, f).atInfinity, true);
});

test('lens: a converging lens makes a real, upside-down image beyond f and a virtual, upright, bigger one inside f', () => {
  const f = 8;
  const far = Ln.image(f, 20), mid = Ln.image(f, 12), near_ = Ln.image(f, 5);
  assert.ok(far.real && !far.upright && !far.enlarged);
  assert.ok(mid.real && !mid.upright && mid.enlarged);
  assert.ok(!near_.real && near_.upright && near_.enlarged);
  assert.equal(Ln.kind(f, 20), 'camera');
  assert.equal(Ln.kind(f, 12), 'projector');
  assert.equal(Ln.kind(f, 5), 'magnifier');
  assert.equal(Ln.kind(f, 2 * f), 'copier');
});

test('lens: a diverging lens always makes a virtual, upright, smaller image', () => {
  for (const s of [2, 6, 15, 40]) {
    const im = Ln.image(-8, s);
    assert.ok(!im.real && im.upright && !im.enlarged, 's = ' + s);
    assert.ok(im.sp < 0 && Math.abs(im.sp) < 8);
  }
  assert.equal(Ln.kind(-8, 10), 'diverging');
});

test('lens: the three principal rays all meet at the image of the tip', () => {
  for (const [f, s] of [[8, 20], [8, 12], [8, 5], [-8, 14], [5, 30]]) {
    const h = 3;
    const im = Ln.image(f, s, h);
    const rs = Ln.rays(f, s, h, 200);
    assert.equal(rs.length, 3);
    // follow each ray beyond the lens to x = s' and check its height is the height of the image
    for (const r of rs) {
      const [a, b] = [r.pts[1], r.pts[2]];
      const t = (im.sp - a.x) / (b.x - a.x);
      const y = a.y + t * (b.y - a.y);
      near(y, im.h, 1e-9, `${r.name} for f ${f} s ${s}`);
    }
    // the ray through the centre is not bent
    const c = rs[1].pts;
    near((c[1].y - c[0].y) / (c[1].x - c[0].x), (c[2].y - c[1].y) / (c[2].x - c[1].x), 1e-12);
    // the third ray leaves the lens parallel to the axis
    near(rs[2].pts[1].y, rs[2].pts[2].y, 1e-12);
  }
});

test('lens: virtual images have back-extensions, real ones do not', () => {
  assert.equal(Ln.rays(8, 20, 3)[0].back, null);
  assert.ok(Ln.rays(8, 5, 3)[0].back);
  assert.ok(Ln.rays(-8, 20, 3)[0].back);
});

test('lens: powers add for thin lenses in contact, and the dioptre is one over the focal length in metres', () => {
  near(Ln.power(0.25), 4, 1e-12);
  near(Ln.combine(0.5, 0.5), 0.25, 1e-12);
  assert.equal(Ln.combine(10, -10), Infinity, 'a lens and its opposite cancel');
  near(Ln.objectForMagnification(8, -2), 12, 1e-12);
  near(Ln.image(8, Ln.objectForMagnification(8, 2)).m, -2, 1e-12);
});
