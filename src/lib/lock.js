/* Pin tumbler lock geometry (pixels in the drawing's lock space; 14 px = 1 mm).
 * A key cut's code c (1 to 9) sets the matching key pin's length K(c).  The
 * key's top edge sits K(c) below the shear line when the cut is right. */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  const MM = 14;
  const SY = 150; // shear line
  const STEP_MM = 0.5;
  const K = (c) => (2.0 + STEP_MM * c) * MM; // key pin length for code c
  const RIDGE = 2.0 * MM; // uncut blade top, below the shear line
  const FLOOR = 100; // lowest a pin can hang with no key under it
  const STACK = 126; // key pin + driver pin length (drivers are sized to keep this constant)
  const TOL = 2; // pixels of slop before a pin blocks the plug
  const PIN_X = [404, 342, 280, 218, 156];
  const TIP_FULL = 76; // key tip x when fully inserted
  const PULL = 360; // how far the key slides out
  const KEY_LEN = 354;
  const SECRET = [4, 7, 2, 6, 3];
  const Q = PIN_X.map((x) => x - TIP_FULL); // distance of each cut from the key tip

  const tipX = (s) => TIP_FULL + (1 - s) * PULL;

  // Top edge of the key blade (y below the shear line, downwards is positive), u = distance from the tip.
  function keyEdge(u, cuts) {
    let y = RIDGE;
    y = Math.max(y, FLOOR - u); // bevelled tip
    for (let i = 0; i < cuts.length; i++) y = Math.max(y, K(cuts[i]) - Math.abs(u - Q[i]));
    return y;
  }

  // Where each key pin's lower end rests (relative to the shear line).
  function pinBottoms(cuts, s) {
    const t = tipX(s);
    return PIN_X.map((x) => {
      const u = x - t;
      return u < 0 ? FLOOR : Math.min(FLOOR, keyEdge(u, cuts));
    });
  }

  // offset of each key pin's top from the shear line, in pixels (+ = below the line = too deep)
  function offsets(cuts, s) {
    const b = pinBottoms(cuts, s);
    return b.map((y, i) => y - K(SECRET[i]));
  }

  function state(cuts, s) {
    const off = offsets(cuts, s);
    const aligned = off.map((d) => Math.abs(d) <= TOL);
    const inserted = s >= 0.98;
    return { off, aligned, count: aligned.filter(Boolean).length, inserted, free: inserted && aligned.every(Boolean) };
  }

  const api = { MM, SY, K, RIDGE, FLOOR, STACK, TOL, PIN_X, TIP_FULL, PULL, KEY_LEN, SECRET, Q, tipX, keyEdge, pinBottoms, offsets, state };
  OM.lock = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
