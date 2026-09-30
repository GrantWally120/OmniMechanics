/* 2D "toy GPS": find receiver position (x, y) and clock bias b from
 * pseudoranges rho_i = |r - s_i| + b   (b is the clock error expressed as distance).
 * Gauss-Newton least squares. Real GPS does the same in 3D with four or more
 * satellites (unknowns x, y, z, and clock bias).
 */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  const C = 299792458; // m/s

  function inv3(m) {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h;
    const B = -(d * i - f * g);
    const Cc = d * h - e * g;
    const det = a * A + b * B + c * Cc;
    if (Math.abs(det) < 1e-9) return null;
    return [
      A / det, -(b * i - c * h) / det, (b * f - c * e) / det,
      B / det, (a * i - c * g) / det, -(a * f - c * d) / det,
      Cc / det, -(a * h - b * g) / det, (a * e - b * d) / det,
    ];
  }

  function solve(sats, rho, guess) {
    const n = sats.length;
    if (n < 3) return { ok: false, reason: 'underdetermined' };
    let x = guess ? guess.x : sats.reduce((s, p) => s + p.x, 0) / n;
    let y = guess ? guess.y : sats.reduce((s, p) => s + p.y, 0) / n;
    let b = guess && guess.b != null ? guess.b : 0;
    const path = [{ x, y, b }];
    let inv = null;
    for (let it = 0; it < 25; it++) {
      const JTJ = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      const JTr = [0, 0, 0];
      for (let i = 0; i < n; i++) {
        const dx = x - sats[i].x;
        const dy = y - sats[i].y;
        const d = Math.max(1e-9, Math.hypot(dx, dy));
        const row = [dx / d, dy / d, 1];
        const r = rho[i] - (d + b);
        for (let p = 0; p < 3; p++) {
          JTr[p] += row[p] * r;
          for (let q = 0; q < 3; q++) JTJ[p * 3 + q] += row[p] * row[q];
        }
      }
      inv = inv3(JTJ);
      if (!inv) return { ok: false, reason: 'singular', path };
      const dxk = inv[0] * JTr[0] + inv[1] * JTr[1] + inv[2] * JTr[2];
      const dyk = inv[3] * JTr[0] + inv[4] * JTr[1] + inv[5] * JTr[2];
      const dbk = inv[6] * JTr[0] + inv[7] * JTr[1] + inv[8] * JTr[2];
      x += dxk; y += dyk; b += dbk;
      path.push({ x, y, b });
      if (Math.abs(dxk) + Math.abs(dyk) + Math.abs(dbk) < 1e-10) break;
    }
    let ss = 0;
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(x - sats[i].x, y - sats[i].y);
      ss += Math.pow(rho[i] - (d + b), 2);
    }
    const pdop = inv ? Math.sqrt(Math.max(0, inv[0] + inv[4])) : Infinity;
    return { ok: true, x, y, b, path, rms: Math.sqrt(ss / n), pdop };
  }

  function pseudoranges(sats, pos, bias, noise) {
    return sats.map((s, i) => Math.hypot(pos.x - s.x, pos.y - s.y) + bias + (noise ? noise[i] : 0));
  }

  // Relativity: satellite clocks run fast by ~38.5 microseconds per day.
  const REL = { gravity: 45.7e-6, velocity: -7.2e-6, perDay: 38.5e-6 };
  const driftKmPerDay = REL.perDay * C / 1000;

  const api = { C, solve, pseudoranges, REL, driftKmPerDay };
  OM.gps = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
