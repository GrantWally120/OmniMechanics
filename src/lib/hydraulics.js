/* Hydraulic jack / press (Pascal's principle) with an optional air bubble.
 *
 * Quasi-static: pressure is the same everywhere in the fluid, so
 * F2 / A2 = F1 / A1, and the fluid volume moved by each piston is equal.
 * A trapped air bubble compresses isothermally (P V = const), which is why a
 * brake pedal with air in the line feels spongy.
 */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});
  const G = 9.80665;
  const P_ATM = 101325;

  const area = (dMm) => (Math.PI / 4) * Math.pow(dMm / 1000, 2);

  // Gauge pressure needed to hold a load of mass m on a slave piston of diameter d2.
  function loadPressure(massKg, d2Mm) {
    return (massKg * G) / area(d2Mm);
  }

  // Volume the bubble loses when its gauge pressure rises to P (Pa).
  function bubbleLoss(V0, P) {
    return V0 * (1 - P_ATM / (P_ATM + Math.max(0, P)));
  }

  // x1: master piston travel (m). Returns slave travel (m) and pump force (N).
  function respond({ x1, d1Mm, d2Mm, massKg, bubbleMl, lever }) {
    const A1 = area(d1Mm);
    const A2 = area(d2Mm);
    const P = loadPressure(massKg, d2Mm);
    const dV = bubbleLoss((bubbleMl || 0) * 1e-6, P);
    const moved = Math.max(0, A1 * x1 - dV);
    const x2 = moved / A2;
    const F1 = P * A1; // force on the master piston at lifting pressure
    return {
      A1, A2, P, dV, x2, F1,
      handForce: F1 / (lever || 1),
      handTravel: x1 * (lever || 1),
      deadTravel: dV / A1, // master travel spent squeezing the bubble
      ratio: A2 / A1,
      workIn: F1 * Math.max(0, x1 - dV / A1),
      workOut: massKg * G * x2,
    };
  }

  const api = { G, P_ATM, area, loadPressure, bubbleLoss, respond };
  OM.hydraulics = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
