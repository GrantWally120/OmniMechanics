(function (root) {
  'use strict';
  const OM = root.OM;
  const Tb = OM.turbine;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, hatchRect, alpha, plotFrame, dim } = OM.gfx;

  const N_PART = 54;
  const hash = (i, k) => { const x = Math.sin(i * 91.7 + k * 17.3) * 43758.5453; return x - Math.floor(x); };
  const mw = (w) => (w >= 1e6 ? fmt(w / 1e6, 2) + ' MW' : fmt(w / 1e3, 0) + ' kW');

  OM.register({
    id: 'turbine',
    title: 'Wind turbine and the Betz limit',
    group: 'heat',
    hook: 'A turbine slows the wind to make power. Take too little and you waste it, take too much and the air piles up. The best you can do is 59 percent.',
    units: 'm/s, m, MW, rpm',
    alt: 'A three-bladed wind turbine seen from the front with its blades turning, a side view of the stream of air slowing and widening as it passes through the rotor, a chart of the power coefficient against tip-speed ratio with the Betz limit, and the power curve against wind speed.',
    controls: [
      { id: 'wind', type: 'range', label: 'Wind speed', min: 0, max: 30, step: 0.5, value: 9, dec: 1, unit: 'm/s' },
      { id: 'diam', type: 'range', label: 'Rotor diameter', min: 20, max: 130, step: 5, value: 80, unit: 'm' },
      { id: 'auto', type: 'toggle', label: 'Controller picks the best rotor speed', value: true, hint: 'Switch it off to set the tip-speed ratio yourself.' },
      { id: 'lam', type: 'range', label: 'Tip-speed ratio', min: 2, max: 14, step: 0.5, value: 8, dec: 1, showIf: (c) => !c.auto },
    ],
    content: {
      intro: 'A wind turbine does not make power from nothing. It slows the wind down and takes the energy the air loses. It can only take part of it: take it all and the air would stop dead at the rotor, pile up in front and flow around instead.',
      steps: [
        { h: 'The wind arrives', p: 'The power in a moving stream of air depends on the area the rotor sweeps and on the cube of the wind speed. Twice the wind speed carries eight times the power.' },
        { h: 'The rotor slows the air', p: 'The blades turn the wind\'s motion into rotation, so the air slows as it passes through. Slower air takes up more room, so the stream widens as it goes by the rotor.' },
        { h: 'The wake', p: 'Behind the rotor the air is slower and turbulent. The power taken is the kinetic energy lost between the front and the back of that stream of air.' },
        { h: 'The controller', p: 'The rotor turns at the speed that gets the most from the blades (its best tip-speed ratio). In strong wind it twists the blades to spill some of the wind and hold the rated power, and in a storm it stops.' },
      ],
      principle: {
        lead: 'There is a best amount of slowing. A rotor that barely slows the air takes nothing, and one that stops it takes nothing either. Between the two lies a peak of 16/27, the Betz limit.',
        eqs: [
          { label: 'Power in the wind', eq: 'P~wind~ = ½ ρ A v^3^', note: 'ρ is the air density (1.225 kg/m³), A the area swept by the rotor and v the wind speed. A 100 m rotor in a 12 m/s wind meets 8.3 MW.' },
          { label: 'Power taken', eq: 'P = ½ ρ A v^3^ C~p~,  C~p~ = 4a (1 − a)^2^', note: 'a is the fraction of the wind speed lost at the rotor. The air is at (1 − a)v at the rotor and (1 − 2a)v far behind. C_p is greatest when a = 1/3.' },
          { label: 'The Betz limit', eq: 'C~p,max~ = 16 / 27 ≈ 0.593', note: 'No turbine of this kind can take more than 59.3 percent of the wind\'s power. Good machines reach 45 to 50 percent.' },
          { label: 'Tip-speed ratio', eq: 'λ = ω R / v', note: 'The speed of the blade tip compared with the wind. A three-blade rotor does best at about 8, with the tips moving eight times faster than the wind.' },
        ],
        points: [
          'A real rotor falls short of the Betz limit because of drag on the blades, swirl in the wake and the finite number of blades. The chart uses a standard fit to the measured behaviour of three-bladed rotors, with a best C_p of 0.48.',
          'Above the rated wind speed the blades are pitched to spill wind, so the power stays flat while the available power keeps climbing with the cube of the wind speed.',
          '**What this model leaves out:** gusts and turbulence, other turbines upwind, wind that is not square-on to the rotor, changes of air density with height and temperature, and blade-by-blade detail. The rotor is treated as a disc, and 92 percent of the shaft power is assumed to reach the grid.',
        ],
      },
      myth: {
        claim: 'The perfect turbine would take all the energy out of the wind.',
        truth: 'It would stop the air. A rotor that took all the wind\'s energy would leave the air behind it standing still, and the oncoming air would have nowhere to go but around it. The best compromise slows the wind to a third of its speed behind the rotor, and takes 59.3 percent of the power.',
      },
      tries: [
        { label: 'Light breeze', text: 'Little power, and the rotor turns slowly.', set: { wind: 5, diam: 80, auto: true } },
        { label: 'Rated wind', text: 'At 12 m/s the turbine reaches its rated power.', set: { wind: 12, diam: 80, auto: true } },
        { label: 'Storm', text: 'At 20 m/s the blades are pitched to hold the power down.', set: { wind: 20, diam: 80, auto: true } },
        { label: 'Too windy', text: 'Above 25 m/s the machine parks itself.', set: { wind: 27, diam: 80, auto: true } },
        { label: 'Wrong speed', text: 'Set the tip-speed ratio to 3 and watch the power coefficient fall.', set: { wind: 8, diam: 80, auto: false, lam: 3 } },
        { label: 'Giant rotor', text: 'A 130 m rotor sweeps nearly three times the area of an 80 m one.', set: { wind: 9, diam: 130, auto: true } },
      ],
      quiz: [
        { q: 'The wind speed doubles. About how much more power is in the wind?', opts: ['2 times', '4 times', '8 times', '16 times'], a: 2, why: 'Power in the wind goes with the cube of the speed, and 2 × 2 × 2 = 8.' },
        { q: 'Why can a turbine not take all the energy from the wind?', opts: ['The blades are too heavy', 'The air would have to stop behind it, and then nothing more could flow through', 'Friction in the gearbox', 'The wind changes direction'], a: 1, why: 'Taking all the energy means stopping the air. Stopped air blocks the oncoming air, so the turbine would starve itself.' },
        { q: 'Why do big turbines pitch their blades in strong wind?', opts: ['To catch more wind', 'To spill some of the wind and keep the power at the level the machine was built for', 'To make the rotor turn backwards', 'To slow the wind down'], a: 1, why: 'Above the rated wind speed there is more power in the wind than the generator and the structure can take, so the blades are turned to catch less of it.' },
      ],
      era: 'Betz, 1919',
      level: 3,
      parts: [
        { name: 'Blades', note: 'Aerofoils. The wind makes lift on them, and the lift turns the rotor.' },
        { name: 'Hub and pitch drive', note: 'Turn each blade about its length to catch more or less wind.' },
        { name: 'Nacelle', note: 'Holds the gearbox (or a direct-drive generator) and the electronics.' },
        { name: 'Tower', note: 'Lifts the rotor up into faster, smoother wind.' },
        { name: 'Controller', note: 'Reads the wind, sets the rotor speed and the blade pitch, and shuts the machine down in a storm.' },
      ],
      facts: [
        'Albert Betz worked out in 1919 that no wind turbine can take more than 16/27, or 59.3 percent, of the power in the wind.',
        'Charles Brush built the first automatically working wind turbine for electricity in Cleveland in 1888, and Poul la Cour built his first in Denmark in 1891.',
        'The Vestas V236 turbine has a rotor 236 metres across and blades 115.5 metres long, each one longer than the wingspan of a Boeing 747 (68 metres).',
        'Because power goes with the cube of the wind speed, a site where the average wind is only 10 percent faster gives about a third more energy.',
      ],
      sources: [
        'A. Betz, "Das Maximum der theoretisch möglichen Ausnützung des Windes durch Windmotoren", *Zeitschrift für das gesamte Turbinenwesen* (1920).',
        'T. Burton, N. Jenkins, D. Sharpe and E. Bossanyi, *Wind Energy Handbook*, Wiley (momentum theory, power curves, control).',
        'J. G. Slootweg, S. W. H. de Haan, H. Polinder and W. L. Kling, "General model for representing variable speed wind turbines in power system dynamics simulations", *IEEE Transactions on Power Systems* 18 (2003), source of the power coefficient fit.',
      ],
    },

    create(host) {
      const st = { t: 0, th: 0, om: 0, parts: [] };
      let L = null;
      let curve = null;

      const op = () => Tb.operate({ v: host.ctl.wind, D: host.ctl.diam, auto: host.ctl.auto, lambdaSet: host.ctl.lam });
      const induction = (o) => (o.state === 'running' || o.state === 'limited' ? Tb.inductionFor(Math.min(o.cp, Tb.BETZ)) || 0 : 0);
      const pcurve = () => {
        const D = host.ctl.diam;
        if (!curve || curve.D !== D) curve = { D, pts: Tb.powerCurve(D, undefined, 30, 150), rated: Tb.ratedPower(D) };
        return curve;
      };

      const sim = {
        ref: { w: 780, h: 580 },
        refNarrow: { w: 420, h: 1090 },
        state: st,
        init() {
          st.t = 0; st.th = 0.4;
          st.om = op().omega;
          st.parts = [];
          for (let i = 0; i < N_PART; i++) st.parts.push({ s: hash(i, 1), f: (hash(i, 2) * 2 - 1) * 1.6 });
        },
        layout(V) {
          L = V.narrow
            ? { front: { x: 0, y: 4, w: 420, h: 270 }, tube: { x: 0, y: 280, w: 420, h: 220 }, cp: { x: 14, y: 505, w: 392, h: 270 }, pw: { x: 14, y: 790, w: 392, h: 270 } }
            : { front: { x: 0, y: 4, w: 390, h: 280 }, tube: { x: 390, y: 4, w: 390, h: 280 }, cp: { x: 10, y: 296, w: 380, h: 280 }, pw: { x: 400, y: 296, w: 372, h: 280 } };
        },
        step(dt) {
          const o = op();
          st.t += dt;
          st.om += (o.omega - st.om) * (1 - Math.exp(-dt / 2));
          st.th += st.om * dt;
          const a = induction(o);
          const speed = o.state === 'parked' || host.ctl.wind <= 0 ? 0 : 0.55 * host.ctl.wind;
          st.parts.forEach((p) => {
            const x = p.s;
            const vx = 1 - a * (1 + Math.tanh((x - 0.38) / 0.1));
            p.s += (speed * Math.max(vx, 0.08) * dt) / 100;
            if (p.s > 1) { p.s -= 1; p.f = (hash(Math.floor(st.t * 7 + p.f * 100), 3) * 2 - 1) * 1.6; }
          });
        },
        thumb() { st.th = 0.5; st.om = 1; },
        readouts() {
          const o = op();
          const a = induction(o);
          return [
            { k: 'Power in the wind', v: mw(o.pAvail) },
            { k: 'Power made', v: mw(o.power), tone: o.state === 'limited' ? 'warn' : '' },
            { k: 'Share taken', v: o.power > 0 ? fmt((o.power / ((o.pAvail || 1) * Tb.ETA)) * 100, 0) + ' % (Betz ' + fmt(Tb.BETZ * 100, 1) + ' %)' : '–' },
            { k: 'Rotor speed', v: fmt(o.rpm, 1) + ' rpm' },
            { k: 'Blade tip speed', v: fmt(o.tip, 0) + ' m/s (λ ' + fmt(o.lambda, 1) + ')' },
            { k: 'Blade pitch', v: fmt(o.beta, 1) + '°' },
            { k: 'Wind behind rotor', v: fmt(host.ctl.wind * (1 - 2 * a), 1) + ' m/s' },
          ];
        },
        caption() {
          const o = op();
          return { waiting: 'Waiting: too little wind to start', running: 'Making power', limited: 'Blades pitched to hold the rated power', parked: 'Parked: too windy for the machine' }[o.state];
        },
        describe() {
          const o = op();
          return 'Wind ' + fmt(host.ctl.wind, 1) + ' metres per second. ' + (o.state === 'running' || o.state === 'limited' ? 'The turbine makes ' + mw(o.power) + '.' : o.state === 'parked' ? 'It is parked.' : 'It is not making power yet.');
        },
        draw(g, V, c) {
          drawFront(g, V, c, L.front);
          if (V.thumb) return;
          drawTube(g, V, c, L.tube);
          drawCp(g, V, c, L.cp);
          drawPower(g, V, c, L.pw);
        },
      };

      // ------------------------------------------------- the rotor, seen from the front
      function drawFront(g, V, c, r) {
        const o = op();
        g.save();
        g.translate(r.x, r.y);
        const cx = r.w / 2, ground = r.h - 22;
        const R = Math.min(r.w * 0.36, ground * 0.46);
        const hy = ground - R * 1.18;
        const ink = c.ink;
        // sky and ground
        g.fillStyle = c.paper2; g.fillRect(0, ground, r.w, r.h - ground);
        hatchRect(g, V, 0, ground, r.w, r.h - ground, { gap: 9, color: c.line });
        line(g, V, 0, ground, r.w, ground, ink, 1.6);
        // swept area
        g.beginPath(); g.arc(cx, hy, R, 0, Math.PI * 2);
        g.fillStyle = alpha(c.cold, 0.1); g.fill();
        g.setLineDash([V.px(5), V.px(4)]); g.strokeStyle = c.cold; g.lineWidth = V.px(1.3); g.stroke(); g.setLineDash([]);
        // tower
        g.beginPath(); g.moveTo(cx - 4, hy); g.lineTo(cx + 4, hy); g.lineTo(cx + 8, ground); g.lineTo(cx - 8, ground); g.closePath();
        g.fillStyle = c.metal2; g.fill(); g.strokeStyle = ink; g.lineWidth = V.px(1.6); g.stroke();
        // blades
        const sq = Math.cos(Math.min(o.beta, 60) * Tb.DEG);
        for (let k = 0; k < 3; k++) {
          g.save(); g.translate(cx, hy); g.rotate(st.th + (k * 2 * Math.PI) / 3 - Math.PI / 2);
          g.beginPath();
          const n = 14;
          for (let i = 0; i <= n; i++) { const t = i / n; const x = R * (0.07 + 0.93 * t); const w = (7 * Math.pow(1 - t, 0.7) + 1.3) * (0.55 + 0.45 * sq); if (i === 0) g.moveTo(x, -w); else g.lineTo(x, -w); }
          for (let i = n; i >= 0; i--) { const t = i / n; const x = R * (0.07 + 0.93 * t); const w = (7 * Math.pow(1 - t, 0.7) + 1.3) * (0.55 + 0.45 * sq); g.lineTo(x, w * 0.6); }
          g.closePath();
          g.fillStyle = c.paper; g.fill(); g.strokeStyle = ink; g.lineWidth = V.px(1.6); g.lineJoin = 'round'; g.stroke();
          g.restore();
        }
        g.beginPath(); g.arc(cx, hy, 8, 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill(); g.strokeStyle = ink; g.lineWidth = V.px(2); g.stroke();
        if (!V.thumb) {
          dim(g, V, cx - R, hy + R + 10, cx + R, hy + R + 10, 'D = ' + fmt(host.ctl.diam, 0) + ' m', 8);
          text(g, V, 'seen from the front', 8, 16, { px: 11.5, weight: 700, halo: false });
          const msg = { waiting: 'waiting for wind', running: 'making power', limited: 'blades pitched ' + fmt(o.beta, 0) + '°', parked: 'parked, blades feathered' }[o.state];
          text(g, V, msg, r.w - 8, 16, { px: 11.5, color: o.state === 'limited' ? c.warn : c.ink2, weight: 700, align: 'right', halo: false });
        }
        g.restore();
      }

      // ------------------------------------------ the stream of air, seen from the side
      function drawTube(g, V, c, r) {
        const o = op();
        const a = induction(o);
        const v = host.ctl.wind;
        g.save();
        g.translate(r.x, r.y);
        const w = r.w, h = r.h;
        const xr = w * 0.38, cy = h * 0.55;
        const half = h * 0.24; // half height of the stream at the rotor
        const vx = (x) => 1 - a * (1 + Math.tanh((x / w - 0.38) / 0.1));
        const rad = (x) => half * Math.sqrt((1 - a) / Math.max(vx(x), 0.05));
        text(g, V, 'seen from the side', 8 + (V.narrow ? 14 : 0), 16, { px: 11.5, weight: 700, halo: false });
        // the wake
        g.beginPath();
        for (let x = xr; x <= w - 6; x += 5) { const y = cy - rad(x); if (x === xr) g.moveTo(x, y); else g.lineTo(x, y); }
        for (let x = w - 6; x >= xr; x -= 5) g.lineTo(x, cy + rad(x));
        g.closePath();
        g.fillStyle = alpha(c.hot, 0.1 + 0.16 * clamp(a * 3, 0, 1)); g.fill();
        // the stream tube
        g.setLineDash([V.px(6), V.px(4)]); g.strokeStyle = c.cold; g.lineWidth = V.px(1.6);
        g.beginPath(); for (let x = 6; x <= w - 6; x += 5) { const y = cy - rad(x); if (x === 6) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
        g.beginPath(); for (let x = 6; x <= w - 6; x += 5) { const y = cy + rad(x); if (x === 6) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke();
        g.setLineDash([]);
        // tower and rotor disc
        g.fillStyle = c.metal2; g.strokeStyle = c.ink; g.lineWidth = V.px(1.6);
        g.fillRect(xr - 4, cy + half + 2, 8, h - cy - half - 14); g.strokeRect(xr - 4, cy + half + 2, 8, h - cy - half - 14);
        g.fillRect(xr - 14, cy - 5, 14, 10); g.strokeRect(xr - 14, cy - 5, 14, 10);
        g.strokeStyle = c.ink; g.lineWidth = V.px(4); g.lineCap = 'round';
        g.beginPath(); g.moveTo(xr, cy - half); g.lineTo(xr, cy + half); g.stroke(); g.lineCap = 'butt';
        // air
        st.parts.forEach((p, i) => {
          const x = 6 + p.s * (w - 12);
          const inTube = Math.abs(p.f) <= 1;
          const y = inTube ? cy + p.f * rad(x) : cy + Math.sign(p.f) * (rad(x) + (Math.abs(p.f) - 1) * half * 0.9);
          if (y < 22 || y > h - 8) return;
          g.beginPath(); g.arc(x, y, inTube ? 2.4 : 1.7, 0, Math.PI * 2);
          g.fillStyle = inTube ? alpha(c.cold, 0.85) : alpha(c.ink3, 0.5); g.fill();
        });
        // speeds
        if (!V.thumb) {
          const tag = (x, label, val, col) => {
            text(g, V, label, x, 30, { px: 10.5, color: c.ink2, align: 'center', halo: false });
            text(g, V, fmt(val, 1) + ' m/s', x, 43, { px: 11.5, mono: true, weight: 700, color: col, align: 'center', halo: false });
          };
          tag(w * 0.1, 'far upwind', v, c.cold);
          tag(xr, 'at the rotor', v * (1 - a), c.ink);
          tag(w * 0.84, 'far behind', v * (1 - 2 * a), c.hot);
          if (a > 0) text(g, V, 'a = ' + fmt(a, 2) + (Math.abs(a - 1 / 3) < 0.02 ? ' (the Betz optimum)' : ''), w * 0.5, h - 10, { px: 11, mono: true, color: c.ink2, align: 'center', halo: false });
          arrow(g, V, 12, cy, 12 + 30, cy, c.ink2, 1.6, 8);
        }
        g.restore();
      }

      // ---------------------------------------------------- power coefficient chart
      function drawCp(g, V, c, r) {
        const o = op();
        const f = plotFrame(g, V, c, r, 'Share of the wind\'s power taken', 'tip-speed ratio  λ', '');
        const LM = 15, CM = 0.65;
        const X = (l) => f.x0 + (l / LM) * f.w, Y = (v) => f.y0 + f.h - (v / CM) * f.h;
        for (const l of [0, 5, 10, 15]) { line(g, V, X(l), f.y0 + f.h, X(l), f.y0 + f.h + 4, c.ink, 1); text(g, V, String(l), X(l), f.y0 + f.h + 15, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false }); }
        for (const v of [0, 0.2, 0.4, 0.6]) { line(g, V, f.x0 - 4, Y(v), f.x0, Y(v), c.ink, 1); text(g, V, fmt(v * 100, 0) + '%', f.x0 - 6, Y(v) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); }
        line(g, V, f.x0, Y(Tb.BETZ), f.x0 + f.w, Y(Tb.BETZ), c.bad, 1.6, [6, 4]);
        text(g, V, 'Betz limit 59.3 %', f.x0 + f.w - 4, Y(Tb.BETZ) - 5, { px: 10.5, color: c.bad, weight: 700, align: 'right', halo: false });
        if (o.beta > 0.05) {
          g.strokeStyle = alpha(c.ink3, 0.8); g.lineWidth = V.px(1.4); g.setLineDash([V.px(3), V.px(3)]); g.beginPath();
          for (let l = 0.2; l <= LM; l += 0.2) { const y = Y(Tb.cp(l, 0)); if (l === 0.2) g.moveTo(X(l), y); else g.lineTo(X(l), y); }
          g.stroke(); g.setLineDash([]);
        }
        g.strokeStyle = c.elec; g.lineWidth = V.px(2.6); g.beginPath();
        for (let l = 0.2; l <= LM; l += 0.2) { const y = Y(Tb.cp(l, o.beta)); if (l === 0.2) g.moveTo(X(l), y); else g.lineTo(X(l), y); }
        g.stroke();
        if (o.state === 'running' || o.state === 'limited' || o.state === 'waiting') {
          const cpv = Tb.cp(o.lambda, o.beta);
          g.beginPath(); g.arc(X(clamp(o.lambda, 0, LM)), Y(cpv), V.px(6), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
          text(g, V, 'λ ' + fmt(o.lambda, 1) + ': ' + fmt(cpv * 100, 0) + ' %', X(clamp(o.lambda, 0, LM)) + 9, Y(cpv) - 9, { px: 11, mono: true, weight: 700 });
        }
      }

      // ----------------------------------------------------------- power curve
      function drawPower(g, V, c, r) {
        const o = op();
        const pc = pcurve();
        const PM = Math.max(pc.rated * 1.18, 1);
        const f = plotFrame(g, V, c, r, 'Power against wind speed, ' + (PM >= 1e6 ? 'MW' : 'kW'), 'wind speed, m/s', '');
        const VM = 30;
        const X = (v) => f.x0 + (v / VM) * f.w, Y = (p) => f.y0 + f.h - (p / PM) * f.h;
        for (const v of [0, 10, 20, 30]) { line(g, V, X(v), f.y0 + f.h, X(v), f.y0 + f.h + 4, c.ink, 1); text(g, V, String(v), X(v), f.y0 + f.h + 15, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false }); }
        const unit = PM >= 1e6 ? 1e6 : 1e3;
        const ticks = PM >= 1e6 ? [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20].filter((t) => t * 1e6 <= PM) : [0, 200, 400, 600, 800, 1000].filter((t) => t * 1e3 <= PM);
        const stepIdx = Math.max(1, Math.ceil(ticks.length / 4));
        ticks.forEach((t, i) => { if (i % stepIdx) return; const p = t * unit; line(g, V, f.x0 - 4, Y(p), f.x0, Y(p), c.ink, 1); text(g, V, fmt(t, 0), f.x0 - 6, Y(p) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); });
        for (const [v, lab] of [[Tb.V_IN, 'cut-in'], [Tb.V_RATED, 'rated'], [Tb.V_OUT, 'cut-out']]) {
          line(g, V, X(v), f.y0, X(v), f.y0 + f.h, alpha(c.ink3, 0.6), 1, [2, 4]);
          text(g, V, lab, X(v), f.y0 + 10, { px: 10, color: c.ink2, align: v === Tb.V_OUT ? 'right' : v === Tb.V_IN ? 'left' : 'center', halo: false });
        }
        line(g, V, f.x0, Y(pc.rated), f.x0 + f.w, Y(pc.rated), alpha(c.warn, 0.7), 1.2, [5, 3]);
        g.strokeStyle = c.hot; g.lineWidth = V.px(2.6); g.beginPath();
        pc.pts.forEach((p, i) => { if (i) g.lineTo(X(p.v), Y(p.p)); else g.moveTo(X(p.v), Y(p.p)); });
        g.stroke();
        g.beginPath(); g.arc(X(clamp(host.ctl.wind, 0, VM)), Y(o.power), V.px(6), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
        text(g, V, mw(o.power), X(clamp(host.ctl.wind, 0, VM)) + (host.ctl.wind > 22 ? -10 : 10), Y(o.power) - 10, { px: 11, mono: true, weight: 700, align: host.ctl.wind > 22 ? 'right' : 'left' });
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
