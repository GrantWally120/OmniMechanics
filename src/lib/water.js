/* The water cycle as a parcel of air crossing a mountain.
 *
 * Damp air leaves the sea, is forced up a slope, cools, condenses into cloud,
 * drops rain, and sinks down the far side warmer and drier. Every number comes
 * from textbook thermodynamics:
 *
 *   evaporation     bulk formula  E = rho C_E U (q_s - q_a)
 *   vapour pressure Magnus form (Alduchov and Eskridge 1996)
 *   cloud base      Bolton's lifting condensation level
 *   cooling         9.8 K/km while unsaturated, then the moist adiabat
 *   far side        dry adiabatic warming; most of the condensate has rained out,
 *                   the rest evaporates again and cools the sinking air
 *
 * Units: degrees C, hPa, metres, kg/kg for humidity, mm/day for water depth. */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});
  const RD = 287.05; // gas constant of dry air, J/(kg K)
  const CP = 1004; // J/(kg K)
  const G = 9.80665;
  const EPS = 0.622;
  const GAMMA_D = G / CP; // K/m, dry adiabatic lapse rate
  const C_E = 1.2e-3; // bulk transfer coefficient for moisture (Dalton number), neutral air
  const SALT = 0.98; // sea salt lowers the saturation vapour pressure by about 2 percent
  const LIFT_DEPTH = 400; // m, depth of the air layer the slope forces upward
  const PRECIP_EFF = 0.6; // share of the condensed water that reaches the ground as rain
  const SLOPE_KM = 40; // km, horizontal length of the windward slope
  const RHO_AIR = 1.15; // kg/m3 near the surface

  const K = (c) => c + 273.15;
  // Latent heat of vaporisation (J/kg), falling slowly with temperature.
  const latentHeat = (c) => 2.501e6 - 2370 * c;

  // Saturation vapour pressure over water (hPa).
  function esat(c) { return 6.1094 * Math.exp((17.625 * c) / (c + 243.04)); }
  // Dew point (C) for temperature c and relative humidity rh (0..1).
  function dewpoint(c, rh) {
    const g = Math.log(Math.max(rh, 1e-4)) + (17.625 * c) / (243.04 + c);
    return (243.04 * g) / (17.625 - g);
  }
  // Pressure at height z (hPa), International Standard Atmosphere.
  function pressureAt(z) { return 1013.25 * Math.pow(1 - 2.25577e-5 * z, 5.25588); }
  // Saturation mixing ratio (kg/kg) at temperature c and pressure p.
  function qsat(c, p) { const e = esat(c); return (EPS * e) / (p - e); }
  // Vapour mixing ratio of air at c with relative humidity rh.
  function qOf(c, rh, p) { const e = rh * esat(c); return (EPS * e) / (p - e); }
  // Relative humidity (0..1) of air with mixing ratio q at temperature c, pressure p.
  function rhOf(q, c, p) { const e = (q * p) / (EPS + q); return Math.min(1.5, e / esat(c)); }

  // Height (m) at which air lifted from the surface becomes saturated (Bolton 1980).
  function lclHeight(c, rh) {
    if (rh >= 0.9999) return 0;
    const t = K(c), td = K(dewpoint(c, rh));
    const tl = 1 / (1 / (td - 56) + Math.log(t / td) / 800) + 56;
    return Math.max(0, (t - tl) / GAMMA_D);
  }
  // Espy's rule of thumb, for comparison: 125 m per degree of dew-point depression.
  function lclEspy(c, rh) { return 125 * Math.max(0, c - dewpoint(c, rh)); }

  // Saturated (moist) adiabatic lapse rate, K/m.
  function moistLapse(c, p) {
    const t = K(c), lv = latentHeat(c);
    const rs = qsat(c, p);
    return (G * (1 + (lv * rs) / (RD * t))) / (CP + (lv * lv * rs * EPS) / (RD * t * t));
  }

  // Follow a surface parcel up to height zTop. Below the cloud base it cools dry
  // adiabatically, above it along the moist adiabat with the condensate removed.
  // Returns the path and what it gained or lost.
  function ascend(seaC, rh, zTop) {
    const tAir = seaC - 1; // the air just above the sea is a little cooler than the water
    const p0 = 1013.25;
    const q0 = qOf(tAir, rh, p0);
    const zl = lclHeight(tAir, rh);
    const path = [{ z: 0, T: tAir, q: q0, cloud: false }];
    const step = 25;
    let z = 0, T = tAir;
    let q = q0;
    while (z < zTop - 1e-9) {
      const dz = Math.min(step, zTop - z);
      const zm = z + dz / 2;
      if (z >= zl) {
        // saturated: integrate with a midpoint step
        const p1 = pressureAt(zm);
        const tm = T - 0.5 * dz * moistLapse(T, pressureAt(z));
        T -= dz * moistLapse(tm, p1);
      } else if (z + dz > zl) {
        // the step contains the cloud base
        T -= GAMMA_D * (zl - z);
        const rest = z + dz - zl;
        const p1 = pressureAt(zl + rest / 2);
        T -= rest * moistLapse(T, p1);
      } else {
        T -= GAMMA_D * dz;
      }
      z += dz;
      const sat = z > zl;
      q = sat ? Math.min(q0, qsat(T, pressureAt(z))) : q0;
      path.push({ z, T, q, cloud: sat });
    }
    const top = path[path.length - 1];
    const cloud = zTop > zl + 1e-9;
    return {
      z: zTop, zLcl: zl, tAir, q0, rh, path,
      cloud,
      Ttop: top.T, qtop: top.q,
      condensed: Math.max(0, q0 - top.q), // kg of water per kg of air
    };
  }

  // The far side. Part of the condensate has fallen as rain; the rest evaporates again
  // in the sinking air, which warms dry adiabatically and cools a little as it does.
  function descend(asc) {
    const left = (1 - PRECIP_EFF) * asc.condensed;
    const q = asc.qtop + left;
    const T = asc.Ttop + GAMMA_D * asc.z - (latentHeat(asc.Ttop) * left) / CP;
    const p = 1013.25;
    const rh = Math.min(1, rhOf(q, T, p));
    return { T, q, rh, dew: dewpoint(T, rh) };
  }

  // Evaporation from the sea by the bulk aerodynamic formula.
  function evaporation(seaC, rh, wind) {
    const tAir = seaC - 1;
    const p = 1013.25;
    const qs = SALT * qsat(seaC, p);
    const qa = qOf(tAir, rh, p);
    const rho = (p * 100) / (RD * K(tAir));
    const flux = Math.max(0, rho * C_E * wind * (qs - qa)); // kg/(m2 s)
    return { kgPerM2S: flux, mmDay: flux * 86400, watts: flux * latentHeat(seaC), qs, qa };
  }

  // Rain on the windward slope (mm/day). The slope forces a layer of air upward and part of
  // the vapour that condenses on the way to the crest falls out over the slope.
  function rain(seaC, rh, wind, ridge) {
    const asc = ascend(seaC, rh, ridge);
    const flux = RHO_AIR * wind * LIFT_DEPTH * asc.condensed * PRECIP_EFF; // kg/s per metre of coast
    const mmDay = ((flux / (SLOPE_KM * 1000)) * 86400);
    return { mmDay, asc, lee: descend(asc) };
  }

  const api = {
    GAMMA_D, C_E, LIFT_DEPTH, SLOPE_KM, PRECIP_EFF, latentHeat, esat, dewpoint, pressureAt, qsat, qOf, rhOf,
    lclHeight, lclEspy, moistLapse, ascend, descend, evaporation, rain,
  };
  OM.water = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
