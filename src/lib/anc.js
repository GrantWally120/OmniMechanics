/* Active noise cancelling: adding a wave to its (delayed, scaled) opposite.
 *
 * noise:      sin(w t)
 * anti-noise: a sin(w t + phi)
 * The sum has amplitude |1 + a e^{i phi}|.
 * An electronic canceller aims for phi = pi but its anti-noise is a copy made
 * tau seconds late, so phi = pi - w tau and the sum is |1 - e^{-i w tau}| = 2 sin(w tau / 2).
 */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  const residual = (a, phi) => Math.hypot(1 + a * Math.cos(phi), a * Math.sin(phi));
  const toDb = (amp) => (amp <= 1e-9 ? 99 : -20 * Math.log10(amp)); // positive = quieter

  function electronic(f, tauUs) {
    const w = 2 * Math.PI * f;
    const tau = tauUs * 1e-6;
    const phi = Math.PI - w * tau;
    return { a: 1, phi, amp: residual(1, phi) };
  }

  const api = { residual, toDb, electronic };
  OM.anc = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
