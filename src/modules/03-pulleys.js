(function (root) {
  'use strict';
  const OM = root.OM;
  const Pu = OM.pulleys;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, hatchRect, alpha, pairBars } = OM.gfx;

  const PX_M = 100; // pixels per metre, for lift and rope alike
  const PULL_MAX = 2.0; // metres of rope you can pull
  const Y_TOP = 70; // centre line of the fixed sheaves
  const L0 = 250; // segment length with the load on the floor
  const HANDLE_Y0 = 110;
  const SR = 16; // sheave rope radius (half the rope spacing)

  OM.register({
    id: 'pulleys',
    title: 'Pulleys and block and tackle',
    group: 'machines',
    hook: 'More ropes, less force, more rope to pull. The work never changes.',
    units: 'kg, N, m, J',
    alt: 'A block and tackle lifting a mass, with tension arrows on each supporting rope, rulers for rope pulled and load lifted, and a chart of the force needed for one to six ropes.',
    controls: [
      { id: 'n', type: 'range', label: 'Ropes supporting the load', min: 1, max: 6, step: 1, value: 4 },
      { id: 'mass', type: 'range', label: 'Load', min: 10, max: 300, step: 10, value: 100, unit: 'kg' },
      { id: 'fric', type: 'seg', label: 'Pulleys', value: 0.95, options: [{ v: 1, l: 'Frictionless' }, { v: 0.95, l: 'Real (5% loss each)' }] },
      { id: 'auto', type: 'toggle', label: 'Pull for me', value: true, hint: 'Or drag the handle down yourself.' },
    ],
    content: {
      intro: 'Every rope that holds up the load takes its share of the weight. Four ropes each carry a quarter, so you pull with a quarter of the force. You pay for that with four times as much rope.',
      steps: [
        { h: 'Count the supporting ropes', p: 'Only the rope segments that run between the two blocks hold up the load. The loose end you pull on does not count, even though it is part of the same rope.' },
        { h: 'One rope, one tension', p: 'A rope that passes over a frictionless wheel has the same tension all along it. So each supporting segment carries the same pull, and the segments add up to the weight.' },
        { h: 'Force down, distance up', p: 'To lift the load 1 m, each of the four supporting ropes has to get 1 m shorter. That 4 m of rope has to come through your hands.' },
        { h: 'Work is unchanged', p: 'A quarter of the force over four times the distance is the same work. Friction in the wheels makes you do slightly more, which is why six pulleys are not six times better.' },
      ],
      principle: {
        lead: 'A pulley system is a force multiplier, never an energy multiplier. The ideal mechanical advantage is simply the number of supporting ropes.',
        eqs: [
          { label: 'Force you pull with (ideal)', eq: 'F = W / n = m g / n', note: 'n is the number of supporting rope segments.' },
          { label: 'Rope against load', eq: 'rope pulled = n × height lifted' },
          { label: 'Work in = work out (ideal)', eq: 'F × (n h) = W × h' },
          { label: 'With friction', eq: 'F = W (1 − η) / (1 − η^n^)', note: 'η is the fraction of tension each wheel passes on. With η = 0.95 and n = 4 you pull with 8 percent more than the ideal force.' },
        ],
        points: [
          'With friction the tension falls a little at every wheel, so the segment nearest your hand pulls hardest. The arrows on the ropes show it.',
          '**What this model leaves out:** rope stretch, rope weight, and the force needed to accelerate the load. It assumes you lift slowly.',
        ],
      },
      myth: {
        claim: 'Pulleys reduce the work you have to do.',
        truth: 'They reduce the force, not the work. Work is force times distance, so halving the force means pulling twice as much rope. The bars in the diagram show work in and work out, and they match.',
      },
      tries: [
        { label: 'Single wheel', text: 'One supporting rope. It only changes the direction of the pull.', set: { n: 1, fric: 1 } },
        { label: 'Four ropes', text: 'A quarter of the force, four times the rope.', set: { n: 4, fric: 1, mass: 100 } },
        { label: 'Six ropes with friction', text: 'Each extra wheel adds a little friction.', set: { n: 6, fric: 0.95 } },
        { label: 'A heavy engine block', text: 'Try 300 kg with one rope, then with six.', set: { mass: 300, n: 6, fric: 0.95 } },
      ],
      quiz: [
        { q: 'You lift a 100 kg load with a frictionless block and tackle that has 4 supporting ropes. About how hard do you pull?', opts: ['981 N', '245 N', '490 N', '25 N'], a: 1, why: 'The weight is 100 × 9.81 = 981 N. Four ropes share it, so each carries about 245 N, and that is what you pull with.' },
        { q: 'The load rises 0.5 m with 4 supporting ropes. How much rope do you pull through your hands?', opts: ['0.5 m', '1 m', '2 m', '4 m'], a: 2, why: 'Each of the 4 supporting segments shortens by 0.5 m, so 4 × 0.5 = 2 m has to pass through your hands.' },
        { q: 'Why does a real six-pulley system need more than one sixth of the weight to lift it?', opts: ['Friction in each wheel takes a little of the tension', 'Gravity is stronger on long ropes', 'Six ropes cannot share a load equally', 'The rope gets heavier'], a: 0, why: 'Every wheel loses a few percent of the tension passing through it, and the losses add up across the system.' },
      ],
      sources: [
        'D. Halliday, R. Resnick and J. Walker, *Fundamentals of Physics* (work, energy and simple machines).',
      ],
    },

    create(host) {
      const st = { pull: 0, dir: 1, drag: false };
      let L = null;

      const an = () => Pu.analyse(host.ctl.mass, host.ctl.n, host.ctl.fric);
      const lift = () => st.pull / host.ctl.n;

      function segX(n) {
        const xc = 160;
        return Array.from({ length: n }, (_, k) => xc - ((n - 1) * SR) + k * 2 * SR);
      }
      function handlePos(n) {
        const xs = segX(n);
        return { x: xs[n - 1] + 2 * SR, y: HANDLE_Y0 + st.pull * PX_M };
      }
      const loadSize = () => ({ w: 40 + 0.12 * host.ctl.mass, h: 44 + 0.08 * host.ctl.mass });

      const sim = {
        ref: { w: 780, h: 470 },
        refNarrow: { w: 420, h: 780 },
        state: st,
        drag: 'y',
        init() { st.pull = 0.3; st.dir = 1; st.drag = false; },
        layout(V) {
          L = V.narrow
            ? { scene: { x: 0, y: 6 }, chart: { x: 14, y: 470, w: 392, h: 150 }, bars: { x: 14, y: 640, w: 392 } }
            : { scene: { x: 10, y: 10 }, chart: { x: 450, y: 14, w: 316, h: 200 }, bars: { x: 450, y: 250, w: 316 } };
        },
        step(dt) {
          if (host.ctl.auto && !st.drag) {
            st.pull += st.dir * 0.32 * dt;
            if (st.pull >= PULL_MAX) { st.pull = PULL_MAX; st.dir = -1; }
            if (st.pull <= 0) { st.pull = 0; st.dir = 1; }
          }
        },
        thumb() { st.pull = 0.9; },
        onControl(id) { if (id === 'n') st.pull = Math.min(st.pull, PULL_MAX); },
        pointer(type, x, y) {
          const h = handlePos(host.ctl.n);
          const hx = x - L.scene.x, hy = y - L.scene.y;
          if (type === 'down') {
            if (Math.hypot(hx - h.x, hy - h.y - 10) > 34) return false;
            st.drag = true;
            if (host.ctl.auto) host.set('auto', false);
            return true;
          }
          if (type === 'move' && st.drag) st.pull = clamp((hy - 10 - HANDLE_Y0) / PX_M, 0, PULL_MAX);
          if (type === 'up') st.drag = false;
          return true;
        },
        cursor(x, y) {
          const h = handlePos(host.ctl.n);
          return Math.hypot(x - L.scene.x - h.x, y - L.scene.y - h.y - 10) < 34 ? 'ns-resize' : '';
        },
        key(k) {
          if (k === 'ArrowDown' || k === 'ArrowUp') {
            if (host.ctl.auto) host.set('auto', false);
            st.pull = clamp(st.pull + (k === 'ArrowDown' ? 0.05 : -0.05), 0, PULL_MAX);
            return true;
          }
          return false;
        },
        readouts() {
          const a = an();
          const lf = lift();
          const wIn = a.F * st.pull, wOut = a.W * lf;
          return [
            { k: 'You pull with', v: fmt(a.F, 0) + ' N' },
            { k: 'Load weighs', v: fmt(a.W, 0) + ' N' },
            { k: 'Advantage', v: fmt(a.ma, 2) + ' ×' + (host.ctl.fric < 1 ? ' (ideal ' + host.ctl.n + ')' : '') },
            { k: 'Rope pulled', v: fmt(st.pull, 2) + ' m' },
            { k: 'Load lifted', v: fmt(lf, 2) + ' m' },
            { k: 'Work in', v: fmt(wIn, 0) + ' J' },
            { k: 'Work out', v: fmt(wOut, 0) + ' J' },
          ];
        },
        caption() { return host.ctl.n + (host.ctl.n === 1 ? ' rope' : ' ropes') + ' carry the load'; },
        describe() { const a = an(); return host.ctl.n + ' supporting ropes. You pull with ' + fmt(a.F, 0) + ' newtons to lift a ' + fmt(a.W, 0) + ' newton load.'; },

        draw(g, V, c) {
          drawScene(g, V, c);
          if (V.thumb) return;
          drawChart(g, V, c);
          const a = an(), lf = lift();
          pairBars(g, V, c, L.bars.x, L.bars.y, L.bars.w, [
            { label: 'Force', a: { v: a.F, text: fmt(a.F, 0) + ' N', color: c.cold, name: 'you' }, b: { v: a.W, text: fmt(a.W, 0) + ' N', color: c.hot, name: 'load' } },
            { label: 'Distance', a: { v: Math.max(st.pull, 1e-6), text: fmt(st.pull, 2) + ' m', color: c.cold, name: 'rope' }, b: { v: Math.max(lf, 1e-6), text: fmt(lf, 2) + ' m', color: c.hot, name: 'load' } },
            { label: 'Work', a: { v: Math.max(a.F * st.pull, 1e-6), text: fmt(a.F * st.pull, 0) + ' J', color: c.cold, name: 'in' }, b: { v: Math.max(a.W * lf, 1e-6), text: fmt(a.W * lf, 0) + ' J', color: c.hot, name: 'out' } },
          ], V.narrow ? 58 : 62);
        },
      };

      function drawChart(g, V, c) {
        const b = L.chart;
        text(g, V, 'Force you pull with, by number of ropes', b.x, b.y + 10, { px: 12, weight: 700, halo: false });
        const W = host.ctl.mass * Pu.G;
        const vals = [1, 2, 3, 4, 5, 6].map((n) => Pu.effort(W, n, host.ctl.fric));
        const top = b.y + 40, bot = b.y + b.h - 26;
        const bw = (b.w - 20) / 6;
        vals.forEach((v, i) => {
          const hh = (v / W) * (bot - top);
          const x = b.x + 10 + i * bw + 5;
          const on = i + 1 === host.ctl.n;
          g.fillStyle = on ? c.accent : alpha(c.cold, 0.55);
          g.fillRect(x, bot - hh, bw - 10, hh);
          g.strokeStyle = c.ink; g.lineWidth = V.px(on ? 2 : 1.2);
          g.strokeRect(x, bot - hh, bw - 10, hh);
          text(g, V, String(i + 1), x + (bw - 10) / 2, bot + 14, { px: 11, mono: true, align: 'center', weight: on ? 800 : 500, halo: false });
          text(g, V, fmt(v, 0), x + (bw - 10) / 2, bot - hh - 4, { px: 10.5, mono: true, align: 'center', halo: false, weight: 600 });
        });
        line(g, V, b.x + 4, bot, b.x + b.w - 4, bot, c.ink, 1.5);
        text(g, V, 'ropes (n), force in newtons', b.x + b.w, bot + 28, { px: 10.5, color: c.ink2, align: 'right', halo: false });
      }

      function drawScene(g, V, c) {
        g.save();
        g.translate(L.scene.x, L.scene.y);
        const n = host.ctl.n;
        const an_ = an();
        const xs = segX(n);
        const lf = lift();
        const yM = Y_TOP + L0 - lf * PX_M;
        const ld = loadSize();
        const lw = (px) => V.px(px);
        const ink = c.ink;

        // ceiling
        g.fillStyle = c.paper2; g.fillRect(20, 10, 380, 12);
        hatchRect(g, V, 20, 10, 380, 12, { gap: 8, color: c.line });
        g.strokeStyle = ink; g.lineWidth = lw(1.5); g.strokeRect(20, 10, 380, 12);
        // floor
        const floorY = Y_TOP + L0 + 38 + 70;
        g.fillStyle = c.paper2; g.fillRect(20, floorY, 380, 10);
        hatchRect(g, V, 20, floorY, 380, 10, { gap: 8, color: c.line });
        g.strokeRect(20, floorY, 380, 10);

        // fixed block
        const bx0 = xs[0] - 24, bx1 = xs[n - 1] + 2 * SR + 12;
        line(g, V, bx0 + 14, 22, bx0 + 14, 40, ink, 2);
        line(g, V, bx1 - 14, 22, bx1 - 14, 40, ink, 2);
        g.fillStyle = c.metal2; g.fillRect(bx0, 40, bx1 - bx0, 54);
        g.strokeStyle = ink; g.lineWidth = lw(1.5); g.strokeRect(bx0, 40, bx1 - bx0, 54);

        // movable block
        const mx0 = xs[0] - 22, mx1 = xs[n - 1] + 22;
        g.fillStyle = c.metal2; g.fillRect(mx0, yM - 18, mx1 - mx0, 42);
        g.strokeRect(mx0, yM - 18, mx1 - mx0, 42);

        // sheaves
        const sheave = (x, y) => {
          g.beginPath(); g.arc(x, y, SR - 2, 0, Math.PI * 2);
          g.fillStyle = c.paper2; g.fill(); g.strokeStyle = ink; g.lineWidth = lw(1.5); g.stroke();
          g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fillStyle = ink; g.fill();
        };
        for (let j = 0; j < n - 1; j++) {
          const k = n - 1 - j;
          const xm = (xs[k] + xs[k - 1]) / 2;
          if (j % 2 === 0) sheave(xm, yM); else sheave(xm, Y_TOP);
        }
        sheave(xs[n - 1] + SR, Y_TOP);

        // rope
        g.strokeStyle = c.ink2; g.lineWidth = lw(2.6); g.lineCap = 'butt';
        for (let k = 0; k < n; k++) { g.beginPath(); g.moveTo(xs[k], Y_TOP); g.lineTo(xs[k], yM); g.stroke(); }
        for (let j = 0; j < n - 1; j++) {
          const k = n - 1 - j;
          const xm = (xs[k] + xs[k - 1]) / 2;
          g.beginPath();
          if (j % 2 === 0) g.arc(xm, yM, SR, 0, Math.PI); else g.arc(xm, Y_TOP, SR, Math.PI, 0);
          g.stroke();
        }
        // anchor on the fixed block (even n) or the movable block (odd n)
        g.fillStyle = ink;
        if (n % 2 === 0) { g.beginPath(); g.arc(xs[0], Y_TOP, V.px(4), 0, Math.PI * 2); g.fill(); }
        else { g.beginPath(); g.arc(xs[0], yM, V.px(4), 0, Math.PI * 2); g.fill(); }
        // free end over the redirect wheel, down to the handle
        const hp = handlePos(n);
        g.beginPath(); g.arc(xs[n - 1] + SR, Y_TOP, SR, Math.PI, 0); g.stroke();
        g.beginPath(); g.moveTo(hp.x, Y_TOP); g.lineTo(hp.x, hp.y); g.stroke();

        // hook and load
        const cx = 160;
        line(g, V, cx, yM + 24, cx, yM + 38, ink, 2.5);
        const ly = yM + 38;
        g.fillStyle = alpha(c.hot, 0.22); g.fillRect(cx - ld.w / 2, ly, ld.w, ld.h);
        g.strokeStyle = ink; g.lineWidth = lw(2); g.strokeRect(cx - ld.w / 2, ly, ld.w, ld.h);
        text(g, V, fmt(host.ctl.mass, 0) + ' kg', cx, ly + ld.h / 2 + 4, { px: 13, weight: 800, align: 'center', mono: true });

        // tension arrows on each supporting rope (chain index j counts from the free end)
        const W = an_.W;
        for (let k = 0; k < n; k++) {
          const j = n - 1 - k;
          const T = an_.tensions[j];
          const aL = 14 + 62 * (T / W);
          const ay = yM - 8;
          arrow(g, V, xs[k], ay, xs[k], ay - aL, c.hot, 2.6, 9);
          text(g, V, n <= 2 ? fmt(T, 0) + ' N' : fmt(T, 0), xs[k], ay - aL - 5, { px: 10, mono: true, align: 'center', color: c.hot, weight: 700 });
        }
        // weight and pull arrows
        const wx = cx - ld.w / 2 - 16;
        arrow(g, V, wx, ly + 6, wx, ly + 6 + 42, c.hot, 3, 10);
        text(g, V, 'W ' + fmt(W, 0) + ' N', wx - 6, ly + 26, { px: 11, mono: true, weight: 700, align: 'right', color: c.hot });
        // handle
        g.fillStyle = c.accent; g.strokeStyle = ink; g.lineWidth = lw(2);
        g.fillRect(hp.x - 13, hp.y, 26, 12); g.strokeRect(hp.x - 13, hp.y, 26, 12);
        arrow(g, V, hp.x, hp.y + 16, hp.x, hp.y + 16 + 38, c.cold, 3, 10);
        text(g, V, 'F ' + fmt(an_.F, 0) + ' N', hp.x + 10, hp.y + 40, { px: 11, mono: true, weight: 700, color: c.cold });
        if (!V.thumb) text(g, V, st.drag || !host.ctl.auto ? '' : 'drag me', hp.x + 18, hp.y + 10, { px: 10.5, color: c.ink2 });

        // rulers: rope pulled (right) and load lifted (left), same scale
        const rx = 372;
        line(g, V, rx, HANDLE_Y0, rx, HANDLE_Y0 + PULL_MAX * PX_M, c.ink2, 1.2);
        for (let m = 0; m <= PULL_MAX + 1e-9; m += 0.5) {
          line(g, V, rx - 4, HANDLE_Y0 + m * PX_M, rx + 4, HANDLE_Y0 + m * PX_M, c.ink2, 1.2);
          text(g, V, fmt(m, 1), rx + 8, HANDLE_Y0 + m * PX_M + 4, { px: 10, mono: true, color: c.ink2, halo: false });
        }
        g.fillStyle = c.cold; g.beginPath();
        g.moveTo(rx, HANDLE_Y0 + st.pull * PX_M); g.lineTo(rx - 12, HANDLE_Y0 + st.pull * PX_M - 6); g.lineTo(rx - 12, HANDLE_Y0 + st.pull * PX_M + 6); g.closePath(); g.fill();
        text(g, V, 'rope pulled (m)', rx + 6, HANDLE_Y0 - 12, { px: 10.5, color: c.ink2, align: 'right', halo: false });
        const lx = 38, y0 = Y_TOP + L0 + 38 + ld.h; // load bottom at rest
        line(g, V, lx, y0, lx, y0 - PULL_MAX * PX_M, c.ink2, 1.2);
        for (let m = 0; m <= PULL_MAX + 1e-9; m += 0.5) {
          line(g, V, lx - 4, y0 - m * PX_M, lx + 4, y0 - m * PX_M, c.ink2, 1.2);
          text(g, V, fmt(m, 1), lx - 7, y0 - m * PX_M + 4, { px: 10, mono: true, color: c.ink2, align: 'right', halo: false });
        }
        g.fillStyle = c.hot; g.beginPath();
        g.moveTo(lx, y0 - lf * PX_M); g.lineTo(lx + 12, y0 - lf * PX_M - 6); g.lineTo(lx + 12, y0 - lf * PX_M + 6); g.closePath(); g.fill();
        text(g, V, 'load lifted (m)', lx - 16, y0 - PULL_MAX * PX_M - 20, { px: 10.5, color: c.ink2, halo: false });
        if (n > 2 && !V.thumb) text(g, V, 'rope tensions in newtons', xs[0] - 22, yM - 98, { px: 10.5, color: c.hot, weight: 700, halo: false });
        g.restore();
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
