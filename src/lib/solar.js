/* Silicon solar panel: the single-diode model.
 *
 * Light makes a current Iph. The junction itself passes a diode current that eats into it, and two small
 * resistances (series Rs, shunt Rsh) take their share:
 *     I = Iph - I0 [ exp((Vc + I Rs) / (n Vt)) - 1 ] - (Vc + I Rs) / Rsh
 * for one cell at voltage Vc. A panel is N cells in series, so its voltage is N Vc and the current is the same.
 *
 * Temperature: Iph rises a little (0.05 %/K), but the saturation current I0 rises very fast, which pulls the
 * open-circuit voltage down by about 2 mV per cell per kelvin. The panel loses roughly 0.4 % of its power
 * for each degree it gets hotter.
 *
 * Units: volts, amps, watts, W/m2, degrees C. */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});
  const Q = 1.602176634e-19;
  const KB = 1.380649e-23;
  const T_REF = 298.15;
  const G_REF = 1000;
  const EG = 1.12; // eV, silicon
  const CELLS = 60;
  const AREA = 1.65; // m2 of panel
  const ISC_REF = 9.5; // A per cell at 1000 W/m2 and 25 C
  const VOC_REF = 0.66; // V per cell
  const N_IDEAL = 1.2;
  const RS = 0.003; // ohm per cell
  const RSH = 25; // ohm per cell
  const KI = 0.0005; // relative change of Isc per kelvin

  const vt = (tk) => (KB * tk) / Q;
  // saturation current at the reference conditions, chosen so that Voc is VOC_REF
  const I0_REF = (ISC_REF - VOC_REF / RSH) / (Math.exp(VOC_REF / (N_IDEAL * vt(T_REF))) - 1);

  function parts(G, tc) {
    const tk = tc + 273.15;
    const iph = (ISC_REF * (1 + KI * (tc - 25)) * G) / G_REF;
    const i0 = I0_REF * Math.pow(tk / T_REF, 3) * Math.exp(((EG * Q) / (N_IDEAL * KB)) * (1 / T_REF - 1 / tk));
    return { iph, i0, nvt: N_IDEAL * vt(tk) };
  }

  // Current of one cell at voltage vc.
  function cellCurrent(vc, G, tc) {
    if (G <= 0) return 0;
    const p = parts(G, tc);
    const f = (i) => p.iph - p.i0 * (Math.exp((vc + i * RS) / p.nvt) - 1) - (vc + i * RS) / RSH - i;
    // f decreases with i: find the root by bracketing and bisection, then polish with Newton steps
    let lo = -2 * p.iph - 1, hi = p.iph + 1;
    for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }

  const current = (v, G, tc, cells) => cellCurrent(v / (cells || CELLS), G, tc);

  // Open-circuit voltage of one cell.
  function cellVoc(G, tc) {
    if (G <= 0) return 0;
    let lo = 0, hi = 1.2;
    for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (cellCurrent(m, G, tc) > 0) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  const voc = (G, tc, cells) => cellVoc(G, tc) * (cells || CELLS);
  const isc = (G, tc) => cellCurrent(0, G, tc);

  // Maximum power point of the whole panel (golden section search).
  function mpp(G, tc, cells) {
    const n = cells || CELLS;
    if (G <= 0) return { v: 0, i: 0, p: 0 };
    const vmax = cellVoc(G, tc);
    const power = (vc) => vc * cellCurrent(vc, G, tc);
    let a = 0, b = vmax;
    const gr = (Math.sqrt(5) - 1) / 2;
    let c = b - gr * (b - a), d = a + gr * (b - a);
    for (let k = 0; k < 60; k++) {
      if (power(c) > power(d)) { b = d; } else { a = c; }
      c = b - gr * (b - a); d = a + gr * (b - a);
    }
    const vc = (a + b) / 2;
    const i = cellCurrent(vc, G, tc);
    return { v: vc * n, i, p: vc * i * n };
  }

  // Everything about the panel at a given operating voltage (v = null means "at the best point").
  function operate(G, tc, v, cells) {
    const n = cells || CELLS;
    const best = mpp(G, tc, n);
    const vv = v == null ? best.v : Math.min(Math.max(v, 0), voc(G, tc, n));
    const i = Math.max(0, current(vv, G, tc, n));
    const p = vv * i;
    const vo = voc(G, tc, n), io = isc(G, tc);
    return {
      v: vv, i, p, best, voc: vo, isc: io,
      ff: vo * io > 0 ? best.p / (vo * io) : 0,
      eff: G > 0 ? p / (G * AREA) : 0,
      bestEff: G > 0 ? best.p / (G * AREA) : 0,
      light: G * AREA,
      // share of the light-made current that reaches the terminals
      collected: parts(G, tc).iph > 0 ? i / parts(G, tc).iph : 0,
    };
  }

  function curve(G, tc, cells, n) {
    const N = cells || CELLS, pts = [];
    const vo = voc(G, tc, N);
    n = n || 90;
    for (let k = 0; k <= n; k++) { const v = (k / n) * vo * 1.0; const i = Math.max(0, current(v, G, tc, N)); pts.push({ v, i, p: v * i }); }
    return pts;
  }

  const api = { CELLS, AREA, ISC_REF, VOC_REF, N_IDEAL, G_REF, RS, RSH, parts, cellCurrent, current, cellVoc, voc, isc, mpp, operate, curve };
  OM.solar = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
