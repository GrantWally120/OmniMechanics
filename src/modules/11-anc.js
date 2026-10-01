(function (root) {
  'use strict';
  const OM = root.OM;
  const An = OM.anc;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, alpha } = OM.gfx;

  const SOUND = 343; // m/s
  const CYCLES = 3; // cycles shown across each trace

  OM.register({
    id: 'anc',
    title: 'Noise-cancelling headphones',
    group: 'signals',
    hook: 'Add sound to remove sound. A second wave, the mirror image of the first, cancels it at your ear, but only if it arrives on time.',
    units: 'Hz, µs, dB, °',
    alt: 'Three waveform traces showing the noise, the anti-noise and the sum you hear, a block diagram of the headphone electronics, and a chart of noise reduction against frequency for the current delay.',
    controls: [
      { id: 'mode', type: 'seg', label: 'Who makes the anti-noise?', value: 'manual', options: [{ v: 'manual', l: 'You, by hand' }, { v: 'auto', l: 'Headphone electronics' }] },
      { id: 'f', type: 'range', label: 'Noise pitch', min: 50, max: 4000, step: 10, value: 300, unit: 'Hz', hint: 'An engine drone is about 100 Hz, speech about 300 to 3000 Hz.' },
      { id: 'amp', type: 'range', label: 'Anti-noise loudness', min: 0, max: 1.5, step: 0.05, value: 0.7, dec: 2, unit: '× the noise', showIf: (c) => c.mode === 'manual' },
      { id: 'phase', type: 'range', label: 'Anti-noise timing (phase)', min: 0, max: 360, step: 1, value: 120, unit: '°', showIf: (c) => c.mode === 'manual', hint: 'Turn it to 180° for the mirror image.' },
      { id: 'tau', type: 'range', label: 'Electronics delay', min: 0, max: 400, step: 5, value: 60, unit: 'µs', hint: 'Microphone to chip to speaker. 60 µs is about the time sound takes to cross 2 cm.' },
    ],
    content: {
      intro: 'Noise-cancelling headphones add sound to remove sound. A microphone hears the noise, the electronics flip the wave upside down, and the speaker plays that mirror image so the two cancel at your ear.',
      steps: [
        { h: 'Waves add up', p: 'Where two sound waves meet, their pressures add. A crest meeting a crest makes a louder sound. A crest meeting a trough makes them cancel.' },
        { h: 'Play the mirror image', p: 'A wave shifted by half a cycle (180°) is the exact opposite of the original. Add the two together and, at every moment, the result is zero.' },
        { h: 'The clock is ticking', p: 'The microphone, chip and speaker take a few tens of microseconds. By the time the anti-noise arrives, the noise has moved on, so the mirror image is slightly off.' },
        { h: 'Low pitches win', p: 'A fixed delay is a small slice of a long wave and a big slice of a short one. 60 µs is 2 percent of a 300 Hz cycle but 36 percent of a 6 kHz cycle, so high pitches cannot be cancelled this way.' },
      ],
      principle: {
        lead: 'Cancelling is a sum of two waves of the same pitch. The size of what is left depends only on how well the anti-noise matches in loudness and timing.',
        eqs: [
          { label: 'What is left', eq: 'residual = | 1 + a e^{iφ} |', note: 'a is the anti-noise loudness compared with the noise, φ its timing shift. Perfect is a = 1 and φ = 180°.' },
          { label: 'With a delay τ', eq: 'residual = 2 sin(π f τ)', note: 'An exact mirror image made τ seconds late. Small for low f, and more than 1 (louder) above f = 1 ÷ (6τ).' },
          { label: 'In decibels', eq: 'reduction = −20 log₁₀(residual)', note: '10 dB is roughly half as loud to your ear. 20 dB is a tenth of the pressure.' },
        ],
        points: [
          'That is why headphones tackle steady low rumble, like a jet engine or a bus, and do little for voices, hiss or a sudden clatter. Soft ear cushions block the high pitches the electronics cannot.',
          'Real headphones have one microphone outside and often one inside the cup, and the electronics adapt continuously to the exact delay of your head and the cup.',
          '**What this model leaves out:** adaptive filtering, the speaker’s own response and the position of your head. It shows one steady pitch, where real noise is a mix of many.',
        ],
      },
      myth: {
        claim: 'Noise-cancelling headphones work by blocking the sound out, like earplugs.',
        truth: 'Soft cups and ear pads do block the high pitches. The electronics do something different: they make a second sound that cancels the low rumble at your ear. Two sounds adding up to silence.',
      },
      tries: [
        { label: 'Cancel it by hand', text: 'Anti-noise exactly equal and opposite.', set: { mode: 'manual', amp: 1, phase: 180 } },
        { label: 'Wrong by 90°', text: 'Same loudness but a quarter cycle late. It gets louder, not quieter.', set: { mode: 'manual', amp: 1, phase: 90 } },
        { label: 'Engine drone, 100 Hz', text: 'Low pitch: cancels very well.', set: { mode: 'auto', f: 100, tau: 60 } },
        { label: 'A voice, 2 kHz', text: 'The same delay now makes a poor mirror image.', set: { mode: 'auto', f: 2000, tau: 60 } },
        { label: 'Very high, 4 kHz', text: 'Above the crossover, the anti-noise makes things worse.', set: { mode: 'auto', f: 4000, tau: 60 } },
      ],
      quiz: [
        { q: 'You add a sound wave to a copy of itself shifted by half a cycle. What do you hear?', opts: ['Twice as loud', 'Nothing at all, the waves cancel', 'The same as before', 'A higher pitch'], a: 1, why: 'A half-cycle shift turns every crest into a trough. At each instant the two add up to zero.' },
        { q: 'Why do headphones cancel low rumble better than high-pitched sounds?', opts: ['High sounds are louder', 'A fixed electronic delay is a small fraction of a long, low-pitched wave but a big fraction of a short, high-pitched one', 'The microphone cannot hear high sounds', 'Low sounds are lighter'], a: 1, why: 'Phase error is 360° × f × τ. It grows in proportion to the pitch.' },
        { q: 'The anti-noise is exactly as loud as the noise but 90° out of timing. What happens?', opts: ['Complete silence', 'Half as loud', 'About 1.4 times as loud', 'No change'], a: 2, why: '| 1 + e^{i 90°} | = √2, about 1.41. A poorly timed anti-noise adds to the noise.' },
      ],
      era: 'Lueg, 1934',
      level: 4,
      parts: [
        { name: 'Outside microphone', note: 'Listens to the noise before it reaches your ear.' },
        { name: 'Electronics', note: 'Delay and invert the signal so that it is the mirror image of the noise.' },
        { name: 'Speaker', note: 'Plays the mirror-image sound beside the noise.' },
        { name: 'Ear cup', note: 'Blocks high pitches on its own. The electronics deal with the low ones.' },
      ],
      facts: [
        'Paul Lueg filed the first patent for cancelling sound with an inverted copy of it in 1934, long before there was electronics able to do it well.',
        'Amar Bose came up with the idea for noise-cancelling headphones on a flight from Europe in 1978. His first headset flew on the Voyager, the plane that flew non-stop around the world in 1986.',
        'It works best on steady, low-pitched noise such as engine drone. High pitches change too quickly and are mostly blocked by the ear cups themselves.',
      ],
      sources: [
        'S. M. Kuo and D. R. Morgan, *Active Noise Control Systems*, Wiley (1996).',
        'P. A. Nelson and S. J. Elliott, *Active Control of Sound*, Academic Press (1992).',
      ],
    },

    create(host) {
      const st = { u: 0 };
      let L = null;

      function params() {
        const c = host.ctl;
        if (c.mode === 'auto') { const e = An.electronic(c.f, c.tau); return { a: e.a, phi: e.phi, amp: e.amp }; }
        const phi = (c.phase * Math.PI) / 180;
        return { a: c.amp, phi, amp: An.residual(c.amp, phi) };
      }

      const sim = {
        ref: { w: 780, h: 480 },
        refNarrow: { w: 420, h: 770 },
        state: st,
        init() { st.u = 0; },
        layout(V) {
          L = V.narrow
            ? { block: { x: 10, y: 6, w: 400, h: 70 }, tr: { x: 10, y: 94, w: 400, h: 270 }, chart: { x: 10, y: 480, w: 400, h: 240 }, meter: { x: 10, y: 392, w: 390 }, nums: { x: 12, y: 740 } }
            : { block: { x: 10, y: 6, w: 500, h: 74 }, tr: { x: 10, y: 98, w: 500, h: 290 }, chart: { x: 530, y: 12, w: 242, h: 290 }, meter: { x: 10, y: 404, w: 500 }, nums: { x: 532, y: 336 } };
        },
        step(dt) { st.u += dt * 0.5; },
        thumb() { st.u = 0.2; },
        readouts() {
          const p = params();
          const f = host.ctl.f;
          const db = An.toDb(p.amp);
          return [
            { k: 'Noise', v: '100 %' },
            { k: 'You hear', v: fmt(p.amp * 100, 0) + ' %', tone: p.amp < 0.35 ? 'good' : p.amp > 1.02 ? 'bad' : 'warn' },
            { k: 'Change', v: p.amp <= 1 ? fmt(db, 1) + ' dB quieter' : fmt(-db, 1) + ' dB louder', tone: p.amp <= 1 ? 'good' : 'bad' },
            { k: 'Wavelength', v: fmt(SOUND / f, 2) + ' m' },
            { k: 'One cycle lasts', v: fmt(1e6 / f, 0) + ' µs' },
            { k: 'Delay is', v: fmt(host.ctl.tau * 1e-6 * f * 100, 1) + ' % of a cycle' },
          ];
        },
        caption() { const p = params(); return p.amp < 0.1 ? 'Near silence' : p.amp < 0.5 ? 'Much quieter' : p.amp < 0.98 ? 'A bit quieter' : p.amp < 1.02 ? 'No change' : 'Louder!'; },
        describe() { const p = params(); return 'You hear ' + fmt(p.amp * 100, 0) + ' percent of the noise, ' + (p.amp <= 1 ? fmt(An.toDb(p.amp), 1) + ' decibels quieter.' : fmt(-An.toDb(p.amp), 1) + ' decibels louder.'); },

        draw(g, V, c) {
          drawBlock(g, V, c);
          drawTraces(g, V, c);
          if (V.thumb) return;
          drawMeter(g, V, c);
          drawChart(g, V, c);
        },
      };

      function box(g, V, c, x, y, w, h, title, sub, fill) {
        g.fillStyle = fill || c.paper2; g.fillRect(x, y, w, h);
        g.strokeStyle = c.ink; g.lineWidth = V.px(1.8); g.strokeRect(x, y, w, h);
        text(g, V, title, x + w / 2, y + h / 2 - 2, { px: 11.5, weight: 800, align: 'center', halo: false });
        text(g, V, sub, x + w / 2, y + h / 2 + 13, { px: 10, color: c.ink2, align: 'center', halo: false });
      }
      function drawBlock(g, V, c) {
        const b = L.block;
        const n = 4, gap = 26, bw = (b.w - gap * (n - 1)) / n, y = b.y + 6, h = b.h - 14;
        const names = [['Microphone', 'hears the noise'], ['Flip + delay', 'invert, then τ late'], ['Speaker', 'plays anti-noise'], ['Your ear', 'noise + anti-noise']];
        names.forEach((nm, i) => {
          const x = b.x + i * (bw + gap);
          box(g, V, c, x, y, bw, h, nm[0], nm[1], i === 1 ? alpha(c.accent, 0.45) : c.paper2);
          if (i < n - 1) arrow(g, V, x + bw + 2, y + h / 2, x + bw + gap - 2, y + h / 2, c.ink, 2, 8);
        });
        if (host.ctl.mode === 'auto') text(g, V, 'τ = ' + host.ctl.tau + ' µs', b.x + 1 * (bw + gap) + bw / 2, y - 1, { px: 10.5, mono: true, align: 'center', weight: 800, halo: false });
      }

      function drawTraces(g, V, c) {
        const t = L.tr;
        const p = params();
        const rows = [
          { name: 'Noise from outside', col: c.hot, fn: (u) => Math.sin(2 * Math.PI * u) },
          { name: 'Anti-noise from the speaker', col: c.cold, fn: (u) => p.a * Math.sin(2 * Math.PI * u + p.phi) },
          { name: 'What you hear (the sum)', col: c.ink, fn: (u) => Math.sin(2 * Math.PI * u) + p.a * Math.sin(2 * Math.PI * u + p.phi), bold: true },
        ];
        const rh = (t.h - 6) / 3;
        const ys = Math.max(1, 1 + Math.abs(p.a));
        rows.forEach((r, i) => {
          const y0 = t.y + i * (rh + 3), mid = y0 + rh / 2 + 8, amp = rh / 2 - 22;
          g.fillStyle = alpha(c.paper2, 0.9); g.fillRect(t.x, y0, t.w, rh);
          g.strokeStyle = c.ink; g.lineWidth = V.px(1.4); g.strokeRect(t.x, y0, t.w, rh);
          line(g, V, t.x, mid, t.x + t.w, mid, alpha(c.ink, 0.35), 1);
          g.strokeStyle = r.col; g.lineWidth = V.px(r.bold ? 3 : 2.2); g.lineJoin = 'round'; g.beginPath();
          for (let k = 0; k <= 200; k++) {
            const u = (k / 200) * CYCLES;
            const y = mid - (clamp(r.fn(u - st.u), -ys, ys) / ys) * amp;
            if (k === 0) g.moveTo(t.x + (k / 200) * t.w, y); else g.lineTo(t.x + (k / 200) * t.w, y);
          }
          g.stroke();
          text(g, V, r.name, t.x + 8, y0 + 14, { px: 10.5, weight: 800, color: r.col === c.ink ? c.ink : r.col });
        });
        text(g, V, 'the pictures run slowed down', t.x + t.w - 6, t.y + t.h + 14, { px: 10, color: c.ink2, align: 'right', halo: false });
      }

      function drawMeter(g, V, c) {
        const m = L.meter;
        const p = params();
        text(g, V, 'How loud is it at your ear?', m.x, m.y + 4, { px: 12, weight: 700, halo: false });
        const w = m.w - 6, y = m.y + 14;
        g.fillStyle = alpha(c.hot, 0.3); g.fillRect(m.x, y, w * 0.62, 22);
        text(g, V, 'noise = 100 %', m.x + 6, y + 15, { px: 10.5, weight: 700, halo: false });
        const amp = clamp(p.amp, 0, 2);
        g.fillStyle = p.amp > 1.02 ? c.bad : p.amp < 0.35 ? c.good : c.accent;
        g.fillRect(m.x, y + 28, w * 0.62 * amp, 22);
        g.strokeStyle = c.ink; g.lineWidth = V.px(1.5); g.strokeRect(m.x, y + 28, w * 0.62 * amp, 22);
        text(g, V, 'you hear ' + fmt(p.amp * 100, 0) + ' %', m.x + w * 0.62 * amp + 6, y + 44, { px: 11.5, weight: 800, mono: true, halo: false });
        line(g, V, m.x + w * 0.62, y - 4, m.x + w * 0.62, y + 54, c.ink, 1.4, [4, 3]);
      }

      function drawChart(g, V, c) {
        const b = L.chart;
        text(g, V, 'Noise reduction against pitch', b.x, b.y + 10, { px: 12, weight: 700, halo: false });
        text(g, V, 'for an electronics delay of ' + host.ctl.tau + ' µs', b.x, b.y + 25, { px: 10.5, color: c.ink2, halo: false });
        const x0 = b.x + 34, y0 = b.y + 34, w = b.w - 44, h = b.h - 68;
        const F0 = Math.log10(30), F1 = Math.log10(8000), D0 = -12, D1 = 36;
        const PX = (f) => x0 + ((Math.log10(f) - F0) / (F1 - F0)) * w, PY = (d) => y0 + h - ((d - D0) / (D1 - D0)) * h;
        g.fillStyle = alpha(c.paper2, 0.9); g.fillRect(x0, y0, w, h);
        g.fillStyle = alpha(c.bad, 0.14); g.fillRect(x0, PY(0), w, y0 + h - PY(0));
        for (const d of [0, 12, 24, 36]) { line(g, V, x0, PY(d), x0 + w, PY(d), alpha(c.ink, d === 0 ? 0.5 : 0.12), 1); text(g, V, d === 36 ? '36 dB' : String(d), x0 - 5, PY(d) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); }
        for (const f of [100, 1000, 4000]) { line(g, V, PX(f), y0, PX(f), y0 + h, alpha(c.ink, 0.12), 1); text(g, V, f >= 1000 ? f / 1000 + 'k' : String(f), PX(f), y0 + h + 13, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false }); }
        g.strokeStyle = c.ink; g.lineWidth = V.px(1.5); g.strokeRect(x0, y0, w, h);
        g.strokeStyle = c.cold; g.lineWidth = V.px(2.6); g.beginPath();
        let first = true;
        for (let k = 0; k <= 160; k++) {
          const f = Math.pow(10, F0 + (k / 160) * (F1 - F0));
          const amp = An.electronic(f, host.ctl.tau).amp;
          const d = clamp(An.toDb(amp), D0, D1);
          if (first) { g.moveTo(PX(f), PY(d)); first = false; } else g.lineTo(PX(f), PY(d));
        }
        g.stroke();
        const p = params();
        const d = clamp(An.toDb(p.amp), D0, D1);
        g.beginPath(); g.arc(PX(host.ctl.f), PY(d), V.px(6), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
        text(g, V, 'quieter', x0 + w - 4, y0 + 13, { px: 10, color: c.good, weight: 700, align: 'right', halo: false });
        text(g, V, 'louder', x0 + w - 4, y0 + h - 6, { px: 10, color: c.bad, weight: 700, align: 'right', halo: false });
        text(g, V, 'pitch, Hz (log scale)', x0 + w, y0 + h + 28, { px: 10.5, color: c.ink2, align: 'right', halo: false });
                drawNums(g, V, c);
      }

      function drawNums(g, V, c) {
        const n = L.nums, p = params();
        const a = fmt(p.a, 2), ph = fmt(((p.phi * 180) / Math.PI + 360) % 360, 0);
        text(g, V, 'residual = |1 + ' + a + ' e^(i ' + ph + '°)|', n.x, n.y, { px: 11.5, mono: true, weight: 700, halo: false });
        text(g, V, '         = ' + fmt(p.amp, 2) + ' of the noise', n.x, n.y + 17, { px: 11.5, mono: true, color: p.amp > 1 ? c.bad : c.good, weight: 800, halo: false });
        const ph2 = fmt(host.ctl.tau * 1e-6 * host.ctl.f * 360, 1);
        text(g, V, 'delay error ' + ph2 + '° at this pitch', n.x, n.y + 38, { px: 11, color: c.ink2, halo: false });
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
