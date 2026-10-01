'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../../src/lib/solar.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} +/- ${tol}, got ${a}`);

test('solar: at one sun and 25 C the panel looks like a 60-cell, 300 watt panel', () => {
  const o = S.operate(1000, 25);
  near(o.voc, 60 * 0.66, 0.4, 'open-circuit voltage');
  near(o.isc, 9.5, 0.2, 'short-circuit current');
  assert.ok(o.best.p > 270 && o.best.p < 330, 'best power ' + o.best.p);
  assert.ok(o.ff > 0.72 && o.ff < 0.82, 'fill factor ' + o.ff);
  assert.ok(o.bestEff > 0.17 && o.bestEff < 0.21, 'efficiency ' + o.bestEff);
  assert.ok(o.best.v / o.voc > 0.76 && o.best.v / o.voc < 0.88, 'best voltage is about 80 percent of Voc');
});

test('solar: the current falls as the voltage rises, from short-circuit current to zero at open circuit', () => {
  const G = 800, T = 30;
  const vo = S.voc(G, T);
  near(S.current(vo, G, T), 0, 1e-6, 'zero current at Voc');
  let last = Infinity;
  for (let k = 0; k <= 60; k++) { const i = S.current((k / 60) * vo, G, T); assert.ok(i <= last + 1e-9); last = i; }
  near(S.current(0, G, T), S.isc(G, T), 1e-12);
  assert.ok(S.current(vo * 1.1, G, T) < 0, 'above Voc the cell would be driven');
});

test('solar: the current is proportional to the light, the voltage grows only with its logarithm', () => {
  near(S.isc(500, 25) / S.isc(1000, 25), 0.5, 0.005);
  near(S.isc(100, 25) / S.isc(1000, 25), 0.1, 0.002);
  // ten times the light adds n Vt ln 10 to each cell, about 71 mV
  const dv = S.cellVoc(1000, 25) - S.cellVoc(100, 25);
  near(dv, 1.2 * 0.025693 * Math.log(10), 0.01);
  assert.equal(S.operate(0, 25).p, 0);
});

test('solar: a hotter cell gives a lower voltage, a little more current and clearly less power', () => {
  const dVoc = (S.cellVoc(1000, 55) - S.cellVoc(1000, 25)) / 30;
  assert.ok(dVoc < -0.0018 && dVoc > -0.0026, 'dVoc/dT per cell ' + dVoc * 1000 + ' mV/K');
  assert.ok(S.isc(1000, 55) > S.isc(1000, 25));
  near((S.isc(1000, 55) / S.isc(1000, 25) - 1) / 30, 0.0005, 0.0001);
  const dP = (S.mpp(1000, 55).p / S.mpp(1000, 25).p - 1) / 30;
  assert.ok(dP < -0.0028 && dP > -0.0050, 'power change per kelvin ' + dP * 100 + ' %');
  assert.ok(S.mpp(1000, 0).p > S.mpp(1000, 25).p && S.mpp(1000, 25).p > S.mpp(1000, 75).p);
});

test('solar: the maximum power point really is the maximum, and power never exceeds the light or Voc times Isc', () => {
  for (const [G, T] of [[1000, 25], [300, 10], [800, 60], [100, 40]]) {
    const m = S.mpp(G, T);
    let top = 0;
    for (let k = 0; k <= 400; k++) { const v = (k / 400) * S.voc(G, T); top = Math.max(top, v * Math.max(0, S.current(v, G, T))); }
    near(m.p, top, top * 0.002, `G ${G} T ${T}`);
    assert.ok(m.p <= G * S.AREA);
    assert.ok(m.p <= S.voc(G, T) * S.isc(G, T));
  }
});

test('solar: cells in series add their voltages and share the current', () => {
  const a = S.voc(1000, 25, 30), b = S.voc(1000, 25, 60);
  near(b / a, 2, 1e-9);
  near(S.isc(1000, 25), S.operate(1000, 25, 0, 30).i, 1e-9);
  near(S.mpp(1000, 25, 60).p / S.mpp(1000, 25, 30).p, 2, 1e-6);
});

test('solar: forcing the voltage up wastes the photocurrent in the junction, so less reaches the terminals', () => {
  const lo = S.operate(1000, 25, 5), hi = S.operate(1000, 25, 37);
  assert.ok(lo.collected > 0.98);
  assert.ok(hi.collected < lo.collected);
  assert.ok(S.operate(1000, 25, S.voc(1000, 25)).collected < 1e-6, 'at open circuit nothing is collected');
  assert.ok(S.operate(1000, 25, 5).p < S.operate(1000, 25).p && S.operate(1000, 25, 37).p < S.operate(1000, 25).p);
});
