/* Canvas drawing helpers and theme colours.
 *
 * Every simulation draws in "world" units. The host scales the canvas so one
 * world unit is V.s CSS pixels; V.px(n) converts n CSS pixels back into world
 * units so line widths and text stay the same physical size at every width. */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  // ---- Theme -------------------------------------------------------------
  const NAMES = [
    'paper', 'paper2', 'ink', 'ink2', 'ink3', 'line', 'accent', 'accentInk',
    'hot', 'cold', 'elec', 'good', 'warn', 'bad', 'metal', 'metal2', 'metalD', 'glass',
  ];
  const VARS = {
    paper: '--paper', paper2: '--paper-2', ink: '--ink', ink2: '--ink-2', ink3: '--ink-3', line: '--line-strong',
    accent: '--accent', accentInk: '--accent-ink', hot: '--c-hot', cold: '--c-cold', elec: '--c-elec', good: '--c-good',
    warn: '--c-warn', bad: '--c-bad', metal: '--c-metal', metal2: '--c-metal-2', metalD: '--c-metal-d', glass: '--c-glass',
  };
  const listeners = [];
  const theme = {
    c: {},
    font: 'system-ui, sans-serif',
    mono: 'ui-monospace, monospace',
    isDark: false,
    refresh() {
      if (typeof document === 'undefined') return;
      const cs = getComputedStyle(document.documentElement);
      NAMES.forEach((n) => { theme.c[n] = cs.getPropertyValue(VARS[n]).trim() || '#888'; });
      theme.font = cs.getPropertyValue('--font-body').trim() || theme.font;
      theme.mono = cs.getPropertyValue('--font-mono').trim() || theme.mono;
      const t = document.documentElement.getAttribute('data-theme');
      theme.isDark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
      listeners.forEach((f) => f());
    },
    onChange(f) { listeners.push(f); return () => { const i = listeners.indexOf(f); if (i >= 0) listeners.splice(i, 1); }; },
  };
  // Node (unit tests) gets a neutral palette.
  NAMES.forEach((n) => { theme.c[n] = '#888888'; });

  // Colour helpers -------------------------------------------------------
  function parse(c) {
    if (c[0] === '#') {
      const s = c.length === 4 ? c.replace(/#(.)(.)(.)/, '#$1$1$2$2$3$3') : c;
      return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 1];
    }
    const m = c.match(/[\d.]+/g);
    return m ? [+m[0], +m[1], +m[2], m[3] == null ? 1 : +m[3]] : [128, 128, 128, 1];
  }
  const alpha = (c, a) => { const p = parse(c); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; };
  function mix(a, b, t) {
    const p = parse(a), q = parse(b);
    return `rgb(${Math.round(p[0] + (q[0] - p[0]) * t)},${Math.round(p[1] + (q[1] - p[1]) * t)},${Math.round(p[2] + (q[2] - p[2]) * t)})`;
  }

  // ---- Drawing helpers ----------------------------------------------------
  function rrect(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function line(g, V, x1, y1, x2, y2, color, wpx, dash) {
    g.strokeStyle = color;
    g.lineWidth = V.px(wpx == null ? 1.5 : wpx);
    if (dash) g.setLineDash(dash.map((d) => V.px(d)));
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
    if (dash) g.setLineDash([]);
  }

  function arrow(g, V, x1, y1, x2, y2, color, wpx, headPx) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 1e-6) return;
    const w = wpx == null ? 2 : wpx;
    const hd = Math.min(V.px(headPx == null ? 9 : headPx), len * 0.6);
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = V.px(w);
    g.lineCap = 'butt';
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2 - ux * hd * 0.8, y2 - uy * hd * 0.8);
    g.stroke();
    g.beginPath();
    g.moveTo(x2, y2);
    g.lineTo(x2 - ux * hd + uy * hd * 0.42, y2 - uy * hd - ux * hd * 0.42);
    g.lineTo(x2 - ux * hd - uy * hd * 0.42, y2 - uy * hd + ux * hd * 0.42);
    g.closePath();
    g.fill();
  }

  // Text at a constant CSS pixel size. o: {px, color, align, base, weight, mono, halo}
  // The label is measured and, if it would run off the canvas, shrunk (down to 74%)
  // and then nudged back inside, so nothing is ever clipped at an edge.
  function text(g, V, s, x, y, o) {
    if (V.thumb) return;
    o = o || {};
    let px = o.px || 12;
    const fam = o.mono ? OM.theme.mono : OM.theme.font;
    const wgt = o.weight || 500;
    const align = o.align || 'left';
    g.font = `${wgt} ${px / V.s}px ${fam}`;
    g.textAlign = align;
    g.textBaseline = o.base || 'alphabetic';
    if (V.cw && g.getTransform) {
      const t = g.getTransform();
      const k = t.a / V.dpr; // CSS pixels per drawing unit
      let w = g.measureText(s).width * k;
      const sx = (t.a * x + t.e) / V.dpr;
      const span = () => {
        const left = align === 'left' ? sx : align === 'right' ? sx - w : sx - w / 2;
        return [left, left + w];
      };
      let [l, r] = span();
      if (l < 2 || r > V.cw - 2) {
        const room = align === 'left' ? V.cw - 2 - sx : align === 'right' ? sx - 2 : 2 * Math.min(sx - 2, V.cw - 2 - sx);
        const f = Math.max(0.74, Math.min(1, room / w));
        if (f < 1) {
          px *= f; w *= f;
          g.font = `${wgt} ${px / V.s}px ${fam}`;
          [l, r] = span();
        }
        let dx = 0;
        if (l < 2) dx = 2 - l; else if (r > V.cw - 2) dx = V.cw - 2 - r;
        if (dx) x += (dx * V.dpr) / t.a;
      }
    }
    if (o.halo !== false) {
      g.lineJoin = 'round';
      g.lineWidth = 3.5 / V.s;
      g.strokeStyle = OM.theme.c.paper2;
      g.strokeText(s, x, y);
    }
    g.fillStyle = o.color || OM.theme.c.ink;
    g.fillText(s, x, y);
  }

  // Diagonal hatching inside a rectangle: the drawing-office way to mark a cut solid.
  function hatchRect(g, V, x, y, w, h, o) {
    o = o || {};
    const gap = V.px(o.gap || 7);
    g.save();
    g.beginPath();
    g.rect(x, y, w, h);
    g.clip();
    g.strokeStyle = o.color || OM.theme.c.line;
    g.lineWidth = V.px(o.width || 1);
    g.beginPath();
    for (let d = -h; d < w + h; d += gap) {
      if (o.flip) { g.moveTo(x + d, y); g.lineTo(x + d + h, y + h); }
      else { g.moveTo(x + d, y + h); g.lineTo(x + d + h, y); }
    }
    g.stroke();
    g.restore();
  }

  function spring(g, V, x1, y1, x2, y2, coils, amp, color, wpx) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 1e-6) return;
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const nx = -uy, ny = ux;
    g.strokeStyle = color || OM.theme.c.ink2;
    g.lineWidth = V.px(wpx || 1.4);
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(x1, y1);
    const seg = coils * 2;
    for (let i = 1; i < seg; i++) {
      const t = i / seg;
      const s = i % 2 ? 1 : -1;
      g.lineTo(x1 + ux * len * t + nx * amp * s, y1 + uy * len * t + ny * amp * s);
    }
    g.lineTo(x2, y2);
    g.stroke();
  }

  // Engineering dimension line with arrowheads and a label.
  function dim(g, V, x1, y1, x2, y2, label, off, o) {
    o = o || {};
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 1e-6) return;
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const nx = -uy * off, ny = ux * off;
    const c = o.color || OM.theme.c.ink2;
    line(g, V, x1, y1, x1 + nx * 1.15, y1 + ny * 1.15, c, 1);
    line(g, V, x2, y2, x2 + nx * 1.15, y2 + ny * 1.15, c, 1);
    arrow(g, V, x1 + nx + ux * len * 0.5, y1 + ny + uy * len * 0.5, x1 + nx, y1 + ny, c, 1, 6);
    arrow(g, V, x1 + nx + ux * len * 0.5, y1 + ny + uy * len * 0.5, x2 + nx, y2 + ny, c, 1, 6);
    if (label) {
      const mx = x1 + nx + ux * len * 0.5, my = y1 + ny + uy * len * 0.5;
      text(g, V, label, mx, my - (off >= 0 ? 0 : -V.px(4)) - V.px(4), { px: 11, color: c, align: 'center', mono: true, base: off >= 0 ? 'bottom' : 'top' });
    }
  }

  function dot(g, V, x, y, rpx, fill, stroke) {
    g.beginPath();
    g.arc(x, y, V.px(rpx), 0, Math.PI * 2);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = V.px(1.5); g.stroke(); }
  }

  // Paired horizontal bars ("what goes in" against "what comes out").
  // rows: [{label, a:{v, text, color, name}, b:{...}}]; both bars in a row share one scale.
  function pairBars(g, V, c, x, y, w, rows, rowH) {
    rowH = rowH || 54;
    const labelW = 34;
    const barMax = Math.max(40, w - labelW - 92);
    rows.forEach((r, i) => {
      const y0 = y + i * rowH;
      text(g, V, r.label.toUpperCase(), x, y0 + 9, { px: 10.5, weight: 700, color: c.ink2, halo: false });
      const m = Math.max(r.a.v, r.b.v, 1e-12);
      [r.a, r.b].forEach((bar, k) => {
        const by = y0 + 15 + k * 17;
        const bw = Math.max(2, (bar.v / m) * barMax);
        g.fillStyle = alpha(bar.color, 0.85);
        g.fillRect(x + labelW, by, bw, 13);
        g.strokeStyle = c.ink;
        g.lineWidth = V.px(1.2);
        g.strokeRect(x + labelW, by, bw, 13);
        text(g, V, bar.name, x, by + 10.5, { px: 10.5, mono: true, color: c.ink2, halo: false });
        text(g, V, bar.text, x + labelW + bw + 6, by + 10.5, { px: 11, mono: true, weight: 600, halo: false });
      });
    });
  }

  OM.theme = theme;
  OM.gfx = { alpha, mix, parse, rrect, line, arrow, text, hatchRect, spring, dim, dot, pairBars };
  if (typeof module !== 'undefined' && module.exports) module.exports = OM.gfx;
})(typeof globalThis !== 'undefined' ? globalThis : this);
