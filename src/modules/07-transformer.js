(function (root) {
  'use strict';
  const OM = root.OM;
  const Tf = OM.transformer;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, hatchRect, alpha } = OM.gfx;

  const SLOW_AC = 1 / 120; // the picture runs 120 times slower than the mains
  const SLOW_DC = 1 / 250;
  const DC_SPAN = 0.02; // seconds shown in the DC plot
  const SQ2 = Math.SQRT2;

  OM.register({
    id: 'transformer',
    title: 'Transformer',
    group: 'electric',
    hook: 'Two coils that never touch. A changing flux in one makes a voltage in the other, in proportion to the turns.',
    units: 'V, A, T, W, turns',
    alt: 'Iron core with a primary and a secondary coil, a lamp load, an oscilloscope-style plot of primary and secondary voltage, and a plot of flux density against the saturation limit.',
    controls: [
      { id: 'src', type: 'seg', label: 'Supply', value: 'ac', options: [{ v: 'ac', l: 'Mains (AC)' }, { v: 'dc', l: 'Battery (DC)' }] },
      { id: 'vrms', type: 'range', label: 'Primary voltage', min: 12, max: 240, step: 1, value: 220, unit: 'V' },
      { id: 'np', type: 'range', label: 'Primary turns', min: 100, max: 400, step: 1, value: 183 },
      { id: 'ns', type: 'range', label: 'Secondary turns', min: 5, max: 800, step: 1, value: 10 },
      { id: 'rload', type: 'range', label: 'Load resistance', min: 1, max: 500, step: 1, value: 10, unit: 'Ω' },
      { id: 'f', type: 'seg', label: 'Mains frequency', value: 60, options: [{ v: 50, l: '50 Hz' }, { v: 60, l: '60 Hz' }], showIf: (c) => c.src === 'ac', hint: 'Cebu and the rest of the Philippines use 60 Hz.' },
      { id: 'scope', type: 'seg', label: 'Voltage plot', value: 'same', options: [{ v: 'same', l: 'Same scale' }, { v: 'fit', l: 'Fit each' }] },
      { id: 'dcgo', type: 'button', label: 'Switch the DC on again', primary: true, playOnClick: true, showIf: (c) => c.src === 'dc' },
    ],
    content: {
      intro: 'A transformer has no moving parts and no electrical connection between its two sides. The primary coil makes a changing magnetic flux in an iron core, and the flux passing through the secondary coil makes a voltage in it.',
      steps: [
        { h: 'Current makes flux', p: 'Alternating current in the primary coil drives a magnetic flux round the iron core. The flux rises and falls with the current, so it keeps changing direction.' },
        { h: 'Changing flux makes voltage', p: 'A coil gets a voltage equal to its number of turns times the rate the flux through it changes. The same flux goes through both coils, so each turn gets the same voltage.' },
        { h: 'Turns set the ratio', p: 'Every turn sees the same flux, so the voltages are in the ratio of the turns. 183 turns to 10 turns takes 220 V down to 12 V.' },
        { h: 'Power is conserved', p: 'A step-down transformer gives a lower voltage and a higher current. The power out is the power in, less a few percent lost as heat in the wire and the core.' },
      ],
      principle: {
        lead: 'Faraday’s law in a box: voltage is turns times the rate of change of flux. Both coils share the flux, so the ratio of voltages is the ratio of turns.',
        eqs: [
          { label: 'Voltage ratio', eq: 'V~s~ / V~p~ = N~s~ / N~p~' },
          { label: 'Current ratio', eq: 'I~s~ / I~p~ = N~p~ / N~s~', note: 'What you gain in voltage you pay for in current.' },
          { label: 'Flux in the core', eq: 'B~max~ = V~rms~ / (4.44 f N~p~ A)', note: 'A is the core cross-section, 30 cm² here. Iron saturates above about 1.7 T.' },
          { label: 'Losses', eq: 'P~loss~ = I²R (wires) + core loss', note: 'Well-made transformers are 95 to 99 percent efficient.' },
        ],
        points: [
          'Try the **battery**. Steady current makes a steady flux, and a steady flux induces nothing. You get one brief pulse at switch-on. The core then saturates and only the wire resistance limits the current, which is how transformers burn out on DC.',
          'Fewer turns or a lower frequency means more flux for the same voltage. Drop the primary turns to 100, or run a 60 Hz design on 50 Hz, and the flux crosses the saturation line.',
          '**What this model leaves out:** leakage flux, eddy-current detail, the exact magnetising curve and temperature. The flux density figure uses the standard EMF equation.',
        ],
      },
      myth: {
        claim: 'A step-up transformer creates extra power.',
        truth: 'The voltage goes up and the current goes down by the same factor, so the power is the same. The step-up transformer at a power station raises the voltage so the same power can travel with far less current, and far less heat, in the power lines.',
      },
      tries: [
        { label: 'Step-down to 12 V', text: '183 turns to 10 turns. 220 V becomes 12 V.', set: { src: 'ac', vrms: 220, np: 183, ns: 10, rload: 10, f: 60 } },
        { label: 'Step-up to 660 V', text: 'Three times the turns on the secondary.', set: { src: 'ac', vrms: 220, np: 200, ns: 600, rload: 400, f: 60 } },
        { label: 'Too few turns', text: 'The core saturates and the magnetising current soars.', set: { src: 'ac', np: 100, ns: 50, vrms: 220 } },
        { label: 'Wrong frequency', text: 'A 60 Hz design run on 50 Hz gets 20 percent more flux.', set: { src: 'ac', vrms: 220, np: 183, ns: 10, f: 50 } },
        { label: 'Put DC in', text: 'One pulse at switch-on, then nothing, and a huge primary current.', set: { src: 'dc', vrms: 220, np: 183, ns: 10 }, action: 'dcgo', play: true },
      ],
      quiz: [
        { q: 'The primary has 500 turns and the secondary 50. The primary voltage is 230 V. About what comes out?', opts: ['2,300 V', '23 V', '230 V', '2.3 V'], a: 1, why: 'The voltage scales with the turns: 230 × 50 ÷ 500 = 23 V. The current is ten times higher.' },
        { q: 'Why does a transformer not work on steady DC?', opts: ['The wire is too thick', 'A steady current makes a steady flux, and only a changing flux induces a voltage', 'DC is too weak', 'The core gets too cold'], a: 1, why: 'Voltage comes from the rate of change of flux. With DC the flux stops changing after switch-on.' },
        { q: 'Why is long-distance power sent at very high voltage?', opts: ['High voltage travels faster', 'The same power needs less current, so the wires lose far less energy as heat', 'It is safer', 'Transformers only work at high voltage'], a: 1, why: 'Heat in the wire is I²R. Raising the voltage ten times cuts the current ten times and the loss a hundred times.' },
      ],
      sources: [
        'S. J. Chapman, *Electric Machinery Fundamentals*, McGraw-Hill (transformers).',
      ],
    },

    create(host) {
      const st = { cyc: 0, dc: 0, dcHold: 0 };
      let L = null;

      const an = () => Tf.analyse({ vrms: host.ctl.vrms, f: host.ctl.f, np: host.ctl.np, ns: host.ctl.ns, rLoad: host.ctl.rload });
      const dcNow = () => Tf.dcStep({ v: host.ctl.vrms, np: host.ctl.np, ns: host.ctl.ns, tSince: Math.max(1e-6, st.dc) });
      const isDC = () => host.ctl.src === 'dc';

      const sim = {
        ref: { w: 780, h: 420 },
        refNarrow: { w: 420, h: 760 },
        state: st,
        init() { st.cyc = 0; st.dc = 0; st.dcHold = 0; },
        layout(V) {
          L = V.narrow
            ? { scene: { x: 0, y: 0 }, v: { x: 12, y: 372, w: 396, h: 190 }, b: { x: 12, y: 580, w: 396, h: 160 } }
            : { scene: { x: 0, y: 10 }, v: { x: 436, y: 12, w: 336, h: 210 }, b: { x: 436, y: 236, w: 336, h: 160 } };
        },
        step(dt) {
          if (isDC()) {
            if (st.dc < DC_SPAN) st.dc += dt * SLOW_DC * 1.0;
            else { st.dcHold += dt; if (st.dcHold > 1.5) { st.dc = 0; st.dcHold = 0; } }
          } else st.cyc += dt * host.ctl.f * SLOW_AC;
        },
        thumb() { st.cyc = 0.22; },
        action(id) { if (id === 'dcgo') { st.dc = 0; st.dcHold = 0; } },
        onControl(id, v) { if (id === 'src' && v === 'dc') { st.dc = 0; st.dcHold = 0; } },
        readouts() {
          const a = an();
          if (isDC()) {
            const d = dcNow();
            return [
              { k: 'Turns ratio', v: fmt(a.ratio, 3) },
              { k: 'Secondary now', v: fmt(d.v2, 1) + ' V' },
              { k: 'After switch-on', v: '0 V', tone: 'warn' },
              { k: 'Flux density', v: fmt(Math.min(1.7, (host.ctl.vrms * Math.max(st.dc, 0)) / (host.ctl.np * Tf.A_CORE)), 2) + ' T' },
              { k: 'Primary current', v: d.saturated ? fmt(d.i1, 0) + ' A' : '< 0.1 A', tone: d.saturated ? 'bad' : '' },
              { k: 'Core', v: d.saturated ? 'saturated' : 'filling', tone: d.saturated ? 'bad' : '' },
            ];
          }
          return [
            { k: 'Turns ratio', v: fmt(a.ratio, 3) + ' (' + a.kind + ')' },
            { k: 'Secondary', v: fmt(a.v2, 1) + ' V' },
            { k: 'Secondary current', v: fmt(a.i2, 2) + ' A' },
            { k: 'Primary current', v: fmt(a.i1, 2) + ' A', tone: a.saturated ? 'bad' : '' },
            { k: 'Peak flux density', v: fmt(a.bMax, 2) + ' T', tone: a.saturated ? 'bad' : a.bMax > 1.6 ? 'warn' : 'good' },
            { k: 'Power out', v: fmt(a.pOut, 1) + ' W' },
            { k: 'Efficiency', v: fmt(a.eff * 100, 1) + ' %' },
          ];
        },
        caption() {
          if (isDC()) return dcNow().saturated ? 'Saturated: only the wire limits the current' : 'Flux still rising';
          const a = an();
          return a.saturated ? 'Core saturated' : a.kind === 'step-up' ? 'Step-up' : a.kind === 'step-down' ? 'Step-down' : '1 to 1';
        },
        describe() { const a = an(); return isDC() ? 'Direct current. The secondary voltage is zero once the core has saturated.' : 'Secondary voltage ' + fmt(a.v2, 1) + ' volts, peak flux density ' + fmt(a.bMax, 2) + ' tesla.' + (a.saturated ? ' The core is saturated.' : ''); },

        draw(g, V, c) {
          drawScene(g, V, c);
          if (V.thumb) return;
          drawVolts(g, V, c);
          drawFlux(g, V, c);
        },
      };

      function fluxNow() {
        if (isDC()) {
          const d = dcNow();
          return { phi: Math.min(1.7, (host.ctl.vrms * st.dc) / (host.ctl.np * Tf.A_CORE)) / 1.7, sat: d.saturated };
        }
        const a = an();
        return { phi: clamp((-Math.cos(2 * Math.PI * st.cyc) * Math.min(a.bMax, 1.75)) / 1.75, -1, 1), sat: a.saturated };
      }

      function drawScene(g, V, c) {
        g.save();
        g.translate(L.scene.x, L.scene.y);
        const a = an();
        const fl = fluxNow();
        const ink = c.ink;
        // core (laminated iron): outer 80..320 x 56..266, window 140..260 x 108..214
        const ox = 80, oy = 56, ow = 240, oh = 210, ix = 140, iy = 108, iw = 120, ih = 106;
        g.fillStyle = c.paper2; g.fillRect(ox, oy, ow, oh);
        hatchRect(g, V, ox, oy, ow, oh, { gap: 6, color: c.line, flip: true });
        g.fillStyle = fl.sat ? alpha(c.bad, 0.22) : alpha(c.metal, 0.25); g.fillRect(ox, oy, ow, oh);
        g.strokeStyle = ink; g.lineWidth = V.px(2); g.strokeRect(ox, oy, ow, oh);
        g.fillStyle = c.paper2; g.fillRect(ix, iy, iw, ih); g.strokeRect(ix, iy, iw, ih);
        // flux chevrons along the middle of the core
        const loop = [[110, 82], [290, 82], [290, 240], [110, 240]];
        const dirSign = fl.phi >= 0 ? 1 : -1;
        const mag = Math.abs(fl.phi);
        g.lineWidth = V.px(1.4);
        for (let i = 0; i < 4; i++) {
          const p = loop[i], q = loop[(i + 1) % 4];
          const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
          const n = Math.round(len / 46);
          for (let k = 0; k < n; k++) {
            const t = (k + 0.5) / n;
            const x = p[0] + (q[0] - p[0]) * t, y = p[1] + (q[1] - p[1]) * t;
            const ux = ((q[0] - p[0]) / len) * dirSign, uy = ((q[1] - p[1]) / len) * dirSign;
            g.strokeStyle = alpha(fl.sat ? c.bad : c.cold, 0.15 + 0.85 * mag);
            g.lineWidth = V.px(2.2);
            g.beginPath(); g.moveTo(x - ux * 7 - uy * 6, y - uy * 7 + ux * 6); g.lineTo(x + ux * 7, y + uy * 7); g.lineTo(x - ux * 7 + uy * 6, y - uy * 7 - ux * 6); g.stroke();
          }
        }
        text(g, V, 'flux', 200, 96, { px: 11, color: c.cold, align: 'center', weight: 700 });
        // coils
        const coil = (cx, n, col) => {
          const cnt = clamp(Math.round(n / 22), 3, 26);
          const top = 92, bot = 232;
          for (let i = 0; i < cnt; i++) {
            const y = top + ((bot - top) * (i + 0.5)) / cnt;
            g.fillStyle = alpha(col, 0.75); g.strokeStyle = ink; g.lineWidth = V.px(1.2);
            OM.gfx.rrect(g, cx - 42, y - (bot - top) / cnt / 2 + 0.8, 84, (bot - top) / cnt - 1.6, 3);
            g.fill(); g.stroke();
          }
          return [top, bot];
        };
        coil(110, host.ctl.np, c.hot);
        coil(290, host.ctl.ns, c.cold);
        text(g, V, 'primary', 110, 282, { px: 12, weight: 800, color: c.hot, align: 'center' });
        text(g, V, host.ctl.np + ' turns', 110, 298, { px: 11, mono: true, align: 'center' });
        text(g, V, 'secondary', 290, 282, { px: 12, weight: 800, color: c.cold, align: 'center' });
        text(g, V, host.ctl.ns + ' turns', 290, 298, { px: 11, mono: true, align: 'center' });
        // source
        const sx = 34, sy = 160;
        g.beginPath(); g.arc(sx, sy, 20, 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill(); g.strokeStyle = ink; g.lineWidth = V.px(1.8); g.stroke();
        if (isDC()) { text(g, V, '+  −', sx, sy + 5, { px: 14, weight: 800, align: 'center', halo: false }); }
        else {
          g.beginPath(); g.moveTo(sx - 12, sy);
          for (let i = 0; i <= 24; i++) g.lineTo(sx - 12 + i, sy - Math.sin((i / 24) * Math.PI * 2) * 8);
          g.strokeStyle = ink; g.stroke();
        }
        g.strokeStyle = ink; g.lineWidth = V.px(1.8);
        g.beginPath(); g.moveTo(sx, sy - 20); g.lineTo(sx, 50); g.lineTo(110, 50); g.lineTo(110, 92);
        g.moveTo(sx, sy + 20); g.lineTo(sx, 274); g.lineTo(110 + 0, 274); g.lineTo(110, 232); g.stroke();
        g.fillStyle = alpha(c.hot, 0.001);
        text(g, V, fmt(host.ctl.vrms, 0) + ' V' + (isDC() ? ' DC' : ' AC'), 4, sy - 30, { px: 12, weight: 800, mono: true, align: 'left', color: c.hot });
        // load lamp
        const lx = 372, ly = 160;
        const lit = isDC() ? clamp(dcNow().v2 / 12, 0, 1) * 0.6 : clamp(a.pOut / 40, 0, 1);
        if (lit > 0.02) {
          const gl = g.createRadialGradient(lx, ly, 2, lx, ly, 38);
          gl.addColorStop(0, alpha(c.accent, 0.95 * lit)); gl.addColorStop(1, alpha(c.accent, 0));
          g.fillStyle = gl; g.beginPath(); g.arc(lx, ly, 38, 0, Math.PI * 2); g.fill();
        }
        g.beginPath(); g.arc(lx, ly, 15, 0, Math.PI * 2); g.fillStyle = alpha(c.accent, 0.25 + 0.7 * lit); g.fill(); g.strokeStyle = ink; g.lineWidth = V.px(1.8); g.stroke();
        g.beginPath(); g.moveTo(lx - 8, ly + 8); g.lineTo(lx + 8, ly - 8); g.moveTo(lx - 8, ly - 8); g.lineTo(lx + 8, ly + 8); g.stroke();
        g.beginPath(); g.moveTo(lx, ly - 15); g.lineTo(lx, 50); g.lineTo(290, 50); g.lineTo(290, 92);
        g.moveTo(lx, ly + 15); g.lineTo(lx, 274); g.lineTo(290, 274); g.lineTo(290, 232); g.stroke();
        text(g, V, fmt(host.ctl.rload, 0) + ' Ω load', lx, ly + 34, { px: 11, mono: true, align: 'center' });
        text(g, V, (isDC() ? fmt(dcNow().v2, 1) : fmt(a.v2, 1)) + ' V', lx, ly - 26, { px: 12, weight: 800, mono: true, align: 'center', color: c.cold });
        if (isDC() && dcNow().saturated) text(g, V, 'I₁ = ' + fmt(dcNow().i1, 0) + ' A !', sx + 6, 312, { px: 13, weight: 800, mono: true, color: c.bad });
        // the formula with live numbers
        if (!V.narrow) text(g, V, 'Vₛ ÷ Vₚ = Nₛ ÷ Nₚ = ' + host.ctl.ns + ' ÷ ' + host.ctl.np + ' = ' + fmt(a.ratio, 3), 14, 344, { px: 13, weight: 700, mono: true, halo: false });
        g.restore();
      }

      function frame(g, V, c, r, title, xl) {
        text(g, V, title, r.x, r.y + 10, { px: 12, weight: 700, halo: false });
        const x0 = r.x + 36, y0 = r.y + 20, w = r.w - 44, h = r.h - 46;
        g.fillStyle = alpha(c.paper2, 0.9); g.fillRect(x0, y0, w, h);
        g.strokeStyle = c.ink; g.lineWidth = V.px(1.5); g.strokeRect(x0, y0, w, h);
        text(g, V, xl, x0 + w, y0 + h + 22, { px: 10.5, color: c.ink2, align: 'right', halo: false });
        return { x0, y0, w, h };
      }

      function drawVolts(g, V, c) {
        const f = frame(g, V, c, L.v, 'Voltage on each side', isDC() ? 'time, milliseconds (from switch-on)' : (host.ctl.scope === 'same' ? 'time, two mains cycles' : 'time, two mains cycles (each wave to its own scale)'));
        const a = an();
        const dc = isDC();
        const p1 = dc ? host.ctl.vrms : SQ2 * host.ctl.vrms;
        const p2 = dc ? (host.ctl.vrms * host.ctl.ns) / host.ctl.np : SQ2 * a.v2;
        const same = host.ctl.scope === 'same';
        const s1 = (same ? Math.max(p1, p2) : p1) * 1.15 || 1, s2 = (same ? Math.max(p1, p2) : Math.max(p2, 1e-6)) * 1.15;
        const mid = f.y0 + f.h / 2, hh = f.h / 2 - 4;
        const X = (u) => f.x0 + u * f.w;
        line(g, V, f.x0, mid, f.x0 + f.w, mid, c.ink2, 1);
        for (let i = 1; i < (dc ? 4 : 4); i++) line(g, V, X(i / 4), f.y0, X(i / 4), f.y0 + f.h, alpha(c.ink, 0.1), 1);
        const curve = (fn, scale, col, wpx) => {
          g.strokeStyle = col; g.lineWidth = V.px(wpx); g.lineJoin = 'round'; g.beginPath();
          for (let i = 0; i <= 240; i++) {
            const u = i / 240;
            const y = mid - (fn(u) / scale) * hh;
            if (i === 0) g.moveTo(X(u), y); else g.lineTo(X(u), y);
          }
          g.stroke();
        };
        if (dc) {
          curve((u) => (u > 0.005 ? p1 : 0), s1, c.hot, 2.2);
          curve((u) => { const d = Tf.dcStep({ v: host.ctl.vrms, np: host.ctl.np, ns: host.ctl.ns, tSince: Math.max(1e-6, u * DC_SPAN) }); return u > 0.005 ? d.v2 : 0; }, s2, c.cold, 2.2);
        } else {
          curve((u) => p1 * Math.sin(u * 4 * Math.PI), s1, c.hot, same ? 2.4 : 5);
          curve((u) => p2 * Math.sin(u * 4 * Math.PI), s2, c.cold, 2.4);
        }
        const cur = dc ? clamp(st.dc / DC_SPAN, 0, 1) : (st.cyc * host.ctl.f ? (st.cyc % 2) / 2 : 0);
        const cx = X(dc ? cur : ((st.cyc % 2) / 2));
        line(g, V, cx, f.y0, cx, f.y0 + f.h, c.ink, 1.5);
        g.fillStyle = c.accent; g.beginPath(); g.moveTo(cx - V.px(5), f.y0 - V.px(7)); g.lineTo(cx + V.px(5), f.y0 - V.px(7)); g.lineTo(cx, f.y0 - 1); g.closePath(); g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(1.2); g.stroke();
        text(g, V, 'primary ' + fmt(p1, 0) + ' V' + (dc ? '' : ' peak'), f.x0 + 6, f.y0 + 14, { px: 11, weight: 800, color: c.hot });
        text(g, V, 'secondary ' + fmt(p2, p2 < 10 ? 1 : 0) + ' V' + (dc ? ' at first' : ' peak'), f.x0 + 6, f.y0 + f.h - 8, { px: 11, weight: 800, color: c.cold });
        if (dc) for (const ms of [0, 5, 10, 15, 20]) text(g, V, String(ms), X(ms / 20), f.y0 + f.h + 13, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false });
      }

      function drawFlux(g, V, c) {
        const f = frame(g, V, c, L.b, 'Flux density in the core (tesla)', isDC() ? 'time, milliseconds' : 'time, two mains cycles');
        const a = an();
        const dc = isDC();
        const YM = 2.2;
        const Y = (b) => f.y0 + f.h / 2 - (b / YM) * (f.h / 2);
        const X = (u) => f.x0 + u * f.w;
        for (const lim of dc ? [1.7] : [1.7, -1.7]) { line(g, V, f.x0, Y(lim), f.x0 + f.w, Y(lim), c.bad, 1.4, [5, 3]); }
        text(g, V, 'saturation 1.7 T', f.x0 + f.w - 4, Y(1.7) - 4, { px: 10, color: c.bad, align: 'right', weight: 700, halo: false });
        line(g, V, f.x0, Y(0), f.x0 + f.w, Y(0), c.ink2, 1);
        g.strokeStyle = a.saturated && !dc ? c.bad : c.cold; g.lineWidth = V.px(2.4); g.lineJoin = 'round'; g.beginPath();
        for (let i = 0; i <= 240; i++) {
          const u = i / 240;
          let b;
          if (dc) b = Math.min(1.7, (host.ctl.vrms * Math.max(0, u * DC_SPAN)) / (host.ctl.np * Tf.A_CORE));
          else b = Math.max(-1.75, Math.min(1.75, -a.bMax * Math.cos(u * 4 * Math.PI)));
          const y = Y(b);
          if (i === 0) g.moveTo(X(u), y); else g.lineTo(X(u), y);
        }
        g.stroke();
        const cx = X(dc ? clamp(st.dc / DC_SPAN, 0, 1) : (st.cyc % 2) / 2);
        line(g, V, cx, f.y0, cx, f.y0 + f.h, c.ink, 1.5);
        if (!dc) text(g, V, 'peak ' + fmt(a.bMax, 2) + ' T' + (a.saturated ? '  saturated' : ''), f.x0 + 6, f.y0 + f.h - 6, { px: 11, weight: 800, color: a.saturated ? c.bad : c.cold });
        else text(g, V, dcNow().saturated ? 'saturated, flux stops changing' : 'rising at V ÷ N', f.x0 + 6, f.y0 + f.h - 6, { px: 11, weight: 800, color: dcNow().saturated ? c.bad : c.cold });
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
