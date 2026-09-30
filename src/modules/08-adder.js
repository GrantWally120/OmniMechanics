(function (root) {
  'use strict';
  const OM = root.OM;
  const Lg = OM.logic;
  const { clamp } = OM.util;
  const { text, alpha } = OM.gfx;

  const DELAY = 0.5; // seconds of drawing time per gate-delay stage

  OM.register({
    id: 'adder',
    title: 'Adding with logic gates',
    group: 'electric',
    hook: 'Computers do not know numbers. A few gates turn patterns of high and low voltages into the sum of two numbers.',
    units: 'bits (1 = high, 0 = low)',
    alt: 'Four full adders chained together with carry wires, and a gate-level diagram of one full adder built from two XOR gates, two AND gates and an OR gate.',
    controls: [
      { id: 'a', type: 'range', label: 'Number A', min: 0, max: 15, step: 1, value: 11, fmt: (v) => v.toString(2).padStart(4, '0') + '  =  ' + v, hint: 'Or click the bits in the drawing.' },
      { id: 'b', type: 'range', label: 'Number B', min: 0, max: 15, step: 1, value: 6, fmt: (v) => v.toString(2).padStart(4, '0') + '  =  ' + v },
      { id: 'cin', type: 'toggle', label: 'Carry in (C in)', value: false },
      { id: 'stage', type: 'seg', label: 'Gates of column', value: 0, options: [{ v: 3, l: 'Bit 3' }, { v: 2, l: 'Bit 2' }, { v: 1, l: 'Bit 1' }, { v: 0, l: 'Bit 0' }] },
      { id: 'delay', type: 'toggle', label: 'Show the gate delay', value: true, hint: 'Change a number and watch the carry ripple from right to left.' },
    ],
    content: {
      intro: 'A computer adds with gates. Feed two bits into an XOR gate and out comes the sum bit. An AND gate spots when a carry is needed. Chain four of these columns and you can add numbers up to 15.',
      steps: [
        { h: 'Bits are wires', p: 'A binary digit is a wire that is either high (1) or low (0). The bits 1011 stand for 8 + 0 + 2 + 1 = 11.' },
        { h: 'One column of addition', p: 'Add two bits and the carry arriving from the column on the right. The sum bit is 1 when an odd number of the three inputs is 1. The carry out is 1 when two or more are. Five gates do both.' },
        { h: 'Chain the columns', p: 'Each column passes its carry out to the next column’s carry in. Four columns make a 4-bit ripple-carry adder.' },
        { h: 'The carry has to ripple', p: 'Gates take time to settle. The top bit cannot be right until the carry has passed through every column below it. Switch on the gate delay and change a number to see it.' },
      ],
      principle: {
        lead: 'Arithmetic is just patterns. Logic gates turn patterns of high and low voltages into other patterns, and we agree to read those patterns as numbers.',
        eqs: [
          { label: 'Sum bit of one column', eq: 'S = A ⊕ B ⊕ C~in~', note: '⊕ is XOR: 1 when an odd number of inputs are 1.' },
          { label: 'Carry out of one column', eq: 'C~out~ = A·B + C~in~·(A ⊕ B)', note: 'A·B is AND and + is OR. A carry is made when A and B are both 1, or when an incoming carry meets a column that adds to 1.' },
          { label: 'Value of the bits', eq: 'value = 8 b~3~ + 4 b~2~ + 2 b~1~ + b~0~' },
        ],
        points: [
          'Take away the carry input and two gates are left: the **half adder**. It is an XOR for the sum and an AND for the carry.',
          'Real processors avoid a long ripple. A carry-lookahead adder works out all the carries at once from the inputs, so a 64-bit add takes only a few gate delays.',
          '**What this model leaves out:** real gate delays differ and signals glitch before they settle. Here every column takes the same time.',
        ],
      },
      myth: {
        claim: 'A computer understands numbers and does arithmetic.',
        truth: 'A computer has no idea what a number is. Switches and gates turn one pattern of voltages into another pattern, and the designers arranged it so that, read as binary, the new pattern is the sum.',
      },
      tries: [
        { label: '1 + 1', text: 'The smallest carry.', set: { a: 1, b: 1, cin: false, stage: 0 } },
        { label: '7 + 8', text: 'No carries at all, so nothing ripples.', set: { a: 7, b: 8, cin: false } },
        { label: '15 + 1', text: 'The carry has to ripple through every column and out the top.', set: { a: 15, b: 1, cin: false, stage: 3 } },
        { label: '15 + 15 + carry in', text: 'The biggest sum a 4-bit adder can make: 31.', set: { a: 15, b: 15, cin: true } },
      ],
      quiz: [
        { q: 'What is 1011 in binary?', opts: ['9', '10', '11', '13'], a: 2, why: '8 + 0 + 2 + 1 = 11.' },
        { q: 'Which gate gives the sum bit when you add two bits (ignoring any carry)?', opts: ['AND', 'OR', 'XOR', 'NOT'], a: 2, why: 'XOR is 1 when exactly one input is 1. 0+0 is 0, 0+1 and 1+0 are 1, and 1+1 is 0 with a carry.' },
        { q: 'Why is the top bit of a ripple-carry adder the last to settle?', opts: ['It has the most gates', 'Its carry input has to travel through all the columns below it first', 'It is the biggest number', 'Its wires are longer'], a: 1, why: 'Each column must wait for the carry from the column before it, so the delay grows with the number of bits.' },
      ],
      sources: [
        'D. M. Harris and S. L. Harris, *Digital Design and Computer Architecture*, Morgan Kaufmann.',
      ],
    },

    create(host) {
      const st = { t: 0, t0: -10, disp: null, last: '' };
      let L = null;
      let hits = [];

      const inputs = () => ({ A: Lg.toBits(host.ctl.a, 4), B: Lg.toBits(host.ctl.b, 4), cin: host.ctl.cin ? 1 : 0 });
      const cur = () => { const i = inputs(); return Lg.add(i.A, i.B, i.cin); };
      const key = () => host.ctl.a + ',' + host.ctl.b + ',' + (host.ctl.cin ? 1 : 0);

      function sync() {
        const c = cur();
        if (!st.disp) st.disp = c.stages.map((s) => Object.assign({}, s));
        if (!host.ctl.delay) { st.disp = c.stages.map((s) => Object.assign({}, s)); return; }
        const el = st.t - st.t0;
        c.stages.forEach((s, i) => { if (el >= (i + 1) * DELAY) st.disp[i] = Object.assign({}, s); });
      }

      const sim = {
        ref: { w: 780, h: 500 },
        refNarrow: { w: 420, h: 480 },
        state: st,
        init() { st.t = 0; st.t0 = -10; st.disp = null; st.last = key(); sync(); },
        layout(V) {
          L = V.narrow
            ? { ov: { x: 6, y: 6, bw: 88, gap: 10, top: 20 }, gl: { x: 14, y: 300, k: 0.54 } }
            : { ov: { x: 70, y: 8, bw: 120, gap: 34, top: 26 }, gl: { x: 20, y: 250, k: 1 } };
        },
        step(dt) {
          st.t += dt;
          if (key() !== st.last) { st.last = key(); st.t0 = st.t; }
          sync();
        },
        onControl() { if (key() !== st.last) { st.last = key(); st.t0 = st.t; } sync(); },
        thumb() { st.disp = cur().stages.map((s) => Object.assign({}, s)); st.t0 = -10; },
        pointer(type, x, y) {
          if (type !== 'down') return false;
          for (const h of hits) {
            if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
              if (h.kind === 'a') host.set('a', host.ctl.a ^ (1 << h.i));
              else if (h.kind === 'b') host.set('b', host.ctl.b ^ (1 << h.i));
              else if (h.kind === 'cin') host.set('cin', !host.ctl.cin);
              else if (h.kind === 'stage') host.set('stage', h.i);
              return false;
            }
          }
          return false;
        },
        cursor(x, y) { return hits.some((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) ? 'pointer' : ''; },
        readouts() {
          const c = cur();
          const val = Lg.toInt(c.sum) + (c.cout << 4);
          const settled = st.disp.every((s, i) => s.s === c.stages[i].s && s.cout === c.stages[i].cout);
          let run = 0, best = 0;
          c.stages.forEach((s) => { if (s.cout) { run++; best = Math.max(best, run); } else run = 0; });
          return [
            { k: 'A', v: host.ctl.a.toString(2).padStart(4, '0') + ' = ' + host.ctl.a },
            { k: 'B', v: host.ctl.b.toString(2).padStart(4, '0') + ' = ' + host.ctl.b },
            { k: 'Sum', v: (c.cout ? '1 ' : '0 ') + c.sum.slice().reverse().join('') + ' = ' + val },
            { k: 'Check', v: host.ctl.a + ' + ' + host.ctl.b + (host.ctl.cin ? ' + 1' : '') + ' = ' + (host.ctl.a + host.ctl.b + (host.ctl.cin ? 1 : 0)), tone: val === host.ctl.a + host.ctl.b + (host.ctl.cin ? 1 : 0) ? 'good' : 'bad' },
            { k: 'Carry out', v: c.cout ? '1 (overflow)' : '0', tone: c.cout ? 'warn' : '' },
            { k: 'Carry ripple', v: best + ' of 4 columns' },
            { k: 'Output', v: settled ? 'settled' : 'settling…', tone: settled ? 'good' : 'warn' },
          ];
        },
        caption() { const c = cur(); const settled = st.disp.every((s, i) => s.s === c.stages[i].s && s.cout === c.stages[i].cout); return settled ? 'Settled' : 'Carry rippling…'; },
        describe() { const c = cur(); return host.ctl.a + ' plus ' + host.ctl.b + ' equals ' + (Lg.toInt(c.sum) + (c.cout << 4)) + '.'; },

        draw(g, V, c) {
          hits = [];
          drawOverview(g, V, c);
          if (!V.thumb) drawGates(g, V, c);
        },
      };

      const col = (c, v) => (v ? c.elec : c.ink3);
      function wire(g, V, c, pts, v, wpx) {
        g.strokeStyle = col(c, v); g.lineWidth = V.px(v ? (wpx || 3.2) : 2); g.lineJoin = 'round'; g.lineCap = 'round';
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
      }
      function bitBox(g, V, c, x, y, w, h, v, label, hit, below) {
        g.fillStyle = v ? alpha(c.elec, 0.85) : c.paper2; g.fillRect(x, y, w, h);
        g.strokeStyle = c.ink; g.lineWidth = V.px(1.8); g.strokeRect(x, y, w, h);
        text(g, V, String(v), x + w / 2, y + h / 2 + 5, { px: 15, weight: 800, mono: true, align: 'center', color: v ? c.paper2 : c.ink, halo: false });
        if (label) text(g, V, label, x + w / 2, y + (below ? h + 13 : -6), { px: 10.5, color: c.ink2, align: 'center', halo: false, mono: true });
        if (hit) hits.push(Object.assign({ x, y, w, h }, hit));
      }

      function drawOverview(g, V, c) {
        const o = L.ov;
        const I = inputs();
        const box = (i) => o.x + (3 - i) * (o.bw + o.gap);
        const y0 = o.y + o.top + 50, bh = 66;
        text(g, V, V.narrow ? 'Four full adders, one per bit' : 'A 4-bit ripple-carry adder: four full adders in a row', o.x - (V.narrow ? 0 : 56), o.y + 12, { px: 12, weight: 700, halo: false });
        for (let i = 3; i >= 0; i--) {
          const x = box(i), s = st.disp[i];
          const sel = host.ctl.stage === i;
          // inputs and sum
          bitBox(g, V, c, x + o.bw * 0.2 - 14, o.y + o.top + 4, 28, 26, I.A[i], 'A' + i, { kind: 'a', i });
          bitBox(g, V, c, x + o.bw * 0.8 - 14, o.y + o.top + 4, 28, 26, I.B[i], 'B' + i, { kind: 'b', i });
          wire(g, V, c, [[x + o.bw * 0.2, o.y + o.top + 30], [x + o.bw * 0.2, y0]], I.A[i]);
          wire(g, V, c, [[x + o.bw * 0.8, o.y + o.top + 30], [x + o.bw * 0.8, y0]], I.B[i]);
          wire(g, V, c, [[x + o.bw * 0.5, y0 + bh], [x + o.bw * 0.5, y0 + bh + 26]], s.s);
          bitBox(g, V, c, x + o.bw * 0.5 - 14, y0 + bh + 26, 28, 26, s.s, 'S' + i, null, true);
          // the adder box
          g.fillStyle = sel ? alpha(c.accent, 0.5) : c.paper2; g.fillRect(x, y0, o.bw, bh);
          g.strokeStyle = c.ink; g.lineWidth = V.px(sel ? 3 : 1.8); g.strokeRect(x, y0, o.bw, bh);
          text(g, V, 'full adder', x + o.bw / 2, y0 + 28, { px: 12, weight: 800, align: 'center', halo: false });
          text(g, V, 'bit ' + i, x + o.bw / 2, y0 + 46, { px: 11, mono: true, align: 'center', color: c.ink2, halo: false });
          hits.push({ x, y: y0, w: o.bw, h: bh, kind: 'stage', i });
        }
        // carry wires: carry out of box i feeds box i+1 (which is on its left)
        for (let i = 0; i < 3; i++) {
          const xl = box(i + 1) + o.bw; // right edge of the left box (bit i+1)
          const yc = y0 + bh / 2;
          wire(g, V, c, [[box(i), yc], [xl, yc]], st.disp[i].cout, 3.2);
          text(g, V, 'C', (box(i) + xl) / 2, yc - 8, { px: 10.5, mono: true, align: 'center', color: c.ink2, halo: false });
        }
        // carry in on the right, carry out on the left
        const xr = box(0) + o.bw, yc = y0 + bh / 2;
        wire(g, V, c, [[xr + o.gap + 4, yc], [xr, yc]], I.cin, 3.2);
        bitBox(g, V, c, xr + o.gap + 4, yc - 13, 28, 26, I.cin, 'C in', { kind: 'cin', i: 0 });
        const xl0 = box(3);
        wire(g, V, c, [[xl0, yc], [xl0 - 12, yc]], st.disp[3].cout, 3.2);
        bitBox(g, V, c, xl0 - 12 - 28, yc - 13, 28, 26, st.disp[3].cout, 'C out', null, false);
        if (!V.thumb) text(g, V, 'click a bit to flip it', o.x + (V.narrow ? 0 : -56), y0 + bh + 82, { px: 11, color: c.ink2, halo: false });
      }

      // gate shapes: box (x, y, w, h), inputs on the left edge, output on the right
      function gate(g, V, c, kind, x, y, w, h) {
        g.beginPath();
        if (kind === 'AND') {
          g.moveTo(x, y); g.lineTo(x + w * 0.5, y); g.bezierCurveTo(x + w * 1.0, y, x + w * 1.0, y + h, x + w * 0.5, y + h); g.lineTo(x, y + h);
        } else {
          g.moveTo(x, y); g.quadraticCurveTo(x + w * 0.62, y, x + w, y + h / 2); g.quadraticCurveTo(x + w * 0.62, y + h, x, y + h); g.quadraticCurveTo(x + w * 0.28, y + h / 2, x, y);
        }
        g.closePath();
        g.fillStyle = c.paper2; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
        if (kind === 'XOR') { g.beginPath(); g.moveTo(x - 9, y); g.quadraticCurveTo(x + w * 0.28 - 9, y + h / 2, x - 9, y + h); g.stroke(); }
        text(g, V, kind, x + w * 0.42, y + h / 2 + 4, { px: 10.5, weight: 800, align: 'center', halo: false, color: c.ink2 });
      }

      function drawGates(g, V, c) {
        const k = L.gl.k;
        const i = host.ctl.stage;
        const s = st.disp[i];
        g.save();
        g.translate(L.gl.x, L.gl.y);
        g.scale(k, k);
        const V2 = Object.assign({}, V, { s: V.s * k, px: (n) => n / (V.s * k) });
        text(g, V2, 'Inside the full adder for bit ' + i, 0, 0, { px: 13, weight: 800, halo: false });
        // design space 740 x 215
        const GW = 76, GH = 50;
        const yA = 40, yB = 70, yC = 200;
        const gx1 = [190, 34], ga1 = [190, 112], gx2 = [380, 44], ga2 = [380, 122], go = [540, 122];
        gate(g, V2, c, 'XOR', gx1[0], gx1[1], GW, GH);
        gate(g, V2, c, 'AND', ga1[0], ga1[1], GW, GH);
        gate(g, V2, c, 'XOR', gx2[0], gx2[1], GW, GH);
        gate(g, V2, c, 'AND', ga2[0], ga2[1], GW, GH);
        gate(g, V2, c, 'OR', go[0], go[1], GW, GH);
        const w = (pts, v) => wire(g, V2, c, pts, v, 3);
        // A and B into both first-stage gates
        w([[60, yA + 6], [140, yA + 6], [140, gx1[1] + 12], [gx1[0] + 2, gx1[1] + 12]], s.a);
        w([[140, yA + 6], [140, ga1[1] + 12], [ga1[0] + 2, ga1[1] + 12]], s.a);
        w([[60, yB + 22], [120, yB + 22], [120, gx1[1] + 38], [gx1[0] + 2, gx1[1] + 38]], s.b);
        w([[120, yB + 22], [120, ga1[1] + 38], [ga1[0] + 2, ga1[1] + 38]], s.b);
        // p = A xor B goes to both second-stage gates
        w([[gx1[0] + GW, gx1[1] + GH / 2], [330, gx1[1] + GH / 2], [330, gx2[1] + 12], [gx2[0] + 2, gx2[1] + 12]], s.p);
        w([[330, gx1[1] + GH / 2], [330, ga2[1] + 12], [ga2[0] + 2, ga2[1] + 12]], s.p);
        // carry in
        w([[60, yC], [350, yC], [350, gx2[1] + 38], [gx2[0] + 2, gx2[1] + 38]], s.cin);
        w([[350, yC], [350, ga2[1] + 38], [ga2[0] + 2, ga2[1] + 38]], s.cin);
        // g and t into the OR
        w([[ga1[0] + GW * 0.95, ga1[1] + GH / 2], [470, ga1[1] + GH / 2], [470, go[1] + 12], [go[0] + 6, go[1] + 12]], s.g);
        w([[ga2[0] + GW * 0.95, ga2[1] + GH / 2], [500, ga2[1] + GH / 2], [500, go[1] + 38], [go[0] + 6, go[1] + 38]], s.t);
        // outputs
        w([[gx2[0] + GW, gx2[1] + GH / 2], [640, gx2[1] + GH / 2]], s.s);
        w([[go[0] + GW, go[1] + GH / 2], [640, go[1] + GH / 2]], s.cout);
        // labels with live values
        const lab = (str, v, x, y, al) => text(g, V2, str, x, y, { px: 12, weight: 800, mono: true, align: al || 'left', color: v ? c.elec : c.ink2, halo: true });
        lab('A = ' + s.a, s.a, 0, yA + 10);
        lab('B = ' + s.b, s.b, 0, yB + 26);
        lab('C in = ' + s.cin, s.cin, 0, yC + 4);
        lab('p = ' + s.p, s.p, 228, gx1[1] + GH + 14, 'center');
        lab('g = ' + s.g, s.g, 228, ga1[1] + GH + 14, 'center');
        lab('t = ' + s.t, s.t, 418, ga2[1] + GH + 14, 'center');
        lab('Sum = ' + s.s, s.s, 648, gx2[1] + GH / 2 + 4);
        lab('C out = ' + s.cout, s.cout, 648, go[1] + GH / 2 + 4);
        g.restore();
        // key to the gates
        const kx = V.narrow ? 14 : 20, ky = V.narrow ? 300 + 128 : 250 + 232;
        text(g, V, 'p = A xor B   g = A and B   t = p and C in', kx, ky, { px: 11.5, color: c.ink2, mono: true, halo: false });
        text(g, V, 'Sum = p xor C in   C out = g or t', kx, ky + 16, { px: 11.5, color: c.ink2, mono: true, halo: false });
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
