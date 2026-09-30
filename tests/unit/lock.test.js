'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Lk = require('../../src/lib/lock.js');

test('the correct key sets every pin on the shear line', () => {
  const s = Lk.state(Lk.SECRET, 1);
  assert.equal(s.count, 5);
  assert.equal(s.free, true);
  s.off.forEach((d) => assert.ok(Math.abs(d) < 1e-9));
});

test('a cut that is one step off blocks the plug, with the right sign', () => {
  for (let i = 0; i < 5; i++) {
    for (const dc of [-1, 1]) {
      const cuts = Lk.SECRET.slice();
      cuts[i] += dc;
      if (cuts[i] < 1 || cuts[i] > 9) continue;
      const s = Lk.state(cuts, 1);
      assert.equal(s.free, false, `pin ${i} off by ${dc}`);
      assert.equal(s.count, 4);
      // deeper cut (+) leaves the pin top below the shear line (positive offset)
      assert.ok(Math.sign(s.off[i]) === Math.sign(dc), `sign pin ${i} ${dc}`);
      assert.ok(Math.abs(Math.abs(s.off[i]) - Lk.MM * 0.5) < 1e-9, 'one step is 0.5 mm');
    }
  }
});

test('only one of the 59,049 possible keys opens the lock', () => {
  let opens = 0;
  const cuts = [1, 1, 1, 1, 1];
  const rec = (i) => {
    if (i === 5) { if (Lk.state(cuts, 1).free) opens++; return; }
    for (let c = 1; c <= 9; c++) { cuts[i] = c; rec(i + 1); }
  };
  rec(0);
  assert.equal(opens, 1);
});

test('nothing opens a lock with the key not fully in', () => {
  for (const s of [0, 0.3, 0.6, 0.9]) assert.equal(Lk.state(Lk.SECRET, s).free, false);
  // pins hang at the floor with no key under them
  Lk.pinBottoms(Lk.SECRET, 0).forEach((y) => assert.equal(y, Lk.FLOOR));
});

test('pins ride smoothly over the key (no jumps bigger than the slope allows)', () => {
  let prev = Lk.pinBottoms(Lk.SECRET, 0);
  for (let s = 0.005; s <= 1.0001; s += 0.005) {
    const cur = Lk.pinBottoms(Lk.SECRET, s);
    cur.forEach((y, i) => assert.ok(Math.abs(y - prev[i]) <= Lk.PULL * 0.005 * 1.01 + 1e-9, `pin ${i} jumps at s=${s}`));
    prev = cur;
  }
});
