(function (root) {
  'use strict';
  const OM = root.OM;
  const Cm = OM.cam;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, hatchRect, alpha, spring, plotFrame } = OM.gfx;

  const K = 3; // drawing pixels per millimetre
  const DEG = Math.PI / 180;
  const DISP = (2 * Math.PI) / 3; // the picture turns once every 3 seconds, whatever the real speed
  const RR = 8; // roller radius, mm
  const MASS = 0.05; // follower, kg
  const PRELOAD = 100; // spring force with the follower at the bottom, N
  const LIFT_AXIS = 16; // mm, top of the lift chart

  OM.register({
    id: 'cam',
    title: 'Cam and follower',
    group: 'machines',
    hook: 'A cam is a motion program cut into metal. Spin it and a follower plays the program back, until it goes too fast to keep up.',
    units: 'mm, degrees, N, rpm',
    alt: 'A rotating cam with a spring-loaded roller follower above it, and three charts against cam angle: follower lift, acceleration, and the force between cam and follower, with the region where the follower would leave the cam shaded.',
    controls: [
      { id: 'rpm', type: 'range', label: 'Cam speed', min: 100, max: 4000, step: 50, value: 600, unit: 'rpm' },
      { id: 'lift', type: 'range', label: 'Lift', min: 4, max: 16, step: 1, value: 10, unit: 'mm' },
      { id: 'law', type: 'seg', label: 'Motion law', value: 'cycloidal', options: [{ v: 'cycloidal', l: 'Cycloidal' }, { v: 'harmonic', l: 'Harmonic' }, { v: 'parabolic', l: 'Constant accel.' }] },
      { id: 'rise', type: 'range', label: 'Rise (and fall) angle', min: 30, max: 120, step: 5, value: 70, unit: '°' },
      { id: 'rb', type: 'range', label: 'Base circle radius', min: 10, max: 35, step: 1, value: 25, unit: 'mm' },
      { id: 'k', type: 'range', label: 'Spring stiffness', min: 2, max: 30, step: 1, value: 10, unit: 'N/mm' },
    ],
    content: {
      intro: 'A cam is a disc whose edge is deliberately not round. A follower rides on the edge, so the shape of the edge becomes the motion of the follower. The cam can only push. A spring has to bring the follower back, and that is where the trouble starts when things get fast.',
      steps: [
        { h: 'On the base circle', p: 'Where the edge is a plain circle around the shaft, the follower sits still. This rest is called a dwell, and it is built into the shape on purpose.' },
        { h: 'The lobe lifts', p: 'As the lobe comes round, the follower is pushed out. The motion law decides how gently: the lift is the same, but the speed and acceleration along the way are not.' },
        { h: 'Held at the top', p: 'A short flat stretch at the largest radius keeps the follower at full lift. In an engine this is where the valve stays open.' },
        { h: 'The spring brings it back', p: 'The cam cannot pull. The spring pushes the follower down as the lobe leaves, and it has to push hard enough to keep the roller against the edge the whole way.' },
      ],
      principle: {
        lead: 'Every point on the cam edge is a position, and the speed of the shaft turns that position list into a schedule. Faster shaft, bigger forces: the acceleration grows with the square of the speed.',
        eqs: [
          { label: 'Cycloidal rise', eq: 'y = h ( s − sin 2πs / 2π ), s = θ / β', note: 'h is the lift and β the angle of the rise. The harmonic law is y = h (1 − cos πs) / 2.' },
          { label: 'Peak acceleration', eq: 'a~max~ = C h ω^2^ / β^2^', note: 'C is 4.0 for constant acceleration, 4.93 for harmonic and 6.28 for cycloidal. Double the speed and the acceleration is four times bigger.' },
          { label: 'Force between cam and follower', eq: 'N = m a + F~0~ + k y + m g', note: 'The spring supplies F₀ + k y. If that falls below what is needed to decelerate the follower, N would have to be negative.' },
          { label: 'Pressure angle', eq: 'tan φ = (dy/dθ) / (R~b~ + R~r~ + y)', note: 'The angle between the push and the direction the follower can move. Above about 30° the guide takes a big sideways load.' },
        ],
        points: [
          'The cam can push but not pull, so N can never be negative. When the equation says it must be, the follower leaves the cam. This is **valve float**, and the simulation shows the follower flying off and landing again.',
          'A small base circle with a tall, quick lobe gives a steep edge: a high pressure angle and, in the extreme, a cam that cannot be cut because the roller is wider than the tip of the lobe (undercut).',
          '**What this model leaves out:** the springiness of the follower and its rod (real ones vibrate), friction, oil films and the mass of the roller. The follower is 50 g, the spring is preloaded to 100 N and the roller is 8 mm in radius. The picture turns once every 3 seconds; the force and acceleration figures use the real speed.',
        ],
      },
      myth: {
        claim: 'The cam controls the follower completely, both up and down.',
        truth: 'A cam only pushes. The way back is the spring, and once the cam is fast enough the spring cannot keep up and the follower leaves the surface. Ducati\'s desmodromic engines avoid this by using a second cam to close the valve by force, with no valve spring.',
      },
      tries: [
        { label: 'Slow and safe', text: 'Gentle speed: the force stays positive and the follower hugs the edge.', set: { rpm: 300, lift: 10, law: 'cycloidal', rise: 70, rb: 25, k: 10 } },
        { label: 'Too fast', text: 'Above the float speed the follower leaves the cam near the top of the lobe, overshoots, and lands late.', set: { rpm: 3600, lift: 10, law: 'cycloidal', rise: 70, rb: 25, k: 10 } },
        { label: 'Stiffer spring', text: 'The same speed with a stiffer spring keeps the follower down.', set: { rpm: 3600, lift: 10, law: 'cycloidal', rise: 70, rb: 25, k: 30 } },
        { label: 'Smooth or gentle?', text: 'At 3,100 rpm the cycloidal cam floats, but this one does not: it has the lowest peak acceleration. Switch the law back to compare.', set: { rpm: 3100, law: 'parabolic', lift: 10, rise: 70, rb: 25, k: 10 } },
        { label: 'Small and steep', text: 'A small base circle with a quick rise: a huge pressure angle, and the cam is undercut.', set: { rpm: 600, lift: 14, rise: 40, rb: 12, law: 'cycloidal', k: 10 } },
      ],
      quiz: [
        { q: 'What brings the follower back down after the lobe passes?', opts: ['The cam pulls it back', 'The spring', 'The shaft', 'The roller'], a: 1, why: 'A cam can only push. The spring supplies the return force, and it has to be strong enough to keep the follower touching the cam.' },
        { q: 'You double the cam speed, from 1,000 to 2,000 rpm. The force needed to accelerate the follower becomes…', opts: ['2 times bigger', '4 times bigger', '8 times bigger', 'the same'], a: 1, why: 'Acceleration is proportional to the speed squared, so twice the speed means four times the acceleration and four times the force.' },
        { q: 'The cycloidal law has a higher peak acceleration than the harmonic law. Why is it used for fast cams?', opts: ['It is cheaper to cut', 'Its acceleration starts and ends at zero, so the force changes gently and there is less knocking and wear', 'It lifts the follower higher', 'It needs no spring'], a: 1, why: 'Smooth changes of force avoid jolts (high jerk) that set the follower vibrating and hammer the cam. The price is a higher peak force.' },
      ],
      era: 'Ancient',
      level: 3,
      parts: [
        { name: 'Cam', note: 'The shaped disc. Its outline is the motion plan.' },
        { name: 'Roller follower', note: 'Rides on the edge and carries the output motion.' },
        { name: 'Return spring', note: 'Holds the follower against the cam and brings it back down.' },
        { name: 'Guide', note: 'Lets the follower move only up and down.' },
        { name: 'Camshaft', note: 'The shaft that turns the cam and keeps its timing against the rest of the machine.' },
      ],
      facts: [
        'Water-powered trip hammers worked by cams were common in China by the 1st century AD, and al-Jazari described camshafts in detail in 1206.',
        'A music box plays its tune from a barrel of pins, which is a bank of cams: a program that cannot be erased.',
        'Ducati\'s racing engines of the 1950s used desmodromic valves, which close the valve with a second cam instead of a spring, so valve float cannot happen. Ducati\'s road bikes got them from the late 1960s.',
      ],
      sources: [
        'R. L. Norton, *Design of Machinery*, McGraw-Hill (cam design, motion laws, pressure angle, follower dynamics).',
        'J. E. Shigley and J. J. Uicker, *Theory of Machines and Mechanisms*, Oxford University Press (cam profile geometry).',
      ],
    },

    create(host) {
      const st = { th: 0, fol: null, bins: new Float32Array(360), last: 0 };
      let G = null;
      let L = null;

      const omega = () => (host.ctl.rpm * Math.PI) / 30;
      const params = () => {
        const c = host.ctl;
        return { lift: c.lift / 1000, rise: c.rise * DEG, law: c.law, rb: c.rb / 1000, rr: RR / 1000, mass: MASS, k: c.k * 1000, preload: PRELOAD };
      };
      // Everything that depends only on the shape of the cam.
      function geom() {
        const c = host.ctl;
        const key = [c.lift, c.rise, c.law, c.rb, c.k].join('|');
        if (!G || G.key !== key) {
          const p = params();
          const y = new Float32Array(361), dd = new Float32Array(361);
          for (let i = 0; i <= 360; i++) { const m = Cm.motion(p, i * DEG); y[i] = m.y * 1000; dd[i] = m.ddy; }
          G = { key, p, an: Cm.analyse(p), out: Cm.outline(p, 540), y, dd };
        }
        return G;
      }

      function advanceBy(dth) {
        const g = geom();
        st.th = Cm.advance(st.fol, g.p, st.th, dth, omega());
        const b = Math.floor((Cm.wrap(st.th) * 180) / Math.PI) % 360;
        let k = st.last;
        let guard = 0;
        while (k !== b && guard++ < 360) { k = (k + 1) % 360; st.bins[k] = st.fol.y * 1000; }
        st.last = b;
      }
      function restart() {
        const g = geom();
        st.th = 2 * Math.PI - 0.35;
        st.fol = Cm.createFollower(g.p, st.th, omega());
        st.bins.fill(-1);
        st.last = Math.floor((Cm.wrap(st.th) * 180) / Math.PI) % 360;
        for (let i = 0; i < 3 * 126; i++) advanceBy(0.05);
      }

      const floating = () => !st.fol.contact;
      const live = () => {
        const g = geom();
        const w = omega();
        const m = Cm.motion(g.p, st.th);
        const phi = Cm.pressureAngle(g.p, st.th);
        const N = st.fol.contact ? st.fol.N : 0;
        return { m, phi, N, side: N * Math.tan(phi), phase: Cm.phaseAt(g.p, st.th), w };
      };

      const sim = {
        ref: { w: 780, h: 500 },
        refNarrow: { w: 420, h: 920 },
        state: st,
        init() { restart(); },
        layout(V) {
          L = V.narrow
            ? { scene: { x: 10, y: 0 }, ch: [{ x: 14, y: 500, w: 392, h: 140 }, { x: 14, y: 640, w: 392, h: 140 }, { x: 14, y: 780, w: 392, h: 140 }] }
            : { scene: { x: 0, y: 0 }, ch: [{ x: 420, y: 6, w: 350, h: 160 }, { x: 420, y: 168, w: 350, h: 160 }, { x: 420, y: 330, w: 350, h: 160 }] };
        },
        step(dt) { advanceBy(DISP * dt); },
        thumb() { const g = geom(); st.th = g.p.rise * 0.62; st.fol = Cm.createFollower(g.p, st.th, omega()); },
        onControl() { const g = geom(); st.fol = Cm.createFollower(g.p, st.th, omega()); st.bins.fill(-1); },
        phase() { return live().phase; },
        readouts() {
          const g = geom();
          const l = live();
          const a = g.an.amax * l.w * l.w;
          const pa = l.phi / DEG, pm = g.an.phimax / DEG;
          const over = host.ctl.rpm > g.an.floatRpm;
          return [
            { k: 'Follower lift', v: fmt(st.fol.y * 1000, 1) + ' mm' },
            { k: 'Pressure angle', v: fmt(pa, 0) + '° (max ' + fmt(pm, 0) + '°)', tone: pm > 45 ? 'bad' : pm > 30 ? 'warn' : '' },
            { k: 'Peak acceleration', v: fmt(a / Cm.G, 0) + ' g' },
            { k: 'Cam pushes with', v: floating() ? '0 N (floating)' : fmt(l.N, 0) + ' N', tone: floating() ? 'bad' : '' },
            { k: 'Sideways load', v: fmt(l.side, 0) + ' N' },
            { k: 'Follower floats above', v: fmt(g.an.floatRpm, 0) + ' rpm', tone: over ? 'bad' : '' },
            { k: 'Picture slowed by', v: fmt(l.w / DISP, 0) + ' ×' },
          ];
        },
        caption() {
          const g = geom();
          if (g.out.undercut) return 'Undercut: this cam cannot be cut';
          if (floating()) return 'Follower has left the cam';
          return ['Resting on the base circle', 'Lifting', 'Held at the top', 'Falling'][live().phase];
        },
        describe() {
          const g = geom();
          const l = live();
          return 'Cam at ' + fmt(host.ctl.rpm, 0) + ' rpm, follower lift ' + fmt(st.fol.y * 1000, 1) + ' millimetres. ' + (host.ctl.rpm > g.an.floatRpm ? 'Above ' + fmt(g.an.floatRpm, 0) + ' rpm the follower leaves the cam.' : 'The follower stays in contact.');
        },

        draw(g, V, c) {
          drawScene(g, V, c);
          if (V.thumb) return;
          drawCharts(g, V, c);
        },
      };

      // ------------------------------------------------------------ scene
      function drawScene(g, V, c) {
        const { p, out } = geom();
        const lw = (n) => V.px(n);
        const ink = c.ink;
        g.save();
        g.translate(L.scene.x, L.scene.y);
        const cx = 200, cy = 330;
        const th = st.th;
        const rr = RR * K;
        const yF = st.fol.y;
        const rollerY = cy - (p.rb + p.rr + yF) * 1000 * K;
        const flangeY = rollerY - rr - 26;
        const plateY = 54;
        const Rmax = (p.rb + p.lift) * 1000 * K;

        // fixed plate
        g.fillStyle = c.paper2; g.fillRect(120, plateY, 160, 14);
        hatchRect(g, V, 120, plateY, 160, 14, { gap: 8, color: c.line });
        g.strokeStyle = ink; g.lineWidth = lw(1.5); g.strokeRect(120, plateY, 160, 14);
        text(g, V, 'fixed frame', 286, plateY + 11, { px: 10.5, color: c.ink2, halo: false });

        // return spring
        spring(g, V, cx, plateY + 14, cx, flangeY, 9, 12, c.ink2, 1.6);
        text(g, V, 'spring', cx - 22, (plateY + 14 + flangeY) / 2 + 4, { px: 10.5, color: c.ink2, align: 'right', halo: false });

        // stem, cap and flange
        g.fillStyle = c.metal; g.strokeStyle = ink; g.lineWidth = lw(1.5);
        g.fillRect(cx - 5, 30, 10, flangeY - 30); g.strokeRect(cx - 5, 30, 10, flangeY - 30);
        g.fillRect(cx - 12, 24, 24, 7); g.strokeRect(cx - 12, 24, 24, 7);
        g.fillRect(cx - 30, flangeY, 60, 8); g.strokeRect(cx - 30, flangeY, 60, 8);

        // cam
        g.save();
        g.translate(cx, cy);
        g.rotate(th);
        g.beginPath();
        for (let i = 0; i < out.cam.length; i++) { const q = out.cam[i]; const X = q.x * 1000 * K, Y = q.y * 1000 * K; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }
        g.closePath();
        g.fillStyle = c.metal2; g.fill();
        g.strokeStyle = ink; g.lineWidth = lw(2); g.lineJoin = 'round'; g.stroke();
        // the path the roller centre follows
        g.setLineDash([V.px(4), V.px(3)]);
        g.strokeStyle = alpha(c.cold, 0.9); g.lineWidth = lw(1.3);
        g.beginPath();
        for (let i = 0; i < out.pitch.length; i++) { const q = out.pitch[i]; const X = q.x * 1000 * K, Y = q.y * 1000 * K; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }
        g.closePath(); g.stroke();
        // the base circle
        g.strokeStyle = c.ink3; g.lineWidth = lw(1.2);
        g.beginPath(); g.arc(0, 0, p.rb * 1000 * K, 0, Math.PI * 2); g.stroke();
        g.setLineDash([]);
        // shaft and a mark that shows which way it has turned
        g.beginPath(); g.arc(0, 0, 8, 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill(); g.strokeStyle = ink; g.lineWidth = lw(1.8); g.stroke();
        g.strokeStyle = c.accent; g.lineWidth = lw(3.5); g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, -12); g.lineTo(0, -(p.rb * 1000 * K) * 0.62); g.stroke();
        g.lineCap = 'butt';
        g.restore();

        // fork and roller
        g.fillStyle = c.metal; g.strokeStyle = ink; g.lineWidth = lw(1.5);
        g.fillRect(cx - rr - 7, flangeY + 8, 5, rollerY - flangeY - 2); g.strokeRect(cx - rr - 7, flangeY + 8, 5, rollerY - flangeY - 2);
        g.fillRect(cx + rr + 2, flangeY + 8, 5, rollerY - flangeY - 2); g.strokeRect(cx + rr + 2, flangeY + 8, 5, rollerY - flangeY - 2);
        g.beginPath(); g.arc(cx, rollerY, rr, 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill(); g.lineWidth = lw(2); g.stroke();
        g.beginPath(); g.arc(cx, rollerY, 3, 0, Math.PI * 2); g.fillStyle = ink; g.fill();

        const fl = floating();
        // contact normal and pressure angle
        if (!fl) {
          const s = Cm.surface(p, -th);
          const cs = Math.cos(th), sn = Math.sin(th);
          const px = cx + (s.cam.x * cs - s.cam.y * sn) * 1000 * K;
          const py = cy + (s.cam.x * sn + s.cam.y * cs) * 1000 * K;
          const dx = cx - px, dy = rollerY - py;
          const dl = Math.hypot(dx, dy) || 1;
          line(g, V, px, py, cx + (dx / dl) * 40, rollerY + (dy / dl) * 40, c.hot, 1.6);
          line(g, V, cx, rollerY - rr - 2, cx, rollerY - 46, c.ink2, 1.2, [3, 3]);
          const phi = Cm.pressureAngle(p, th);
          const hiPhi = phi / DEG;
          const tone = hiPhi > 45 ? c.bad : hiPhi > 30 ? c.warn : c.ink;
          text(g, V, 'φ ' + fmt(hiPhi, 0) + '°', cx + rr + 16, rollerY - 4, { px: 11.5, mono: true, weight: 800, color: tone });
        } else {
          text(g, V, 'floating!', cx + rr + 16, rollerY - 4, { px: 12, weight: 800, color: c.bad });
        }
        text(g, V, 'follower', cx + 38, flangeY + 6, { px: 10.5, color: c.ink2, halo: false });

        // the cam, turning clockwise
        if (!V.thumb) {
          text(g, V, 'cam', cx - Rmax * 0.72 - 12, cy + Rmax * 0.72 + 18, { px: 11, color: c.ink2, align: 'right', halo: false });
          const ra = Rmax + 16;
          g.strokeStyle = c.ink2; g.lineWidth = lw(1.4);
          g.beginPath(); g.arc(cx, cy, ra, 25 * DEG, 65 * DEG); g.stroke();
          const a1 = 65 * DEG;
          arrow(g, V, cx + ra * Math.cos(a1 - 0.05), cy + ra * Math.sin(a1 - 0.05), cx + ra * Math.cos(a1 + 0.02), cy + ra * Math.sin(a1 + 0.02), c.ink2, 1.4, 8);
          text(g, V, fmt(host.ctl.rpm, 0) + ' rpm (real)', cx + ra * Math.cos(45 * DEG) + 14, cy + ra * Math.sin(45 * DEG) + 6, { px: 10.5, color: c.ink2, halo: false });
        }
        g.restore();
      }

      // ----------------------------------------------------------- charts
      function drawCharts(g, V, c) {
        const { p, an, y, dd, out } = geom();
        const w = omega();
        const cur = (Cm.wrap(st.th) * 180) / Math.PI;
        const rise = host.ctl.rise;
        const zones = [
          { a: 0, b: rise, name: 'rise', hot: true },
          { a: rise, b: rise + 30, name: 'dwell' },
          { a: rise + 30, b: 2 * rise + 30, name: 'fall', hot: true },
          { a: 2 * rise + 30, b: 360, name: 'rest' },
        ];
        const frame = (r, title, yl, last) => plotFrame(g, V, c, r, title, last ? 'cam angle, degrees' : '', yl);
        const X = (f, a) => f.x0 + (a / 360) * f.w;
        const shade = (f, withNames) => {
          zones.forEach((z) => {
            if (z.hot) { g.fillStyle = alpha(c.accent, 0.16); g.fillRect(X(f, z.a), f.y0, X(f, z.b) - X(f, z.a), f.h); }
          });
          if (withNames) zones.forEach((z) => {
            if (z.b - z.a >= 30) text(g, V, z.name, (X(f, z.a) + X(f, z.b)) / 2, f.y0 + 11, { px: 10, color: c.ink2, align: 'center', halo: false });
          });
        };
        const marker = (f, yy, col) => {
          line(g, V, X(f, cur), f.y0, X(f, cur), f.y0 + f.h, alpha(c.ink, 0.35), 1);
          g.beginPath(); g.arc(X(f, cur), yy, V.px(5.5), 0, Math.PI * 2); g.fillStyle = col || c.accent; g.fill();
          g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
        };
        const xticks = (f) => { for (const a of [0, 90, 180, 270, 360]) text(g, V, String(a), X(f, a), f.y0 + f.h + 14, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false }); };

        // 1. lift
        const f1 = frame(L.ch[0], 'Follower lift, mm', '', false);
        shade(f1, true);
        const Y1 = (v) => f1.y0 + f1.h - (v / LIFT_AXIS) * f1.h;
        for (const v of [0, 8, 16]) { line(g, V, f1.x0 - 4, Y1(v), f1.x0, Y1(v), c.ink, 1); text(g, V, String(v), f1.x0 - 6, Y1(v) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); }
        g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.beginPath();
        for (let i = 0; i <= 360; i++) { if (i) g.lineTo(X(f1, i), Y1(y[i])); else g.moveTo(X(f1, i), Y1(y[i])); }
        g.stroke();
        // where the follower actually was on the last pass
        g.fillStyle = c.bad;
        for (let i = 0; i < 360; i++) {
          const v = st.bins[i];
          if (v >= 0 && Math.abs(v - y[i]) > 0.06) { g.beginPath(); g.arc(X(f1, i + 0.5), Y1(v), V.px(2), 0, Math.PI * 2); g.fill(); }
        }
        marker(f1, Y1(st.fol.y * 1000), floating() ? c.bad : c.accent);

        // 2. acceleration at the real speed
        const f2 = frame(L.ch[1], 'Acceleration at this speed, m/s²', '', false);
        shade(f2, false);
        const peak = Math.max(an.amax * w * w, 1e-9);
        const Y2 = (v) => f2.y0 + f2.h / 2 - (v / peak) * (f2.h / 2 - 3);
        line(g, V, f2.x0, Y2(0), f2.x0 + f2.w, Y2(0), c.ink2, 1, [4, 3]);
        for (const v of [peak, 0, -peak]) { line(g, V, f2.x0 - 4, Y2(v), f2.x0, Y2(v), c.ink, 1); text(g, V, fmt(v, 0), f2.x0 - 6, Y2(v) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); }
        g.strokeStyle = c.cold; g.lineWidth = V.px(2); g.beginPath();
        for (let i = 0; i <= 360; i++) { const v = dd[i] * w * w; if (i) g.lineTo(X(f2, i), Y2(v)); else g.moveTo(X(f2, i), Y2(v)); }
        g.stroke();
        marker(f2, Y2(Cm.motion(p, st.th).ddy * w * w), c.accent);

        // 3. force between cam and follower
        const f3 = frame(L.ch[2], 'Force the cam must supply, N', '', true);
        shade(f3, false);
        const force = new Float32Array(361);
        let fmin = Infinity, fmax = -Infinity;
        for (let i = 0; i <= 360; i++) { const v = p.mass * dd[i] * w * w + p.preload + p.k * (y[i] / 1000) + p.mass * Cm.G; force[i] = v; fmin = Math.min(fmin, v); fmax = Math.max(fmax, v); }
        const lo = Math.min(0, fmin) * 1.08, hi = Math.max(fmax, 50) * 1.08;
        const Y3 = (v) => f3.y0 + f3.h - ((v - lo) / (hi - lo)) * f3.h;
        if (fmin < 0) {
          g.fillStyle = alpha(c.bad, 0.22);
          g.fillRect(f3.x0, Y3(0), f3.w, f3.y0 + f3.h - Y3(0));
          text(g, V, 'cam would have to pull: follower floats', f3.x0 + f3.w - 4, f3.y0 + f3.h - 6, { px: 10.5, color: c.bad, weight: 700, align: 'right' });
        }
        line(g, V, f3.x0, Y3(0), f3.x0 + f3.w, Y3(0), c.ink, 1.3);
        for (const v of [0, hi / 1.08]) { line(g, V, f3.x0 - 4, Y3(v), f3.x0, Y3(v), c.ink, 1); text(g, V, fmt(v, 0), f3.x0 - 6, Y3(v) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); }
        g.strokeStyle = fmin < 0 ? c.bad : c.elec; g.lineWidth = V.px(2); g.beginPath();
        for (let i = 0; i <= 360; i++) { if (i) g.lineTo(X(f3, i), Y3(force[i])); else g.moveTo(X(f3, i), Y3(force[i])); }
        g.stroke();
        const Nnow = floating() ? 0 : st.fol.N;
        marker(f3, Y3(Nnow), floating() ? c.bad : c.accent);
        xticks(f3);
        if (out.undercut) text(g, V, 'undercut: the edge has cusps', f3.x0 + f3.w, f3.y0 - 6, { px: 10.5, color: c.bad, weight: 700, align: 'right', halo: false });
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
