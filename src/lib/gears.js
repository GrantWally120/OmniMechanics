/* Involute spur gears (module = 1, 20 degree pressure angle).
 *
 * Tooth outlines are true involutes, so meshing gears at the correct centre
 * distance roll without overlap. meshAngle() gives the exact rotation of a
 * driven gear from its driver so the teeth always interleave.
 */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  const PA = (20 * Math.PI) / 180;
  const inv = (a) => Math.tan(a) - a;
  const INV_PA = inv(PA);
  const ADD = 1; // addendum (module)
  const DED = 1.25; // dedendum (module)

  // Half of the angular thickness of one tooth at radius rho.
  function halfAngle(N, rho) {
    const r = N / 2;
    const rb = r * Math.cos(PA);
    const c = rho <= rb ? 1 : rb / rho;
    const phi = Math.acos(Math.min(1, Math.max(-1, c)));
    return Math.PI / (2 * N) + INV_PA - inv(phi);
  }

  const cache = new Map();

  // Closed outline of a gear with N teeth, tooth 0 centred on angle 0.
  // Returns {pts: [[x,y],...], pitchR, tipR, rootR}
  function outline(N) {
    if (cache.has(N)) return cache.get(N);
    const r = N / 2;
    const rr = r - DED;
    const ra = r + ADD;
    const rb = r * Math.cos(PA);
    const pitch = (2 * Math.PI) / N;
    const flank = [];
    const S = 7;
    const r0 = Math.max(rr, rb);
    for (let i = 0; i <= S; i++) flank.push(r0 + ((ra - r0) * i) / S);
    const pts = [];
    for (let k = 0; k < N; k++) {
      const c = k * pitch;
      const add = (rho, ang) => pts.push([rho * Math.cos(c + ang), rho * Math.sin(c + ang)]);
      // root, then up the leading flank
      add(rr, -halfAngle(N, r0));
      for (let i = 0; i <= S; i++) add(flank[i], -halfAngle(N, flank[i]));
      const ht = halfAngle(N, ra);
      add(ra, -ht * 0.34);
      add(ra, ht * 0.34);
      for (let i = S; i >= 0; i--) add(flank[i], halfAngle(N, flank[i]));
      add(rr, halfAngle(N, r0));
      // root land to the next tooth
      const gapStart = c + halfAngle(N, r0);
      const gapEnd = c + pitch - halfAngle(N, r0);
      for (let j = 1; j <= 2; j++) {
        const a = gapStart + ((gapEnd - gapStart) * j) / 3;
        pts.push([rr * Math.cos(a), rr * Math.sin(a)]);
      }
    }
    const res = { pts, pitchR: r, tipR: ra, rootR: rr, baseR: rb, N };
    cache.set(N, res);
    return res;
  }

  // Rotation (radians) of a driven gear b, meshing with driver a whose centre
  // lies at angle alpha (radians) as seen from b's centre looking to a... see
  // derivation: N_a (alpha - th_a) + N_b (alpha + pi - th_b) = pi (mod 2 pi).
  function meshAngle(thA, alpha, Na, Nb) {
    return alpha + Math.PI - Math.PI / Nb + (Na / Nb) * (alpha - thA);
  }

  // Gear train from a list of meshes: each stage is {drive: N, driven: N}.
  // Compound stages share a shaft, so the driven gear of one mesh turns with
  // the driver of the next.
  function ratio(stages) {
    let i = 1;
    for (const s of stages) i *= s.driven / s.drive;
    return i;
  }

  const MESH_EFF = 0.98;
  function analyse(stages, rpmIn, torqueIn) {
    const i = ratio(stages);
    const eta = Math.pow(MESH_EFF, stages.length);
    const wIn = (rpmIn * 2 * Math.PI) / 60;
    const wOut = wIn / i;
    const tOut = torqueIn * i * eta;
    return {
      ratio: i,
      eta,
      rpmOut: rpmIn / i,
      torqueOut: tOut,
      pIn: torqueIn * wIn,
      pOut: tOut * wOut,
      reversed: stages.length % 2 === 1,
    };
  }

  const api = { PA, halfAngle, outline, meshAngle, ratio, analyse, MESH_EFF, ADD, DED };
  OM.gears = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
