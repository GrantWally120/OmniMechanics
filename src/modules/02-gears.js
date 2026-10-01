(function (root) {
  'use strict';
  const OM = root.OM;
  const Gr = OM.gears;
  const { fmt } = OM.util;
  const { text, alpha, pairBars } = OM.gfx;

  OM.register({
    id: 'gears',
    title: 'Gears and gear trains',
    group: 'machines',
    hook: 'Trade speed for force. Change the tooth counts and watch torque and speed swap places.',
    units: 'teeth, rpm, N·m, W',
    alt: 'Two or four meshing involute gears with bars comparing input and output speed, torque and power.',
    controls: [
      { id: 'stages', type: 'seg', label: 'Gear train', value: 1, options: [{ v: 1, l: 'One mesh' }, { v: 2, l: 'Two meshes' }] },
      { id: 'na', type: 'range', label: 'Gear A (driver) teeth', min: 12, max: 60, step: 1, value: 16 },
      { id: 'nb', type: 'range', label: 'Gear B teeth', min: 12, max: 60, step: 1, value: 40 },
      { id: 'nc', type: 'range', label: 'Gear C teeth (on B’s shaft)', min: 12, max: 48, step: 1, value: 14, showIf: (c) => c.stages === 2 },
      { id: 'nd', type: 'range', label: 'Gear D (output) teeth', min: 12, max: 60, step: 1, value: 36, showIf: (c) => c.stages === 2 },
      { id: 'rpm', type: 'range', label: 'Input speed', min: 60, max: 3000, step: 20, value: 1200, unit: 'rpm', hint: 'Drawn in slow motion. The ratio is what matters.' },
      { id: 'torque', type: 'range', label: 'Input torque', min: 1, max: 50, step: 1, value: 10, unit: 'N·m' },
    ],
    content: {
      intro: 'A gear train swaps speed for force. Drive a small gear and the big gear it meshes with turns slower but harder. The power stays nearly the same.',
      steps: [
        { h: 'Teeth take turns', p: 'The teeth of two gears push on each other one pair at a time. Their curved (involute) shape keeps the speed ratio perfectly steady as they roll.' },
        { h: 'Ratio from tooth counts', p: 'Count the teeth. The driven gear has 40 and the driver 16, so the ratio is 40 ÷ 16 = 2.5. The output turns 2.5 times slower.' },
        { h: 'Slower means stronger', p: 'Torque multiplies by the same ratio, minus about 2 percent lost as friction at each mesh. A car’s first gear is a big ratio for pulling away.' },
        { h: 'Two meshes multiply', p: 'Gears B and C are fixed to one shaft so they turn together. The total ratio is (B ÷ A) × (D ÷ C). Each mesh also reverses the direction.' },
      ],
      principle: {
        lead: 'Gears move power without making any. What you gain in torque you pay for in speed, because power is speed times torque.',
        eqs: [
          { label: 'Gear ratio', eq: 'i = N~driven~ / N~driver~', note: 'N is the number of teeth. Greater than 1 slows the output down.' },
          { label: 'Speed', eq: 'ω~out~ = ω~in~ / i' },
          { label: 'Torque', eq: 'T~out~ = T~in~ × i × η', note: 'η is about 0.98 for each mesh.' },
          { label: 'Power', eq: 'P = T × ω', note: 'Power out is power in, less the friction loss.' },
        ],
        points: [
          'Every gear here has module 1, meaning the tooth size is fixed and the radius is half the tooth count. Gears can only mesh if their teeth are the same size.',
          '**What this model leaves out:** backlash, tooth bending and wear, lubrication and helical teeth. The 2 percent loss per mesh is a typical figure for well-made spur gears.',
        ],
      },
      myth: {
        claim: 'A bigger gear gives you more power.',
        truth: 'Gears cannot create power. A larger driven gear gives more torque and less speed, and their product is the same. A gearbox lets the engine stay at its best speed while the wheels turn at whatever speed the road needs.',
      },
      tries: [
        { label: 'Low gear, 2.5 : 1', text: 'Small driver, big driven gear. Slow and strong.', set: { stages: 1, na: 16, nb: 40 } },
        { label: 'Overdrive', text: 'Big driver, small driven gear. Fast and weak.', set: { stages: 1, na: 40, nb: 16 } },
        { label: 'Equal gears', text: 'Same speed and torque out. Only the direction flips.', set: { stages: 1, na: 24, nb: 24 } },
        { label: 'Compound, 9 : 1', text: 'Two 3 : 1 meshes multiply to a big reduction in a small space.', set: { stages: 2, na: 14, nb: 42, nc: 12, nd: 36 } },
      ],
      quiz: [
        { q: 'A 12-tooth gear spinning at 900 rpm drives a 36-tooth gear. How fast does the big gear turn?', opts: ['2,700 rpm', '300 rpm', '900 rpm', '75 rpm'], a: 1, why: 'The ratio is 36 ÷ 12 = 3, so the speed is divided by 3. The torque is multiplied by about 3.' },
        { q: 'The output of a gear train turns slower than the input. What happens to the torque?', opts: ['It rises, because power (speed times torque) stays about the same', 'It falls as well', 'It stays the same', 'It depends on the colour of the gears'], a: 0, why: 'Power is speed times torque and gears lose only a little of it. Less speed has to mean more torque.' },
        { q: 'Two gears mesh directly. Why does the output turn the opposite way?', opts: ['Friction', 'At the contact point the teeth push in opposite directions, so each external mesh reverses the rotation', 'Only when the ratio is above 1', 'It does not'], a: 1, why: 'Every external mesh reverses the direction. Put an idler gear between them and the direction is restored.' },
      ],
      era: 'Antikythera, 2nd c. BC',
      level: 2,
      parts: [
        { name: 'Driver gear', note: 'The gear that is turned. It is the input.' },
        { name: 'Driven gear', note: 'The gear that is pushed round by the first one. It is the output.' },
        { name: 'Teeth', note: 'Shaped as involutes, so that each pair rolls together smoothly.' },
        { name: 'Pitch circles', note: 'Imaginary circles that roll on each other. Their size ratio is the gear ratio.' },
        { name: 'Shafts', note: 'Carry the gears and the torque.' },
      ],
      facts: [
        'The Antikythera mechanism, made in the late 2nd century BC, has at least 30 surviving bronze gears and was used to predict the positions of the Sun and Moon.',
        'Leonhard Euler worked out in 1760 that involute teeth keep meshing correctly even when the gears sit a little too close or too far apart, which is why almost all gears use them.',
        'A gear train trades speed for torque. Apart from friction, speed times torque stays the same: a shaft that turns half as fast turns with twice the torque.',
      ],
      sources: [
        'R. G. Budynas and J. K. Nisbett, *Shigley’s Mechanical Engineering Design*, McGraw-Hill (the gear chapters).',
      ],
    },

    create(host) {
      const st = { th: 0 };
      let layout = null;

      function stagesList() {
        const c = host.ctl;
        return c.stages === 2
          ? [{ drive: c.na, driven: c.nb }, { drive: c.nc, driven: c.nd }]
          : [{ drive: c.na, driven: c.nb }];
      }
      const dispRps = () => 0.3 + (0.5 * (host.ctl.rpm - 60)) / 2940;

      function place(V) {
        const c = host.ctl;
        const two = c.stages === 2;
        const gs = [];
        const A = { id: 'A', N: c.na, x: 0, y: 0, role: 'in', plane: 1 };
        const B = { id: 'B', N: c.nb, x: (c.na + c.nb) / 2, y: 0, role: two ? 'mid' : 'out', plane: 1 };
        gs.push(A, B);
        let a2 = 0;
        if (two) {
          a2 = V.narrow ? Math.PI / 2 : 0;
          const C = { id: 'C', N: c.nc, x: B.x, y: B.y, role: 'mid', plane: 2 };
          const D = { id: 'D', N: c.nd, x: B.x + ((c.nc + c.nd) / 2) * Math.cos(a2), y: B.y + ((c.nc + c.nd) / 2) * Math.sin(a2), role: 'out', plane: 2 };
          gs.push(C, D);
        }
        A.th = st.th;
        B.th = Gr.meshAngle(A.th, 0, A.N, B.N);
        if (two) {
          const C = gs[2], D = gs[3];
          C.th = B.th;
          D.th = Gr.meshAngle(C.th, a2, C.N, D.N);
        }
        let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
        gs.forEach((g) => {
          const r = g.N / 2 + 1.2;
          minx = Math.min(minx, g.x - r); maxx = Math.max(maxx, g.x + r);
          miny = Math.min(miny, g.y - r); maxy = Math.max(maxy, g.y + r);
        });
        const area = layout.gears;
        const pad = 24, top = 26; // room above for the INPUT/OUTPUT tags
        const unit = Math.min((area.w - 2 * pad) / (maxx - minx), (area.h - 2 * pad - top) / (maxy - miny), 15);
        const ox = area.x + area.w / 2 - (unit * (minx + maxx)) / 2;
        const oy = area.y + top + (area.h - top) / 2 - (unit * (miny + maxy)) / 2;
        gs.forEach((g) => { g.X = ox + g.x * unit; g.Y = oy + g.y * unit; });
        return { gs, unit, a2, two };
      }

      const an = () => Gr.analyse(stagesList(), host.ctl.rpm, host.ctl.torque);

      const sim = {
        ref: { w: 780, h: 450 },
        refNarrow: { w: 420, h: 660 },
        state: st,
        init() { st.th = 0.4; },
        layout(V) {
          layout = V.narrow
            ? { gears: { x: 0, y: 0, w: 420, h: 400 }, bars: { x: 16, y: 420, w: 388, cols: 1 } }
            : { gears: { x: 0, y: 0, w: 780, h: 290 }, bars: { x: 20, y: 308, w: 240, cols: 3 } };
        },
        step(dt) { st.th += dt * dispRps() * Math.PI * 2; },
        thumb() { st.th = 0.9; },
        readouts() {
          const a = an();
          const r = a.ratio;
          return [
            { k: 'Ratio', v: fmt(r, 2) + ' : 1' },
            { k: 'Does what', v: r > 1.001 ? 'slows down' : r < 0.999 ? 'speeds up' : 'same speed', tone: '' },
            { k: 'Output speed', v: fmt(a.rpmOut, 0) + ' rpm' },
            { k: 'Output torque', v: fmt(a.torqueOut, 1) + ' N·m' },
            { k: 'Direction', v: a.reversed ? 'reversed' : 'same as input' },
            { k: 'Power out', v: fmt(a.pOut, 0) + ' W' },
            { k: 'Efficiency', v: fmt(a.eta * 100, 0) + ' %' },
          ];
        },
        caption() { const r = an().ratio; return fmt(r, 2) + ' : 1 ' + (r > 1.001 ? 'reduction' : r < 0.999 ? 'overdrive' : 'direct'); },
        describe() { const a = an(); return 'Gear ratio ' + fmt(a.ratio, 2) + ' to 1. Output ' + fmt(a.rpmOut, 0) + ' rpm at ' + fmt(a.torqueOut, 1) + ' newton metres.'; },

        draw(g, V, c) {
          const P = place(V);
          const fills = { in: alpha(c.hot, 0.4), out: alpha(c.cold, 0.42), mid: alpha(c.metal, 0.5) };
          const order = P.two ? [P.gs[0], P.gs[1], P.gs[2], P.gs[3]] : P.gs;
          order.forEach((gr) => {
            const o = Gr.outline(gr.N).pts;
            const u = P.unit;
            g.save();
            g.translate(gr.X, gr.Y);
            g.rotate(gr.th);
            g.scale(u, u);
            g.beginPath();
            o.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
            g.closePath();
            g.fillStyle = c.paper2; g.fill();
            g.fillStyle = fills[gr.role];
            g.fill();
            g.lineWidth = V.px(1.6) / u; g.strokeStyle = c.ink; g.lineJoin = 'round'; g.stroke();
            // lightening holes and hub
            const rr = gr.N / 2 - 1.25;
            g.lineWidth = V.px(1.2) / u;
            g.beginPath(); g.arc(0, 0, rr * 0.22, 0, Math.PI * 2); g.fillStyle = c.ink; g.fill();
            for (let k = 0; k < 5; k++) {
              const a = (k / 5) * Math.PI * 2;
              g.beginPath(); g.arc(Math.cos(a) * rr * 0.6, Math.sin(a) * rr * 0.6, rr * 0.16, 0, Math.PI * 2);
              g.fillStyle = c.paper2; g.fill(); g.strokeStyle = c.ink2; g.stroke();
            }
            // mark on tooth 0
            g.strokeStyle = c.ink; g.lineWidth = V.px(4.5) / u;
            g.beginPath(); g.moveTo(rr * 0.25, 0); g.lineTo(gr.N / 2 + 1, 0); g.stroke();
            g.strokeStyle = c.accent; g.lineWidth = V.px(2.5) / u;
            g.beginPath(); g.moveTo(rr * 0.25, 0); g.lineTo(gr.N / 2 + 1, 0); g.stroke();
            g.restore();
            text(g, V, gr.id + ' · ' + gr.N + 'T', gr.X, gr.Y + gr.N / 2 * u + 1.2 * u + V.px(14), { px: 12, weight: 700, align: 'center', mono: true });
          });
          // pitch point highlights
          for (let i = 0; i + 1 < P.gs.length; i++) {
            const a = P.gs[i], b = P.gs[i + 1];
            if (a.plane !== b.plane) continue;
            const ang = Math.atan2(b.Y - a.Y, b.X - a.X);
            const px = a.X + Math.cos(ang) * (a.N / 2) * P.unit, py = a.Y + Math.sin(ang) * (a.N / 2) * P.unit;
            g.beginPath(); g.arc(px, py, V.px(4.5), 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(1.5); g.stroke();
          }
          if (P.two) {
            const bg = P.gs[1];
            text(g, V, 'B and C share a shaft', bg.X, bg.Y - (bg.N / 2 + 1.5) * P.unit - V.px(6), { px: 11, color: c.ink2, align: 'center' });
          }
          // input/output tags
          const a0 = P.gs[0], out = P.two ? P.gs[3] : P.gs[1];
          text(g, V, 'INPUT', a0.X, a0.Y - (a0.N / 2 + 1.5) * P.unit - V.px(6), { px: 11, weight: 800, color: c.hot, align: 'center' });
          text(g, V, 'OUTPUT', out.X, out.Y - (out.N / 2 + 1.5) * P.unit - V.px(6), { px: 11, weight: 800, color: c.cold, align: 'center' });

          // bars
          if (V.thumb) return;
          const a = an();
          const B = layout.bars;
          const rows = [
            { label: 'Speed', a: { v: host.ctl.rpm, text: fmt(host.ctl.rpm, 0) + ' rpm', color: c.hot, name: 'in' }, b: { v: a.rpmOut, text: fmt(a.rpmOut, 0) + ' rpm', color: c.cold, name: 'out' } },
            { label: 'Torque', a: { v: host.ctl.torque, text: fmt(host.ctl.torque, 1) + ' N·m', color: c.hot, name: 'in' }, b: { v: a.torqueOut, text: fmt(a.torqueOut, 1) + ' N·m', color: c.cold, name: 'out' } },
            { label: 'Power', a: { v: a.pIn, text: fmt(a.pIn, 0) + ' W', color: c.hot, name: 'in' }, b: { v: a.pOut, text: fmt(a.pOut, 0) + ' W', color: c.cold, name: 'out' } },
          ];
          if (B.cols === 3) {
            rows.forEach((r, i) => pairBars(g, V, c, B.x + i * 252, B.y, 240, [r], 60));
          } else {
            pairBars(g, V, c, B.x, B.y, B.w, rows, 64);
          }
        },
      };
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
