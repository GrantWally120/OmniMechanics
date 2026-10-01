/* Wind turbine.
 *
 * Momentum theory (Rankine and Froude, Betz 1919). The rotor slows the wind to (1 - a) v at the disc and
 * (1 - 2a) v far behind it, where a is the axial induction factor:
 *     power coefficient  Cp = 4 a (1 - a)^2        (largest value 16/27 at a = 1/3, the Betz limit)
 *     thrust coefficient Ct = 4 a (1 - a)
 *
 * A real rotor falls short of the Betz limit. Its Cp depends on the tip-speed ratio (blade tip speed over
 * wind speed) and the blade pitch. The generic fit below is the widely used one from Slootweg et al. (2003):
 *     Cp(lambda, beta) = c1 (c2 / li - c3 beta - c4) exp(-c5 / li) + c6 lambda,
 *     1 / li = 1 / (lambda + 0.08 beta) - 0.035 / (beta^3 + 1)
 * with a best Cp of about 0.48 at lambda = 8.1 and beta = 0.
 *
 * A turbine controller keeps the rotor at the best tip-speed ratio until the blade tips reach a speed limit,
 * holds the rated power above the rated wind speed by pitching the blades, and stops at the cut-out speed. */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});
  const RHO = 1.225; // kg/m3, air at sea level, 15 C
  const BETZ = 16 / 27;
  const ETA = 0.92; // gearbox, generator and converter
  const V_IN = 3; // cut-in wind speed, m/s
  const V_RATED = 12; // m/s
  const V_OUT = 25; // cut-out wind speed, m/s
  const TIP_MAX = 80; // m/s, blade tip speed limit (noise and loads)
  const DEG = Math.PI / 180;

  // ---- momentum theory
  const cpIdeal = (a) => 4 * a * (1 - a) * (1 - a);
  const ctIdeal = (a) => 4 * a * (1 - a);
  // the induction factor (below 1/3) that gives a power coefficient cp, or null if above the Betz limit
  function inductionFor(cp) {
    if (cp <= 0) return 0;
    if (cp > BETZ + 1e-9) return null;
    let lo = 0, hi = 1 / 3;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (cpIdeal(m) < cp) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  const windPower = (v, D, rho) => 0.5 * (rho || RHO) * Math.PI * (D / 2) * (D / 2) * v * v * v;

  // ---- a real rotor
  function cp(lambda, betaDeg) {
    const b = betaDeg || 0;
    if (lambda <= 0) return 0;
    const inv = 1 / (lambda + 0.08 * b) - 0.035 / (b * b * b + 1);
    if (inv <= 0) return 0;
    const li = 1 / inv;
    const c = 0.5176 * (116 / li - 0.4 * b - 5) * Math.exp(-21 / li) + 0.0068 * lambda;
    return Math.max(0, c);
  }
  // best tip-speed ratio at zero pitch
  let best = null;
  function bestLambda() {
    if (best) return best;
    let bl = 1, bc = 0;
    for (let l = 1; l <= 16; l += 0.01) { const c = cp(l, 0); if (c > bc) { bc = c; bl = l; } }
    best = { lambda: bl, cp: bc };
    return best;
  }

  // Rated power of a rotor of diameter D: what the controller reaches at the rated wind speed.
  function ratedPower(D, rho) {
    const lam = Math.min(bestLambda().lambda, TIP_MAX / V_RATED);
    return windPower(V_RATED, D, rho) * cp(lam, 0) * ETA;
  }

  // What the machine does in a wind of v m/s. lambdaSet is used when auto is false.
  function operate(o) {
    const v = o.v, D = o.D, rho = o.rho || RHO;
    const R = D / 2;
    const out = { v, D, state: 'running', lambda: 0, beta: 0, cp: 0, power: 0, pAvail: windPower(v, D, rho), omega: 0, rpm: 0, tip: 0, rated: ratedPower(D, rho) };
    if (v >= V_OUT) { out.state = 'parked'; return out; }
    const lamWanted = o.auto === false ? o.lambdaSet : bestLambda().lambda;
    const lam = v > 0 ? Math.min(lamWanted, TIP_MAX / v) : 0;
    out.lambda = lam;
    out.omega = v > 0 ? (lam * v) / R : 0;
    out.rpm = (out.omega * 60) / (2 * Math.PI);
    out.tip = out.omega * R;
    if (v < V_IN) { out.state = 'waiting'; return out; }
    let c = cp(lam, 0);
    let p = out.pAvail * c * ETA;
    if (p > out.rated) {
      // pitch the blades until the power is just the rated power
      let lo = 0, hi = 40;
      for (let i = 0; i < 50; i++) {
        const m = (lo + hi) / 2;
        if (out.pAvail * cp(lam, m) * ETA > out.rated) lo = m; else hi = m;
      }
      out.beta = (lo + hi) / 2;
      c = cp(lam, out.beta);
      p = out.pAvail * c * ETA;
      out.state = 'limited';
    }
    out.cp = c;
    out.power = p;
    return out;
  }

  function powerCurve(D, rho, vMax, n) {
    const pts = [];
    vMax = vMax || 30; n = n || 120;
    for (let i = 0; i <= n; i++) { const v = (i / n) * vMax; pts.push({ v, p: operate({ v, D, rho }).power }); }
    return pts;
  }

  const api = {
    RHO, BETZ, ETA, V_IN, V_RATED, V_OUT, TIP_MAX, DEG,
    cpIdeal, ctIdeal, inductionFor, windPower, cp, bestLambda, ratedPower, operate, powerCurve,
  };
  OM.turbine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
