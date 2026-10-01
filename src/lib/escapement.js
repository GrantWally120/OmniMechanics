/* Pendulum and deadbeat escapement.
 *
 * Two things live here.
 *
 * 1. The pendulum, with no small-angle shortcut: the exact period at any
 *    amplitude (through the arithmetic-geometric mean), and a simulation with
 *    air drag and the small push from the escapement once per swing.
 *
 * 2. The escapement geometry. A deadbeat (Graham) escapement has a 30-tooth wheel
 *    and two pallets that span 7.5 teeth. Each pallet has a locking face that is
 *    an arc around the anchor pivot (so the locked wheel pushes straight at the
 *    pivot and gives no push and no recoil) followed by an impulse face. The
 *    impulse face is found from the contact itself: it is the path of the tooth tip
 *    as seen from the anchor, so the drawing and the motion cannot disagree.
 *
 * Angles: radians, counter-clockwise positive, y up. The wheel turns clockwise.
 * The anchor angle theta is positive when the pendulum is to the right. */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const G_EARTH = 9.80665;

  // ------------------------------------------------------------ pendulum
  function agm(a, b) {
    for (let i = 0; i < 40; i++) {
      const an = (a + b) / 2, bn = Math.sqrt(a * b);
      a = an; b = bn;
      if (Math.abs(a - b) < 1e-15) break;
    }
    return a;
  }
  const period0 = (L, g) => TAU * Math.sqrt(L / g);
  // T(A) / T0 for any amplitude A (radians, < pi): 1 / AGM(1, cos(A/2)).
  const periodRatio = (amp) => 1 / agm(1, Math.cos(Math.min(amp, Math.PI - 1e-9) / 2));
  const period = (L, g, amp) => period0(L, g) * periodRatio(amp);
  const lengthForPeriod = (T, g) => g * (T / TAU) * (T / TAU);
  // Seconds lost per day by a clock regulated for a tiny swing but running at amplitude amp.
  const secondsLostPerDay = (amp) => 86400 * (1 - 1 / periodRatio(amp));

  // -------------------------------------------------------- escapement
  const TEETH = 30;
  const PITCH = TAU / TEETH;
  const HALF = PITCH / 2; // the wheel advances half a pitch per beat
  const DEFAULTS = { thetaI: 1.5 * DEG, drop: 1.5 * DEG, q: 60 };
  const LOCK_A = 135 * DEG; // tooth tip held by the entry pallet (left)
  const LOCK_B = 45 * DEG; // tooth tip held by the exit pallet (right)
  const W = { x: 0, y: 0 };
  const PIV = { x: 0, y: Math.SQRT2 }; // where the two tangents to the wheel meet

  const tipAt = (a) => ({ x: Math.cos(a), y: Math.sin(a) });
  const rotAbout = (pt, c, th) => {
    const dx = pt.x - c.x, dy = pt.y - c.y, cs = Math.cos(th), sn = Math.sin(th);
    return { x: c.x + dx * cs - dy * sn, y: c.y + dx * sn + dy * cs };
  };
  // A point fixed on the anchor, at anchor angle theta, in world coordinates.
  const anchorToWorld = (q, th) => rotAbout(q, PIV, th);

  // Where the driven tooth tip is, as a function of the progress u (0..1) through its impulse.
  function tipDuringImpulse(pallet, u, p) {
    const a0 = pallet === 'left' ? LOCK_A : LOCK_B;
    return tipAt(a0 - u * (HALF - p.drop));
  }

  // Pallet face as a list of points fixed on the anchor, from deep in the lock arc
  // through the end of the impulse. thMax is the largest swing the lock must cover.
  function face(pallet, p, thMax, n) {
    p = Object.assign({}, DEFAULTS, p);
    n = n || 24;
    const sgn = pallet === 'left' ? 1 : -1; // the left pallet is locked for theta > +thetaI
    const lock = pallet === 'left' ? tipAt(LOCK_A) : tipAt(LOCK_B);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const th = sgn * (thMax - (thMax - p.thetaI) * (i / n));
      pts.push({ th, q: rotAbout(lock, PIV, -th), kind: 'lock' });
    }
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const th = sgn * (p.thetaI - 2 * p.thetaI * u);
      const tip = tipDuringImpulse(pallet, u, p);
      pts.push({ th, q: rotAbout(tip, PIV, -th), kind: 'impulse', u });
    }
    // unit normal into the pallet body: the tooth moves into it, so it points along the wheel's clockwise motion
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)].q, b = pts[Math.min(pts.length - 1, i + 1)].q;
      let tx = b.x - a.x, ty = b.y - a.y;
      const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      let nx = -ty, ny = tx;
      // the world direction the tooth is moving (clockwise) in the anchor frame at this theta
      const tipW = anchorToWorld(pts[i].q, pts[i].th);
      const ang = Math.atan2(tipW.y, tipW.x);
      const mv = rotAbout({ x: PIV.x + Math.sin(ang), y: PIV.y - Math.cos(ang) }, PIV, -pts[i].th);
      const mvx = mv.x - PIV.x, mvy = mv.y - PIV.y;
      if (nx * mvx + ny * mvy < 0) { nx = -nx; ny = -ny; }
      pts[i].n = { x: nx, y: ny };
    }
    return pts;
  }

  // ----------------------------------------------------- the running clock
  function create(L, g, p) {
    p = Object.assign({}, DEFAULTS, p);
    return {
      L, g, p,
      th: 0, w: 0, t: 0,
      side: 1, // +1: the wheel is held by the left pallet; -1: by the right
      beats: 0, u: 0, lag: 0,
      accIn: 0, accOut: 0, lastIn: 0, lastOut: 0,
      tick: 0, // seconds since the last beat
      ampPeak: 0, amp: 0,
    };
  }

  // Energy and drag are per unit m L^2, so the mass drops out of the motion.
  function accel(st, th, w, drive) {
    const w0 = Math.sqrt(st.g / st.L);
    let a = -(w0 * w0) * Math.sin(th) - (w0 / st.p.q) * w;
    if (Math.abs(th) < st.p.thetaI) a += -st.side * drive * w0 * w0;
    return a;
  }

  // Advance by dt (s) with drive d (push acceleration as a fraction of g / L).
  function step(st, dt, d) {
    const n = Math.max(1, Math.ceil(dt / 0.0005));
    const h = dt / n;
    const w0 = Math.sqrt(st.g / st.L);
    for (let i = 0; i < n; i++) {
      const th = st.th, w = st.w;
      const k1a = w, k1b = accel(st, th, w, d);
      const k2a = w + 0.5 * h * k1b, k2b = accel(st, th + 0.5 * h * k1a, k2a, d);
      const k3a = w + 0.5 * h * k2b, k3b = accel(st, th + 0.5 * h * k2a, k3a, d);
      const k4a = w + h * k3b, k4b = accel(st, th + h * k3a, k4a, d);
      st.th = th + (h / 6) * (k1a + 2 * k2a + 2 * k3a + k4a);
      st.w = w + (h / 6) * (k1b + 2 * k2b + 2 * k3b + k4b);
      st.t += h;
      st.tick += h;
      // work done by the drive and lost to drag, per unit m L^2
      if (Math.abs(st.th) < st.p.thetaI) st.accIn += -st.side * d * w0 * w0 * st.w * h;
      st.accOut += (w0 / st.p.q) * st.w * st.w * h;
      // the wheel: release, impulse, then the next tooth drops onto the other pallet
      if (st.side === 1 && st.th <= -st.p.thetaI) { st.side = -1; st.beats++; st.lag = st.p.drop; st.tick = 0; }
      else if (st.side === -1 && st.th >= st.p.thetaI) { st.side = 1; st.beats++; st.lag = st.p.drop; st.tick = 0; }
      st.u = st.side === 1
        ? Math.min(1, Math.max(0, (st.p.thetaI - st.th) / (2 * st.p.thetaI)))
        : Math.min(1, Math.max(0, (st.th + st.p.thetaI) / (2 * st.p.thetaI)));
      st.lag *= Math.exp(-h / 0.012);
      // swing turning point: record the amplitude and the energy books for that half swing
      if (w * st.w < 0 || (w === 0 && st.w !== 0)) {
        st.amp = Math.abs(st.th);
        st.lastIn = st.accIn; st.lastOut = st.accOut;
        st.accIn = 0; st.accOut = 0;
      }
    }
  }

  // Rotation of the escape wheel, clockwise, in radians.
  function wheelAngle(st) {
    return st.beats * HALF + st.u * (HALF - st.p.drop) - st.lag;
  }

  // Amplitude the drive would hold in the small-angle limit (radians).
  function steadyAmplitude(d, p) {
    p = Object.assign({}, DEFAULTS, p);
    return 2 * Math.sqrt((d * p.thetaI * p.q) / Math.PI);
  }
  // The drive that would hold a given small-angle amplitude.
  function driveFor(amp, p) {
    p = Object.assign({}, DEFAULTS, p);
    return (amp * amp * Math.PI) / (4 * p.thetaI * p.q);
  }

  // ------------------------------------------------------------ outlines
  // Shapes shared by the drawing and the clearance test. All in world units (wheel radius 1).
  const TOOTH = { root: 0.8, inner: 0.66, lead: -0.1, trail: 0.3 }; // angles in fractions of a pitch
  const STONE_T = 0.04; // pallet stone thickness
  const THMAX = 7 * DEG; // the largest swing the locking faces are cut for
  // Tooth i of the wheel, which has turned by phi, as a closed polygon.
  function toothPolygon(i, phi) {
    const a = LOCK_A + i * PITCH - phi;
    const pt = (r, da) => ({ x: r * Math.cos(a + da * PITCH), y: r * Math.sin(a + da * PITCH) });
    return [pt(TOOTH.inner, -TOOTH.lead), pt(TOOTH.root, -TOOTH.lead), pt(1, 0), pt(TOOTH.root, TOOTH.trail), pt(TOOTH.inner, TOOTH.trail)];
  }
  // A pallet stone, fixed on the anchor: the working face (locking arc, then impulse face)
  // and a straight back of the given thickness.
  function stonePolygon(pallet, thickness, p, thMax) {
    thickness = thickness == null ? STONE_T : thickness;
    const f = face(pallet, p, thMax == null ? THMAX : thMax, 28);
    const nb = f[1].n;
    const pts = f.map((q) => ({ x: q.q.x, y: q.q.y }));
    const last = f[f.length - 1].q, first = f[0].q;
    pts.push({ x: last.x + nb.x * thickness, y: last.y + nb.y * thickness });
    pts.push({ x: first.x + nb.x * thickness, y: first.y + nb.y * thickness });
    return pts;
  }

  const api = {
    TAU, DEG, G_EARTH, TEETH, PITCH, HALF, DEFAULTS, LOCK_A, LOCK_B, W, PIV, TOOTH, STONE_T, THMAX,
    agm, period0, periodRatio, period, lengthForPeriod, secondsLostPerDay,
    tipAt, rotAbout, anchorToWorld, tipDuringImpulse, face, toothPolygon, stonePolygon,
    create, step, wheelAngle, steadyAmplitude, driveFor,
  };
  OM.escapement = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
