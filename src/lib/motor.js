/* Brushed DC motor.
 *
 * Electrical: V = I R + k w   (k w is the back-EMF)
 * Mechanical: J dw/dt = k I - b w - T_load
 * Torque constant equals voltage constant (k, in N m/A = V s/rad) in SI units.
 */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  const K = 0.04; // V s/rad
  const R = 0.8; // ohm
  const J = 0.002; // kg m^2
  const B = 0.0004; // N m s/rad viscous friction

  // Steady state for supply voltage V (>= 0) and load torque tl (N m).
  function steady(V, tl) {
    let w = (K * V / R - tl) / ((K * K) / R + B);
    let stalled = false;
    if (w <= 0) { w = 0; stalled = true; }
    const I = (V - K * w) / R;
    const tShaft = tl;
    const pOut = tShaft * w;
    const pIn = V * I;
    return { w, rpm: (w * 60) / (2 * Math.PI), I, stalled, eff: pIn > 1e-9 ? pOut / pIn : 0, pIn, pOut, backEmf: K * w };
  }

  // Advance angular speed w by dt with substeps. hold = rotor jammed.
  function advance(w, V, tl, dt, hold) {
    if (hold) return 0;
    const n = Math.max(1, Math.ceil(dt / 0.002));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const I = (V - K * w) / R;
      let t = K * I - B * w;
      if (w <= 1e-6 && t <= tl) { w = 0; continue; }
      t -= tl;
      w += (t / J) * h;
      if (w < 0) w = 0;
    }
    return w;
  }

  // Instantaneous torque relative to its mean for n evenly spaced coils
  // with a commutator that reverses each coil at its neutral plane.
  function ripple(theta, n) {
    let s = 0;
    for (let k = 0; k < n; k++) s += Math.abs(Math.cos(theta + (k * Math.PI) / n));
    return ((Math.PI / 2) * s) / n;
  }

  const api = { K, R, J, B, steady, advance, ripple };
  OM.motor = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
