/* Vapour-compression refrigerator using an R-134a property fit.
 *
 * Saturation pressure: ln P = ln 2.006 bar + 2675 K (1/263.15 - 1/T), anchored
 * to table values at -10 C and 40 C (within about 1% from -20 C to 60 C).
 * Enthalpies use the IIR reference (h_f = 200 kJ/kg at 0 C). The compressor is
 * modelled with an isentropic efficiency; all of this is a teaching fit, not a
 * property library.
 */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  const RGAS = 81.49; // J/(kg K) for R-134a
  const ETA_S = 0.7; // compressor isentropic efficiency
  const K_ISEN = 21.5; // kJ/kg per unit ln(pressure ratio)
  const V_DISP = 0.6 / 3600; // m^3/s swept volume
  const kelvin = (t) => t + 273.15;

  const psat = (tC) => 2.006 * Math.exp(2675 * (1 / 263.15 - 1 / kelvin(tC))); // bar
  const hf = (tC) => 200 + 1.41 * tC; // kJ/kg
  const hg = (tC) => 398.6 + 0.52 * tC; // kJ/kg

  // tEvap, tCond in deg C.
  function cycle(tEvap, tCond) {
    const pe = psat(tEvap);
    const pc = psat(tCond);
    const pr = pc / pe;
    const h1 = hg(tEvap); // saturated vapour leaving evaporator
    const h3 = hf(tCond); // saturated liquid leaving condenser
    const h4 = h3; // expansion valve: constant enthalpy
    const dhIsen = K_ISEN * Math.log(pr);
    const h2 = h1 + dhIsen / ETA_S;
    const qEvap = h1 - h4;
    const wComp = h2 - h1;
    const qCond = h2 - h3;
    const x4 = (h4 - hf(tEvap)) / (hg(tEvap) - hf(tEvap));
    const v1 = (0.93 * RGAS * kelvin(tEvap)) / (pe * 1e5);
    const etaV = Math.max(0.4, 0.95 - 0.04 * pr);
    const mdot = (etaV * V_DISP) / v1;
    return {
      tEvap, tCond, pe, pc, pr, h1, h2, h3, h4, x4, qEvap, wComp, qCond,
      cop: qEvap / wComp,
      carnot: kelvin(tEvap) / (kelvin(tCond) - kelvin(tEvap)),
      mdot,
      qCool: mdot * qEvap * 1000, // W
      wElec: mdot * wComp * 1000, // W
      qReject: mdot * qCond * 1000, // W
    };
  }

  const EVAP_DT = 13; // evaporator colder than cabinet air by this much
  const COND_DT = 15; // condenser hotter than room by this much
  const C_CAB = 30000; // J/K thermal mass of cabinet and contents
  const UA = 1.6; // W/K heat leak through the walls
  const DOOR_W = 45; // extra heat load while the door is open, W

  // Advance the cabinet thermostat loop. s = {tCab, on}; returns new state and cycle.
  function step(s, dt, { setpoint, tRoom, door }) {
    const cyc = cycle(s.tCab - EVAP_DT, tRoom + COND_DT);
    let on = s.on;
    if (s.tCab > setpoint + 1) on = true;
    else if (s.tCab < setpoint - 1) on = false;
    const leak = UA * (tRoom - s.tCab) + (door ? DOOR_W : 0);
    const q = leak - (on ? cyc.qCool : 0);
    const tCab = s.tCab + (q * dt) / C_CAB;
    return { tCab, on, cyc, leak };
  }

  const api = { psat, hf, hg, cycle, step, EVAP_DT, COND_DT, C_CAB, UA, kelvin };
  OM.fridge = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
