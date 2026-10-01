(function (root) {
  'use strict';
  const OM = root.OM;
  const H = OM.hydraulics;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, hatchRect, alpha, pairBars } = OM.gfx;

  const S = 2; // pixels per mm (widths and travel share one scale)
  const PUSH_MAX = 100; // mm of master piston travel
  const MX = 72, SX = 292; // centre lines of the two cylinders
  const CYL_TOP_M = 84, CYL_BOT = 338; // master cylinder walls
  const CYL_TOP_S = 150; // slave cylinder walls start here
  const PISTON_T = 16;
  const PIPE_Y1 = 346, PIPE_Y2 = 366;

  OM.register({
    id: 'hydraulics',
    title: 'Hydraulic jack and brakes',
    group: 'machines',
    hook: 'A light push on a small piston becomes a heavy lift on a big one. Air in the line ruins it.',
    units: 'mm, N, bar, J',
    alt: 'Two connected cylinders filled with fluid. Pushing the small piston down raises the large piston carrying a load. Bars compare force, travel and work.',
    controls: [
      { id: 'd1', type: 'range', label: 'Small piston diameter', min: 10, max: 40, step: 1, value: 20, unit: 'mm' },
      { id: 'd2', type: 'range', label: 'Big piston diameter', min: 30, max: 100, step: 1, value: 60, unit: 'mm' },
      { id: 'mass', type: 'range', label: 'Load', min: 100, max: 2000, step: 50, value: 800, unit: 'kg' },
      { id: 'air', type: 'seg', label: 'Air in the line', value: 0, options: [{ v: 0, l: 'None' }, { v: 5, l: 'Small bubble' }, { v: 15, l: 'Big bubble' }] },
      { id: 'auto', type: 'toggle', label: 'Push for me', value: true, hint: 'Or drag the small piston down yourself.' },
    ],
    content: {
      intro: 'Liquid cannot be squeezed, so a push on one piston shows up as pressure everywhere in the fluid. A small piston pushing a big piston turns a light push into a heavy lift.',
      steps: [
        { h: 'Pressure is the same everywhere', p: 'Push the small piston and the fluid pressure rises by the same amount throughout. Pressure is force divided by area.' },
        { h: 'A bigger area means a bigger force', p: 'That same pressure acts on the big piston’s larger area. A piston with nine times the area pushes nine times as hard.' },
        { h: 'A short stroke is the price', p: 'Fluid is not created or lost, so the volume the small piston pushes out is the volume the big one takes in. Nine times the area means one ninth of the travel.' },
        { h: 'Air spoils it', p: 'Air squashes and liquid does not. A bubble swallows some of your stroke before the pressure can build, which is why a brake pedal with air in the line feels spongy.' },
      ],
      principle: {
        lead: 'Pascal’s principle: a pressure change applied to a confined fluid reaches every part of it equally. A hydraulic system is a lever made of liquid.',
        eqs: [
          { label: 'Pressure', eq: 'P = F~1~ / A~1~ = F~2~ / A~2~' },
          { label: 'Force multiplication', eq: 'F~2~ = F~1~ × A~2~ / A~1~', note: 'Area goes with the square of the diameter, so a piston 3 times wider gives 9 times the force.' },
          { label: 'Volume is conserved', eq: 'A~1~ x~1~ = A~2~ x~2~', note: 'So the travel is divided by the same factor the force is multiplied by.' },
          { label: 'Air bubble', eq: 'P V = constant', note: 'At 35 bar a bubble shrinks to about a thirtieth of its size, and your pedal travel pays for all of it.' },
        ],
        points: [
          'A car’s brake pedal is also a lever, usually about 4 to 1, which multiplies your foot force before the hydraulics multiply it again.',
          'Brake fluid has to resist boiling. When it boils it makes vapour bubbles, the line turns spongy and the pedal goes to the floor.',
          '**What this model leaves out:** fluid compressibility, flex in the hoses, friction in the seals and the force needed to accelerate the load. It is a slow, quasi-static lift.',
        ],
      },
      myth: {
        claim: 'A hydraulic jack gives you extra force for free.',
        truth: 'The force is bigger but the travel is smaller by the same factor, so the work is unchanged. That is why a jack needs many pumps to lift a car a few centimetres. The bars in the diagram show force, travel and work side by side.',
      },
      tries: [
        { label: 'Jack for a car', text: '9 to 1 area ratio lifting 800 kg.', set: { d1: 20, d2: 60, mass: 800, air: 0 } },
        { label: 'Equal pistons', text: 'No advantage at all. Force and travel are the same on both sides.', set: { d1: 30, d2: 30 } },
        { label: 'Huge ratio', text: 'A 10 mm piston against a 100 mm piston is 100 to 1, but the big piston barely moves.', set: { d1: 10, d2: 100, mass: 1500, air: 0 } },
        { label: 'Spongy brakes', text: 'A bubble in the line. Watch the small piston travel before anything happens.', set: { d1: 20, d2: 60, mass: 800, air: 15 } },
      ],
      quiz: [
        { q: 'The pistons are 20 mm and 60 mm across. You push the small one with 100 N. What force comes out of the big one (ideal)?', opts: ['300 N', '900 N', '100 N', '1,800 N'], a: 1, why: 'Force scales with area, and area with diameter squared: (60 ÷ 20)² = 9, so 9 × 100 N = 900 N.' },
        { q: 'With that 9 to 1 area ratio the small piston moves 90 mm. How far does the big piston rise?', opts: ['810 mm', '90 mm', '30 mm', '10 mm'], a: 3, why: 'Volume is conserved, so the travel is divided by the area ratio: 90 ÷ 9 = 10 mm.' },
        { q: 'Why does a brake pedal feel spongy when there is air in the line?', opts: ['Air is lighter than fluid', 'The air bubble compresses, so the pedal has to travel further before the pressure can build', 'Air makes the fluid boil', 'The pads get hotter'], a: 1, why: 'Liquid is almost incompressible but air squashes easily. Some of your pedal travel goes into squeezing the bubble.' },
      ],
      era: 'Pascal, 1663',
      level: 2,
      parts: [
        { name: 'Pump piston', note: 'The small piston you push. It makes the pressure.' },
        { name: 'Load piston', note: 'The large piston that lifts the weight.' },
        { name: 'Fluid', note: 'Oil or brake fluid. It hardly compresses, so it passes the pressure on at once.' },
        { name: 'Lever', note: 'Gives a second multiplication of force at the handle.' },
        { name: 'Air bubble', note: 'Not meant to be there. Air compresses, and so takes up some of the push.' },
      ],
      facts: [
        'Pascal described the principle in a treatise that was published in 1663, after his death. Joseph Bramah patented the first hydraulic press in 1795.',
        'Brake fluid soaks up water from the air. With 3 percent water it can boil at a temperature about a quarter lower, and the bubbles of vapour make the pedal spongy.',
        'Large excavators work at up to about 350 bar, which is around 350 times atmospheric pressure.',
      ],
      sources: [
        'Y. A. Çengel and J. M. Cimbala, *Fluid Mechanics: Fundamentals and Applications* (pressure and Pascal’s law).',
      ],
    },

    create(host) {
      const st = { x1: 0.04, dir: 1, drag: false };
      let L = null;

      const resp = () => H.respond({
        x1: st.x1, d1Mm: host.ctl.d1, d2Mm: host.ctl.d2, massKg: host.ctl.mass, bubbleMl: host.ctl.air, lever: 1,
      });
      const pistonY = () => CYL_TOP_M + 20 + st.x1 * 1000 * S;

      const sim = {
        ref: { w: 780, h: 470 },
        refNarrow: { w: 420, h: 730 },
        state: st,
        drag: 'y',
        init() { st.x1 = 0.03; st.dir = 1; st.drag = false; },
        layout(V) {
          L = V.narrow
            ? { scene: { x: 0, y: 0 }, bars: { x: 16, y: 500, w: 388 } }
            : { scene: { x: 14, y: 0 }, bars: { x: 450, y: 70, w: 316 } };
        },
        step(dt) {
          if (host.ctl.auto && !st.drag) {
            st.x1 += st.dir * 0.022 * dt;
            if (st.x1 >= PUSH_MAX / 1000) { st.x1 = PUSH_MAX / 1000; st.dir = -1; }
            if (st.x1 <= 0) { st.x1 = 0; st.dir = 1; }
          }
        },
        thumb() { st.x1 = 0.07; },
        pointer(type, x, y) {
          const sx = x - L.scene.x, sy = y - L.scene.y;
          if (type === 'down') {
            const w = host.ctl.d1 * S;
            if (Math.abs(sx - MX) > w / 2 + 26 || Math.abs(sy - (pistonY() - 20)) > 44) return false;
            st.drag = true;
            if (host.ctl.auto) host.set('auto', false);
            return true;
          }
          if (type === 'move' && st.drag) st.x1 = clamp((sy - CYL_TOP_M - 20 + 6) / S / 1000, 0, PUSH_MAX / 1000);
          if (type === 'up') st.drag = false;
          return true;
        },
        cursor(x, y) {
          const sx = x - L.scene.x, sy = y - L.scene.y;
          return Math.abs(sx - MX) < host.ctl.d1 * S / 2 + 26 && Math.abs(sy - (pistonY() - 20)) < 44 ? 'ns-resize' : '';
        },
        key(k) {
          if (k === 'ArrowDown' || k === 'ArrowUp') {
            if (host.ctl.auto) host.set('auto', false);
            st.x1 = clamp(st.x1 + (k === 'ArrowDown' ? 0.004 : -0.004), 0, PUSH_MAX / 1000);
            return true;
          }
          return false;
        },
        readouts() {
          const r = resp();
          return [
            { k: 'Pressure', v: fmt(r.P / 1e5, 1) + ' bar' },
            { k: 'Push on small piston', v: fmt(r.F1, 0) + ' N' },
            { k: 'Load weighs', v: fmt(host.ctl.mass * H.G, 0) + ' N' },
            { k: 'Area ratio', v: fmt(r.ratio, 1) + ' : 1' },
            { k: 'Small piston moved', v: fmt(st.x1 * 1000, 0) + ' mm' },
            { k: 'Load rose', v: fmt(r.x2 * 1000, 1) + ' mm' },
            { k: 'Lost to air', v: fmt(r.deadTravel * 1000, 0) + ' mm', tone: r.deadTravel > 0.0005 ? 'warn' : '' },
          ];
        },
        caption() {
          const r = resp();
          if (host.ctl.air > 0 && r.x2 <= 0 && st.x1 > 0) return 'Squeezing the bubble';
          return r.x2 > 0 ? 'Lifting' : 'Waiting for pressure';
        },
        describe() { const r = resp(); return 'Pressure ' + fmt(r.P / 1e5, 1) + ' bar. The small piston has moved ' + fmt(st.x1 * 1000, 0) + ' millimetres and the load has risen ' + fmt(r.x2 * 1000, 1) + ' millimetres.'; },

        draw(g, V, c) {
          const r = resp();
          g.save();
          g.translate(L.scene.x, L.scene.y);
          const ink = c.ink;
          const w1 = host.ctl.d1 * S, w2 = host.ctl.d2 * S;
          const pMid = clamp(Math.log10(1 + r.P / 1e5) / 2.6, 0, 1);
          const fluid = alpha(c.cold, 0.22 + 0.4 * pMid);
          const y1 = pistonY();
          const x2px = r.x2 * 1000 * S;
          const y2 = CYL_TOP_S + 26 - x2px; // slave piston top
          const lw = (n) => V.px(n);

          // fluid
          g.fillStyle = fluid;
          g.fillRect(MX - w1 / 2, y1 + PISTON_T, w1, CYL_BOT - y1 - PISTON_T);
          g.fillRect(MX - w1 / 2, CYL_BOT, w1, PIPE_Y2 - CYL_BOT);
          g.fillRect(MX - w1 / 2, PIPE_Y1, SX - MX + w1 / 2 + 2, PIPE_Y2 - PIPE_Y1);
          g.fillRect(SX - w2 / 2, y2 + PISTON_T, w2, CYL_BOT - y2 - PISTON_T);
          g.fillRect(SX - w2 / 2, CYL_BOT, w2, PIPE_Y2 - CYL_BOT);
          // air bubble in the pipe, compressed by pressure
          if (host.ctl.air > 0) {
            const ratio = 1 / (1 + r.P / H.P_ATM);
            const bw = (host.ctl.air / 15) * 64 * (0.15 + 0.85 * ratio) + 6;
            const bx = MX + w1 / 2 + 50;
            g.beginPath(); g.ellipse(bx, (PIPE_Y1 + PIPE_Y2) / 2, bw / 2, 7, 0, 0, Math.PI * 2);
            g.fillStyle = c.paper2; g.fill(); g.strokeStyle = ink; g.lineWidth = lw(1.5); g.stroke();
            text(g, V, 'air', bx, PIPE_Y1 - 6, { px: 11, weight: 700, align: 'center', color: c.ink });
          }

          // cylinder walls (cut metal)
          const walls = (cx, w, top, bot) => {
            for (const x of [cx - w / 2 - 9, cx + w / 2]) {
              g.fillStyle = c.paper2; g.fillRect(x, top, 9, bot - top);
              hatchRect(g, V, x, top, 9, bot - top, { gap: 7, color: c.line });
              g.strokeStyle = ink; g.lineWidth = lw(1.5); g.strokeRect(x, top, 9, bot - top);
            }
            g.fillStyle = c.paper2; g.fillRect(cx - w / 2 - 9, bot, w + 18, 10);
            hatchRect(g, V, cx - w / 2 - 9, bot, w + 18, 10, { gap: 7, color: c.line });
            g.strokeRect(cx - w / 2 - 9, bot, w + 18, 10);
          };
          walls(MX, w1, CYL_TOP_M, CYL_BOT);
          walls(SX, w2, CYL_TOP_S, CYL_BOT);
          // pipe walls
          g.strokeStyle = ink; g.lineWidth = lw(1.5);
          g.beginPath(); g.moveTo(MX - w1 / 2 - 9, PIPE_Y2 + 1); g.lineTo(SX + w2 / 2 + 9, PIPE_Y2 + 1); g.stroke();
          g.beginPath(); g.moveTo(MX + w1 / 2 + 9, PIPE_Y1 - 1); g.lineTo(SX - w2 / 2 - 9, PIPE_Y1 - 1); g.stroke();

          // master piston and rod
          g.fillStyle = c.metal2; g.strokeStyle = ink; g.lineWidth = lw(1.5);
          g.fillRect(MX - w1 / 2, y1, w1, PISTON_T); g.strokeRect(MX - w1 / 2, y1, w1, PISTON_T);
          g.fillRect(MX - 5, y1 - 54, 10, 54); g.strokeRect(MX - 5, y1 - 54, 10, 54);
          g.fillStyle = c.accent; g.fillRect(MX - 22, y1 - 62, 44, 10); g.strokeRect(MX - 22, y1 - 62, 44, 10);
          // slave piston and load
          g.fillStyle = c.metal2;
          g.fillRect(SX - w2 / 2, y2, w2, PISTON_T); g.strokeRect(SX - w2 / 2, y2, w2, PISTON_T);
          const lwid = Math.max(60, Math.min(w2 + 30, 190)), lh = 34 + host.ctl.mass / 50;
          g.fillStyle = c.metal2; g.fillRect(SX - lwid / 2, y2 - 6, lwid, 6); g.strokeRect(SX - lwid / 2, y2 - 6, lwid, 6);
          g.fillStyle = alpha(c.hot, 0.22); g.fillRect(SX - lwid / 2 + 6, y2 - 6 - lh, lwid - 12, lh);
          g.strokeStyle = ink; g.lineWidth = lw(2); g.strokeRect(SX - lwid / 2 + 6, y2 - 6 - lh, lwid - 12, lh);
          text(g, V, fmt(host.ctl.mass, 0) + ' kg', SX, y2 - 6 - lh / 2 + 4, { px: 13, weight: 800, align: 'center', mono: true });

          // force arrows (length on a square-root scale so both stay readable)
          const Fmax = Math.max(r.F1, host.ctl.mass * H.G);
          const len = (F) => 16 + 52 * Math.sqrt(F / Fmax);
          arrow(g, V, MX, y1 - 64 - len(r.F1), MX, y1 - 64, c.hot, 3, 10);
          text(g, V, fmt(r.F1, 0) + ' N', MX + 12, y1 - 64 - len(r.F1) / 2 + 4, { px: 11.5, mono: true, weight: 700, color: c.hot });
          const Fw = host.ctl.mass * H.G;
          const topL = y2 - 6 - lh;
          arrow(g, V, SX, topL - len(Fw), SX, topL - 2, c.hot, 3, 10);
          text(g, V, 'W ' + fmt(Fw, 0) + ' N', SX + 12, topL - len(Fw) / 2 + 4, { px: 11.5, mono: true, weight: 700, color: c.hot, align: 'left' });
          // pressure tag
          text(g, V, fmt(r.P / 1e5, 1) + ' bar', (MX + SX) / 2, PIPE_Y2 + 46, { px: 13, mono: true, weight: 800, align: 'center', color: c.cold });
          text(g, V, 'same pressure everywhere', (MX + SX) / 2, PIPE_Y2 + 62, { px: 11, color: c.ink2, align: 'center' });
          // travel markers
          text(g, V, 'small piston', MX, CYL_BOT + 42, { px: 11, color: c.ink2, align: 'center' });
          text(g, V, 'big piston', SX, CYL_BOT + 42, { px: 11, color: c.ink2, align: 'center' });
          if (!V.thumb) text(g, V, host.ctl.auto || st.drag ? '' : 'drag the small piston', MX, 52, { px: 11, color: c.ink2, align: 'center' });
          g.restore();

          if (V.thumb) return;
          const Fload = host.ctl.mass * H.G;
          pairBars(g, V, c, L.bars.x, L.bars.y, L.bars.w, [
            { label: 'Force', a: { v: Math.max(r.F1, 1e-6), text: fmt(r.F1, 0) + ' N', color: c.cold, name: 'in' }, b: { v: Fload, text: fmt(Fload, 0) + ' N', color: c.hot, name: 'out' } },
            { label: 'Travel', a: { v: Math.max(st.x1 * 1000, 1e-6), text: fmt(st.x1 * 1000, 0) + ' mm', color: c.cold, name: 'in' }, b: { v: Math.max(r.x2 * 1000, 1e-6), text: fmt(r.x2 * 1000, 1) + ' mm', color: c.hot, name: 'out' } },
            { label: 'Work', a: { v: Math.max(r.F1 * st.x1, 1e-6), text: fmt(r.F1 * st.x1, 1) + ' J', color: c.cold, name: 'in' }, b: { v: Math.max(r.workOut, 1e-6), text: fmt(r.workOut, 1) + ' J', color: c.hot, name: 'out' } },
          ], 64);
          const b = L.bars;
          text(g, V, 'Force × ' + fmt(r.ratio, 1) + ',  travel ÷ ' + fmt(r.ratio, 1), b.x, b.y + 214, { px: 13, weight: 800, halo: false });
          text(g, V, 'Work in includes the stroke wasted on air.', b.x, b.y + 232, { px: 11, color: c.ink2, halo: false });
        },
      };
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
