'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../../src/lib/water.js');

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} +/- ${tol}, got ${a}`);

test('water: saturation vapour pressure matches the standard table and grows about 6 to 7 percent per degree', () => {
  near(W.esat(0), 6.11, 0.03);
  near(W.esat(20), 23.4, 0.15);
  near(W.esat(25), 31.7, 0.2);
  near(W.esat(35), 56.2, 0.4);
  for (const t of [0, 10, 20, 30]) {
    const g = W.esat(t + 1) / W.esat(t);
    assert.ok(g > 1.058 && g < 1.075, 'growth at ' + t + ' C: ' + g);
  }
});

test('water: dew point is consistent with relative humidity', () => {
  near(W.dewpoint(20, 0.5), 9.3, 0.15);
  near(W.dewpoint(25, 0.6), 16.7, 0.15);
  near(W.dewpoint(18, 1), 18, 1e-9);
  for (const [t, rh] of [[5, 0.4], [15, 0.7], [30, 0.95]]) near(W.esat(W.dewpoint(t, rh)), rh * W.esat(t), 1e-9);
});

test('water: Bolton cloud base agrees with the 125 m per degree rule of thumb', () => {
  for (let t = 5; t <= 35; t += 5) {
    for (const rh of [0.4, 0.6, 0.8, 0.95]) {
      const a = W.lclHeight(t, rh), b = W.lclEspy(t, rh);
      near(a, b, Math.max(25, b * 0.06), `T ${t} rh ${rh}`);
    }
  }
  assert.equal(W.lclHeight(20, 1), 0);
  assert.ok(W.lclHeight(20, 0.4) > W.lclHeight(20, 0.8), 'drier air, higher cloud base');
});

test('water: saturated air cools more slowly than dry air, and less so when it is warm', () => {
  near(W.moistLapse(0, 1000) * 1000, 6.5, 0.3);
  near(W.moistLapse(25, 1000) * 1000, 3.9, 0.3);
  assert.ok(W.moistLapse(25, 1000) < W.moistLapse(10, 1000) && W.moistLapse(10, 1000) < W.moistLapse(-10, 1000));
  assert.ok(W.moistLapse(25, 1000) < W.GAMMA_D && W.moistLapse(-30, 500) <= W.GAMMA_D);
  near(W.GAMMA_D * 1000, 9.8, 0.1);
});

test('water: a parcel cools dry up to the cloud base, then along the moist adiabat', () => {
  const a = W.ascend(26, 0.8, 2000);
  const zl = a.zLcl;
  assert.ok(zl > 300 && zl < 700);
  const at = (z) => a.path.reduce((best, p) => (Math.abs(p.z - z) < Math.abs(best.z - z) ? p : best));
  near(at(200).T, a.tAir - W.GAMMA_D * 200, 1e-6, 'dry cooling');
  // at the cloud base the air is at its dew point
  const lcl = at(Math.round(zl / 25) * 25);
  near(lcl.T, a.tAir - W.GAMMA_D * lcl.z, 0.3);
  // above it the cooling rate is between the moist and dry values
  const p1 = at(1000), p2 = at(1500);
  const rate = (p1.T - p2.T) / (p2.z - p1.z);
  assert.ok(rate > 0.003 && rate < W.GAMMA_D);
  // vapour stays constant below the cloud base and falls above it
  near(at(100).q, a.q0, 1e-12);
  assert.ok(p2.q < p1.q && p1.q < a.q0);
  assert.ok(a.cloud);
});

test('water: a hill below the cloud base makes no cloud and no rain', () => {
  const r = W.rain(26, 0.8, 7, 300);
  assert.equal(r.asc.cloud, false);
  near(r.mmDay, 0, 1e-12);
  near(r.lee.T, r.asc.tAir, 1e-9, 'air returns as it started');
  near(r.lee.rh, 0.8, 1e-6);
});

test('water: energy is conserved: the far side is warmer by the heat released by the water that fell as rain', () => {
  for (const [sea, rh, ridge] of [[26, 0.8, 1800], [30, 0.9, 2500], [15, 0.7, 3000], [20, 0.6, 2200]]) {
    const r = W.rain(sea, rh, 7, ridge);
    if (r.asc.condensed <= 0) continue;
    const heating = (W.latentHeat(r.asc.tAir / 2) * r.asc.condensed * W.PRECIP_EFF) / 1004;
    near(r.lee.T - r.asc.tAir, heating, Math.max(0.35, heating * 0.06), `sea ${sea} rh ${rh} ridge ${ridge}`);
  }
});

test('water: the rain shadow side is warmer and drier than the air that came off the sea', () => {
  const r = W.rain(26, 0.8, 7, 2000);
  assert.ok(r.lee.T > r.asc.tAir + 3);
  assert.ok(r.lee.rh < 0.8 * 0.75);
  assert.ok(r.lee.dew < W.dewpoint(r.asc.tAir, 0.8));
});

test('water: more mountain, more wind, warmer sea or damper air all mean more rain', () => {
  const base = W.rain(26, 0.8, 7, 1500).mmDay;
  assert.ok(base > 5);
  assert.ok(W.rain(26, 0.8, 7, 2500).mmDay > base);
  near(W.rain(26, 0.8, 14, 1500).mmDay / base, 2, 1e-9);
  assert.ok(W.rain(32, 0.8, 7, 1500).mmDay > W.rain(14, 0.8, 7, 1500).mmDay);
  assert.ok(W.rain(26, 0.95, 7, 1500).mmDay > base);
  assert.ok(W.rain(26, 0.5, 7, 1500).mmDay < base);
});

test('water: evaporation from a warm sea is a few millimetres a day and about 100 W/m2', () => {
  const e = W.evaporation(26, 0.8, 7);
  assert.ok(e.mmDay > 3 && e.mmDay < 6, 'mm/day ' + e.mmDay);
  assert.ok(e.watts > 80 && e.watts < 180, 'W/m2 ' + e.watts);
  near(e.watts, e.kgPerM2S * W.latentHeat(26), 1e-9);
  near(W.evaporation(26, 0.8, 14).mmDay / e.mmDay, 2, 1e-9);
  assert.ok(W.evaporation(30, 0.8, 7).mmDay > e.mmDay);
  assert.ok(W.evaporation(26, 0.6, 7).mmDay > e.mmDay);
  assert.ok(W.evaporation(26, 1, 7).mmDay < e.mmDay);
  // the warming sea gives roughly 6 to 10 percent more evaporation per degree
  const g = W.evaporation(27, 0.8, 7).mmDay / e.mmDay;
  assert.ok(g > 1.05 && g < 1.14, 'per degree ' + g);
});

test('water: latent heat is about 2.5 MJ per kg at sea temperatures and 2.26 MJ at boiling', () => {
  near(W.latentHeat(0), 2.501e6, 1e3);
  near(W.latentHeat(25), 2.44e6, 2e4);
  near(W.latentHeat(100), 2.26e6, 5e4);
});
