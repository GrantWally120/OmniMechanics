/* Cam and follower.
 *
 * A cam turns at a steady speed and an in-line roller follower rides on it.
 * The follower program is: rise (beta), dwell at the top, fall (beta), dwell
 * at the bottom. Three classic laws describe the rise and fall. Everything is
 * in SI units (metres, kilograms, newtons, radians).
 *
 * Geometry. The roller centre moves on the pitch curve, radius Rp = Rb + Rr + y.
 * The cam outline is that curve pushed inward by the roller radius Rr, along
 * the curve normal. If the pitch curve bends more sharply than the roller
 * (radius of curvature below Rr) the outline develops cusps: the cam is
 * "undercut" and cannot be cut that way.
 *
 * Forces. The spring pushes the follower onto the cam, so the cam can only
 * push. The contact force is
 *     N = m y'' + F0 + k y + m g
 * and when that would go negative the follower leaves the cam ("float").
 * advance() integrates the follower through free flight and landings. */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});
  const TAU = Math.PI * 2;
  const G = 9.80665;
  const DWELL_TOP = (30 * Math.PI) / 180;
  const MAX_DT = 2e-5;

  // Unit laws on s in [0,1]: position f, then d/ds and d2/ds2.
  const LAWS = {
    cycloidal: (s) => ({ f: s - Math.sin(TAU * s) / TAU, d: 1 - Math.cos(TAU * s), dd: TAU * Math.sin(TAU * s) }),
    harmonic: (s) => ({ f: (1 - Math.cos(Math.PI * s)) / 2, d: (Math.PI / 2) * Math.sin(Math.PI * s), dd: ((Math.PI * Math.PI) / 2) * Math.cos(Math.PI * s) }),
    parabolic: (s) => (s < 0.5
      ? { f: 2 * s * s, d: 4 * s, dd: 4 }
      : { f: 1 - 2 * (1 - s) * (1 - s), d: 4 * (1 - s), dd: -4 }),
  };
  // Peak acceleration coefficient: a_max = C h / beta^2 (per rad^2).
  const COEF = { cycloidal: TAU, harmonic: (Math.PI * Math.PI) / 2, parabolic: 4 };

  const wrap = (a) => { const t = a % TAU; return t < 0 ? t + TAU : t; };

  // p = { lift, rise, law, rb, rr, mass, k, preload, dwell? }
  function dwellTop(p) { return p.dwell == null ? DWELL_TOP : p.dwell; }

  // Follower lift and its first two derivatives with respect to cam angle theta.
  function motion(p, theta) {
    const th = wrap(theta);
    const b = p.rise;
    const law = LAWS[p.law];
    if (th < b) {
      const r = law(th / b);
      return { y: p.lift * r.f, dy: (p.lift * r.d) / b, ddy: (p.lift * r.dd) / (b * b) };
    }
    const t1 = b + dwellTop(p);
    if (th < t1) return { y: p.lift, dy: 0, ddy: 0 };
    if (th < t1 + b) {
      const r = law(1 - (th - t1) / b);
      return { y: p.lift * r.f, dy: (-p.lift * r.d) / b, ddy: (p.lift * r.dd) / (b * b) };
    }
    return { y: 0, dy: 0, ddy: 0 };
  }

  // 0 bottom dwell, 1 rise, 2 top dwell, 3 fall.
  function phaseAt(p, theta) {
    const th = wrap(theta);
    const b = p.rise;
    const t1 = b + dwellTop(p);
    if (th < b) return 1;
    if (th < t1) return 2;
    if (th < t1 + b) return 3;
    return 0;
  }

  function bottomDwell(p) { return TAU - 2 * p.rise - dwellTop(p); }

  function pressureAngle(p, theta) {
    const m = motion(p, theta);
    return Math.atan2(Math.abs(m.dy), p.rb + p.rr + m.y);
  }

  // Force between cam and follower at cam speed omega (rad/s).
  function contactForce(p, theta, omega) {
    const m = motion(p, theta);
    return p.mass * m.ddy * omega * omega + p.preload + p.k * m.y + p.mass * G;
  }

  const SAMPLES = 1440;

  // Peak values over one revolution and the speed at which the follower floats.
  function analyse(p, n) {
    n = n || SAMPLES;
    let vmax = 0, amax = 0, phimax = 0, ratio = Infinity;
    for (let i = 0; i < n; i++) {
      const th = (i / n) * TAU;
      const m = motion(p, th);
      vmax = Math.max(vmax, Math.abs(m.dy));
      amax = Math.max(amax, Math.abs(m.ddy));
      phimax = Math.max(phimax, Math.atan2(Math.abs(m.dy), p.rb + p.rr + m.y));
      if (m.ddy < -1e-12) ratio = Math.min(ratio, (p.preload + p.k * m.y + p.mass * G) / (p.mass * -m.ddy));
    }
    const omega = Math.sqrt(ratio);
    return {
      vmax, amax, phimax,
      floatOmega: omega,
      floatRpm: (omega * 60) / TAU,
    };
  }

  // Geometry at cam-frame angle psi, measured clockwise from "up" with x, y on
  // canvas axes (y points down): the pitch point, the matching cam surface point
  // and the outward normal. The roller centre sits at psi = -theta.
  function surface(p, psi) {
    const m = motion(p, -psi);
    const P = p.rb + p.rr + m.y;
    const dP = -m.dy;
    const ddP = m.ddy;
    const sx = Math.sin(psi), sy = -Math.cos(psi); // radial direction
    const tx = Math.cos(psi), ty = Math.sin(psi);  // direction of increasing psi
    const len = Math.hypot(P, dP);
    const nx = (P * sx - dP * tx) / len;
    const ny = (P * sy - dP * ty) / len;
    const den = P * P + 2 * dP * dP - P * ddP;
    return {
      pitch: { x: P * sx, y: P * sy },
      cam: { x: P * sx - p.rr * nx, y: P * sy - p.rr * ny },
      nx, ny,
      rho: den > 1e-12 ? Math.pow(P * P + dP * dP, 1.5) / den : Infinity, // convex points only
    };
  }

  // The whole pitch curve and cam outline, plus the tightest bend (for undercut).
  function outline(p, n) {
    n = n || 720;
    const pitch = [], out = [];
    let minRho = Infinity;
    for (let i = 0; i < n; i++) {
      const s = surface(p, (i / n) * TAU);
      pitch.push(s.pitch);
      out.push(s.cam);
      minRho = Math.min(minRho, s.rho);
    }
    return { pitch, cam: out, minRho, undercut: minRho < p.rr - 1e-9 };
  }

  // ---------------------------------------------------------------- follower
  function createFollower(p, theta, omega) {
    const m = motion(p, theta);
    const w = omega || 0;
    return {
      y: m.y, v: m.dy * w, contact: true,
      N: p.mass * m.ddy * w * w + p.preload + p.k * m.y + p.mass * G,
      impact: 0, floating: false,
    };
  }

  // Advance the cam by dtheta (>= 0) at steady speed omega, starting at angle
  // theta. Returns the new cam angle. Integrates the follower in small steps of
  // real time: in contact it follows the cam, otherwise it flies on the spring.
  function advance(st, p, theta, dtheta, omega) {
    if (!(omega > 0) || !(dtheta > 0)) return theta;
    const dt = dtheta / omega;
    const n = Math.min(4000, Math.max(1, Math.ceil(dt / MAX_DT)));
    const h = dt / n;
    let th = theta;
    for (let i = 0; i < n; i++) {
      th += omega * h;
      const m = motion(p, th);
      const yc = m.y, vc = m.dy * omega, ac = m.ddy * omega * omega;
      if (st.contact) {
        const N = p.mass * ac + p.preload + p.k * yc + p.mass * G;
        if (N >= 0) { st.y = yc; st.v = vc; st.N = N; continue; }
        st.contact = false;
      }
      // Free flight on the spring. Position is advanced with the same second-order
      // rule the cam's own motion obeys, so the gap opens smoothly at release.
      const a = -(p.preload + p.k * st.y + p.mass * G) / p.mass;
      st.y += st.v * h + 0.5 * a * h * h;
      st.v += a * h;
      st.N = 0;
      // Lands when it reaches the surface while moving toward it, or if it has been
      // pushed a visible amount into it. (The velocity test stops rounding noise from
      // causing a false landing at the instant of release.)
      if (st.y <= yc && (st.v <= vc || st.y < yc - 5e-7)) {
        st.impact = Math.max(0, st.v < vc ? vc - st.v : 0);
        st.y = yc; st.v = vc; st.contact = true;
        st.N = p.mass * ac + p.preload + p.k * yc + p.mass * G;
      }
    }
    st.floating = !st.contact;
    return th;
  }

  const api = { TAU, G, DWELL_TOP, LAWS: Object.keys(LAWS), COEF, motion, phaseAt, bottomDwell, pressureAngle, contactForce, analyse, surface, outline, createFollower, advance, wrap };
  OM.cam = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
