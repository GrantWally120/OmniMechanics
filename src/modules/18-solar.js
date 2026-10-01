(function (root) {
  'use strict';
  const OM = root.OM;
  const So = OM.solar;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, alpha, plotFrame } = OM.gfx;

  const V_AXIS = 45; // volts, right end of the voltage axis
  const I_AXIS = 11; // amps
  const P_AXIS = 340; // watts
  const hash = (i, k) => { const x = Math.sin(i * 53.1 + k * 29.7) * 43758.5453; return x - Math.floor(x); };

  OM.register({
    id: 'solar',
    title: 'Solar panel',
    group: 'electric',
    hook: 'Light frees electrons in silicon and a junction sweeps them out as a current. The voltage you draw decides how much of it you get.',
    units: 'V, A, W, W/m², °C',
    alt: 'A cross-section of a solar cell with the n-type layer, the junction, the p-type layer and the contacts, light arriving and electron and hole pairs being separated, with a wire and a load. Beside it are the current and power curves of a 60-cell panel against voltage, and charts of the best power against sunlight and against temperature.',
    controls: [
      { id: 'sun', type: 'range', label: 'Sunlight on the panel', min: 50, max: 1100, step: 25, value: 1000, unit: 'W/m²' },
      { id: 'temp', type: 'range', label: 'Cell temperature', min: 0, max: 85, step: 1, value: 25, unit: '°C' },
      { id: 'mppt', type: 'toggle', label: 'Hold the best operating point', value: true, hint: 'A real inverter does this all the time. Switch it off to choose the voltage yourself.' },
      { id: 'volts', type: 'range', label: 'Voltage held on the panel', min: 0, max: 45, step: 0.5, value: 30, dec: 1, unit: 'V', showIf: (c) => !c.mppt },
    ],
    content: {
      intro: 'A solar cell is a diode that makes electricity when light falls on it. Light frees electrons inside the silicon, the electric field at the junction sends them one way and the holes they leave the other way, and that separation of charge is a voltage and a current.',
      steps: [
        { h: 'Light is absorbed', p: 'A photon with enough energy knocks an electron out of its bond and leaves a hole. Silicon needs photons of about 1.1 electron-volts or more, so all visible light works, and the infrared beyond about 1,100 nanometres goes to waste.' },
        { h: 'The junction separates them', p: 'Where the n-type and p-type silicon meet there is an electric field. It pushes electrons toward the front and holes toward the back, so they cannot simply fall back together.' },
        { h: 'Current in the circuit', p: 'The electrons leave by the front contact, do work in the load, and come back to the rear contact to meet the holes. The current is proportional to the light.' },
        { h: 'The junction pushes back', p: 'A voltage across the cell also drives a current through the junction the wrong way, as in any diode. The higher the voltage, the more of the light-made current is lost that way, until at open circuit none gets out. That is why there is one best operating point.' },
      ],
      principle: {
        lead: 'A solar cell is a current source, set by the light, with a diode across it that sets the voltage. The panel is 60 cells in series, so the voltage is 60 times that of one cell and the current is the same.',
        eqs: [
          { label: 'The single-diode model', eq: 'I = I~L~ − I~0~ [ exp( (V + I R~s~) / n V~t~ ) − 1 ] − (V + I R~s~) / R~sh~', note: 'I_L is the light current, I_0 the diode\'s saturation current, V_t = kT/q (25.7 mV at 25 °C), R_s and R_sh small losses in series and across the cell.' },
          { label: 'Open-circuit voltage', eq: 'V~oc~ ≈ n V~t~ ln( I~L~ / I~0~ + 1 )', note: 'It grows only with the logarithm of the light. Ten times the light adds about 70 mV per cell.' },
          { label: 'Best power', eq: 'P~max~ = FF × V~oc~ × I~sc~', note: 'The fill factor FF says how square the current curve is. Here it is about 0.78. Efficiency is P divided by the sunlight landing on the panel.' },
          { label: 'Heat', eq: 'I~0~ ∝ T^3^ exp( −E~g~ / n k T )', note: 'The leakage through the junction grows very fast with temperature, so the open-circuit voltage falls about 2 mV per cell per kelvin and the panel loses roughly 0.35 percent of its power for every degree.' },
        ],
        points: [
          'The orange curve is the power, current times voltage. It is zero at short circuit (no voltage) and zero at open circuit (no current), with a peak in between at about 80 percent of the open-circuit voltage.',
          'The dashed grey curves show a panel in full sun at 25 °C for comparison, so you can see what changed.',
          '**What this model leaves out:** shading and bypass diodes, the fall in efficiency in very weak light, reflection that changes with the angle of the sun, ageing, and the inverter. The cells are standard silicon with a 25 °C, 1,000 W/m² rating of about 290 W for 1.65 m².',
        ],
      },
      myth: {
        claim: 'Solar panels make the most power on the hottest days.',
        truth: 'Heat makes them worse. Sunshine adds current, but heat lowers the voltage by more than that, so a panel at 65 °C makes about 14 percent less than the same panel at 25 °C. A cold, clear, bright day is the best day for solar panels.',
      },
      tries: [
        { label: 'Full sun', text: 'The rated conditions: 1,000 W/m² at 25 °C.', set: { sun: 1000, temp: 25, mppt: true } },
        { label: 'Hot roof', text: 'Same sun, but the panel is at 70 °C. Less voltage, less power.', set: { sun: 1000, temp: 70, mppt: true } },
        { label: 'Cold and bright', text: 'At 0 °C the same panel makes more than its rating.', set: { sun: 1000, temp: 0, mppt: true } },
        { label: 'Overcast', text: 'A fifth of the light gives a fifth of the current and nearly the same voltage.', set: { sun: 200, temp: 25, mppt: true } },
        { label: 'Open circuit', text: 'Nothing connected: the highest voltage and no current.', set: { sun: 1000, temp: 25, mppt: false, volts: 45 } },
        { label: 'Short circuit', text: 'Terminals joined: the highest current and no voltage.', set: { sun: 1000, temp: 25, mppt: false, volts: 0 } },
      ],
      quiz: [
        { q: 'The sunlight on the panel halves. What changes most?', opts: ['The current roughly halves and the voltage barely changes', 'The voltage halves and the current stays', 'Both halve', 'Nothing changes'], a: 0, why: 'The light current is proportional to the light, while the voltage depends only on the logarithm of it.' },
        { q: 'A panel gets 30 degrees hotter in the same sunlight. What happens to its power?', opts: ['It goes up, because there is more heat', 'It falls by about 10 percent, because the voltage drops', 'It does not change', 'It stops'], a: 1, why: 'The junction leaks more at higher temperature, which lowers the voltage. With about 0.35 percent per degree, 30 degrees costs around 10 percent.' },
        { q: 'Why does the panel make no power at open circuit?', opts: ['The light stops', 'There is voltage but no current, and power is voltage times current', 'The cells are cold', 'The diode is broken'], a: 1, why: 'At open circuit all the light-made current is lost inside the junction, so nothing flows out and the power is zero.' },
      ],
      era: 'Bell Labs, 1954',
      level: 3,
      parts: [
        { name: 'Front contacts', note: 'Thin metal fingers that collect the electrons and still let most of the light in.' },
        { name: 'n-type layer', note: 'A thin layer of silicon with extra electrons. It is the front of the cell.' },
        { name: 'Junction', note: 'The boundary between n and p. Its electric field separates the electrons from the holes.' },
        { name: 'p-type layer', note: 'The thick layer of silicon with spare holes. Most of the light is absorbed here.' },
        { name: 'Back contact', note: 'Where the electrons return to the cell after the load.' },
      ],
      facts: [
        'Edmond Becquerel discovered the photovoltaic effect in 1839, aged 19, when he saw a voltage appear between two electrodes in an acid solution when light fell on one of them.',
        'The first practical silicon solar cell was made at Bell Labs in 1954 by Daryl Chapin, Calvin Fuller and Gerald Pearson. It was about 6 percent efficient.',
        'A silicon cell cannot turn more than about 29 percent of the sunlight into electricity, however perfect it is, because of the way a single junction works (the Shockley–Queisser limit). Good panels today reach about 20 to 23 percent.',
        'Most panels lose between 0.3 and 0.5 percent of their power for each degree above 25 °C, so a roof at 65 °C gives up 12 to 20 percent.',
      ],
      sources: [
        'J. Nelson, *The Physics of Solar Cells*, Imperial College Press (2003).',
        'M. A. Green, *Solar Cells: Operating Principles, Technology and System Applications*, Prentice-Hall (1982).',
        'D. M. Chapin, C. S. Fuller and G. L. Pearson, "A new silicon p-n junction photocell for converting solar radiation into electrical power", *Journal of Applied Physics* 25, 676 (1954).',
        'W. Shockley and H. J. Queisser, "Detailed balance limit of efficiency of p-n junction solar cells", *Journal of Applied Physics* 32, 510 (1961).',
      ],
    },

    create(host) {
      const st = { t: 0, pairs: [], acc: 0, wire: 0 };
      let L = null;
      let cacheG = null, cacheT = null;

      const op = () => So.operate(host.ctl.sun, host.ctl.temp, host.ctl.mppt ? null : host.ctl.volts);
      const ref = () => So.curve(1000, 25, undefined, 80);
      let refCurve = null;
      const pOfG = () => {
        if (!cacheG || cacheG.T !== host.ctl.temp) {
          const pts = [];
          for (let G = 0; G <= 1100; G += 50) pts.push({ x: G, p: So.mpp(G, host.ctl.temp).p });
          cacheG = { T: host.ctl.temp, pts };
        }
        return cacheG.pts;
      };
      const pOfT = () => {
        if (!cacheT || cacheT.G !== host.ctl.sun) {
          const pts = [];
          for (let T = 0; T <= 85; T += 5) pts.push({ x: T, p: So.mpp(host.ctl.sun, T).p });
          cacheT = { G: host.ctl.sun, pts };
        }
        return cacheT.pts;
      };

      const sim = {
        ref: { w: 780, h: 590 },
        refNarrow: { w: 420, h: 1170 },
        state: st,
        init() { st.t = 0; st.pairs = []; st.acc = 0; st.wire = 0; refCurve = ref(); },
        layout(V) {
          L = V.narrow
            ? { cell: { x: 0, y: 4, w: 420, h: 300 }, iv: { x: 14, y: 312, w: 392, h: 290 }, pg: { x: 14, y: 612, w: 392, h: 270 }, pt: { x: 14, y: 892, w: 392, h: 270 } }
            : { cell: { x: 0, y: 4, w: 390, h: 300 }, iv: { x: 394, y: 4, w: 386, h: 300 }, pg: { x: 10, y: 312, w: 380, h: 270 }, pt: { x: 394, y: 312, w: 380, h: 270 } };
        },
        step(dt) {
          const o = op();
          st.t += dt;
          // light making electron and hole pairs; the fraction that reaches the terminals is the collected share
          st.acc += (host.ctl.sun / 1000) * 7 * dt;
          while (st.acc >= 1 && st.pairs.length < 70) {
            st.acc -= 1;
            st.pairs.push({ x: 0.08 + 0.84 * Math.random(), y: Math.random(), age: 0, ok: Math.random() < o.collected });
          }
          if (st.acc > 3) st.acc = 0;
          for (let i = st.pairs.length - 1; i >= 0; i--) { const p = st.pairs[i]; p.age += dt; if (p.age > (p.ok ? 1.15 : 0.45)) st.pairs.splice(i, 1); }
          st.wire = (st.wire + (o.i / So.ISC_REF) * 0.5 * dt) % 1;
        },
        thumb() {
          st.t = 1;
          st.pairs = [];
          for (let i = 0; i < 16; i++) st.pairs.push({ x: hash(i, 1), y: hash(i, 2), age: hash(i, 3) * 0.8, ok: i % 4 !== 0 });
          st.wire = 0.2;
        },
        readouts() {
          const o = op();
          return [
            { k: 'Voltage', v: fmt(o.v, 1) + ' V' },
            { k: 'Current', v: fmt(o.i, 2) + ' A' },
            { k: 'Power', v: fmt(o.p, 0) + ' W' },
            { k: 'Efficiency', v: fmt(o.eff * 100, 1) + ' %' },
            { k: 'Fill factor', v: fmt(o.ff * 100, 0) + ' %' },
            { k: 'Open-circuit voltage', v: fmt(o.voc, 1) + ' V' },
            { k: 'Short-circuit current', v: fmt(o.isc, 2) + ' A' },
          ];
        },
        caption() {
          const o = op();
          if (host.ctl.mppt) return 'At the best operating point: ' + fmt(o.p, 0) + ' W';
          if (o.i < 0.01) return 'Open circuit: voltage but no current';
          if (o.v < 0.2) return 'Short circuit: current but no voltage';
          return 'Off the best point: ' + fmt(o.p, 0) + ' W of ' + fmt(o.best.p, 0) + ' W possible';
        },
        describe() { const o = op(); return 'The panel is making ' + fmt(o.p, 0) + ' watts at ' + fmt(o.v, 1) + ' volts and ' + fmt(o.i, 2) + ' amps.'; },
        draw(g, V, c) {
          drawCell(g, V, c, L.cell);
          if (V.thumb) return;
          drawIV(g, V, c, L.iv);
          drawPG(g, V, c, L.pg);
          drawPT(g, V, c, L.pt);
        },
      };

      // ---------------------------------------------------- the cell, in section
      function drawCell(g, V, c, r) {
        const o = op();
        g.save();
        g.translate(r.x, r.y);
        const w = r.w;
        const cx0 = w * 0.07, cx1 = w * 0.64;
        const yF = 112, yN = 120, yJ = 148, yP = 160, yB = 252, yBk = 262;
        const ink = c.ink;
        const lw = (n) => V.px(n);
        // sun and light
        const nph = Math.round(2 + 4 * clamp(host.ctl.sun / 1100, 0, 1));
        for (let k = 0; k < nph; k++) {
          const x = cx0 + 20 + (k * (cx1 - cx0 - 40)) / Math.max(nph - 1, 1);
          const off = (st.t * 40 + k * 17) % 34;
          for (let j = 0; j < 3; j++) {
            const y0 = 22 + j * 34 + off - 34;
            if (y0 < 12 || y0 > yF - 14) continue;
            arrow(g, V, x, y0, x + 4, y0 + 18, alpha(c.accent, 0.95), 2.2, 8);
          }
        }
        // front contact fingers
        g.fillStyle = c.metal; g.strokeStyle = ink; g.lineWidth = lw(1.4);
        for (let k = 0; k < 4; k++) { const x = cx0 + 14 + k * ((cx1 - cx0 - 40) / 3); g.fillRect(x, yF, 12, 8); g.strokeRect(x, yF, 12, 8); }
        // layers
        g.fillStyle = alpha(c.cold, 0.35); g.fillRect(cx0, yN, cx1 - cx0, yJ - yN);
        g.fillStyle = alpha(c.accent, 0.35); g.fillRect(cx0, yJ, cx1 - cx0, yP - yJ);
        g.fillStyle = alpha(c.hot, 0.25); g.fillRect(cx0, yP, cx1 - cx0, yB - yP);
        g.strokeStyle = ink; g.lineWidth = lw(1.8); g.strokeRect(cx0, yN, cx1 - cx0, yB - yN);
        line(g, V, cx0, yJ, cx1, yJ, ink, 1.2); line(g, V, cx0, yP, cx1, yP, ink, 1.2);
        g.fillStyle = c.metal; g.fillRect(cx0, yB, cx1 - cx0, yBk - yB); g.strokeRect(cx0, yB, cx1 - cx0, yBk - yB);
        // the electric field at the junction
        for (let k = 0; k < 5; k++) { const x = cx0 + 22 + k * ((cx1 - cx0 - 44) / 4); arrow(g, V, x, yP - 2, x, yJ + 3, alpha(c.ink, 0.55), 1.2, 5); }
        if (!V.thumb) {
          text(g, V, 'n-type silicon (front)', cx0 + 4, yN + 15, { px: 10.5, color: c.ink, halo: false });
          text(g, V, 'junction: electric field', cx0 + 4, yJ + 10, { px: 9.5, color: c.ink2, halo: false });
          text(g, V, 'p-type silicon', cx0 + 4, yP + 16, { px: 10.5, color: c.ink, halo: false });
          text(g, V, 'back contact', cx0 + 4, yBk + 14, { px: 10, color: c.ink2, halo: false });
          text(g, V, 'sunlight ' + fmt(host.ctl.sun, 0) + ' W/m²', cx0, 14, { px: 11.5, weight: 700, halo: false });
        }
        // pairs: electrons (blue) go up and out the front, holes (red) go down to the back contact
        st.pairs.forEach((p) => {
          const x = cx0 + 8 + p.x * (cx1 - cx0 - 16);
          const y0 = yP + 12 + p.y * (yB - yP - 28);
          let ey, hy, fade;
          if (p.ok) {
            const u = Math.min(1, p.age / 1.0);
            ey = y0 + (yN + 4 - y0) * u; hy = y0 + (yB - 4 - y0) * u;
            fade = clamp((1.15 - p.age) * 3, 0, 1);
          } else {
            const u = Math.min(1, p.age / 0.4);
            ey = y0 - 7 * (1 - u); hy = y0 + 7 * (1 - u);
            fade = clamp((0.45 - p.age) * 6, 0, 1);
          }
          g.globalAlpha = fade;
          g.beginPath(); g.arc(x - 3, ey, 3.6, 0, Math.PI * 2); g.fillStyle = c.cold; g.fill(); g.strokeStyle = ink; g.lineWidth = lw(1); g.stroke();
          g.beginPath(); g.arc(x + 3, hy, 3.6, 0, Math.PI * 2); g.fillStyle = c.hot; g.fill(); g.stroke();
          g.globalAlpha = 1;
          if (!p.ok && p.age > 0.3) { g.strokeStyle = alpha(c.bad, clamp((0.45 - p.age) * 6, 0, 1)); g.lineWidth = lw(1.6); g.beginPath(); g.arc(x, y0, 5 + (p.age - 0.3) * 50, 0, Math.PI * 2); g.stroke(); }
        });
        // the circuit: front contact, over to the load and back to the rear contact
        const wx = w * 0.86;
        const path = [[cx0 + 20, yF], [cx0 + 20, 52], [wx, 52], [wx, 150], [wx, 215], [wx, 285], [cx1 - 20, 285], [cx1 - 20, yBk]];
        g.strokeStyle = ink; g.lineWidth = lw(2.4); g.lineJoin = 'round';
        g.beginPath(); path.forEach((p, i) => { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke();
        // the load, a resistor
        g.fillStyle = c.paper; g.fillRect(wx - 16, 150, 32, 65); g.strokeStyle = ink; g.lineWidth = lw(2.2); g.strokeRect(wx - 16, 150, 32, 65);
        g.beginPath(); g.moveTo(wx, 150);
        for (let k = 0; k < 6; k++) g.lineTo(wx + (k % 2 ? -9 : 9), 150 + (k + 0.5) * (65 / 6));
        g.lineTo(wx, 215); g.lineWidth = lw(1.6); g.stroke();
        // electrons moving round the wire
        let total = 0; const segs = [];
        for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); segs.push(d); total += d; }
        const nw = 18;
        for (let k = 0; k < nw; k++) {
          let s = (((k / nw) + st.wire) % 1) * total, i = 0;
          while (i < segs.length - 1 && s > segs[i]) { s -= segs[i]; i++; }
          const t = s / segs[i];
          const x = path[i][0] + (path[i + 1][0] - path[i][0]) * t, y = path[i][1] + (path[i + 1][1] - path[i][1]) * t;
          g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fillStyle = c.cold; g.fill();
        }
        if (!V.thumb) {
          text(g, V, 'load', wx + 22, 178, { px: 11, color: c.ink2, halo: false });
          text(g, V, fmt(o.i, 1) + ' A', wx + 22, 193, { px: 11, mono: true, weight: 700, halo: false });
          text(g, V, fmt(o.v, 1) + ' V', wx + 22, 208, { px: 11, mono: true, weight: 700, halo: false });
          text(g, V, 'electrons', wx - 6, 44, { px: 10.5, color: c.cold, weight: 700, align: 'right', halo: false });
          const lost = Math.round((1 - o.collected) * 100);
          text(g, V, lost + ' % of the freed pairs recombine inside', cx0, 298, { px: 10.5, color: lost > 20 ? c.bad : c.ink2, halo: false });
        }
        g.restore();
      }

      // -------------------------------------------- current and power against voltage
      function drawIV(g, V, c, r) {
        const o = op();
        const f = plotFrame(g, V, c, { x: r.x, y: r.y, w: r.w - 36, h: r.h }, 'Current and power against voltage', refCurve ? 'voltage, V     dashed: full sun at 25 °C' : 'voltage, V', '');
        const X = (v) => f.x0 + (v / V_AXIS) * f.w, YI = (i) => f.y0 + f.h - (i / I_AXIS) * f.h, YP = (p) => f.y0 + f.h - (p / P_AXIS) * f.h;
        for (const v of [0, 10, 20, 30, 40]) { line(g, V, X(v), f.y0 + f.h, X(v), f.y0 + f.h + 4, c.ink, 1); text(g, V, String(v), X(v), f.y0 + f.h + 15, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false }); }
        for (const i of [0, 4, 8]) { line(g, V, f.x0 - 4, YI(i), f.x0, YI(i), c.ink, 1); text(g, V, String(i), f.x0 - 6, YI(i) + 4, { px: 10, mono: true, align: 'right', color: c.elec, halo: false }); }
        for (const p of [0, 100, 200, 300]) { line(g, V, f.x0 + f.w, YP(p), f.x0 + f.w + 4, YP(p), c.ink, 1); text(g, V, String(p), f.x0 + f.w + 6, YP(p) + 4, { px: 10, mono: true, color: c.hot, halo: false }); }
        text(g, V, 'A', f.x0 - 6, f.y0 - 3, { px: 10.5, color: c.elec, weight: 700, align: 'right', halo: false });
        text(g, V, 'W', f.x0 + f.w + 6, f.y0 - 3, { px: 10.5, color: c.hot, weight: 700, halo: false });
        // full sun at 25 C for comparison
        if (refCurve) {
          g.setLineDash([V.px(4), V.px(3)]); g.lineWidth = V.px(1.3); g.strokeStyle = alpha(c.ink3, 0.9);
          g.beginPath(); refCurve.forEach((p, k) => { if (k) g.lineTo(X(p.v), YI(p.i)); else g.moveTo(X(p.v), YI(p.i)); }); g.stroke();
          g.beginPath(); refCurve.forEach((p, k) => { if (k) g.lineTo(X(p.v), YP(p.p)); else g.moveTo(X(p.v), YP(p.p)); }); g.stroke();
          g.setLineDash([]);
        }
        const pts = So.curve(host.ctl.sun, host.ctl.temp, undefined, 90);
        g.lineWidth = V.px(2.6); g.strokeStyle = c.elec;
        g.beginPath(); pts.forEach((p, k) => { if (k) g.lineTo(X(p.v), YI(p.i)); else g.moveTo(X(p.v), YI(p.i)); }); g.stroke();
        g.strokeStyle = c.hot;
        g.beginPath(); pts.forEach((p, k) => { if (k) g.lineTo(X(p.v), YP(p.p)); else g.moveTo(X(p.v), YP(p.p)); }); g.stroke();
        // best point
        const b = o.best;
        g.save(); g.translate(X(b.v), YP(b.p)); g.rotate(Math.PI / 4); g.fillStyle = c.paper; g.fillRect(-V.px(5.5), -V.px(5.5), V.px(11), V.px(11)); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.strokeRect(-V.px(5.5), -V.px(5.5), V.px(11), V.px(11)); g.restore();
        text(g, V, 'best ' + fmt(b.p, 0) + ' W', X(b.v) + 11, YP(b.p) - 8, { px: 10.5, mono: true, weight: 700 });
        // operating point
        g.beginPath(); g.arc(X(o.v), YI(o.i), V.px(6), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
        g.beginPath(); g.arc(X(o.v), YP(o.p), V.px(6), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.stroke();
        text(g, V, 'Isc ' + fmt(o.isc, 1) + ' A', f.x0 + 6, YI(o.isc) - 7, { px: 10.5, mono: true, color: c.elec, weight: 700 });
        text(g, V, 'Voc ' + fmt(o.voc, 1) + ' V', X(o.voc) - 4, f.y0 + f.h - 8, { px: 10.5, mono: true, color: c.ink2, align: 'right', weight: 700 });
      }

      function drawSmall(g, V, c, r, title, xl, pts, xmax, cur, xticks) {
        const o = op();
        const f = plotFrame(g, V, c, r, title, xl, '');
        const X = (x) => f.x0 + (x / xmax) * f.w, Y = (p) => f.y0 + f.h - (p / P_AXIS) * f.h;
        xticks.forEach((t) => { line(g, V, X(t), f.y0 + f.h, X(t), f.y0 + f.h + 4, c.ink, 1); text(g, V, String(t), X(t), f.y0 + f.h + 15, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false }); });
        for (const p of [0, 100, 200, 300]) { line(g, V, f.x0 - 4, Y(p), f.x0, Y(p), c.ink, 1); text(g, V, String(p), f.x0 - 6, Y(p) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); }
        g.strokeStyle = c.hot; g.lineWidth = V.px(2.6); g.beginPath();
        pts.forEach((p, k) => { if (k) g.lineTo(X(p.x), Y(p.p)); else g.moveTo(X(p.x), Y(p.p)); }); g.stroke();
        const pm = So.mpp(host.ctl.sun, host.ctl.temp).p;
        g.beginPath(); g.arc(X(cur), Y(pm), V.px(6), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
        text(g, V, fmt(pm, 0) + ' W', X(cur) + (cur > xmax * 0.7 ? -10 : 10), Y(pm) - 10, { px: 11, mono: true, weight: 700, align: cur > xmax * 0.7 ? 'right' : 'left' });
        return o;
      }
      function drawPG(g, V, c, r) { drawSmall(g, V, c, r, 'Best power against sunlight, W', 'sunlight, W/m²', pOfG(), 1100, host.ctl.sun, [0, 250, 500, 750, 1000]); }
      function drawPT(g, V, c, r) { drawSmall(g, V, c, r, 'Best power against cell temperature, W', 'cell temperature, °C', pOfT(), 85, host.ctl.temp, [0, 20, 40, 60, 80]); }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
