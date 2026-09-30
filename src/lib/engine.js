/* Four-stroke spark-ignition engine model (one cylinder).
 *
 * Geometry: 86 mm bore, 86 mm stroke, 140 mm rod = 0.5 litre.
 * Cylinder pressure comes from a single-zone model: adiabatic compression and
 * expansion (gamma = 1.30) plus a Wiebe heat-release curve, followed by an
 * exhaust blowdown and near-constant pressure during intake and exhaust.
 * It is a teaching model, not a calibrated engine simulation.
 *
 * Angles: phi is the 720 degree cycle angle. phi = 0 is top dead centre (TDC)
 * at the start of the intake stroke, 360 is TDC on the firing stroke.
 */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  const DEG = Math.PI / 180;
  const GEO = { bore: 0.086, r: 0.043, l: 0.140 };
  GEO.area = (Math.PI / 4) * GEO.bore * GEO.bore;
  GEO.stroke = 2 * GEO.r;
  GEO.Vd = GEO.area * GEO.stroke;

  const GAMMA = 1.3;
  const STEP = 0.5; // degrees per table sample
  const N = 720 / STEP;
  const Q_FACTOR = 3.4; // heat added, as a multiple of end-of-compression pressure
  const IGN_DELAY = 8; // degrees between spark and start of measurable heat release
  const BURN_DUR = 50; // degrees for the main burn

  const TIMINGS = {
    textbook: { ivo: 0, ivc: 180, evo: 540, evc: 0 },
    real: { ivo: 710, ivc: 220, evo: 490, evc: 10 },
  };

  const mod = (a, m) => ((a % m) + m) % m;
  const span = (open, close) => mod(close - open, 720);
  function inWin(phi, open, close) {
    const s = span(open, close);
    return s > 0 && mod(phi - open, 720) < s;
  }
  function lift(phi, open, close) {
    const s = span(open, close);
    if (s === 0) return 0;
    const d = mod(phi - open, 720);
    if (d >= s) return 0;
    const x = Math.sin((Math.PI * d) / s);
    return x * x;
  }

  function pistonY(thetaDeg) {
    const t = thetaDeg * DEG;
    const s = GEO.r * Math.sin(t);
    return GEO.r * Math.cos(t) + Math.sqrt(GEO.l * GEO.l - s * s);
  }
  function volume(thetaDeg, cr) {
    const Vc = GEO.Vd / (cr - 1);
    return Vc + GEO.area * (GEO.r + GEO.l - pistonY(thetaDeg));
  }

  function wiebe(phi, soc, dur) {
    const u = (phi - soc) / dur;
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    return (1 - Math.exp(-5 * u * u * u)) / (1 - Math.exp(-5));
  }

  const smooth = (t) => t * t * (3 - 2 * t);

  function cycle(opts) {
    const o = Object.assign({ cr: 10, load: 1, spark: 25, timing: 'real' }, opts);
    const T = TIMINGS[o.timing] || TIMINGS.real;
    const Vc = GEO.Vd / (o.cr - 1);

    const V = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) V[i] = volume(mod(i * STEP, 360), o.cr);

    const pInt = (0.3 + 0.6 * o.load) * 1e5;
    const pExh = 1.1e5;
    const iIvc = Math.round(T.ivc / STEP);
    const iEvo = Math.round(T.evo / STEP);
    const soc = 360 - o.spark + IGN_DELAY;

    const Pref = pInt * Math.pow(V[iIvc] / Vc, GAMMA);
    const Qtot = (Q_FACTOR * Pref * Vc) / (GAMMA - 1);

    // Closed-valve integration from IVC to EVO.
    const Pc = new Float64Array(N + 1);
    const xb = new Float64Array(N + 1);
    Pc[iIvc] = pInt;
    for (let i = iIvc; i < iEvo; i++) {
      const x0 = wiebe(i * STEP, soc, BURN_DUR);
      const x1 = wiebe((i + 1) * STEP, soc, BURN_DUR);
      xb[i] = x0;
      xb[i + 1] = x1;
      const Vm = 0.5 * (V[i] + V[i + 1]);
      let P = Pc[i] * Math.pow(V[i] / V[i + 1], GAMMA);
      P += ((GAMMA - 1) * Qtot * (x1 - x0)) / Vm;
      Pc[i + 1] = P;
    }
    const Pevo = Pc[iEvo];

    const P = new Float64Array(N + 1);
    const ivLift = new Float64Array(N + 1);
    const evLift = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) {
      const phi = mod(i * STEP, 720);
      const ivOpen = inWin(phi, T.ivo, T.ivc);
      const evOpen = inWin(phi, T.evo, T.evc);
      ivLift[i] = lift(phi, T.ivo, T.ivc);
      evLift[i] = lift(phi, T.evo, T.evc);
      if (!ivOpen && !evOpen) {
        P[i] = i >= iIvc && i <= iEvo ? Pc[i] : pInt;
      } else if (evOpen && !ivOpen) {
        const d = mod(phi - T.evo, 720);
        P[i] = pExh + (Pevo - pExh) * Math.exp(-d / 12);
      } else if (ivOpen && !evOpen) {
        P[i] = pInt;
      } else {
        const t = mod(phi - T.ivo, 720) / span(T.ivo, T.evc);
        P[i] = pExh + (pInt - pExh) * smooth(Math.min(1, Math.max(0, t)));
      }
    }
    P[N] = P[0];

    // Light circular smoothing so valve events do not draw as vertical steps.
    const Ps = new Float64Array(N + 1);
    const W = 3;
    for (let pass = 0; pass < 2; pass++) {
      const src = pass === 0 ? P : Ps;
      const dst = pass === 0 ? Ps : P;
      for (let i = 0; i < N; i++) {
        let s = 0;
        for (let k = -W; k <= W; k++) s += src[(i + k + N) % N];
        dst[i] = s / (2 * W + 1);
      }
      dst[N] = dst[0];
    }

    // Work integrals.
    let Wnet = 0;
    let Wgross = 0;
    for (let i = 0; i < N; i++) {
      const dW = 0.5 * (P[i] + P[i + 1]) * (V[i + 1] - V[i]);
      Wnet += dW;
      if (i >= 360 && i < 1080) Wgross += dW; // 180..540 degrees
    }
    let pMax = 0;
    let phiPeak = 0;
    for (let i = iIvc; i <= iEvo; i++) {
      if (P[i] > pMax) {
        pMax = P[i];
        phiPeak = i * STEP;
      }
    }
    let ca50 = null;
    for (let i = iIvc; i < iEvo; i++) {
      if (xb[i] < 0.5 && xb[i + 1] >= 0.5) {
        ca50 = (i + (0.5 - xb[i]) / (xb[i + 1] - xb[i])) * STEP - 360;
        break;
      }
    }

    // Gas temperature estimate (ideal gas, fixed trapped mass after IVC).
    const T0 = 320;
    const Tg = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) {
      if (i >= iIvc && i <= iEvo) Tg[i] = (T0 * P[i] * V[i]) / (pInt * V[iIvc]);
      else if (evLift[i] > 0 || (i > iEvo && i * STEP < 720)) Tg[i] = 900;
      else Tg[i] = T0;
    }

    return {
      opts: o, timing: T, N, STEP, V, P, xb, Tg, ivLift, evLift,
      iIvc, iEvo, pInt, pExh, Vc, soc,
      stats: {
        pMaxBar: pMax / 1e5,
        phiPeak,
        peakAtdc: phiPeak - 360,
        ca50,
        imepNet: Wnet / GEO.Vd / 1e5,
        imepGross: Wgross / GEO.Vd / 1e5,
        imepPump: (Wnet - Wgross) / GEO.Vd / 1e5,
        workNetJ: Wnet,
        tMax: Math.max.apply(null, Array.prototype.slice.call(Tg, iIvc, iEvo + 1)),
      },
    };
  }

  function powerKw(res, rpm) {
    return (res.stats.workNetJ * (rpm / 60)) / 2 / 1000;
  }

  // Interpolated state at cycle angle phi (degrees).
  function at(res, phi) {
    const p = mod(phi, 720) / STEP;
    const i = Math.floor(p);
    const f = p - i;
    const j = i + 1;
    const l = (a) => a[i] + (a[j] - a[i]) * f;
    return {
      phi: mod(phi, 720),
      theta: mod(phi, 360),
      P: l(res.P), V: l(res.V), xb: l(res.xb), T: l(res.Tg),
      iv: l(res.ivLift), ev: l(res.evLift),
      stroke: Math.floor(mod(phi, 720) / 180),
    };
  }

  const api = { GEO, GAMMA, TIMINGS, STEP, N, pistonY, volume, cycle, at, powerKw, mod, inWin };
  OM.engine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
