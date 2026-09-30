(function (root) {
  'use strict';
  const OM = root.OM;
  const Mo = OM.motor;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, alpha } = OM.gfx;

  const SLOW = 1 / 30; // the picture turns 30 times slower than the real rotor
  const V_MAX = 12;

  OM.register({
    id: 'motor',
    title: 'DC electric motor',
    group: 'electric',
    hook: 'A current in a magnetic field gets pushed. The motor also generates a voltage against you as it spins.',
    units: 'V, A, N·m, rpm',
    alt: 'End view of a brushed DC motor with magnets, a spinning coil with current directions and force arrows, a commutator, and charts of speed against torque and torque ripple.',
    controls: [
      { id: 'volts', type: 'range', label: 'Battery voltage', min: 0, max: V_MAX, step: 0.5, value: 9, dec: 1, unit: 'V' },
      { id: 'load', type: 'range', label: 'Load torque', min: 0, max: 0.5, step: 0.01, value: 0.12, dec: 2, unit: 'N·m' },
      { id: 'coils', type: 'seg', label: 'Coils on the rotor', value: 1, options: [{ v: 1, l: '1' }, { v: 2, l: '2' }, { v: 3, l: '3' }] },
      { id: 'rev', type: 'toggle', label: 'Reverse the battery', value: false },
      { id: 'hold', type: 'toggle', label: 'Jam the rotor', value: false },
    ],
    content: {
      intro: 'A wire carrying current through a magnetic field is pushed sideways. Wind that wire into a loop on a shaft, reverse the current every half turn, and the shaft keeps turning. As it spins it makes its own voltage that works against the battery.',
      steps: [
        { h: 'A push on a current', p: 'A current through a magnetic field feels a force at right angles to both. Here the current on the right comes out of the page and is pushed up, and the current on the left goes into the page and is pushed down.' },
        { h: 'Two pushes make a turn', p: 'The two sides of the loop are pushed in opposite directions, and because they sit on opposite sides of the shaft, both push it round the same way.' },
        { h: 'The commutator keeps it going', p: 'When the loop reaches the vertical its pushes would start to pull it back. The split ring (commutator) swaps the current at exactly that moment, so the torque never changes sign.' },
        { h: 'Spinning makes a voltage', p: 'A coil moving through a field generates a voltage that opposes the battery: the back-EMF. As the motor speeds up the back-EMF rises and the current falls, until the torque just balances the load.' },
      ],
      principle: {
        lead: 'The same constant k links both directions. Current makes torque, and speed makes back-EMF. That is why a motor is also a generator.',
        eqs: [
          { label: 'Force on a conductor', eq: 'F = B I L', note: 'B is the field, I the current and L the length of wire in the field.' },
          { label: 'Torque', eq: 'τ = k I', note: 'k = 0.04 N·m per amp for this motor.' },
          { label: 'Electrical balance', eq: 'V = I R + k ω', note: 'kω is the back-EMF. R = 0.8 Ω is the winding resistance.' },
          { label: 'Jammed (stalled) current', eq: 'I = V / R', note: 'At 12 V that is 15 A, which is why a jammed motor overheats.' },
        ],
        points: [
          'The straight line in the speed–torque chart is the whole motor. It runs from the no-load speed V ÷ k down to the stall torque k V ÷ R.',
          'With one coil the torque drops to zero twice per turn. More coils overlap their pushes and smooth it out.',
          '**What this model leaves out:** brush drop and sparking, winding inductance, magnetic saturation and heating. The picture is slowed down 30 times.',
        ],
      },
      myth: {
        claim: 'A motor draws more current the faster it spins.',
        truth: 'It is the other way round. A spinning motor makes back-EMF that opposes the supply, so the current falls as the speed rises. The most current flows at the instant you switch on, or when the rotor is jammed.',
      },
      tries: [
        { label: 'No load', text: 'The motor spins up until the back-EMF almost cancels the battery.', set: { volts: 9, load: 0, hold: false } },
        { label: 'Heavy load', text: 'It slows down and draws more current to make the torque.', set: { volts: 9, load: 0.3, hold: false } },
        { label: 'Jam it', text: 'No rotation, no back-EMF, and the current shoots up.', set: { volts: 9, load: 0.12, hold: true } },
        { label: 'Smooth it out', text: 'Three coils give a much steadier torque.', set: { coils: 3, hold: false } },
      ],
      quiz: [
        { q: 'Why does a motor draw the most current at the instant it starts?', opts: ['There is no back-EMF yet, so only the winding resistance limits the current', 'The magnets are strongest then', 'The brushes are cold', 'Friction is highest'], a: 0, why: 'Back-EMF is proportional to speed. At zero speed it is zero, so the current is V ÷ R.' },
        { q: 'What does the commutator do?', opts: ['Cools the coil', 'Reverses the current in the coil every half turn so the torque keeps the same direction', 'Stores charge', 'Measures the speed'], a: 1, why: 'Without it the coil would swing to the vertical and stop, or rock back and forth.' },
        { q: 'You double the battery voltage and leave the load alone. What roughly happens to the no-load speed?', opts: ['It halves', 'It stays the same', 'It doubles', 'It quadruples'], a: 2, why: 'The motor speeds up until the back-EMF (k × speed) almost equals the battery, so the no-load speed is V ÷ k.' },
      ],
      sources: [
        'S. J. Chapman, *Electric Machinery Fundamentals*, McGraw-Hill (DC machines).',
      ],
    },

    create(host) {
      const st = { th: 0.3, w: 0, t: 0 };
      let L = null;

      const dir = () => (host.ctl.rev ? -1 : 1);
      const eff = () => Mo.steady(host.ctl.volts, host.ctl.load);
      const live = () => {
        const V = host.ctl.volts;
        const I = st.w === 0 && (host.ctl.hold || Mo.K * V / Mo.R <= host.ctl.load + 1e-9) ? V / Mo.R : (V - Mo.K * st.w) / Mo.R;
        return { I, emf: Mo.K * st.w };
      };

      const sim = {
        ref: { w: 780, h: 450 },
        refNarrow: { w: 420, h: 820 },
        state: st,
        init() { st.w = 0; st.th = 0.3; st.t = 0; },
        layout(V) {
          L = V.narrow
            ? { mot: { x: 10, y: 0, k: 1 }, bar: { x: 20, y: 424, w: 380 }, ts: { x: 20, y: 500, w: 380, h: 170 }, rip: { x: 20, y: 696, w: 380, h: 110 } }
            : { mot: { x: 0, y: 14, k: 1 }, bar: { x: 430, y: 18, w: 330 }, ts: { x: 430, y: 100, w: 340, h: 190 }, rip: { x: 430, y: 318, w: 340, h: 112 } };
        },
        step(dt) {
          st.t += dt;
          st.w = Mo.advance(st.w, host.ctl.volts, host.ctl.load, dt, host.ctl.hold);
          st.th += dir() * st.w * SLOW * dt;
        },
        thumb() { st.w = eff().w; st.th = 0.5; },
        readouts() {
          const l = live();
          const V = host.ctl.volts;
          const rpm = (st.w * 60) / (2 * Math.PI);
          const tq = Mo.K * l.I;
          const pIn = V * l.I;
          const pOut = Math.max(0, (tq - Mo.B * st.w)) * st.w;
          return [
            { k: 'Speed', v: fmt(rpm, 0) + ' rpm' },
            { k: 'Current', v: fmt(l.I, 1) + ' A', tone: l.I > 10 ? 'bad' : '' },
            { k: 'Back-EMF', v: fmt(l.emf, 1) + ' V' },
            { k: 'Motor torque', v: fmt(tq, 2) + ' N·m' },
            { k: 'Power in', v: fmt(pIn, 0) + ' W' },
            { k: 'Power to shaft', v: fmt(pOut, 0) + ' W' },
            { k: 'Efficiency', v: pIn > 1 ? fmt((pOut / pIn) * 100, 0) + ' %' : '–' },
          ];
        },
        caption() {
          const l = live();
          if (host.ctl.hold) return 'Jammed: ' + fmt(l.I, 0) + ' A!';
          if (st.w < 1) return host.ctl.volts * Mo.K / Mo.R <= host.ctl.load ? 'Too much load to start' : 'Starting';
          return st.w > eff().w * 0.98 ? 'Steady speed' : 'Speeding up';
        },
        describe() { const l = live(); return 'Speed ' + fmt((st.w * 60) / (2 * Math.PI), 0) + ' rpm, current ' + fmt(l.I, 1) + ' amps, back-EMF ' + fmt(l.emf, 1) + ' volts.'; },

        draw(g, V, c) {
          drawMotor(g, V, c);
          if (V.thumb) return;
          drawBar(g, V, c);
          drawTS(g, V, c);
          drawRipple(g, V, c);
        },
      };

      function drawMotor(g, V, c) {
        const cx = 200 + L.mot.x, cy = 206 + L.mot.y;
        const n = host.ctl.coils;
        const l = live();
        const d = dir();
        const ink = c.ink;
        // magnets
        const mag = (x, col, ch) => {
          g.fillStyle = alpha(col, 0.3); g.fillRect(x, cy - 92, 84, 184);
          g.strokeStyle = ink; g.lineWidth = V.px(2); g.strokeRect(x, cy - 92, 84, 184);
          text(g, V, ch, x + 42, cy + 10, { px: 34, weight: 800, align: 'center', color: ink, halo: false });
        };
        mag(cx - 192, c.hot, 'N');
        mag(cx + 108, c.cold, 'S');
        // field lines
        for (const y of [-70, -35, 0, 35, 70]) arrow(g, V, cx - 106, cy + y, cx + 106, cy + y, alpha(c.ink2, 0.6), 1.2, 8);
        text(g, V, 'magnetic field', cx, cy - 104, { px: 11, color: c.ink2, align: 'center' });
        // rotor
        g.beginPath(); g.arc(cx, cy, 66, 0, Math.PI * 2); g.fillStyle = alpha(c.paper2, 0.92); g.fill();
        g.strokeStyle = ink; g.lineWidth = V.px(1.8); g.stroke();
        // coil end connections (through the middle)
        const P = (a, r) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
        for (let k = 0; k < n; k++) {
          const a = st.th + (k * Math.PI) / n;
          const p1 = P(a, 50), p2 = P(a + Math.PI, 50);
          g.setLineDash([V.px(3), V.px(3)]); g.strokeStyle = c.ink2; g.lineWidth = V.px(1);
          g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.stroke(); g.setLineDash([]);
        }
        // commutator
        const segs = 2 * n;
        for (let j = 0; j < segs; j++) {
          const a0 = st.th + (j * Math.PI) / n + 0.09, a1 = st.th + ((j + 1) * Math.PI) / n - 0.09;
          g.beginPath(); g.arc(cx, cy, 22, -a1, -a0); g.strokeStyle = j % 2 ? c.metalD : c.metal; g.lineWidth = V.px(7); g.stroke();
        }
        // brushes and wires
        g.fillStyle = c.ink;
        g.fillRect(cx - 7, cy - 34, 14, 10); g.fillRect(cx - 7, cy + 24, 14, 10);
        line(g, V, cx, cy - 34, cx, cy - 66, c.ink, 1.6); line(g, V, cx, cy + 34, cx, cy + 66, c.ink, 1.6);
        text(g, V, d > 0 ? '+' : '−', cx + 12, cy - 72, { px: 16, weight: 800, color: c.hot });
        text(g, V, d > 0 ? '−' : '+', cx + 12, cy + 88, { px: 16, weight: 800, color: c.cold });
        // conductors with current direction and force
        const Fmax = 12;
        const fl = 10 + 34 * clamp(l.I / Fmax, 0, 1.1);
        for (let k = 0; k < n; k++) {
          for (const side of [0, 1]) {
            const a = st.th + (k * Math.PI) / n + side * Math.PI;
            const p = P(a, 50);
            const out = Math.cos(a) * d > 0; // current out of the page on the right half
            const up = out; // force is up for out-of-page current in this field
            g.beginPath(); g.arc(p[0], p[1], 8.5, 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill();
            g.strokeStyle = c.elec; g.lineWidth = V.px(2); g.stroke();
            g.fillStyle = c.elec; g.strokeStyle = c.elec;
            if (out) { g.beginPath(); g.arc(p[0], p[1], 2.6, 0, Math.PI * 2); g.fill(); }
            else { g.lineWidth = V.px(1.6); g.beginPath(); g.moveTo(p[0] - 4.4, p[1] - 4.4); g.lineTo(p[0] + 4.4, p[1] + 4.4); g.moveTo(p[0] + 4.4, p[1] - 4.4); g.lineTo(p[0] - 4.4, p[1] + 4.4); g.stroke(); }
            if (l.I > 0.05 && st.w >= 0) arrow(g, V, p[0], p[1] + (up ? -10 : 10), p[0], p[1] + (up ? -10 - fl : 10 + fl), c.hot, 2.4, 8);
          }
        }
        // hub
        g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fillStyle = ink; g.fill();
        // legend
        text(g, V, '● current out of page', cx - 190, cy + 124, { px: 10.5, color: c.elec, halo: false, weight: 700 });
        text(g, V, '✕ current into page', cx - 190, cy + 140, { px: 10.5, color: c.elec, halo: false, weight: 700 });
        text(g, V, 'orange arrows: force on each wire', cx - 190, cy + 156, { px: 10.5, color: c.hot, halo: false, weight: 700 });
        text(g, V, 'picture slowed ÷ 30', cx + 192, cy + 156, { px: 10.5, color: c.ink2, halo: false, align: 'right' });
      }

      function drawBar(g, V, c) {
        const b = L.bar;
        const l = live();
        const Vb = host.ctl.volts;
        text(g, V, 'Where the battery voltage goes', b.x, b.y + 6, { px: 12, weight: 700, halo: false });
        const tot = Math.max(Vb, 0.001), W = b.w - 4;
        const e = clamp(l.emf, 0, tot), ir = Math.max(0, tot - e);
        const y = b.y + 16;
        g.fillStyle = alpha(c.elec, 0.8); g.fillRect(b.x, y, (e / V_MAX) * W, 24);
        g.fillStyle = alpha(c.hot, 0.8); g.fillRect(b.x + (e / V_MAX) * W, y, (ir / V_MAX) * W, 24);
        g.strokeStyle = c.ink; g.lineWidth = V.px(1.5); g.strokeRect(b.x, y, (tot / V_MAX) * W, 24);
        g.strokeStyle = c.ink2; g.setLineDash([V.px(3), V.px(3)]); g.strokeRect(b.x, y, W, 24); g.setLineDash([]);
        text(g, V, 'back-EMF ' + fmt(e, 1) + ' V', b.x, y + 40, { px: 11, weight: 700, color: c.elec, halo: false });
        text(g, V, 'lost in winding (I×R) ' + fmt(ir, 1) + ' V', b.x + W, y + 40, { px: 11, weight: 700, color: c.hot, align: 'right', halo: false });
      }

      function plotFrame(g, V, c, r, title, xl, yl) {
        text(g, V, title, r.x, r.y + 10, { px: 12, weight: 700, halo: false });
        const x0 = r.x + 40, y0 = r.y + 22, w = r.w - 52, h = r.h - 54;
        line(g, V, x0, y0, x0, y0 + h, c.ink, 1.5); line(g, V, x0, y0 + h, x0 + w, y0 + h, c.ink, 1.5);
        text(g, V, xl, x0 + w, y0 + h + 28, { px: 10.5, color: c.ink2, align: 'right', halo: false });
        text(g, V, yl, x0 - 6, y0 - 4, { px: 10.5, color: c.ink2, align: 'right', halo: false });
        return { x0, y0, w, h };
      }

      function drawTS(g, V, c) {
        const f = plotFrame(g, V, c, L.ts, 'Speed (rpm) against torque', 'torque, N·m', '');
        const TM = 0.62, WM = 3000;
        const X = (t) => f.x0 + (t / TM) * f.w, Y = (rpm) => f.y0 + f.h - (rpm / WM) * f.h;
        for (const t of [0, 0.2, 0.4, 0.6]) { line(g, V, X(t), f.y0 + f.h, X(t), f.y0 + f.h + 4, c.ink, 1); text(g, V, fmt(t, 1), X(t), f.y0 + f.h + 15, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false }); }
        for (const w of [0, 1000, 2000, 3000]) { line(g, V, f.x0 - 4, Y(w), f.x0, Y(w), c.ink, 1); text(g, V, fmt(w, 0), f.x0 - 6, Y(w) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); }
        // motor line for this voltage
        const s0 = Mo.steady(host.ctl.volts, 0);
        const tStall = Mo.K * host.ctl.volts / Mo.R;
        g.strokeStyle = c.elec; g.lineWidth = V.px(2.5);
        g.beginPath(); g.moveTo(X(0), Y(s0.rpm)); g.lineTo(X(tStall), Y(0)); g.stroke();
        // load line
        g.setLineDash([V.px(4), V.px(3)]); g.strokeStyle = c.hot; g.lineWidth = V.px(2);
        g.beginPath(); g.moveTo(X(host.ctl.load), Y(0)); g.lineTo(X(host.ctl.load), f.y0); g.stroke(); g.setLineDash([]);
        text(g, V, 'load', X(host.ctl.load) + 4, f.y0 + 12, { px: 10.5, color: c.hot, weight: 700, halo: false });
        text(g, V, 'no load', X(0) + 6, Y(s0.rpm) - 6, { px: 10.5, color: c.elec, weight: 700, halo: false });
        if (tStall > 0.02) text(g, V, 'stall', X(tStall) - 2, Y(0) - 6, { px: 10.5, color: c.elec, weight: 700, align: 'right', halo: false });
        // operating point (live)
        const rpm = (st.w * 60) / (2 * Math.PI);
        g.beginPath(); g.arc(X(clamp(host.ctl.load, 0, TM)), Y(clamp(rpm, 0, WM)), V.px(6), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
      }

      function drawRipple(g, V, c) {
        const f = plotFrame(g, V, c, L.rip, 'Torque through one turn (average = 1)', 'rotor angle, degrees', '');
        const n = host.ctl.coils;
        const X = (a) => f.x0 + (a / 360) * f.w, Y = (t) => f.y0 + f.h - (t / 1.7) * f.h;
        line(g, V, f.x0, Y(1), f.x0 + f.w, Y(1), c.ink2, 1, [4, 3]);
        text(g, V, 'average', f.x0 + f.w, Y(1) - 4, { px: 10, color: c.ink2, align: 'right', halo: false });
        g.strokeStyle = c.elec; g.lineWidth = V.px(2); g.beginPath();
        for (let a = 0; a <= 360; a += 3) {
          const t = Mo.ripple((a * Math.PI) / 180, n);
          if (a === 0) g.moveTo(X(a), Y(t)); else g.lineTo(X(a), Y(t));
        }
        g.stroke();
        const cur = (((st.th * 180) / Math.PI) % 360 + 360) % 360;
        const t = Mo.ripple((cur * Math.PI) / 180, n);
        g.beginPath(); g.arc(X(cur), Y(t), V.px(5.5), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
        for (const a of [0, 90, 180, 270, 360]) text(g, V, String(a), X(a), f.y0 + f.h + 14, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false });
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
