(function (root) {
  'use strict';
  const OM = root.OM;
  const Gp = OM.gps;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, alpha } = OM.gfx;

  const SATS = [{ x: -9.5, y: 9.5 }, { x: 10.5, y: 8.5 }, { x: 1, y: -11.5 }, { x: 12.5, y: -5 }];
  const NOISE = [0.6, -0.9, 0.45, -0.25];

  OM.register({
    id: 'gps',
    title: 'GPS',
    group: 'signals',
    hook: 'A stopwatch race. Distances from satellites pin you down, and your own clock error is the extra unknown that needs one more satellite.',
    units: 'map units (1 unit ≈ 100 m)',
    alt: 'A flat map with three or four satellites, a circle around each showing its measured distance, a draggable receiver, and a table of the solver steps that converge on the receiver position and clock error.',
    controls: [
      { id: 'n', type: 'seg', label: 'Satellites in view', value: 3, options: [{ v: 2, l: '2' }, { v: 3, l: '3' }, { v: 4, l: '4' }] },
      { id: 'bias', type: 'range', label: 'Receiver clock error', min: -4, max: 4, step: 0.1, value: 1.5, dec: 1, unit: 'units', hint: 'Shown as extra distance. In real GPS one microsecond of clock error is about 300 m.' },
      { id: 'noise', type: 'range', label: 'Measurement noise', min: 0, max: 0.8, step: 0.05, value: 0, dec: 2, unit: 'units' },
      { id: 'mode', type: 'seg', label: 'Receiver', value: 'solve', options: [{ v: 'raw', l: 'Ignores its clock error' }, { v: 'solve', l: 'Solves for it' }] },
      { id: 'replay', type: 'button', label: 'Replay the solver', playOnClick: true },
    ],
    content: {
      intro: 'GPS is a stopwatch race. Each satellite says when it sent its signal, your receiver measures how long it took to arrive, and the distance is that time multiplied by the speed of light. Enough distances pin you down, once you also solve for your own clock error.',
      steps: [
        { h: 'One satellite: a circle', p: 'A single distance puts you somewhere on a circle around that satellite, and you cannot tell where.' },
        { h: 'Two: two places', p: 'Two circles cross in two points. You are at one of them.' },
        { h: 'Three: one point', p: 'A third circle picks out the point, provided your clock was perfect. Drag the receiver and watch the circles follow.' },
        { h: 'The clock is never perfect', p: 'A clock error adds the same extra distance to every measurement, so the circles stop meeting at one point. The receiver treats the clock error as one more unknown and finds the one offset that makes all the circles meet. That is why it needs one more satellite than dimensions: three here, four in the real 3D world.' },
      ],
      principle: {
        lead: 'Every measured distance is the true distance plus the same clock error. Three measurements give three equations for three unknowns: your x, your y and the clock error.',
        eqs: [
          { label: 'Measured (pseudo) range', eq: 'ρ~i~ = | r − s~i~ | + c b', note: 's~i~ is satellite i, r is you, and c b is the clock error turned into a distance.' },
          { label: 'Unknowns and equations', eq: 'x, y, b  →  at least 3 satellites', note: 'In 3D it is x, y, z and b, so at least 4.' },
          { label: 'Solving', eq: 'Δ = (HᵀH)⁻¹ Hᵀ (ρ − ρ̂)', note: 'Gauss–Newton: guess, see how wrong the ranges are, correct the guess, repeat. The table shows the steps.' },
        ],
        points: [
          'Light travels 0.3 m in a nanosecond, so a receiver clock 100 ns out is 30 m out. That is why the clock has to be solved for and cannot simply be trusted.',
          'Real satellite signals take about 70 milliseconds to arrive. The satellites carry atomic clocks and run 38 microseconds a day fast because of relativity, which would add up to 11 km of error a day if engineers did not correct for it.',
          'The spread of the satellites matters. If they are bunched together the circles cross at shallow angles and the answer is uncertain. The solver reports this as the geometry factor (PDOP).',
          '**What this model leaves out:** the third dimension, the atmosphere, satellite orbits moving and signal bounces from buildings. The numbers here are in map units.',
        ],
      },
      myth: {
        claim: 'GPS satellites track your phone and tell it where it is.',
        truth: 'Satellites only broadcast. They do not know your phone exists. Your receiver listens to several of them and works out its own position, which is why GPS works in airplane mode and with no data connection.',
      },
      tries: [
        { label: 'Perfect clock', text: 'With no clock error the three circles meet at one point.', set: { n: 3, bias: 0, noise: 0, mode: 'raw' } },
        { label: 'Ignore the clock', text: 'A 2.5 unit clock error, and a receiver that does not allow for it.', set: { n: 3, bias: 2.5, noise: 0, mode: 'raw' } },
        { label: 'Solve for it', text: 'The same error, but now the receiver finds the clock error and the circles meet again.', set: { n: 3, bias: 2.5, noise: 0, mode: 'solve' }, action: 'replay', play: true },
        { label: 'Noisy ranges', text: 'Real measurements are never exact. More satellites average the noise down.', set: { n: 4, bias: 1.5, noise: 0.5, mode: 'solve' }, action: 'replay', play: true },
        { label: 'Only two satellites', text: 'Not enough for x, y and the clock.', set: { n: 2, bias: 1.5, noise: 0 } },
      ],
      quiz: [
        { q: 'How does a GPS receiver find its distance from a satellite?', opts: ['The satellite measures it and sends it', 'Time the signal took to arrive multiplied by the speed of light', 'From the phone signal strength', 'By comparing the satellite’s height'], a: 1, why: 'The signal says when it was sent. The receiver notes when it arrives, and the difference times c is the distance.' },
        { q: 'Why does a GPS receiver need four satellites in the real 3D world, not just three?', opts: ['Three satellites cannot be seen at once', 'There is a fourth unknown, the receiver’s own clock error', 'To check the other three', 'To get the altitude only'], a: 1, why: 'The unknowns are x, y, z and the clock error. Four unknowns need four equations.' },
        { q: 'Do GPS satellites know where your phone is?', opts: ['Yes, they track every phone', 'Only when the phone has data', 'No, they only broadcast and the receiver works out its own position', 'Only when you press navigate'], a: 2, why: 'It is one-way. That is why GPS works without any connection and why millions of receivers can use it at once.' },
      ],
      era: '1978 to 1995',
      level: 4,
      parts: [
        { name: 'Satellites', note: 'At least 24 of them, each broadcasting its position and the time from an atomic clock.' },
        { name: 'Receiver', note: 'Measures how long each signal took to arrive.' },
        { name: 'Pseudorange', note: 'The distance worked out from that time, which is wrong by the receiver clock error.' },
        { name: 'Ground stations', note: 'Track the satellites and send up corrections.' },
      ],
      facts: [
        'The first GPS satellite was launched on 22 February 1978. The system was declared fully operational in 1995, when 24 satellites were in orbit.',
        'GPS satellite clocks run about 38 microseconds a day faster than clocks on the ground: 45 from weaker gravity, minus 7 from their speed. Left uncorrected, positions would drift by about 10 km a day.',
        'A receiver needs four satellites because there are four unknowns: the three coordinates of its position and the error of its own clock.',
      ],
      sources: [
        'E. D. Kaplan and C. J. Hegarty (eds.), *Understanding GPS/GNSS: Principles and Applications*, Artech House (3rd edition, 2017).',
        'N. Ashby, “Relativity in the Global Positioning System”, *Living Reviews in Relativity* 6 (2003).',
      ],
    },

    create(host) {
      const st = { pos: { x: 3, y: -1 }, k: 0, key: '', sol: null, raw: null, rho: [], sats: [], drag: false };
      let L = null;

      function solve() {
        const c = host.ctl;
        const key = [st.pos.x.toFixed(3), st.pos.y.toFixed(3), c.n, c.bias, c.noise].join('|');
        if (key === st.key) return;
        st.key = key;
        st.sats = SATS.slice(0, c.n);
        st.rho = Gp.pseudoranges(st.sats, st.pos, c.bias, st.sats.map((_, i) => NOISE[i] * c.noise));
        st.sol = Gp.solve(st.sats, st.rho);
        st.raw = Gp.solveXY(st.sats, st.rho);
        st.k = 0;
      }
      const errOf = (p) => (p ? Math.hypot(p.x - st.pos.x, p.y - st.pos.y) : NaN);

      const sim = {
        ref: { w: 780, h: 470 },
        refNarrow: { w: 420, h: 760 },
        state: st,
        drag: 'both',
        init() { st.key = ''; st.k = 0; solve(); },
        layout(V) {
          L = V.narrow
            ? { map: { x: 8, y: 6, w: 404, h: 404, s: 13.4 }, tab: { x: 14, y: 430, w: 392 }, facts: { x: 14, y: 620 } }
            : { map: { x: 8, y: 8, w: 470, h: 454, s: 15.6 }, tab: { x: 498, y: 16, w: 274 }, facts: { x: 498, y: 268 } };
        },
        step(dt) { solve(); if (st.sol && st.sol.ok) st.k = Math.min(st.sol.path.length - 1, st.k + dt * 1.1); },
        thumb() { solve(); st.k = 99; },
        action(id) { if (id === 'replay') st.k = 0; },
        pointer(type, x, y) {
          const M = L.map;
          const wx = (x - (M.x + M.w / 2)) / M.s, wy = -(y - (M.y + M.h / 2)) / M.s;
          if (type === 'down') {
            if (Math.hypot(wx - st.pos.x, wy - st.pos.y) * M.s > 26) return false;
            st.drag = true; return true;
          }
          if (type === 'move' && st.drag) { st.pos.x = clamp(wx, -8, 8); st.pos.y = clamp(wy, -8, 8); solve(); }
          if (type === 'up') st.drag = false;
          return true;
        },
        cursor(x, y) {
          const M = L.map;
          const wx = (x - (M.x + M.w / 2)) / M.s, wy = -(y - (M.y + M.h / 2)) / M.s;
          return Math.hypot(wx - st.pos.x, wy - st.pos.y) * M.s < 26 ? 'grab' : '';
        },
        key(k) {
          const d = { ArrowLeft: [-0.5, 0], ArrowRight: [0.5, 0], ArrowUp: [0, 0.5], ArrowDown: [0, -0.5] }[k];
          if (!d) return false;
          st.pos.x = clamp(st.pos.x + d[0], -8, 8); st.pos.y = clamp(st.pos.y + d[1], -8, 8); solve();
          return true;
        },
        readouts() {
          solve();
          const ok = st.sol && st.sol.ok;
          return [
            { k: 'Satellites', v: String(host.ctl.n) },
            { k: 'True clock error', v: fmt(host.ctl.bias, 1) + ' units' },
            { k: 'Receiver finds', v: ok ? fmt(st.sol.b, 2) + ' units' : 'cannot solve', tone: ok ? 'good' : 'bad' },
            { k: 'Off if clock ignored', v: fmt(errOf(st.raw), 2) + ' units', tone: errOf(st.raw) > 0.3 ? 'warn' : 'good' },
            { k: 'Off after solving', v: ok ? fmt(errOf(st.sol), 2) + ' units' : '–', tone: ok && errOf(st.sol) < 0.3 ? 'good' : '' },
            { k: 'Solver steps', v: ok ? String(st.sol.path.length - 1) : '–' },
            { k: 'Geometry (PDOP)', v: ok ? fmt(st.sol.pdop, 1) : '–', tone: ok && st.sol.pdop > 4 ? 'warn' : '' },
          ];
        },
        caption() {
          solve();
          if (host.ctl.n < 3) return 'Not enough satellites';
          return host.ctl.mode === 'solve' ? (st.sol.ok && st.k < st.sol.path.length - 1 ? 'Solver working…' : 'Circles meet') : 'Clock error ignored';
        },
        describe() { solve(); return host.ctl.n < 3 ? 'Only two satellites. Not enough to find a position and the clock error.' : 'Position error ' + fmt(errOf(host.ctl.mode === 'solve' ? st.sol : st.raw), 2) + ' units.'; },

        draw(g, V, c) {
          solve();
          const M = L.map;
          const cx = M.x + M.w / 2, cy = M.y + M.h / 2;
          const X = (u) => cx + u * M.s, Y = (v) => cy - v * M.s;
          g.save();
          g.beginPath(); g.rect(M.x, M.y, M.w, M.h); g.clip();
          g.fillStyle = alpha(c.paper2, 0.9); g.fillRect(M.x, M.y, M.w, M.h);
          for (let u = -14; u <= 14; u += 2) {
            line(g, V, X(u), M.y, X(u), M.y + M.h, alpha(c.ink, u === 0 ? 0.3 : 0.1), 1);
            line(g, V, M.x, Y(u), M.x + M.w, Y(u), alpha(c.ink, u === 0 ? 0.3 : 0.1), 1);
          }
          const ok = st.sol && st.sol.ok;
          const solve_ = host.ctl.mode === 'solve' && ok;
          // the solver path and the current estimate
          let est = null, bk = 0;
          if (solve_) {
            const pth = st.sol.path;
            const kk = Math.min(pth.length - 1, st.k);
            const k0 = Math.floor(kk), k1 = Math.min(pth.length - 1, k0 + 1), f = kk - k0;
            est = { x: pth[k0].x + (pth[k1].x - pth[k0].x) * f, y: pth[k0].y + (pth[k1].y - pth[k0].y) * f };
            bk = pth[k0].b + (pth[k1].b - pth[k0].b) * f;
          }
          // circles
          st.sats.forEach((s, i) => {
            const rawR = st.rho[i] * M.s;
            g.setLineDash([V.px(5), V.px(4)]); g.strokeStyle = alpha(c.cold, solve_ ? 0.45 : 0.95); g.lineWidth = V.px(solve_ ? 1.3 : 2.4);
            g.beginPath(); g.arc(X(s.x), Y(s.y), rawR, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
            if (solve_) {
              const r2 = Math.max(0, st.rho[i] - bk) * M.s;
              g.strokeStyle = c.elec; g.lineWidth = V.px(2.6);
              g.beginPath(); g.arc(X(s.x), Y(s.y), r2, 0, Math.PI * 2); g.stroke();
            }
          });
          g.restore();
          // satellites
          st.sats.forEach((s, i) => {
            const x = X(s.x), y = Y(s.y), r = V.px(9);
            g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath();
            g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
            text(g, V, 'S' + (i + 1), x, y - V.px(14), { px: 12, weight: 800, align: 'center' });
          });
          // the raw estimate that ignores the clock
          if (st.raw && !solve_ && host.ctl.n >= 2) {
            const ex = X(st.raw.x), ey = Y(st.raw.y);
            line(g, V, X(st.pos.x), Y(st.pos.y), ex, ey, c.bad, 1.6, [4, 3]);
            g.strokeStyle = c.bad; g.lineWidth = V.px(2.6);
            g.beginPath(); g.moveTo(ex - V.px(7), ey - V.px(7)); g.lineTo(ex + V.px(7), ey + V.px(7)); g.moveTo(ex + V.px(7), ey - V.px(7)); g.lineTo(ex - V.px(7), ey + V.px(7)); g.stroke();
            text(g, V, 'thinks it is here', ex + V.px(10), ey - V.px(8), { px: 11, weight: 800, color: c.bad });
          }
          if (est) {
            const ex = X(est.x), ey = Y(est.y);
            g.beginPath(); g.arc(ex, ey, V.px(8), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
            line(g, V, ex - V.px(14), ey, ex + V.px(14), ey, c.ink, 1.3); line(g, V, ex, ey - V.px(14), ex, ey + V.px(14), c.ink, 1.3);
            text(g, V, 'receiver’s estimate', ex + V.px(14), ey - V.px(12), { px: 11, weight: 800 });
          }
          // the true receiver
          g.beginPath(); g.arc(X(st.pos.x), Y(st.pos.y), V.px(7), 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2.6); g.stroke();
          g.beginPath(); g.arc(X(st.pos.x), Y(st.pos.y), V.px(2.6), 0, Math.PI * 2); g.fillStyle = c.ink; g.fill();
          text(g, V, 'you (drag me)', X(st.pos.x) - V.px(12), Y(st.pos.y) + V.px(24), { px: 11, weight: 700, align: 'right' });
          g.strokeStyle = c.ink; g.lineWidth = V.px(1.5); g.strokeRect(M.x, M.y, M.w, M.h);
          if (host.ctl.n < 3) text(g, V, 'Two circles meet in two places, and the clock error is unknown.', cx, M.y + M.h - 14, { px: 12, weight: 800, align: 'center', color: c.bad });
          if (V.thumb) return;
          text(g, V, 'dashed blue: measured distances    teal: after removing the clock error', M.x + 6, M.y + M.h - 28 + (host.ctl.n < 3 ? -18 : 0), { px: 10.5, color: c.ink2, halo: true });
          drawTable(g, V, c, ok);
        },
      };

      function drawTable(g, V, c, ok) {
        const T = L.tab;
        text(g, V, 'What the solver does, step by step', T.x, T.y, { px: 12, weight: 700, halo: false });
        const cols = [T.x, T.x + 34, T.x + 98, T.x + 162, T.x + 224];
        ['step', 'x', 'y', 'clock', 'misfit'].forEach((h, i) => text(g, V, h, cols[i], T.y + 20, { px: 10, weight: 800, color: c.ink2, halo: false }));
        line(g, V, T.x, T.y + 26, T.x + T.w, T.y + 26, c.ink, 1.2);
        if (!ok) { text(g, V, host.ctl.n < 3 ? 'needs at least 3 satellites' : 'cannot solve', T.x, T.y + 48, { px: 12, color: c.bad, weight: 700, halo: false }); return; }
        const path = st.sol.path;
        const rows = Math.min(path.length, 7);
        for (let i = 0; i < rows; i++) {
          const y = T.y + 44 + i * 19;
          const p = path[i];
          const active = Math.floor(Math.min(path.length - 1, st.k)) === i && host.ctl.mode === 'solve';
          if (active) { g.fillStyle = alpha(c.accent, 0.55); g.fillRect(T.x - 4, y - 13, T.w + 6, 18); }
          let ss = 0;
          st.sats.forEach((s, j) => { const d = Math.hypot(p.x - s.x, p.y - s.y); ss += Math.pow(st.rho[j] - d - p.b, 2); });
          const mis = Math.sqrt(ss / st.sats.length);
          const cells = [String(i), fmt(p.x, 2), fmt(p.y, 2), fmt(p.b, 2), fmt(mis, 3)];
          cells.forEach((t, j) => text(g, V, t, cols[j], y, { px: 11, mono: true, weight: active ? 800 : 500, halo: false }));
        }
        const fy = T.y + 44 + rows * 19 + 6;
        text(g, V, 'truth: x ' + fmt(st.pos.x, 2) + ', y ' + fmt(st.pos.y, 2) + ', clock ' + fmt(host.ctl.bias, 2), T.x, fy, { px: 10.5, mono: true, color: c.ink2, halo: false });
        text(g, V, 'misfit: how far the circles are from meeting', T.x, fy + 15, { px: 10, color: c.ink2, halo: false });
        const F = L.facts;
        const facts = ['Real signals take about 70 ms.', '1 ns of clock error = 0.3 m.', 'Satellite clocks gain 38 µs a day', 'from relativity: 11 km a day of', 'error if nobody corrected it.'];
        facts.forEach((t, i) => text(g, V, t, F.x, F.y + i * 16, { px: 11, color: i < 2 ? c.ink : c.ink2, halo: false }));
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
