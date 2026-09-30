(function (root) {
  'use strict';
  const OM = root.OM;
  const Lk = OM.lock;
  const { clamp, fmt, smooth } = OM.util;
  const { text, line, arrow, hatchRect, spring, alpha } = OM.gfx;

  const X0 = 60, X1 = 430; // lock body
  const SY = Lk.SY;
  const CH_TOP = SY - 120;
  const PLUG_BOT = SY + 150;

  const cutControl = (i, dflt) => ({ id: 'c' + i, type: 'range', label: 'Cut ' + i + (i === 1 ? ' (nearest the face)' : ''), min: 1, max: 9, step: 1, value: dflt, fmt: (v) => 'depth ' + v });

  OM.register({
    id: 'lock',
    title: 'Pin tumbler lock',
    group: 'machines',
    hook: 'A key is a code. Five cuts lift five pin stacks to exactly one height, and only then will the lock turn.',
    units: 'mm (1 step = 0.5 mm)',
    alt: 'Side cutaway of a pin tumbler lock with five pin stacks, a key with five cuts sliding in, and an end view showing the plug turning when every pin sits on the shear line.',
    controls: [
      { id: 'insert', type: 'range', label: 'Key insertion', min: 0, max: 100, step: 1, value: 100, unit: '%', hint: 'Or drag the key sideways.' },
      { id: 'turn', type: 'toggle', label: 'Turn the key', value: false },
      { type: 'heading', label: 'Cut the key' },
      cutControl(1, 4), cutControl(2, 7), cutControl(3, 3), cutControl(4, 6), cutControl(5, 3),
    ],
    content: {
      intro: 'Every pin stack is cut in two. The lock only turns when the gap between those halves lines up exactly with the gap between the turning plug and the housing. A key is a set of cuts that does that for all five stacks at once.',
      steps: [
        { h: 'Key out', p: 'Springs push each stack down. The upper pin (the driver) straddles the **shear line**, the thin gap between the plug and the housing, so the plug is locked to the housing.' },
        { h: 'Key sliding in', p: 'The bevelled tip lifts each stack, then the pins ride up and down over the ridges and cuts. Each cut holds its key pin at a different height.' },
        { h: 'Right key', p: 'Every key pin ends exactly at the shear line. The drivers sit above it in the housing, the key pins below it in the plug, and nothing crosses the gap, so the plug is free to turn.' },
        { h: 'Wrong key', p: 'A cut that is too shallow pushes a key pin into the housing. A cut that is too deep leaves a driver pin inside the plug. Either way one pin crosses the gap and blocks the turn.' },
      ],
      principle: {
        lead: 'The lock is a mechanical comparison. Each key pin has a length set by the right cut depth, and the key is correct when the top of every key pin lands on the shear line.',
        eqs: [
          { label: 'Where each key pin ends up', eq: 'top of pin = cut depth − pin length', note: 'Measured below the shear line. It must be zero, give or take a hundredth of a millimetre or two in a real lock.' },
          { label: 'Turns only if', eq: 'all five pins within tolerance', note: 'Four out of five is as good as none.' },
          { label: 'Number of keys', eq: '9^5^ = 59,049', note: 'Five cuts with nine depths each. Real keys use six pins and ten depths, and manufacturers avoid many of the combinations.' },
        ],
        points: [
          'One depth step is about 0.4 mm on real keys. It is drawn here at 0.5 mm so you can see it.',
          'The numbers beside each pin show how far its top is from the shear line, in millimetres. A plus sign means the cut is too deep, a minus sign too shallow. Use them to work out the right key.',
          '**What this model leaves out:** manufacturing tolerances, pin shape, security pins and the order in which pins bind. It explains why a key works. It is not a guide to getting past a lock.',
        ],
      },
      myth: {
        claim: 'The key works by pushing the pins up until the lock gives way.',
        truth: 'A key does not force anything. It sets every pin stack to exactly the right height so nothing crosses the shear line. Half a millimetre off on one pin and the plug will not turn at all, however hard you twist.',
      },
      tries: [
        { label: 'Cut the right key', text: 'All five cuts correct. Insert it and turn.', set: { c1: 4, c2: 7, c3: 2, c4: 6, c5: 3, insert: 100, turn: false } },
        { label: 'One cut too deep', text: 'Cut 3 is one step too deep. See which pin blocks.', set: { c1: 4, c2: 7, c3: 3, c4: 6, c5: 3, insert: 100, turn: false } },
        { label: 'Blank key', text: 'Shallow cuts all along. Every driver pin pokes through.', set: { c1: 1, c2: 1, c3: 1, c4: 1, c5: 1, insert: 100, turn: false } },
        { label: 'Key half in', text: 'Watch the pins ride over the ridges.', set: { insert: 55, turn: false } },
      ],
      quiz: [
        { q: 'What is the shear line?', opts: ['The gap between the turning plug and the housing, which every pin stack must be split at', 'The edge of the key', 'The line where the spring ends', 'The bolt that holds the door'], a: 0, why: 'When every stack splits exactly at that gap, nothing bridges the plug and the housing and the plug can rotate.' },
        { q: 'One key cut is 0.5 mm too deep. What happens?', opts: ['A driver pin sits partly inside the plug and blocks it', 'A key pin pokes into the housing and blocks it', 'Nothing, the lock opens', 'The spring breaks'], a: 0, why: 'A deeper cut lets the key pin sit lower, which pulls the driver pin down across the shear line.' },
        { q: 'How many different keys are there with five pins and nine possible cut depths?', opts: ['45', '59,049', '3,125', '9,000'], a: 1, why: 'Nine choices for each of five cuts: 9⁵ = 59,049.' },
      ],
      sources: [
        'M. W. Tobias, *Locks, Safes and Security*, Charles C Thomas (2nd edition, 2000).',
      ],
    },

    create(host) {
      const st = { s: 0, turn: 0, pins: Lk.PIN_X.map(() => Lk.FLOOR), drag: false, grab: 0 };
      let L = null;
      const cuts = () => [host.ctl.c1, host.ctl.c2, host.ctl.c3, host.ctl.c4, host.ctl.c5];
      const lstate = () => Lk.state(cuts(), st.s);

      const sim = {
        ref: { w: 780, h: 370 },
        refNarrow: { w: 420, h: 540 },
        state: st,
        drag: 'x',
        init() { st.s = 0; st.turn = 0; st.pins = Lk.pinBottoms(cuts(), 0); st.drag = false; },
        layout(V) {
          L = V.narrow
            ? { lock: { x: 4, y: 6, k: 0.735 }, front: { cx: 105, cy: 425, R: 72 }, info: { x: 215, y: 380 } }
            : { lock: { x: 8, y: 14, k: 1 }, front: { cx: 652, cy: 122, R: 70 }, info: { x: 588, y: 250 } };
        },
        step(dt) {
          const target = host.ctl.insert / 100;
          if (!st.drag) {
            const v = 0.6 * dt;
            if (st.turn > 0.05 && target < 1) host.set('insert', 100);
            else if (st.s < target) st.s = Math.min(target, st.s + v);
            else st.s = Math.max(target, st.s - v * 1.6);
          }
          const tgt = Lk.pinBottoms(cuts(), st.s);
          const a = 1 - Math.exp(-40 * dt);
          st.pins = st.pins.map((y, i) => y + (tgt[i] - y) * a);
          const free = lstate().free;
          const goal = host.ctl.turn ? (free ? 1 : 0.03) : 0;
          const d = goal - st.turn;
          st.turn += Math.sign(d) * Math.min(Math.abs(d), 1.3 * dt);
        },
        thumb() { st.s = 1; st.pins = Lk.pinBottoms(cuts(), 1); },
        onControl(id) { if (id === 'insert' && !st.drag) { /* step() eases toward it */ } },
        pointer(type, x, y) {
          const lx = (x - L.lock.x) / L.lock.k, ly = (y - L.lock.y) / L.lock.k;
          const tip = Lk.tipX(st.s);
          if (type === 'down') {
            if (st.turn > 0.05) return false;
            if (lx < tip - 8 || lx > tip + Lk.KEY_LEN + 140 || ly < SY + 10 || ly > SY + 160) return false;
            st.drag = true;
            st.grab = lx - tip;
            return true;
          }
          if (type === 'move' && st.drag) {
            const s = clamp(1 - (lx - st.grab - Lk.TIP_FULL) / Lk.PULL, 0, 1);
            st.s = s;
            host.set('insert', Math.round(s * 100));
          }
          if (type === 'up') st.drag = false;
          return true;
        },
        cursor(x, y) {
          const lx = (x - L.lock.x) / L.lock.k, ly = (y - L.lock.y) / L.lock.k;
          const tip = Lk.tipX(st.s);
          return lx > tip - 8 && lx < tip + Lk.KEY_LEN + 140 && ly > SY + 10 && ly < SY + 160 ? 'ew-resize' : '';
        },
        key(k) {
          if (st.turn > 0.05) return false;
          if (k === 'ArrowLeft' || k === 'ArrowRight') {
            host.set('insert', clamp(Math.round(host.ctl.insert + (k === 'ArrowLeft' ? 5 : -5)), 0, 100));
            return true;
          }
          return false;
        },
        readouts() {
          const s = lstate();
          const cell = (i) => {
            if (st.s < 0.98) return { k: 'Pin ' + (i + 1), v: '–' };
            const d = s.off[i] / Lk.MM;
            return { k: 'Pin ' + (i + 1), v: s.aligned[i] ? 'on the line' : d > 0 ? 'too deep' : 'too shallow', tone: s.aligned[i] ? 'good' : 'bad' };
          };
          return [
            { k: 'Pins on the line', v: st.s < 0.98 ? 'key not in' : s.count + ' of 5', tone: s.free ? 'good' : '' },
            { k: 'Plug', v: st.turn > 0.9 ? 'turned, open' : s.free ? 'free to turn' : 'locked', tone: s.free ? 'good' : 'bad' },
            cell(0), cell(1), cell(2), cell(3), cell(4),
          ];
        },
        caption() {
          const s = lstate();
          if (st.turn > 0.9) return 'Open';
          if (st.s < 0.05) return 'Key out, pins down';
          if (st.s < 0.98) return 'Key sliding in';
          if (host.ctl.turn && !s.free) return 'Blocked by a pin';
          return s.free ? 'Every pin on the line' : s.count + ' of 5 pins on the line';
        },
        phase() { const s = lstate(); return st.s < 0.05 ? 0 : st.s < 0.98 ? 1 : s.free ? 2 : 3; },
        describe() { const s = lstate(); return st.s < 0.98 ? 'Key partly inserted.' : s.count + ' of 5 pins are on the shear line. The plug is ' + (s.free ? 'free to turn.' : 'locked.'); },

        draw(g, V, c) {
          drawLock(g, V, c);
          drawFront(g, V, c);
        },
      };

      function drawLock(g, V, c) {
        g.save();
        g.translate(L.lock.x, L.lock.y);
        g.scale(L.lock.k, L.lock.k);
        const V2 = Object.assign({}, V, { s: V.s * L.lock.k, px: (n) => n / (V.s * L.lock.k) });
        const ink = c.ink;
        const lw = (n) => V2.px(n);
        const ls = lstate();
        const tip = Lk.tipX(st.s);
        g.lineJoin = 'round';

        // housing and plug (cut metal, hatched in opposite directions)
        const solid = (x, y, w, h, flip) => {
          g.fillStyle = c.paper2; g.fillRect(x, y, w, h);
          hatchRect(g, V2, x, y, w, h, { gap: 9, color: c.line, flip });
          g.strokeStyle = ink; g.lineWidth = lw(1.5); g.strokeRect(x, y, w, h);
        };
        solid(X0, 18, X1 - X0, SY - 18, false);
        solid(X0, PLUG_BOT, X1 - X0, 18, false);
        solid(X0, SY, X1 - X0, PLUG_BOT - SY, true);
        // keyway
        g.fillStyle = c.paper2; g.fillRect(X0 - 1, SY + 22, X1 - X0 + 1, 96);
        g.strokeStyle = ink; g.lineWidth = lw(1.5);
        g.beginPath(); g.moveTo(X0, SY + 22); g.lineTo(X1, SY + 22); g.moveTo(X0, SY + 118); g.lineTo(X1, SY + 118); g.stroke();
        // pin chambers
        Lk.PIN_X.forEach((x) => {
          g.fillStyle = c.paper2;
          g.fillRect(x - 11, CH_TOP, 22, SY - CH_TOP);
          g.fillRect(x - 11, SY - 1, 22, 24);
          g.beginPath(); g.moveTo(x - 11, CH_TOP); g.lineTo(x - 11, SY + 22); g.moveTo(x + 11, CH_TOP); g.lineTo(x + 11, SY + 22); g.moveTo(x - 11, CH_TOP); g.lineTo(x + 11, CH_TOP); g.stroke();
        });

        // key (clipped to the drawing so it slides out of view)
        g.save();
        g.beginPath(); g.rect(0, 0, 572, 340); g.clip();
        drawKey(g, V2, c, tip);
        g.restore();

        // pin stacks
        Lk.PIN_X.forEach((x, i) => {
          const yb = st.pins[i];
          const K = Lk.K(Lk.SECRET[i]);
          const yt = SY + yb - K; // key pin top
          const yd = SY + yb - Lk.STACK; // driver top
          const bad = st.s >= 0.98 && !ls.aligned[i];
          spring(g, V2, x, CH_TOP + 2, x, yd, 6, 6.5, c.ink2, 1.3);
          // driver
          g.fillStyle = alpha(c.metal, 0.85); g.fillRect(x - 9, yd, 18, yt - yd);
          g.strokeStyle = bad ? c.bad : ink; g.lineWidth = lw(bad ? 2.4 : 1.5); g.strokeRect(x - 9, yd, 18, yt - yd);
          // key pin with a pointed foot
          g.beginPath();
          g.moveTo(x - 9, yt); g.lineTo(x + 9, yt); g.lineTo(x + 9, SY + yb - 10); g.lineTo(x, SY + yb); g.lineTo(x - 9, SY + yb - 10); g.closePath();
          g.fillStyle = alpha(c.elec, 0.6); g.fill(); g.stroke();
          text(g, V2, String(i + 1), x, PLUG_BOT + 34, { px: 13, weight: 800, mono: true, align: 'center', halo: false });
          if (st.s >= 0.98) {
            const d = (yb - K) / Lk.MM;
            const ok = ls.aligned[i];
            text(g, V2, ok ? '0' : (d > 0 ? '+' : '−') + fmt(Math.abs(d), 1), x + 14, SY - 7, { px: 10.5, mono: true, weight: 800, color: ok ? c.good : c.bad, align: 'left' });
          }
        });

        // shear line
        g.setLineDash([V2.px(7), V2.px(4)]);
        g.strokeStyle = c.hot; g.lineWidth = lw(2.2);
        g.beginPath(); g.moveTo(X0 - 20, SY); g.lineTo(X1 + 10, SY); g.stroke();
        g.setLineDash([]);
        text(g, V2, 'shear line', X0 - 4, SY - 8, { px: 11.5, weight: 800, color: c.hot });
        text(g, V2, 'housing', X0 + 6, 38, { px: 11.5, weight: 700, color: c.ink2, halo: false });
        text(g, V2, 'plug (turns)', X0 + 6, PLUG_BOT - 10, { px: 11.5, weight: 700, color: c.ink2, halo: false });
        // legend
        g.fillStyle = alpha(c.metal, 0.85); g.fillRect(442, 26, 12, 12); g.strokeStyle = ink; g.lineWidth = lw(1.2); g.strokeRect(442, 26, 12, 12);
        text(g, V2, 'driver pin', 460, 37, { px: 11, color: c.ink2, halo: false });
        g.fillStyle = alpha(c.elec, 0.6); g.fillRect(442, 46, 12, 12); g.strokeRect(442, 46, 12, 12);
        text(g, V2, 'key pin', 460, 57, { px: 11, color: c.ink2, halo: false });
        text(g, V2, 'pin', 386, PLUG_BOT + 34, { px: 10.5, color: c.ink2, align: 'right', halo: false });
        g.restore();
      }

      function drawKey(g, V2, c, tip) {
        const cs = cuts();
        const top = [];
        for (let u = 0; u <= Lk.KEY_LEN; u += 2) top.push([tip + u, SY + Lk.keyEdge(u, cs)]);
        const bottom = SY + 112;
        g.beginPath();
        g.moveTo(tip, bottom - 6);
        top.forEach((p) => g.lineTo(p[0], p[1]));
        g.lineTo(tip + Lk.KEY_LEN, SY + Lk.RIDGE - 10);
        // shoulder and bow
        const sx = tip + Lk.KEY_LEN;
        g.lineTo(sx, SY + 30); g.lineTo(sx + 12, SY + 30); g.lineTo(sx + 12, SY + 8);
        g.arcTo(sx + 120, SY + 8, sx + 120, SY + 70, 32);
        g.arcTo(sx + 120, SY + 132, sx + 12, SY + 132, 32);
        g.lineTo(sx + 12, SY + 112); g.lineTo(sx, SY + 112);
        g.lineTo(tip + 10, bottom); g.closePath();
        g.fillStyle = alpha(c.accent, 0.85); g.fill();
        g.strokeStyle = c.ink; g.lineWidth = V2.px(2); g.stroke();
        // bow hole
        g.beginPath(); g.arc(sx + 80, SY + 70, 13, 0, Math.PI * 2);
        g.fillStyle = c.paper2; g.fill(); g.stroke();
        // cut numbers
        Lk.Q.forEach((q, i) => text(g, V2, String(cs[i]), tip + q, SY + 104, { px: 11, weight: 800, mono: true, align: 'center', halo: false, color: c.accentInk }));
      }

      function drawFront(g, V, c) {
        const F = L.front;
        const ls = lstate();
        const th = st.turn * (Math.PI / 2);
        const ink = c.ink;
        // housing ring
        g.beginPath(); g.arc(F.cx, F.cy, F.R, 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill();
        hatchCircle(g, V, F.cx, F.cy, F.R, F.R * 0.74, c);
        g.strokeStyle = ink; g.lineWidth = V.px(1.6); g.beginPath(); g.arc(F.cx, F.cy, F.R, 0, Math.PI * 2); g.stroke();
        // plug
        g.save();
        g.translate(F.cx, F.cy);
        g.rotate(th);
        g.beginPath(); g.arc(0, 0, F.R * 0.74, 0, Math.PI * 2); g.fillStyle = alpha(c.metal, 0.3); g.fill(); g.stroke();
        // keyway slot and key
        const kw = F.R * 0.16, kh = F.R * 0.78;
        g.fillStyle = c.paper2; g.fillRect(-kw / 2, -kh / 2, kw, kh); g.strokeRect(-kw / 2, -kh / 2, kw, kh);
        if (st.s > 0.05) { g.fillStyle = alpha(c.accent, 0.95); g.fillRect(-kw * 0.3, -kh / 2 + 3, kw * 0.6, kh - 6); }
        g.fillStyle = c.ink; g.beginPath(); g.moveTo(0, -F.R * 0.74 + 2); g.lineTo(-5, -F.R * 0.74 + 12); g.lineTo(5, -F.R * 0.74 + 12); g.closePath(); g.fill();
        g.restore();
        // bolt
        const out = 1 - smooth(clamp((st.turn - 0.45) / 0.45, 0, 1));
        const bl = 8 + 44 * out;
        g.fillStyle = c.metal2; g.strokeStyle = ink; g.lineWidth = V.px(1.6);
        g.fillRect(F.cx + F.R - 2, F.cy - 9, bl, 18); g.strokeRect(F.cx + F.R - 2, F.cy - 9, bl, 18);
        text(g, V, 'bolt', F.cx + F.R + 4, F.cy - 14, { px: 10.5, color: c.ink2, halo: false });
        text(g, V, 'end view', F.cx, F.cy - F.R - 10, { px: 11, color: c.ink2, align: 'center', halo: false });
        const open = st.turn > 0.9;
        text(g, V, open ? 'OPEN' : 'LOCKED', F.cx, F.cy + F.R + 22, { px: 15, weight: 800, align: 'center', color: open ? c.good : c.bad });
        if (!V.thumb) {
          const I = L.info;
          const msg = host.ctl.turn && !ls.free && st.s >= 0.98 ? 'A pin crosses the shear line.' : st.s < 0.98 ? 'Slide the key all the way in.' : ls.free ? (host.ctl.turn ? 'Every pin on the line.' : 'Now turn the key.') : 'Not every pin is on the line.';
          text(g, V, msg, V.narrow ? F.cx + F.R + 14 : F.cx, V.narrow ? F.cy + 44 : F.cy + F.R + 44, { px: 12, color: c.ink, align: V.narrow ? 'left' : 'center', weight: 600 });
          if (!V.narrow) text(g, V, 'Drag the key sideways.', F.cx, F.cy + F.R + 62, { px: 11, color: c.ink2, align: 'center' });
        }
      }

      function hatchCircle(g, V, cx, cy, R, r, c) {
        g.save();
        g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.arc(cx, cy, r, 0, Math.PI * 2, true); g.clip('evenodd');
        g.strokeStyle = c.line; g.lineWidth = V.px(1);
        g.beginPath();
        for (let d = -R * 2; d < R * 2; d += V.px(8)) { g.moveTo(cx + d, cy + R); g.lineTo(cx + d + R, cy); g.moveTo(cx + d, cy + 2 * R); g.lineTo(cx + d + 2 * R, cy); }
        g.stroke();
        g.restore();
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
