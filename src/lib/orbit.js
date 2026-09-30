/* Two-body orbits around Earth.  Units: km, s.  Leapfrog with a step that
 * shrinks near the planet so eccentric orbits stay accurate. */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  const GM = 398600.4418; // km^3/s^2
  const RE = 6371; // km
  const G0 = 9.80665; // m/s^2 (standard gravity, for g(h) comparisons)

  const circularSpeed = (r) => Math.sqrt(GM / r);
  const escapeSpeed = (r) => Math.sqrt((2 * GM) / r);
  const gAt = (hKm) => (G0 * RE * RE) / ((RE + hKm) * (RE + hKm)); // m/s^2

  function acc(x, y) {
    const r2 = x * x + y * y;
    const r3 = r2 * Math.sqrt(r2);
    return [(-GM * x) / r3, (-GM * y) / r3];
  }

  // Advance state s = {x, y, vx, vy} by dt seconds. Returns true if it hit the ground.
  function advance(s, dt) {
    let left = dt;
    let guard = 0;
    while (left > 1e-9 && guard++ < 200000) {
      const r = Math.hypot(s.x, s.y);
      const h = Math.min(left, 0.0015 * Math.sqrt((r * r * r) / GM) * 2 * Math.PI);
      let [ax, ay] = acc(s.x, s.y);
      s.vx += 0.5 * h * ax;
      s.vy += 0.5 * h * ay;
      s.x += h * s.vx;
      s.y += h * s.vy;
      [ax, ay] = acc(s.x, s.y);
      s.vx += 0.5 * h * ax;
      s.vy += 0.5 * h * ay;
      left -= h;
      if (Math.hypot(s.x, s.y) <= RE) return true;
    }
    return false;
  }

  function energy(s) {
    return 0.5 * (s.vx * s.vx + s.vy * s.vy) - GM / Math.hypot(s.x, s.y);
  }

  // Orbital elements from a state vector.
  function elements(s) {
    const r = Math.hypot(s.x, s.y);
    const v2 = s.vx * s.vx + s.vy * s.vy;
    const eps = 0.5 * v2 - GM / r;
    const h = s.x * s.vy - s.y * s.vx;
    const rv = s.x * s.vx + s.y * s.vy;
    const ex = ((v2 - GM / r) * s.x - rv * s.vx) / GM;
    const ey = ((v2 - GM / r) * s.y - rv * s.vy) / GM;
    const e = Math.hypot(ex, ey);
    const bound = eps < 0;
    const a = bound ? -GM / (2 * eps) : Infinity;
    const p = (h * h) / GM;
    const rp = p / (1 + e);
    const ra = bound ? p / (1 - e) : Infinity;
    return {
      r, v: Math.sqrt(v2), eps, h, e, ex, ey, bound, a, p, rp, ra,
      period: bound ? 2 * Math.PI * Math.sqrt((a * a * a) / GM) : Infinity,
      omega: Math.atan2(ey, ex),
      retrograde: h < 0,
    };
  }

  // Points of the conic path, from true anomaly range, up to rMax (km).
  function conic(el, rMax, n) {
    const pts = [];
    if (el.e < 1e-6) {
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * 2 * Math.PI;
        pts.push([el.p * Math.cos(t), el.p * Math.sin(t)]);
      }
      return pts;
    }
    let lim = Math.PI;
    if (!el.bound || el.e >= 1) {
      const c = (el.p / rMax - 1) / el.e; // cos(nu) at r = rMax
      lim = Math.acos(Math.max(-1, Math.min(1, c)));
      if (el.e < 1) lim = Math.PI;
    }
    const sgn = el.retrograde ? -1 : 1;
    for (let i = 0; i <= n; i++) {
      const nu = -lim + (2 * lim * i) / n;
      const r = el.p / (1 + el.e * Math.cos(nu));
      if (r < 0 || r > rMax * 1.5) continue;
      const a = el.omega + sgn * nu;
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return pts;
  }

  const api = { GM, RE, G0, circularSpeed, escapeSpeed, gAt, advance, energy, elements, conic };
  OM.orbit = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
