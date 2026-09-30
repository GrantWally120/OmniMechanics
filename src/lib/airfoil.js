/* Potential flow around a Joukowski airfoil.
 *
 * A circle in the zeta plane maps to an airfoil in the z plane by
 *     z = zeta + 1/zeta.
 * Flow past the circle (uniform stream + doublet + vortex) maps to flow past
 * the airfoil. Choosing the vortex strength so the flow leaves the trailing
 * edge smoothly (the Kutta condition) gives
 *     Gamma = 4 pi U a sin(alpha + beta)
 * and a lift coefficient CL = 2 Gamma / (U chord).
 *
 * Shape: circle centre (-eps, kappa), radius a = |1 - centre|. eps sets
 * thickness, kappa sets camber.  Everything here is in the airfoil's own
 * frame after a rotation by delta so the chord line is horizontal and the
 * free stream arrives at the geometric angle of attack.
 *
 * This is inviscid: it predicts lift very well below the stall and says
 * nothing about drag or stall itself. stallModel() adds a typical stall.
 */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const cdiv = (a, b) => {
    const d = b[0] * b[0] + b[1] * b[1];
    return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
  };
  const cabs = (a) => Math.hypot(a[0], a[1]);
  const cscale = (a, k) => [a[0] * k, a[1] * k];
  function csqrt(z) {
    const r = Math.hypot(z[0], z[1]);
    const re = Math.sqrt(Math.max(0, (r + z[0]) / 2));
    const im = Math.sqrt(Math.max(0, (r - z[0]) / 2));
    return [re, z[1] < 0 ? -im : im];
  }

  function make(opts) {
    const eps = opts.eps == null ? 0.1 : opts.eps;
    const kappa = opts.kappa == null ? 0 : opts.kappa;
    const U = opts.U == null ? 1 : opts.U;
    const aoa = ((opts.aoaDeg == null ? 5 : opts.aoaDeg) * Math.PI) / 180;

    const z0 = [-eps, kappa];
    const a = Math.hypot(1 + eps, kappa);
    const beta = Math.asin(kappa / a);

    // Chord geometry from the surface itself.
    const NS = 720;
    const surf = [];
    for (let i = 0; i < NS; i++) {
      const t = (2 * Math.PI * i) / NS;
      const zeta = [z0[0] + a * Math.cos(t), z0[1] + a * Math.sin(t)];
      surf.push(cadd(zeta, cdiv([1, 0], zeta)));
    }
    const te = [2, 0];
    let le = surf[0];
    let best = 0;
    for (const p of surf) {
      const d = Math.hypot(p[0] - te[0], p[1] - te[1]);
      if (d > best) { best = d; le = p; }
    }
    const chord = best;
    const delta = Math.atan2(te[1] - le[1], te[0] - le[0]); // chord line tilt in the z plane
    const alpha = aoa + delta; // free-stream angle in the z plane
    const gamma = 4 * Math.PI * U * a * Math.sin(alpha + beta); // clockwise-positive
    const cl = (2 * gamma) / (U * chord);

    const ea = [Math.cos(-alpha), Math.sin(-alpha)];
    const eA = [Math.cos(alpha), Math.sin(alpha)];

    // dW/dzeta
    function dWdzeta(zeta) {
      const d = csub(zeta, z0);
      const d2 = cmul(d, d);
      const t1 = csub(ea, cscale(cdiv(eA, d2), a * a));
      const t2 = cdiv([0, gamma / (2 * Math.PI)], d);
      return cadd(cscale(t1, U), t2);
    }
    const dzdzeta = (zeta) => csub([1, 0], cdiv([1, 0], cmul(zeta, zeta)));

    // Velocity (u, v) at a point in the z plane; also whether it is inside the body.
    function velocity(x, y) {
      const z = [x, y];
      const s = csqrt(csub(cmul(z, z), [4, 0]));
      const z1 = cscale(cadd(z, s), 0.5);
      const z2 = cscale(csub(z, s), 0.5);
      // z = zeta + 1/zeta has two roots. Exactly one lies outside the circle when
      // z is outside the airfoil (the circle contains zeta = -1, so the map is
      // one-to-one outside it). Picking by |zeta| >= 1 would be wrong along the
      // rear underside, where the circle dips inside the unit circle.
      const d1 = cabs(csub(z1, z0));
      const d2 = cabs(csub(z2, z0));
      const zeta = d1 >= d2 ? z1 : z2;
      const inside = Math.max(d1, d2) < a;
      if (inside) return { u: 0, v: 0, cp: 1, inside: true };
      const w = cdiv(dWdzeta(zeta), dzdzeta(zeta)); // u - i v
      const u = w[0];
      const v = -w[1];
      return { u, v, cp: 1 - (u * u + v * v) / (U * U), inside: false };
    }

    // Surface samples going anticlockwise from the trailing edge.
    function surface(n) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const t = -beta + (2 * Math.PI * (i + 0.5)) / n;
        const zeta = [z0[0] + a * Math.cos(t), z0[1] + a * Math.sin(t)];
        const z = cadd(zeta, cdiv([1, 0], zeta));
        const w = cdiv(dWdzeta(zeta), dzdzeta(zeta));
        const sp2 = w[0] * w[0] + w[1] * w[1];
        out.push({ t, x: z[0], y: z[1], speed: Math.sqrt(sp2), cp: 1 - sp2 / (U * U) });
      }
      return out;
    }

    // Lift coefficient by integrating surface pressure (independent check).
    function cpLift(n) {
      const s = surface(n || 2000);
      let fx = 0;
      let fy = 0;
      for (let i = 0; i < s.length; i++) {
        const p = s[i];
        const q = s[(i + 1) % s.length];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const cpm = 0.5 * (p.cp + q.cp);
        // outward normal for an anticlockwise curve: (dy, -dx)
        fx += -cpm * dy;
        fy += cpm * dx;
      }
      // components perpendicular to the free stream
      const lift = -Math.sin(alpha) * fx + Math.cos(alpha) * fy;
      const drag = Math.cos(alpha) * fx + Math.sin(alpha) * fy;
      return { cl: lift / chord, cd: drag / chord };
    }

    // Front stagnation point on the circle.
    const thetaFront = Math.PI + 2 * alpha + beta;

    // Rotation into the chord-aligned screen frame: z_screen = z * e^{-i delta}
    const cd = Math.cos(delta);
    const sd = Math.sin(delta);
    const toScreen = (x, y) => [x * cd + y * sd, -x * sd + y * cd];
    const fromScreen = (x, y) => [x * cd - y * sd, x * sd + y * cd];
    function velocityScreen(x, y) {
      const p = fromScreen(x, y);
      const r = velocity(p[0], p[1]);
      const v = toScreen(r.u, r.v);
      return { u: v[0], v: v[1], cp: r.cp, inside: r.inside };
    }

    const bodyScreen = surf.map((p) => toScreen(p[0], p[1]));
    let tMax = -1e9;
    let tMin = 1e9;
    for (const p of bodyScreen) { tMax = Math.max(tMax, p[1]); tMin = Math.min(tMin, p[1]); }

    return {
      eps, kappa, U, aoa, a, beta, delta, alpha, chord, gamma, cl,
      thickness: (tMax - tMin) / chord,
      z0, velocity, velocityScreen, surface, cpLift, thetaFront, bodyScreen, toScreen, fromScreen,
      dWdzeta, dzdzeta,
    };
  }

  // Time for two tracers, released together straddling the dividing
  // streamline far upstream, to reach a station downstream of the trailing edge.
  function race(af, opts) {
    const o = Object.assign({ xStart: -3.6, xEnd: 3.4, sep: 0.03, dt: 0.004 }, opts);
    const V = (x, y) => af.velocityScreen(x, y);
    const rk = (p, dt) => {
      const k1 = V(p[0], p[1]);
      const k2 = V(p[0] + 0.5 * dt * k1.u, p[1] + 0.5 * dt * k1.v);
      const k3 = V(p[0] + 0.5 * dt * k2.u, p[1] + 0.5 * dt * k2.v);
      const k4 = V(p[0] + dt * k3.u, p[1] + dt * k3.v);
      return [
        p[0] + (dt / 6) * (k1.u + 2 * k2.u + 2 * k3.u + k4.u),
        p[1] + (dt / 6) * (k1.v + 2 * k2.v + 2 * k3.v + k4.v),
      ];
    };
    // Front stagnation point in the screen frame.
    const tf = af.thetaFront;
    const zeta = [af.z0[0] + af.a * Math.cos(tf), af.z0[1] + af.a * Math.sin(tf)];
    const zf = cadd(zeta, cdiv([1, 0], zeta));
    let sp = af.toScreen(zf[0], zf[1]);
    // Trace the dividing streamline backwards to x = xStart.
    let p = [sp[0] - 1e-3, sp[1]];
    let guard = 0;
    while (p[0] > o.xStart && guard++ < 20000) {
      const v = V(p[0], p[1]);
      const sp2 = Math.hypot(v.u, v.v) || 1;
      const h = Math.min(0.02, 0.01 / Math.max(sp2, 0.05)) * -1;
      p = rk(p, h);
    }
    const yS = p[1];
    const run = (y0) => {
      let q = [o.xStart, y0];
      let t = 0;
      const path = [[t, q[0], q[1]]];
      let n = 0;
      while (q[0] < o.xEnd && n++ < 60000) {
        const v = V(q[0], q[1]);
        const h = Math.min(o.dt * 3, o.dt / Math.max(0.15, Math.hypot(v.u, v.v)));
        q = rk(q, h);
        t += h;
        if (n % 4 === 0) path.push([t, q[0], q[1]]);
        const inside = V(q[0], q[1]).inside;
        if (inside) break;
      }
      path.push([t, q[0], q[1]]);
      return { t, path, y0 };
    };
    const top = run(yS + o.sep);
    const bottom = run(yS - o.sep);
    return { yS, top, bottom };
  }

  // Typical stall shape layered over the inviscid lift curve.
  const STALL_DEG = 15;
  function stallModel(af, aoaDeg) {
    const pot = (d) => {
      const alpha = (d * Math.PI) / 180 + af.delta;
      return (8 * Math.PI * af.a * Math.sin(alpha + af.beta)) / af.chord;
    };
    if (aoaDeg <= STALL_DEG) return { cl: pot(aoaDeg), stalled: false, pot: pot(aoaDeg) };
    const peak = pot(STALL_DEG);
    const drop = 1 - 0.32 * (1 - Math.exp(-(aoaDeg - STALL_DEG) / 2.5));
    return { cl: peak * drop, stalled: true, pot: pot(aoaDeg) };
  }

  const api = { make, race, stallModel, STALL_DEG };
  OM.airfoil = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
