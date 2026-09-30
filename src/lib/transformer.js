/* Single-phase transformer.
 *
 * Ideal relations: V2/V1 = Ns/Np and I2/I1 = Np/Ns.
 * Real effects kept: winding resistance (copper loss, R grows with N^2 for a
 * fixed winding window), core loss that rises with flux density, and core
 * saturation above about 1.7 T where the magnetising current explodes.
 * Flux density from the transformer EMF equation: V_rms = 4.44 f N A B_max.
 */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  const A_CORE = 30e-4; // m^2 core cross-section
  const B_SAT = 1.7; // tesla
  const R_REF = 1.0; // ohm per winding at 100 turns

  function analyse({ vrms, f, np, ns, rLoad }) {
    const ratio = ns / np;
    const bMax = vrms / (4.44 * f * np * A_CORE);
    const saturated = bMax > B_SAT;
    const r1 = R_REF * Math.pow(np / 100, 2);
    const r2 = R_REF * Math.pow(ns / 100, 2);
    const v2open = vrms * ratio;
    const rTot = rLoad + r2 + r1 * ratio * ratio;
    const i2 = v2open / rTot;
    const v2 = i2 * rLoad;
    const excess = Math.max(0, bMax / B_SAT - 1);
    const im = Math.min(60, 0.02 + 3 * excess * excess);
    const i1 = Math.hypot(i2 * ratio, im);
    const pOut = i2 * i2 * rLoad;
    const pCu = i2 * i2 * (r2 + r1 * ratio * ratio) + im * im * r1;
    const pCore = 1.5 * Math.pow(Math.min(bMax, 3) / 1.5, 2);
    const pIn = pOut + pCu + pCore;
    return {
      ratio, bMax, saturated, r1, r2, v2open, v2, i2, i1, im,
      pOut, pCu, pCore, pIn, eff: pIn > 0 ? pOut / pIn : 0,
      kind: ratio > 1.001 ? 'step-up' : ratio < 0.999 ? 'step-down' : 'isolation',
    };
  }

  // What happens when DC is switched on: flux ramps at V/Np until the core
  // saturates, then the secondary sees no change and the primary current is
  // limited only by winding resistance.
  function dcStep({ v, np, ns, tSince }) {
    const phiSat = B_SAT * A_CORE;
    const tSat = (phiSat * np) / v;
    const r1 = R_REF * Math.pow(np / 100, 2);
    const before = tSince < tSat;
    return {
      tSat,
      flux: before ? (v * tSince) / np : phiSat,
      v2: before ? (v * ns) / np : 0,
      i1: before ? 0.02 : v / r1,
      saturated: !before,
    };
  }

  const api = { A_CORE, B_SAT, analyse, dcStep };
  OM.transformer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
