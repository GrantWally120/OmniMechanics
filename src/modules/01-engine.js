(function (root) {
  'use strict';
  const OM = root.OM;
  const E = OM.engine;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, hatchRect, spring, dim, alpha } = OM.gfx;

  // Drawing geometry, in "engine space" units (1 unit = 1 mm).
  const CX = 200, CY = 392, R = 43, LROD = 140, BORE = 86, WALL = 34;
  const XL = CX - BORE / 2, XR = CX + BORE / 2, XOL = XL - WALL, XOR = XR + WALL;
  const HEAD_TOP = 92, PIPE_Y1 = 112, PIPE_Y2 = 140, LIFT_MAX = 12;
  const XI = 173, XE = 227; // valve centres
  const STROKE_NAMES = ['Intake', 'Compression', 'Power', 'Exhaust'];

  const pistonCrown = (theta) => CY - E.pistonY(theta) * 1000 - 34;

  OM.register({
    id: 'engine',
    title: 'Four-stroke engine',
    group: 'machines',
    hook: 'Four strokes, two turns of the crank, one push. Watch the pressure trace draw the work.',
    units: 'mm, deg, bar, kW',
    alt: 'Cutaway of one cylinder with piston, crank, valves and spark plug, a pressure-volume diagram and a 720 degree timeline.',
    controls: [
      { id: 'rpm', type: 'range', label: 'Engine speed', min: 600, max: 7000, step: 100, value: 3000, unit: 'rpm', hint: 'Shown in slow motion. A real engine at 3,000 rpm turns 50 times a second.' },
      { id: 'load', type: 'range', label: 'Throttle opening', min: 10, max: 100, step: 5, value: 100, unit: '%' },
      { id: 'cr', type: 'range', label: 'Compression ratio', min: 6, max: 14, step: 0.5, value: 10, dec: 1, fmt: (v) => fmt(v, 1) + ' : 1' },
      { id: 'spark', type: 'range', label: 'Spark timing', min: 0, max: 45, step: 1, value: 28, fmt: (v) => v + '° before TDC' },
      { id: 'timing', type: 'seg', label: 'Valve timing', value: 'real', options: [{ v: 'textbook', l: 'Textbook' }, { v: 'real', l: 'Real-world' }] },
    ],
    content: {
      intro: 'One cylinder, cut open. The piston goes down, up, down, up while the crank turns twice, and only one of those four strokes makes power.',
      steps: [
        { h: 'Intake', p: 'The piston moves down and the **intake valve** opens. Air and fuel are pushed in by the atmosphere, because the falling piston leaves the cylinder at lower pressure than outside.' },
        { h: 'Compression', p: 'Both valves close and the piston rises, squeezing the mixture to about a tenth of its volume. Squeezing heats it and, by the top, would raise the pressure to roughly 16 to 18 bar. The spark fires just before that.' },
        { h: 'Power', p: 'A flame spreads out from the plug. The hot gas pushes the piston down with up to 50 bar on top of it. This is the only stroke that delivers work to the crank.' },
        { h: 'Exhaust', p: 'The **exhaust valve** opens well before the bottom of the power stroke so the pressure can leave, then the rising piston sweeps out what is left.' },
      ],
      principle: {
        lead: 'Burning fuel raises the pressure of the trapped gas. Pressure times piston area is a force, force times distance is work, and the **pressure-volume diagram** adds that up for you: the area inside the loop is the work of one cycle.',
        eqs: [
          { label: 'Piston height above the crank', eq: 'y = r cosθ + √(l² − r² sin²θ)', note: 'r = 43 mm crank radius, l = 140 mm rod, θ = crank angle from top dead centre. The stroke is 2r = 86 mm.' },
          { label: 'Work in one cycle', eq: 'W = ∮ P dV', note: 'The area enclosed on the P–V diagram. Positive around the big loop, negative around the small intake-exhaust loop.' },
          { label: 'Power', eq: 'Power = W × (rpm ÷ 60) ÷ 2', note: 'A four-stroke cylinder fires once every two revolutions, which is the ÷ 2.' },
          { label: 'Compression ratio', eq: 'CR = (V~c~ + V~d~) / V~c~', note: 'V~d~ is the swept volume (0.5 litre here) and V~c~ the squeezed volume at the top.' },
        ],
        points: [
          'Real engines do not open and close the valves at the dead centres. Here the intake valve opens 10° early, closes 40° late, and the exhaust valve opens 50° early. Both are open together for 20° at the top (valve overlap). Switch to **Textbook** timing to compare.',
          'With the throttle nearly shut the cylinder pressure during intake falls far below the exhaust pressure. The little loop in the diagram then turns into negative work, which is one reason engines waste fuel at part load.',
          '**What this model leaves out:** heat lost to the walls, knock, fuel chemistry and air flow in the manifold. It is a single-zone model (gamma 1.30, Wiebe burn curve) tuned to give the pressures and work of a small petrol engine.',
        ],
      },
      myth: {
        claim: 'The spark plug makes the fuel explode.',
        truth: 'A healthy burn is a flame front spreading out from the plug at roughly 10 to 30 metres per second and taking a few milliseconds. The pressure climbs smoothly. An actual explosion in the mixture is called knock or pinging, and it can wreck a piston.',
      },
      tries: [
        { label: 'Idle', text: 'Throttle almost shut. The work loop shrinks and the pumping loop grows.', set: { rpm: 800, load: 10, spark: 15, cr: 10, timing: 'real' } },
        { label: 'Flat out', text: 'Wide open at high revs.', set: { rpm: 6000, load: 100, spark: 30, cr: 10, timing: 'real' } },
        { label: 'Spark far too late', text: 'The pressure peak arrives after the piston has already dropped away. Less work, more heat out of the exhaust.', set: { load: 100, spark: 3 } },
        { label: 'Spark far too early', text: 'The pressure peak arrives before the top, pushing against the rising piston. Higher peak, less work.', set: { load: 100, spark: 45 } },
        { label: 'Textbook valves', text: 'Valves open and close exactly at top and bottom. Real engines do not.', set: { timing: 'textbook' } },
        { label: 'Squeeze harder', text: 'Higher compression gets more work from the same fuel. Petrol would knock at this ratio, which is why real engines stop around 12 to 13.', set: { cr: 13, spark: 24, timing: 'real' } },
      ],
      quiz: [
        { q: 'In a single-cylinder four-stroke engine, how many times does the crankshaft turn for each power stroke?', opts: ['Half a turn', 'One turn', 'Two turns', 'Four turns'], a: 2, why: 'Four strokes need four trips of the piston, which is two full crank turns. That is why the timeline runs to 720°.' },
        { q: 'Why does the spark fire before the piston reaches the top of the compression stroke?', opts: ['The flame takes time to spread, so the pressure peak should land just after the top', 'Fuel burns faster while the piston is rising', 'To clear the exhaust from the last cycle', 'So the valves have time to close'], a: 0, why: 'The mixture needs several milliseconds to burn. Lighting it early puts the pressure peak about 10 to 15° after the top, where it pushes the piston hardest.' },
        { q: 'Why does a nearly closed throttle waste energy during the intake stroke?', opts: ['The spark gets weaker', 'The piston must pull air past the restriction, so the cylinder pressure drops far below the exhaust side and the stroke costs work', 'Less air makes the crank heavier', 'It does not, the piston coasts'], a: 1, why: 'The pressure during intake falls well below the exhaust pressure, so the piston does negative work. The pumping loop on the diagram shows it.' },
      ],
      sources: [
        'J. B. Heywood, *Internal Combustion Engine Fundamentals*, McGraw-Hill (1988).',
        'Y. A. Çengel and M. A. Boles, *Thermodynamics: An Engineering Approach* (the Otto cycle).',
      ],
    },

    create(host) {
      const st = { phi: 30, t: 0 };
      let res = null;
      let L = null;

      function recompute() {
        const c = host.ctl;
        res = E.cycle({ cr: c.cr, load: c.load / 100, spark: c.spark, timing: c.timing });
      }
      const dispRps = () => 0.6 + (2.0 * (host.ctl.rpm - 600)) / 6400;

      const sim = {
        ref: { w: 780, h: 500 },
        refNarrow: { w: 420, h: 780 },
        state: st,
        init() { st.phi = 30; st.t = 0; recompute(); },
        onControl() { recompute(); },
        layout(V) {
          if (V.narrow) {
            L = {
              eng: { x: 50, y: 6, k: 320 / 400 },
              pv: { x: 10, y: 400, w: 400, h: 210 },
              tl: { x: 10, y: 622, w: 400, h: 150 },
            };
          } else {
            L = {
              eng: { x: 10, y: 10, k: 0.98 },
              pv: { x: 430, y: 10, w: 340, h: 300 },
              tl: { x: 430, y: 330, w: 340, h: 160 },
            };
          }
        },
        step(dt) {
          st.t += dt;
          st.phi = (st.phi + dt * dispRps() * 360) % 720;
        },
        thumb() { st.phi = 378; },
        stepSize: 0.12,

        readouts() {
          const s = E.at(res, st.phi);
          const rpm = host.ctl.rpm;
          const slow = rpm / 60 / dispRps();
          return [
            { k: 'Stroke', v: STROKE_NAMES[s.stroke] },
            { k: 'Cycle angle', v: fmt(s.phi, 0) + '° of 720' },
            { k: 'Pressure now', v: fmt(s.P / 1e5, 1) + ' bar' },
            { k: 'Peak pressure', v: fmt(res.stats.pMaxBar, 0) + ' bar' },
            { k: 'Peak comes', v: fmt(Math.abs(res.stats.peakAtdc), 0) + '° ' + (res.stats.peakAtdc >= 0 ? 'after' : 'before') + ' TDC', tone: res.stats.peakAtdc < 5 || res.stats.peakAtdc > 25 ? 'warn' : 'good' },
            { k: 'Work per cycle', v: fmt(res.stats.workNetJ, 0) + ' J' },
            { k: 'Pumping loss', v: fmt(res.stats.imepPump, 2) + ' bar', tone: res.stats.imepPump < -0.5 ? 'warn' : '' },
            { k: 'Power', v: fmt(E.powerKw(res, rpm), 1) + ' kW' },
            { k: 'Slow motion', v: '÷ ' + fmt(slow, 0) },
          ];
        },
        caption() {
          const s = E.at(res, st.phi);
          let t = STROKE_NAMES[s.stroke] + ' stroke';
          if (s.iv > 0.05 && s.ev > 0.05) t = 'Valve overlap';
          const sp = 360 - host.ctl.spark;
          if (Math.abs(E.mod(st.phi - sp + 360, 720) - 360) < 4) t = 'Spark';
          return t;
        },
        phase() { return E.at(res, st.phi).stroke; },
        describe() {
          const s = E.at(res, st.phi);
          return STROKE_NAMES[s.stroke] + ' stroke, cylinder pressure ' + fmt(s.P / 1e5, 1) + ' bar. Net work ' + fmt(res.stats.workNetJ, 0) + ' joules per cycle.';
        },

        draw(g, V, c) {
          const s = E.at(res, st.phi);
          drawEngine(g, V, c, s);
          drawPV(g, V, c, s);
          drawTimeline(g, V, c, s);
        },
      };

      // --------------------------------------------------------------- engine
      function drawEngine(g, V, c, s) {
        const k = L.eng.k;
        g.save();
        g.translate(L.eng.x, L.eng.y);
        g.scale(k, k);
        const V2 = Object.assign({}, V, { s: V.s * k, px: (n) => n / (V.s * k) });
        const theta = s.theta;
        const cr = host.ctl.cr;
        const hc = (E.GEO.stroke * 1000) / (cr - 1);
        const yHead = pistonCrown(0) - hc;
        const yc = pistonCrown(theta); // crown top
        const yPin = CY - E.pistonY(theta) * 1000;
        const th = theta * Math.PI / 180;
        const pinX = CX + R * Math.sin(th), pinY = CY - R * Math.cos(th);
        const ink = c.ink, ink2 = c.ink2;
        const lw = (n) => V2.px(n);

        // crankcase outline
        g.strokeStyle = ink; g.lineWidth = lw(1.5);
        g.beginPath();
        g.moveTo(XOL, 322); g.lineTo(XOL, CY);
        g.arc(CX, CY, CX - XOL, Math.PI, 0, true);
        g.lineTo(XOR, 322);
        g.stroke();

        // block walls (cut metal)
        for (const [x, w] of [[XOL, WALL], [XR, WALL]]) {
          g.fillStyle = c.paper2; g.fillRect(x, yHead, w, 322 - yHead);
          hatchRect(g, V2, x, yHead, w, 322 - yHead, { gap: 8, color: c.line });
          g.strokeStyle = ink; g.lineWidth = lw(1.5); g.strokeRect(x, yHead, w, 322 - yHead);
        }

        // gas in the chamber
        const chH = Math.max(0, yc - yHead);
        g.save();
        g.beginPath(); g.rect(XL, yHead, BORE, chH); g.clip();
        const flowing = s.iv > 0.02 || s.ev > 0.02;
        if (flowing) {
          const col = s.iv >= s.ev ? c.cold : c.metal;
          g.fillStyle = alpha(col, 0.22 + 0.25 * clamp(s.P / 1.2e5, 0, 1));
          g.fillRect(XL, yHead, BORE, chH);
        } else {
          g.fillStyle = alpha(c.cold, 0.25 + 0.4 * clamp(s.P / 2.5e6, 0, 1));
          g.fillRect(XL, yHead, BORE, chH);
          if (s.xb > 0.001) {
            const hot = alpha(c.hot, 0.38 + 0.5 * clamp((s.T - 1200) / 1400, 0, 1));
            const rf = Math.sqrt(s.xb) * Math.hypot(BORE / 2, chH) * 1.08;
            g.fillStyle = hot;
            g.beginPath(); g.arc(CX, yHead, rf, 0, Math.PI * 2); g.fill();
          }
        }
        g.restore();

        // cylinder head with ports
        g.fillStyle = c.paper2; g.fillRect(XOL, HEAD_TOP, XOR - XOL, yHead - HEAD_TOP);
        hatchRect(g, V2, XOL, HEAD_TOP, XOR - XOL, yHead - HEAD_TOP, { gap: 8, color: c.line });
        g.strokeStyle = ink; g.lineWidth = lw(1.5); g.strokeRect(XOL, HEAD_TOP, XOR - XOL, yHead - HEAD_TOP);
        const port = (pts, col) => {
          g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath();
          g.fillStyle = c.paper2; g.fill();
          g.fillStyle = col; g.fill();
          g.strokeStyle = ink; g.lineWidth = lw(1.5); g.stroke();
        };
        port([[XOL, PIPE_Y1], [XI + 14, PIPE_Y1], [XI + 14, yHead], [XI - 14, yHead], [XI - 14, PIPE_Y2], [XOL, PIPE_Y2]], alpha(c.cold, 0.16));
        port([[XOR, PIPE_Y1], [XE - 14, PIPE_Y1], [XE - 14, yHead], [XE + 14, yHead], [XE + 14, PIPE_Y2], [XOR, PIPE_Y2]], alpha(c.metal, 0.22));
        // pipes outside the head
        for (const [x1, x2, col] of [[24, XOL, alpha(c.cold, 0.16)], [XOR, 380, alpha(c.metal, 0.22)]]) {
          g.fillStyle = c.paper2; g.fillRect(x1, PIPE_Y1, x2 - x1, PIPE_Y2 - PIPE_Y1);
          g.fillStyle = col; g.fillRect(x1, PIPE_Y1, x2 - x1, PIPE_Y2 - PIPE_Y1);
          g.strokeStyle = ink; g.lineWidth = lw(1.5);
          g.beginPath(); g.moveTo(x1, PIPE_Y1); g.lineTo(x2, PIPE_Y1); g.moveTo(x1, PIPE_Y2); g.lineTo(x2, PIPE_Y2); g.stroke();
        }
        // air in, exhaust out: moving chevrons while the valve is open
        const chev = (x0, x1, act, col) => {
          if (act < 0.04) return;
          const gap = 26, off = (st.t * 60) % gap;
          g.strokeStyle = col; g.lineWidth = lw(2); g.globalAlpha = clamp(act * 2, 0, 1);
          for (let x = x0 + off; x < x1 - 8; x += gap) {
            g.beginPath(); g.moveTo(x, 120); g.lineTo(x + 7, 126); g.lineTo(x, 132); g.stroke();
          }
          g.globalAlpha = 1;
        };
        chev(30, XOL - 6, s.iv, c.cold);
        chev(XOR + 6, 374, s.ev, c.metalD);
        text(g, V2, 'AIR + FUEL IN', 24, 104, { px: 10, color: c.ink2, weight: 700 });
        text(g, V2, 'EXHAUST OUT', 380, 104, { px: 10, color: c.ink2, weight: 700, align: 'right' });

        // valves, springs, cams
        const valve = (x, lift, camPhiMid, span, isIntake) => {
          const yv = yHead + lift * LIFT_MAX;
          g.strokeStyle = ink; g.fillStyle = c.metal2; g.lineWidth = lw(1.5);
          // stem
          g.fillRect(x - 2.5, 56 + lift * LIFT_MAX, 5, yv - 5 - (56 + lift * LIFT_MAX));
          g.strokeRect(x - 2.5, 56 + lift * LIFT_MAX, 5, yv - 5 - (56 + lift * LIFT_MAX));
          // head
          g.beginPath();
          g.moveTo(x - 14, yv); g.lineTo(x + 14, yv); g.lineTo(x + 14, yv - 4); g.lineTo(x + 4, yv - 9); g.lineTo(x - 4, yv - 9); g.lineTo(x - 14, yv - 4);
          g.closePath(); g.fill(); g.stroke();
          // spring and retainer
          const yr = 74 + lift * LIFT_MAX;
          spring(g, V2, x, HEAD_TOP, x, yr, 4, 6, c.ink2, 1.3);
          g.fillStyle = c.metalD; g.fillRect(x - 9, yr - 3, 18, 4);
          // cam (turns at half crank speed)
          const cy = 44, R0 = 12;
          const W = span / 2; // degrees of cam angle the lobe covers
          const aRel = E.mod(st.phi - camPhiMid + 360, 720) - 360; // crank degrees from mid-lift
          const rot = (aRel / 2) * Math.PI / 180;
          g.beginPath();
          for (let i = 0; i <= 90; i++) {
            const a = (i / 90) * Math.PI * 2 - Math.PI; // local angle, lobe tip at 0
            const adeg = (a * 180) / Math.PI;
            const r = Math.abs(adeg) <= W / 2 ? R0 + LIFT_MAX * Math.pow(Math.cos((Math.PI * adeg) / W), 2) : R0;
            // screen angle: tip points down (+y) at rot = 0; cam spins clockwise
            const sa = Math.PI / 2 + a + rot;
            const px = x + r * Math.cos(sa), py = cy + r * Math.sin(sa);
            if (i) g.lineTo(px, py); else g.moveTo(px, py);
          }
          g.closePath(); g.fillStyle = c.metal2; g.fill(); g.strokeStyle = ink; g.lineWidth = lw(1.5); g.stroke();
          g.beginPath(); g.arc(x, cy, 3, 0, Math.PI * 2); g.fillStyle = ink; g.fill();
        };
        const T = res.timing;
        const midI = E.mod(T.ivo + ((E.mod(T.ivc - T.ivo, 720)) / 2), 720);
        const midE = E.mod(T.evo + ((E.mod(T.evc - T.evo, 720)) / 2), 720);
        valve(XI, s.iv, midI, E.mod(T.ivc - T.ivo, 720), true);
        valve(XE, s.ev, midE, E.mod(T.evc - T.evo, 720), false);
        text(g, V2, 'cam, half speed', CX, 22, { px: 10, color: c.ink2, align: 'center' });

        // spark plug
        g.fillStyle = c.paper2; g.strokeStyle = ink; g.lineWidth = lw(1.5);
        g.fillRect(CX - 5, 62, 10, 30); g.strokeRect(CX - 5, 62, 10, 30);
        g.fillStyle = c.metalD; g.fillRect(CX - 7, 92, 14, yHead - 92); g.strokeRect(CX - 7, 92, 14, yHead - 92);
        g.beginPath(); g.moveTo(CX, yHead); g.lineTo(CX, yHead + 5); g.strokeStyle = ink; g.stroke();
        const dSpark = E.mod(st.phi - (360 - host.ctl.spark) + 360, 720) - 360;
        if (dSpark > -3 && dSpark < 6 && !flowing) {
          g.strokeStyle = c.accent; g.lineWidth = lw(3);
          g.beginPath(); g.moveTo(CX, yHead + 5); g.lineTo(CX - 6, yHead + 11); g.lineTo(CX + 5, yHead + 16); g.lineTo(CX - 3, yHead + 22); g.stroke();
          const gl = g.createRadialGradient(CX, yHead + 12, 1, CX, yHead + 12, 26);
          gl.addColorStop(0, alpha(c.accent, 0.85)); gl.addColorStop(1, alpha(c.accent, 0));
          g.fillStyle = gl; g.beginPath(); g.arc(CX, yHead + 12, 26, 0, Math.PI * 2); g.fill();
        }

        // piston
        g.fillStyle = c.metal2; g.fillRect(XL + 1.5, yc, BORE - 3, 52);
        hatchRect(g, V2, XL + 1.5, yc, BORE - 3, 52, { gap: 9, color: alpha(c.ink, 0.25) });
        g.strokeStyle = ink; g.lineWidth = lw(1.5); g.strokeRect(XL + 1.5, yc, BORE - 3, 52);
        g.lineWidth = lw(1);
        for (const dy of [8, 14, 20]) { g.beginPath(); g.moveTo(XL + 1.5, yc + dy); g.lineTo(XR - 1.5, yc + dy); g.stroke(); }

        // connecting rod, crank
        g.strokeStyle = c.metalD; g.lineWidth = lw(0) + 13; g.lineCap = 'round';
        g.beginPath(); g.moveTo(CX, yPin); g.lineTo(pinX, pinY); g.stroke();
        g.strokeStyle = c.metal2; g.lineWidth = 7;
        g.beginPath(); g.moveTo(CX, yPin); g.lineTo(pinX, pinY); g.stroke();
        g.lineCap = 'butt';
        // crank web with counterweight
        g.fillStyle = c.metalD;
        g.beginPath(); g.moveTo(CX, CY);
        g.arc(CX, CY, 58, th + Math.PI - 1.0 - Math.PI / 2, th + Math.PI + 1.0 - Math.PI / 2);
        g.closePath(); g.fill();
        g.strokeStyle = c.metalD; g.lineWidth = 11; g.lineCap = 'round';
        g.beginPath(); g.moveTo(CX, CY); g.lineTo(pinX, pinY); g.stroke(); g.lineCap = 'butt';
        // angle scale
        g.strokeStyle = c.ink2; g.lineWidth = lw(1);
        g.beginPath(); g.arc(CX, CY, 66, 0, Math.PI * 2); g.stroke();
        for (let d = 0; d < 360; d += 30) {
          const a = d * Math.PI / 180 - Math.PI / 2;
          g.beginPath(); g.moveTo(CX + Math.cos(a) * 66, CY + Math.sin(a) * 66); g.lineTo(CX + Math.cos(a) * 72, CY + Math.sin(a) * 72); g.stroke();
        }
        g.beginPath(); g.arc(pinX, pinY, 8, 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill(); g.strokeStyle = ink; g.lineWidth = lw(1.5); g.stroke();
        g.beginPath(); g.arc(CX, CY, 5, 0, Math.PI * 2); g.fillStyle = ink; g.fill();
        g.beginPath(); g.arc(CX, yPin, 6, 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill(); g.stroke();
        // marker on the rim
        g.fillStyle = c.accent; g.strokeStyle = ink; g.lineWidth = lw(1.5);
        g.beginPath(); g.arc(CX + Math.sin(th) * 66, CY - Math.cos(th) * 66, 5, 0, Math.PI * 2); g.fill(); g.stroke();
        text(g, V2, 'TDC', CX, CY - 78, { px: 10, color: c.ink2, align: 'center', weight: 700 });
        text(g, V2, 'BDC', CX, CY + 88, { px: 10, color: c.ink2, align: 'center', weight: 700, base: 'top' });
        text(g, V2, 'θ ' + fmt(theta, 0) + '°', CX + 82, CY + 4, { px: 12, color: c.ink, mono: true, weight: 700 });

        // dimensions: stroke
        dim(g, V2, 305, pistonCrown(0), 305, pistonCrown(180), '', 14);
        text(g, V2, 'stroke', 322, (pistonCrown(0) + pistonCrown(180)) / 2 - 4, { px: 10.5, color: c.ink2 });
        text(g, V2, '86 mm', 322, (pistonCrown(0) + pistonCrown(180)) / 2 + 10, { px: 10.5, color: c.ink2, mono: true });
        g.restore();
      }

      // -------------------------------------------------------------- P-V plot
      function drawPV(g, V, c, s) {
        const b = L.pv;
        const x0 = b.x + 40, y0 = b.y + 44, w = b.w - 52, hh = b.h - 88;
        const Vmax = (res.Vc + E.GEO.Vd) * 1.04;
        const Pmax = Math.max(40, Math.ceil((res.stats.pMaxBar * 1.08) / 10) * 10);
        const X = (v) => x0 + (v / Vmax) * w;
        const Y = (p) => y0 + hh - (p / 1e5 / Pmax) * hh;
        text(g, V, 'Pressure (bar) against volume', b.x + 2, b.y + 10, { px: 12, weight: 700, halo: false });
        text(g, V, 'Area inside the loop = work', b.x + 2, b.y + 27, { px: 11, color: c.ink2, halo: false });
        // grid
        g.lineWidth = V.px(1);
        for (let p = 0; p <= Pmax; p += Pmax > 50 ? 20 : 10) {
          line(g, V, x0, Y(p * 1e5), x0 + w, Y(p * 1e5), alpha(c.ink, 0.12), 1);
          text(g, V, String(p), x0 - 6, Y(p * 1e5) + 4, { px: 10.5, color: c.ink2, align: 'right', mono: true, halo: false });
        }
        line(g, V, x0, y0, x0, y0 + hh, c.ink, 1.5);
        line(g, V, x0, y0 + hh, x0 + w, y0 + hh, c.ink, 1.5);
        for (const cc of [0, 100, 200, 300, 400, 500]) {
          if (cc * 1e-6 > Vmax) continue;
          text(g, V, String(cc), X(cc * 1e-6), y0 + hh + 14, { px: 10.5, color: c.ink2, align: 'center', mono: true, halo: false });
        }
        text(g, V, 'volume, cm³', x0 + w, y0 + hh + 29, { px: 10.5, color: c.ink2, align: 'right', halo: false });
        // loop fills
        const P = res.P, Vv = res.V;
        const path = (i0, i1) => {
          g.beginPath();
          for (let i = i0; i <= i1; i++) {
            const x = X(Vv[i % res.N]), y = Y(P[i % res.N]);
            if (i === i0) g.moveTo(x, y); else g.lineTo(x, y);
          }
          g.closePath();
        };
        path(360, 1080); g.fillStyle = alpha(c.hot, 0.26); g.fill();
        path(1080, 1440 + 360); g.fillStyle = alpha(c.cold, 0.4); g.fill();
        // curve
        g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.lineJoin = 'round';
        g.beginPath();
        for (let i = 0; i <= res.N; i++) {
          const x = X(Vv[i % res.N]), y = Y(P[i % res.N]);
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
        // current point
        const cx = X(s.V), cy = Y(s.P);
        g.beginPath(); g.arc(cx, cy, V.px(6), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
      }

      // -------------------------------------------------------------- timeline
      function drawTimeline(g, V, c, s) {
        const b = L.tl;
        const X0 = b.x + 34, X1 = b.x + b.w - 6;
        const X = (phi) => X0 + (phi / 720) * (X1 - X0);
        const yP = b.y, hP = 56;
        const yS = yP + hP + 6, hS = 20;
        const yI = yS + hS + 8, yX = yI + 14, ySp = yX + 16, yA = ySp + 24;
        // pressure trace
        const pm = res.stats.pMaxBar * 1e5;
        g.strokeStyle = c.hot; g.lineWidth = V.px(1.8); g.lineJoin = 'round';
        g.beginPath();
        for (let i = 0; i <= res.N; i += 2) {
          const x = X(i * res.STEP), y = yP + hP - (res.P[i % res.N] / pm) * (hP - 6);
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
        line(g, V, X0, yP + hP, X1, yP + hP, c.ink, 1);
        text(g, V, 'bar', b.x + 2, yP + 12, { px: 10.5, color: c.ink2, halo: false });
        text(g, V, fmt(res.stats.pMaxBar, 0), X(res.stats.phiPeak) + 6, yP + 10, { px: 10.5, color: c.hot, mono: true, weight: 700, halo: false });
        // strokes
        const tints = [c.cold, c.metal, c.hot, c.ink3];
        for (let i = 0; i < 4; i++) {
          g.fillStyle = alpha(tints[i], 0.3); g.fillRect(X(i * 180), yS, X(180) - X(0), hS);
          g.strokeStyle = c.ink; g.lineWidth = V.px(1.2); g.strokeRect(X(i * 180), yS, X(180) - X(0), hS);
          text(g, V, V.narrow || (X1 - X0) > 300 ? STROKE_NAMES[i] : STROKE_NAMES[i][0], (X(i * 180) + X((i + 1) * 180)) / 2, yS + 14, { px: 10.5, align: 'center', weight: 700, halo: false });
        }
        // valves
        const T = res.timing;
        const win = (open, close, y, col, label) => {
          text(g, V, label, b.x + 2, y + 9, { px: 10.5, color: c.ink2, mono: true, weight: 700, halo: false });
          const sp = E.mod(close - open, 720);
          g.fillStyle = alpha(col, 0.85);
          const a = open, e = open + sp;
          if (e <= 720) g.fillRect(X(a), y, X(e) - X(a), 10);
          else { g.fillRect(X(a), y, X(720) - X(a), 10); g.fillRect(X(0), y, X(e - 720) - X(0), 10); }
        };
        win(T.ivo, T.ivc, yI, c.cold, 'IN');
        win(T.evo, T.evc, yX, c.metalD, 'EX');
        // spark tick
        const phS = 360 - host.ctl.spark;
        text(g, V, 'SP', b.x + 2, ySp + 10, { px: 10.5, color: c.ink2, mono: true, weight: 700, halo: false });
        line(g, V, X(phS), ySp - 2, X(phS), ySp + 12, c.ink, 2);
        g.fillStyle = c.accent; g.strokeStyle = c.ink; g.lineWidth = V.px(1.2);
        g.beginPath(); g.arc(X(phS), ySp + 12, V.px(4.5), 0, Math.PI * 2); g.fill(); g.stroke();
        // axis
        ['TDC', 'BDC', 'TDC', 'BDC', 'TDC'].forEach((t, i) => {
          line(g, V, X(i * 180), yA - 8, X(i * 180), yA - 3, c.ink2, 1);
          text(g, V, t, X(i * 180), yA + 6, { px: 10, color: c.ink2, align: i === 0 ? 'left' : i === 4 ? 'right' : 'center', mono: true, halo: false });
        });
        // now marker
        const mx = X(s.phi);
        g.strokeStyle = c.ink; g.lineWidth = V.px(1.5);
        g.beginPath(); g.moveTo(mx, yP - 2); g.lineTo(mx, yA - 8); g.stroke();
        g.fillStyle = c.accent;
        g.beginPath(); g.moveTo(mx - V.px(6), yP - V.px(9)); g.lineTo(mx + V.px(6), yP - V.px(9)); g.lineTo(mx, yP - 1); g.closePath(); g.fill(); g.stroke();
      }

      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
