(function (root) {
  'use strict';
  const OM = root.OM;
  const Af = OM.airfoil;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, alpha, parse } = OM.gfx;

  const SHAPES = {
    sym: { eps: 0.1, kappa: 0 },
    cam: { eps: 0.1, kappa: 0.05 },
    thin: { eps: 0.04, kappa: 0.02 },
  };
  const VIEW = { x0: -3.0, x1: 3.4, y0: -2.2, y1: 2.2 };
  const RHO = 1.225;
  const G0 = 9.80665;
  const NT = 170; // tracers
  const TRAIL = 16;

  function rng(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  OM.register({
    id: 'wing',
    title: 'Airplane wing',
    group: 'heat',
    hook: 'A wing makes lift by bending the air downwards. The air over the top gets to the back first, and the reasons you were told are mostly wrong.',
    units: 'deg, m/s, m², kN, Cₗ',
    alt: 'Potential flow around a wing section with a pressure map, tracer particles, a lift arrow, a race between two air particles, and a chart of lift coefficient against angle of attack with the stall.',
    controls: [
      { id: 'aoa', type: 'range', label: 'Angle of attack', min: -6, max: 20, step: 0.5, value: 5, dec: 1, unit: '°' },
      { id: 'shape', type: 'seg', label: 'Wing section', value: 'cam', options: [{ v: 'sym', l: 'Symmetric' }, { v: 'cam', l: 'Cambered' }, { v: 'thin', l: 'Thin' }] },
      { id: 'speed', type: 'range', label: 'Airspeed', min: 10, max: 100, step: 1, value: 50, unit: 'm/s', hint: '50 m/s is about 180 km/h.' },
      { id: 'area', type: 'range', label: 'Wing area', min: 1, max: 40, step: 1, value: 16, unit: 'm²', hint: 'A small four-seat plane has about 16 m².' },
      { id: 'race', type: 'toggle', label: 'Race two air particles', value: false, hint: 'Released together just above and below the wing’s nose.' },
    ],
    content: {
      intro: 'A wing deflects the air it meets downwards, and the air pushes the wing up in return. The flow speeds up over the top, where the pressure falls, and slows underneath, where it rises. Both descriptions are the same thing seen two ways.',
      steps: [
        { h: 'The air splits at the nose', p: 'Some air goes over the wing and some under. The point where it divides is the stagnation point. Tilt the wing up and it slides down to the underside.' },
        { h: 'The top is faster', p: 'Air is pulled round the curved top surface, so it speeds up there. Fast air has lower pressure (Bernoulli). The blue on the top surface is that suction.' },
        { h: 'The flow leaves smoothly', p: 'At the sharp trailing edge the air cannot turn the corner, so it leaves along the wing. That rule (the Kutta condition) fixes how much the air circulates around the wing, and therefore the lift.' },
        { h: 'Too steep and it stalls', p: 'Past about 15° the air can no longer follow the top surface. It breaks away into a turbulent wake, the suction collapses and the lift drops. Try 20°.' },
      ],
      principle: {
        lead: 'Lift is pressure acting on the wing’s surface. The pressure map in the picture is computed from the flow speed at every point, and adding it up around the wing gives the lift.',
        eqs: [
          { label: 'Lift force', eq: 'L = ½ ρ V² S C~L~', note: 'ρ = 1.225 kg/m³ is air density at sea level, V the airspeed, S the wing area.' },
          { label: 'Thin-wing result', eq: 'C~L~ ≈ 2π (α − α~0~)', note: 'α is the angle of attack in radians. That is about 0.11 per degree. A cambered wing has a negative zero-lift angle α~0~.' },
          { label: 'Kutta–Joukowski', eq: 'L′ = ρ V Γ', note: 'Lift per metre of span equals density, speed and the circulation Γ around the wing.' },
          { label: 'Bernoulli', eq: 'p + ½ ρ v² = constant', note: 'Along a streamline, faster air means lower pressure.' },
        ],
        points: [
          'The flow here is the exact mathematical solution for a Joukowski wing section (a circle transformed by z = ζ + 1/ζ). The lift from the pressure map and from the circulation agree to within 2 percent, and the tests check that.',
          '**What this model leaves out:** viscosity. It cannot show drag or the boundary layer. The stall curve is a typical shape added by hand, and the turbulence past the stall is illustrative, not calculated.',
        ],
      },
      myth: {
        title: 'Common myth: equal transit time',
        claim: 'The air over the top has further to go, so it must travel faster to meet up with the air from underneath at the back.',
        truth: 'There is no rule that the two bits of air must meet up again. Switch on the race: the air over the top gets to the back well ahead of the air below. The flow is faster over the top because of the circulation the sharp trailing edge demands, not because it is catching up.',
      },
      tries: [
        { label: 'Cruising, 5°', text: 'A typical angle in steady flight.', set: { aoa: 5, shape: 'cam', speed: 50, area: 16, race: false } },
        { label: 'Zero angle', text: 'The symmetric section makes no lift. The cambered one still does.', set: { aoa: 0 } },
        { label: 'Stall', text: 'Beyond 15° the lift drops and the air breaks away.', set: { aoa: 19, shape: 'cam' } },
        { label: 'Race the air', text: 'Which particle reaches the trailing edge first?', set: { aoa: 5, race: true } },
        { label: 'Slow for landing', text: 'At 28 m/s, even right at the stall angle this wing makes only about 70 percent of its cruise lift. Landing planes use flaps to get more.', set: { speed: 28, aoa: 15, race: false } },
      ],
      quiz: [
        { q: 'Which description of how a wing makes lift is correct?', opts: ['The air over the top must go faster to meet the air from underneath', 'The wing turns the airflow downwards, pressure is lower above and higher below, and the air pushes the wing up in return', 'The wing is sucked up into a vacuum above it', 'Air hits the underside like a skipping stone and nothing else matters'], a: 1, why: 'Pushing air down, lower pressure above and higher pressure below, and the circulation around the wing are all the same physics described from different angles. The equal-transit-time story is the one that is wrong.' },
        { q: 'Two air particles split at the nose of the wing. Which one reaches the trailing edge first in this simulation?', opts: ['The one underneath', 'They arrive together', 'The one over the top', 'It depends on the colour'], a: 2, why: 'The air over the top moves faster and arrives well ahead. Nothing forces the two to meet again.' },
        { q: 'What happens to the lift when the angle of attack is raised well beyond about 15°?', opts: ['It keeps growing in a straight line', 'The air separates from the top surface and the lift drops: a stall', 'It becomes zero exactly', 'The wing gets thicker'], a: 1, why: 'The smooth flow round the top breaks down, the suction collapses and the lift falls. It is why pilots lower the nose to recover.' },
      ],
      sources: [
        'J. D. Anderson Jr., *Fundamentals of Aerodynamics*, McGraw-Hill (potential flow, the Kutta condition, thin airfoil theory).',
        'I. H. Abbott and A. E. von Doenhoff, *Theory of Wing Sections*, Dover (1959).',
      ],
    },

    create(host) {
      const st = { key: '', af: null, field: null, fieldKey: '', tr: null, raceData: null, raceKey: '', raceT: 0, hold: 0, rand: rng(7), peak: 1 };
      let L = null;

      const aoa = () => host.ctl.aoa;
      function ensure() {
        const sh = SHAPES[host.ctl.shape];
        const key = host.ctl.aoa + '|' + host.ctl.shape;
        if (st.key !== key) {
          st.key = key;
          st.af = Af.make({ eps: sh.eps, kappa: sh.kappa, aoaDeg: host.ctl.aoa });
          st.peak = Math.max.apply(null, st.af.surface(240).map((p) => p.speed));
          st.fieldKey = '';
          st.raceKey = '';
        }
        return st.af;
      }
      const stall = () => Af.stallModel(ensure(), aoa());

      // ---- flow area placement
      const X = (u) => L.flow.x + ((u - VIEW.x0) / (VIEW.x1 - VIEW.x0)) * L.flow.w;
      const Y = (v) => L.flow.y + L.flow.h / 2 - (v * L.flow.h) / (VIEW.y1 - VIEW.y0);

      function spawn(t, anywhere) {
        t.x = anywhere ? VIEW.x0 + st.rand() * (VIEW.x1 - VIEW.x0) : VIEW.x0 + st.rand() * 0.15;
        t.y = clamp((st.rand() + st.rand() + st.rand() - 1.5) * 1.5, VIEW.y0 + 0.1, VIEW.y1 - 0.1);
        t.trail = [];
      }
      function initTracers() {
        st.tr = Array.from({ length: NT }, () => { const t = {}; spawn(t, true); return t; });
      }

      function buildField(c) {
        const af = ensure();
        const w = 150, h = Math.round(w * ((VIEW.y1 - VIEW.y0) / (VIEW.x1 - VIEW.x0)));
        if (!st.field) st.field = document.createElement('canvas');
        st.field.width = w; st.field.height = h;
        const fg = st.field.getContext('2d');
        const img = fg.createImageData(w, h);
        const hot = parse(c.hot), cold = parse(c.cold);
        for (let j = 0; j < h; j++) {
          for (let i = 0; i < w; i++) {
            const x = VIEW.x0 + ((i + 0.5) / w) * (VIEW.x1 - VIEW.x0);
            const y = VIEW.y1 - ((j + 0.5) / h) * (VIEW.y1 - VIEW.y0);
            const r = af.velocityScreen(x, y);
            const o = (j * w + i) * 4;
            if (r.inside || !Number.isFinite(r.cp)) { img.data[o + 3] = 0; continue; }
            const cp = clamp(r.cp, -3, 1);
            const col = cp < 0 ? cold : hot;
            const a = cp < 0 ? Math.pow(clamp(-cp / 2.6, 0, 1), 0.75) * 0.8 : Math.pow(clamp(cp, 0, 1), 0.9) * 0.8;
            img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = Math.round(a * 255);
          }
        }
        fg.putImageData(img, 0, 0);
        st.fieldKey = st.key + '|' + c.hot + c.cold;
      }

      function ensureRace() {
        if (st.raceKey === st.key && st.raceData) return st.raceData;
        st.raceData = Af.race(ensure());
        st.raceKey = st.key;
        st.raceT = 0; st.hold = 0;
        return st.raceData;
      }
      function posAt(path, t) {
        if (t <= path[0][0]) return path[0];
        for (let i = 1; i < path.length; i++) if (path[i][0] >= t) {
          const a = path[i - 1], b = path[i], u = (t - a[0]) / Math.max(1e-9, b[0] - a[0]);
          return [t, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
        }
        return path[path.length - 1];
      }

      const sim = {
        ref: { w: 780, h: 470 },
        refNarrow: { w: 420, h: 820 },
        state: st,
        init() { st.key = ''; st.rand = rng(7); ensure(); initTracers(); st.raceT = 0; st.hold = 0; },
        layout(V) {
          L = V.narrow
            ? { flow: { x: 0, y: 6, w: 420, h: Math.round(420 * 4.4 / 6.4) }, chart: { x: 12, y: 330, w: 396, h: 230 }, info: { x: 14, y: 590 } }
            : { flow: { x: 6, y: 8, w: 490, h: Math.round(490 * 4.4 / 6.4) }, chart: { x: 512, y: 14, w: 262, h: 226 }, info: { x: 512, y: 268 } };
          st.fieldKey = '';
        },
        step(dt) {
          const af = ensure();
          const stl = stall().stalled;
          const dtw = dt * 1.5;
          st.tr.forEach((t) => {
            const v1 = af.velocityScreen(t.x, t.y);
            if (v1.inside || !Number.isFinite(v1.u)) { spawn(t, false); return; }
            const v2 = af.velocityScreen(t.x + 0.5 * dtw * v1.u, t.y + 0.5 * dtw * v1.v);
            let u = v2.u, v = v2.v;
            if (!Number.isFinite(u)) { spawn(t, false); return; }
            if (stl && t.x > -0.6 && t.y > -0.1 && t.y < 1.1) {
              const k = clamp((aoa() - Af.STALL_DEG) / 4, 0.3, 1.2);
              u *= 1 - 0.55 * k; v += (st.rand() - 0.35) * 2.6 * k;
            }
            const sp = Math.hypot(u, v) || 1e-9;
            const step = Math.min(dtw * sp, 0.12);
            t.x += (u / sp) * step; t.y += (v / sp) * step;
            t.trail.push([t.x, t.y]);
            if (t.trail.length > TRAIL) t.trail.shift();
            if (t.x > VIEW.x1 || t.x < VIEW.x0 - 0.2 || Math.abs(t.y) > VIEW.y1) spawn(t, false);
          });
          if (host.ctl.race) {
            const r = ensureRace();
            const end = Math.max(r.top.t, r.bottom.t);
            if (st.raceT < end + 0.6) st.raceT += dt * 1.1;
            else { st.hold += dt; if (st.hold > 1.2) { st.raceT = 0; st.hold = 0; } }
          }
        },
        thumb() { ensure(); for (let i = 0; i < 70; i++) sim.step(1 / 30); },
        onControl(id) { if (id === 'race') { st.raceT = 0; st.hold = 0; } },
        readouts() {
          const af = ensure();
          const s = stall();
          const V = host.ctl.speed;
          const q = 0.5 * RHO * V * V;
          const Lf = q * host.ctl.area * s.cl;
          const out = [
            { k: 'Lift coefficient', v: fmt(s.cl, 2), tone: s.stalled ? 'bad' : '' },
            { k: 'Lift', v: fmt(Lf / 1000, 1) + ' kN' },
            { k: 'Could hold up', v: fmt(Lf / G0, 0) + ' kg' },
            { k: 'Dynamic pressure', v: fmt(q / 1000, 2) + ' kPa' },
            { k: 'Fastest air', v: fmt(st.peak, 2) + ' × airspeed' },
            { k: 'Wing section', v: fmt(af.thickness * 100, 0) + ' % thick' },
          ];
          if (host.ctl.race && st.raceData) {
            const r = st.raceData;
            out.push({ k: 'Top beats bottom by', v: fmt((r.bottom.t / r.top.t - 1) * 100, 0) + ' %', tone: 'good' });
          } else out.push({ k: 'Stall angle', v: Af.STALL_DEG + '°' });
          return out;
        },
        caption() { const s = stall(); return s.stalled ? 'Stalled: the flow has separated' : s.cl > 0.05 ? 'Making lift' : s.cl < -0.05 ? 'Pushing down' : 'No lift'; },
        describe() { const s = stall(); return 'Angle of attack ' + fmt(aoa(), 1) + ' degrees, lift coefficient ' + fmt(s.cl, 2) + (s.stalled ? '. The wing is stalled.' : '.'); },

        draw(g, V, c) {
          const af = ensure();
          if (st.fieldKey !== st.key + '|' + c.hot + c.cold) buildField(c);
          const F = L.flow;
          g.fillStyle = alpha(c.paper2, 0.55); g.fillRect(F.x, F.y, F.w, F.h);
          g.imageSmoothingEnabled = true;
          g.drawImage(st.field, F.x, F.y, F.w, F.h);
          g.strokeStyle = c.ink; g.lineWidth = V.px(1.5); g.strokeRect(F.x, F.y, F.w, F.h);

          // tracers
          if (!V.thumb || true) {
            g.lineCap = 'round'; g.lineJoin = 'round';
            st.tr.forEach((t) => {
              if (t.trail.length < 2) return;
              for (let i = 1; i < t.trail.length; i++) {
                const a = i / t.trail.length;
                g.strokeStyle = alpha(c.ink, 0.12 + 0.5 * a); g.lineWidth = V.px(1.2);
                g.beginPath(); g.moveTo(X(t.trail[i - 1][0]), Y(t.trail[i - 1][1])); g.lineTo(X(t.trail[i][0]), Y(t.trail[i][1])); g.stroke();
              }
            });
          }

          // wing body
          g.beginPath();
          af.bodyScreen.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))));
          g.closePath();
          g.fillStyle = c.paper2; g.fill();
          g.fillStyle = alpha(c.metal, 0.55); g.fill();
          g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();

          // lift arrow at the quarter chord
          const s = stall();
          const xs = af.bodyScreen.map((p) => p[0]);
          const xle = Math.min.apply(null, xs), xq = xle + 0.25 * af.chord;
          const a = (aoa() * Math.PI) / 180;
          if (Math.abs(s.cl) > 0.02) {
            const len = clamp(s.cl, -1.2, 2.2) * 62;
            const x0 = X(xq), y0 = Y(0);
            arrow(g, V, x0, y0, x0 - Math.sin(a) * len, y0 - Math.cos(a) * len, c.hot, 3.4, 12);
            text(g, V, 'lift', x0 - Math.sin(a) * len + 8, y0 - Math.cos(a) * len - 4, { px: 12, weight: 800, color: c.hot });
          }
          // free stream direction
          const ax = F.x + 22, ay = F.y + F.h - 28;
          arrow(g, V, ax, ay + Math.sin(a) * 26, ax + Math.cos(a) * 52, ay - Math.sin(a) * 26 + Math.sin(a) * 26 - Math.sin(a) * 26, c.ink2, 2, 9);
          text(g, V, 'air', ax, ay - 8, { px: 11, color: c.ink2, weight: 700 });
          if (s.stalled) text(g, V, 'STALL: the flow has separated', X(0.9), Y(1.75), { px: 13, weight: 800, color: c.bad, align: 'center' });
          if (!V.thumb) {
            text(g, V, 'fast air, low pressure', X(1.75), Y(1.15), { px: 11, color: c.cold, weight: 700, align: 'center', halo: true });
            text(g, V, 'slower, higher pressure', X(1.75), Y(-1.1), { px: 11, color: c.hot, weight: 700, align: 'center', halo: true });
          }

          // race
          if (host.ctl.race) {
            const r = ensureRace();
            const dots = [[r.top, c.accent, 'top'], [r.bottom, c.ink, 'bottom']];
            dots.forEach(([run, col, lab]) => {
              const p = posAt(run.path, st.raceT);
              g.strokeStyle = alpha(col === c.ink ? c.ink : c.accent, 0.8); g.lineWidth = V.px(2);
              g.beginPath();
              for (let i = 0; i < run.path.length && run.path[i][0] <= st.raceT; i++) { const q = run.path[i]; if (i) g.lineTo(X(q[1]), Y(q[2])); else g.moveTo(X(q[1]), Y(q[2])); }
              g.lineTo(X(p[1]), Y(p[2])); g.stroke();
              g.beginPath(); g.arc(X(p[1]), Y(p[2]), V.px(6.5), 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.strokeStyle = c.paper2; g.lineWidth = V.px(2); g.stroke();
            });
            const done = st.raceT >= r.top.t;
            text(g, V, done ? 'top finished first' : 'racing…', X(1.6), Y(-1.9), { px: 12, weight: 800, align: 'center', color: c.ink });
            text(g, V, 'yellow: over the top    black: underneath', F.x + 10, F.y + 16, { px: 10.5, color: c.ink2 });
          }
          if (V.thumb) return;
          // colour key
          const ky = F.y + F.h + 14;
          const gr = g.createLinearGradient(F.x + 10, 0, F.x + 170, 0);
          gr.addColorStop(0, alpha(c.cold, 0.85)); gr.addColorStop(0.45, alpha(c.cold, 0)); gr.addColorStop(0.62, alpha(c.hot, 0)); gr.addColorStop(1, alpha(c.hot, 0.85));
          g.fillStyle = c.paper2; g.fillRect(F.x + 10, ky, 160, 10); g.fillStyle = gr; g.fillRect(F.x + 10, ky, 160, 10); g.strokeStyle = c.ink; g.lineWidth = V.px(1); g.strokeRect(F.x + 10, ky, 160, 10);
          text(g, V, 'lower pressure', F.x + 10, ky + 24, { px: 10.5, color: c.cold, weight: 700, halo: false });
          text(g, V, 'higher', F.x + 170, ky + 24, { px: 10.5, color: c.hot, weight: 700, align: 'right', halo: false });
          text(g, V, 'Pressure compared with the air far away', F.x + 184, ky + 9, { px: 10.5, color: c.ink2, halo: false });

          drawChart(g, V, c, af);
        },
      };

      function drawChart(g, V, c, af) {
        const b = L.chart;
        text(g, V, 'Lift coefficient against angle', b.x, b.y + 10, { px: 12, weight: 700, halo: false });
        const x0 = b.x + 34, y0 = b.y + 22, w = b.w - 44, h = b.h - 52;
        const A0 = -8, A1 = 22, C0 = -1, C1 = 2.2;
        const PX = (a) => x0 + ((a - A0) / (A1 - A0)) * w, PY = (cl) => y0 + h - ((cl - C0) / (C1 - C0)) * h;
        g.fillStyle = alpha(c.paper2, 0.9); g.fillRect(x0, y0, w, h);
        for (const cl of [-1, 0, 1, 2]) { line(g, V, x0, PY(cl), x0 + w, PY(cl), alpha(c.ink, cl === 0 ? 0.4 : 0.12), 1); text(g, V, String(cl), x0 - 5, PY(cl) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); }
        for (const a of [-5, 0, 5, 10, 15, 20]) { line(g, V, PX(a), y0, PX(a), y0 + h, alpha(c.ink, 0.1), 1); text(g, V, String(a), PX(a), y0 + h + 13, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false }); }
        g.strokeStyle = c.ink; g.lineWidth = V.px(1.5); g.strokeRect(x0, y0, w, h);
        // potential-flow line continues past the stall as a dashed guide
        g.setLineDash([V.px(4), V.px(3)]); g.strokeStyle = c.ink2; g.lineWidth = V.px(1.4); g.beginPath();
        for (let a = A0; a <= A1; a += 1) { const v = Af.stallModel(af, a).pot; if (a === A0) g.moveTo(PX(a), PY(clamp(v, C0, C1))); else g.lineTo(PX(a), PY(clamp(v, C0, C1))); }
        g.stroke(); g.setLineDash([]);
        // typical curve with the stall
        g.strokeStyle = c.hot; g.lineWidth = V.px(2.6); g.beginPath();
        for (let a = A0; a <= A1; a += 0.5) { const v = Af.stallModel(af, a).cl; if (a === A0) g.moveTo(PX(a), PY(v)); else g.lineTo(PX(a), PY(v)); }
        g.stroke();
        const s = stall();
        g.beginPath(); g.arc(PX(aoa()), PY(s.cl), V.px(6), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
        text(g, V, 'stall', PX(Af.STALL_DEG) + 5, PY(Af.stallModel(af, Af.STALL_DEG).cl) + 14, { px: 10.5, weight: 800, color: c.bad });
        text(g, V, 'angle of attack, degrees', x0 + w, y0 + h + 28, { px: 10.5, color: c.ink2, align: 'right', halo: false });
        text(g, V, 'dashed: smooth flow', x0 + w - 6, y0 + h - 22, { px: 10, color: c.ink2, align: 'right', halo: false });
        text(g, V, 'solid: with stall', x0 + w - 6, y0 + h - 8, { px: 10, color: c.hot, weight: 700, align: 'right', halo: false });
        // numbers
        const V_ = host.ctl.speed, q = 0.5 * RHO * V_ * V_;
        const I = L.info;
        const Lf = q * host.ctl.area * s.cl;
        text(g, V, 'Lift = ½ ρ V² S C_L', I.x, I.y, { px: 12.5, weight: 800, mono: true, halo: false });
        text(g, V, '= ½ × 1.225 × ' + V_ + '² × ' + host.ctl.area + ' × ' + fmt(s.cl, 2), I.x, I.y + 18, { px: 10.5, mono: true, color: c.ink2, halo: false });
        text(g, V, '= ' + fmt(Lf, 0) + ' N', I.x, I.y + 38, { px: 15, weight: 800, mono: true, color: c.hot, halo: false });
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
