/* Block and tackle.
 *
 * With n rope segments supporting the load and each sheave passing on a
 * fraction eta of the tension it receives, the tensions form a geometric
 * series and must add up to the weight: W = F (1 + eta + ... + eta^(n-1)).
 */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});
  const G = 9.80665;

  function effort(W, n, eta) {
    if (eta >= 0.99999) return W / n;
    return (W * (1 - eta)) / (1 - Math.pow(eta, n));
  }

  // Tension in segment k, counted from the end you pull.
  function tensions(W, n, eta) {
    const F = effort(W, n, eta);
    const out = [];
    for (let k = 0; k < n; k++) out.push(F * Math.pow(eta, k));
    return out;
  }

  function analyse(massKg, n, eta) {
    const W = massKg * G;
    const F = effort(W, n, eta);
    return {
      W, F,
      idealF: W / n,
      ma: W / F,
      idealMa: n,
      eff: W / (n * F),
      ropePerMetre: n,
      tensions: tensions(W, n, eta),
    };
  }

  const api = { G, effort, tensions, analyse };
  OM.pulleys = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
