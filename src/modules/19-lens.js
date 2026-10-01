(function (root) {
  'use strict';
  const OM = root.OM;
  const Ln = OM.lens;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, alpha, dim, plotFrame } = OM.gfx;

  const H = 3; // object height, cm
  const S_MAX = 45;

  OM.register({
    id: 'lens',
    title: 'Lenses and images',
    group: 'signals',
    hook: 'Drag an object toward a lens and watch its image grow, flip, vanish to infinity and come back as a magnifying glass.',
    units: 'cm, dioptres',
    alt: 'A ray diagram of a thin lens: an object arrow on the left, three principal rays bending at the lens, and the image arrow where they meet, solid for a real image and dashed for a virtual one. Below are charts of image distance and of magnification against object distance.',
    controls: [
      { id: 'kind', type: 'seg', label: 'Lens', value: 'conv', options: [{ v: 'conv', l: 'Converging' }, { v: 'div', l: 'Diverging' }] },
      { id: 'f', type: 'range', label: 'Focal length', min: 2, max: 20, step: 0.5, value: 8, dec: 1, unit: 'cm' },
      { id: 's', type: 'range', label: 'Object distance', min: 2, max: S_MAX, step: 0.5, value: 20, dec: 1, unit: 'cm', hint: 'Or drag the arrow in the picture.' },
    ],
    content: {
      intro: 'A lens bends light so that the rays from one point of an object meet again at one point on the other side. The place where they meet is the image. Move the object and the image moves, grows, shrinks and flips, and when the object is closer than the focal length the lens becomes a magnifying glass.',
      steps: [
        { h: 'A ray parallel to the axis', p: 'A converging lens bends it so that it passes through the focal point on the far side. That is what the focal point is: where parallel light is brought to a point.' },
        { h: 'The ray through the centre', p: 'Near the middle a thin lens is a sheet of glass with parallel faces, so a ray through the centre goes straight on.' },
        { h: 'Where the rays meet', p: 'The tip of the image is where the bent rays cross. Beyond twice the focal length the image is real, upside down and smaller, like the one in a camera. Between one and two focal lengths it is bigger, like the one from a projector.' },
        { h: 'Inside the focal length', p: 'The rays no longer meet. They spread, and the eye follows them back to a bigger, upright, virtual image behind the object. That is a magnifying glass. A diverging lens always spreads the rays and always gives a smaller upright virtual image.' },
      ],
      principle: {
        lead: 'Three rays are enough to find the image, and one equation does the same job. Distances on the object side are positive, and a negative image distance means the image is virtual.',
        eqs: [
          { label: 'The thin lens equation', eq: '1 / s + 1 / s′ = 1 / f', note: 's is the distance of the object from the lens, s′ the distance of the image, f the focal length. f is negative for a diverging lens.' },
          { label: 'Magnification', eq: 'm = − s′ / s', note: 'A negative m means the image is upside down. The size of the image is m times the size of the object.' },
          { label: 'Newton\'s form', eq: '(s − f)(s′ − f) = f^2^', note: 'Measured from the focal points instead of the lens, the distances multiply to a constant.' },
          { label: 'Power', eq: 'P = 1 / f', note: 'In dioptres, with f in metres. A lens of focal length 25 cm has a power of 4 dioptres. The powers of lenses held together add up.' },
        ],
        points: [
          'When the object sits exactly at the focal point the rays leave the lens parallel, and the image is at infinity. This is how a lamp in a torch (flashlight) makes a beam.',
          'A camera is an object far beyond 2f, so its image forms just beyond the focal point. Focusing moves the lens a little to put the sensor exactly where the image is.',
          '**What this model leaves out:** the thickness of the lens, colour fringes, the blur at the edges of a real lens (aberrations), and the wave nature of light. Rays are drawn for an ideal thin lens.',
        ],
      },
      myth: {
        claim: 'If you cover half of the lens, you lose half of the picture.',
        truth: 'You lose half of the brightness and the whole picture stays. Every point of the object sends light across the whole lens, so every point of the image is made from rays through every part of it. Covering half just removes half of those rays. That is also why a camera lens with a smaller opening makes a dimmer picture and not a smaller one.',
      },
      tries: [
        { label: 'Camera', text: 'A distant object: the image is small, upside down and just beyond the focal point.', set: { kind: 'conv', f: 8, s: 30 } },
        { label: 'Projector', text: 'Between f and 2f the image is real, upside down and bigger.', set: { kind: 'conv', f: 8, s: 12 } },
        { label: 'Same size', text: 'At exactly 2f the image is as big as the object, upside down, at 2f.', set: { kind: 'conv', f: 8, s: 16 } },
        { label: 'At the focal point', text: 'The rays leave parallel. The image is at infinity.', set: { kind: 'conv', f: 8, s: 8 } },
        { label: 'Magnifying glass', text: 'Inside f the image is virtual, upright and bigger.', set: { kind: 'conv', f: 8, s: 5 } },
        { label: 'Short-sight glasses', text: 'A diverging lens gives a smaller, upright, virtual image.', set: { kind: 'div', f: 8, s: 20 } },
      ],
      quiz: [
        { q: 'An object is far beyond twice the focal length of a converging lens. What is the image like?', opts: ['Real, upside down and smaller', 'Virtual, upright and bigger', 'Real, upright and bigger', 'There is no image'], a: 0, why: 'Far objects form small, real, inverted images just beyond the focal point. This is how a camera or the eye works.' },
        { q: 'You hold a converging lens of 8 cm focal length 5 cm from a page. What do you see?', opts: ['An upside-down image', 'A bigger, upright, virtual image', 'Nothing', 'A smaller upright image'], a: 1, why: 'Inside the focal length the rays spread out, and the eye sees a bigger virtual image behind the page. That is a magnifying glass.' },
        { q: 'You cover the lower half of a camera lens. What happens to the picture?', opts: ['The lower half of the picture disappears', 'The whole picture is there, but dimmer', 'The picture turns upside down', 'The picture gets bigger'], a: 1, why: 'Light from every point of the object reaches every part of the lens, so each point of the image is just made of fewer rays.' },
      ],
      era: 'Kepler, 1611',
      level: 2,
      parts: [
        { name: 'Lens', note: 'A piece of glass whose curved faces bend the light. Drawn here as an ideal thin lens.' },
        { name: 'Optical axis', note: 'The line through the centre of the lens at right angles to it.' },
        { name: 'Focal points', note: 'F, one on each side, at the focal length from the lens. Parallel light comes to a point at the far one.' },
        { name: 'Object and image', note: 'The arrow you move, and the arrow the lens makes of it.' },
        { name: 'Principal rays', note: 'Three easy rays: parallel then through the far focus, straight through the centre, and through the near focus then parallel.' },
      ],
      facts: [
        'The first eyeglasses were made in northern Italy around 1286, near Pisa, by an unknown craftsman.',
        'Ibn al-Haytham wrote his Book of Optics between 1011 and 1021 and showed that we see because light enters the eye, and not because something leaves it.',
        'Hans Lippershey applied for a patent on a telescope made of two lenses in 1608. Galileo built better ones the next year, and Kepler worked out the optics in his Dioptrice in 1611.',
        'The cornea of your eye does about two thirds of its focusing, around 43 dioptres out of roughly 60. The lens inside only does the fine adjustment.',
      ],
      sources: [
        'E. Hecht, *Optics*, Pearson (thin lenses, ray tracing, sign conventions).',
        'F. A. Jenkins and H. E. White, *Fundamentals of Optics*, McGraw-Hill.',
        'J. Kepler, *Dioptrice* (1611).',
      ],
    },

    create(host) {
      const st = { drag: false };
      let L = null;

      const fval = () => (host.ctl.kind === 'div' ? -host.ctl.f : host.ctl.f);
      const im = () => Ln.image(fval(), host.ctl.s, H);
      const KIND = {
        camera: 'Camera: a real, upside-down, smaller image',
        copier: 'Same size: the real, upside-down image is as big as the object',
        projector: 'Projector: a real, upside-down, bigger image',
        magnifier: 'Magnifying glass: a virtual, upright, bigger image',
        diverging: 'Diverging lens: a virtual, upright, smaller image',
        none: 'At the focal point: the rays leave parallel',
      };
      const kindOf = () => { const i = im(); return i.atInfinity ? 'none' : Ln.kind(fval(), host.ctl.s); };
      const geo = () => ({ k: L.k, ky: L.ky, lx: L.lens.x, ax: L.lens.y });

      const sim = {
        ref: { w: 780, h: 560 },
        refNarrow: { w: 420, h: 940 },
        state: st,
        static: true,
        drag: 'x',
        init() { st.drag = false; },
        layout(V) {
          // k is units per centimetre along the axis, ky up the page. The picture is stretched upward, as ray
          // diagrams usually are: every ray is a straight line, and straight lines stay straight when one
          // direction is scaled, so the crossing points are unchanged.
          L = V.narrow
            ? { k: 5, ky: 10.5, lens: { x: 252, y: 168 }, diag: { x: 0, y: 0, w: 420, h: 330 }, c1: { x: 14, y: 336, w: 392, h: 290 }, c2: { x: 14, y: 636, w: 392, h: 290 } }
            : { k: 8, ky: 12, lens: { x: 390, y: 165 }, diag: { x: 0, y: 0, w: 780, h: 320 }, c1: { x: 10, y: 326, w: 376, h: 230 }, c2: { x: 396, y: 326, w: 376, h: 230 } };
        },
        pointer(type, x, y) {
          const { k, ky, lx, ax } = geo();
          const ox = lx - host.ctl.s * k;
          if (type === 'down') {
            if (Math.abs(x - ox) > 26 || y < ax - H * ky - 30 || y > ax + 30) return false;
            st.drag = true; return true;
          }
          if (type === 'move' && st.drag) host.set('s', clamp(Math.round(((lx - x) / k) * 2) / 2, 2, S_MAX));
          if (type === 'up') st.drag = false;
          return true;
        },
        cursor(x, y) {
          const { k, ky, lx, ax } = geo();
          return Math.abs(x - (lx - host.ctl.s * k)) < 26 && y > ax - H * ky - 30 && y < ax + 30 ? 'ew-resize' : '';
        },
        key(kk) {
          if (kk === 'ArrowLeft' || kk === 'ArrowRight') { host.set('s', clamp(host.ctl.s + (kk === 'ArrowLeft' ? 0.5 : -0.5), 2, S_MAX)); return true; }
          return false;
        },
        readouts() {
          const i = im();
          const f = fval();
          return [
            { k: 'Image distance', v: i.atInfinity ? 'infinity' : fmt(Math.abs(i.sp), 1) + ' cm' + (i.real ? ' (real)' : ' (virtual)') },
            { k: 'Magnification', v: i.atInfinity ? '–' : fmt(i.m, 2) + ' ×' },
            { k: 'Image height', v: i.atInfinity ? '–' : fmt(Math.abs(i.h), 1) + ' cm' + (i.upright ? ', upright' : ', upside down') },
            { k: 'Object distance', v: fmt(host.ctl.s / Math.abs(f), 2) + ' × the focal length' },
            { k: 'Lens power', v: fmt(100 / f, 1) + ' dioptres' },
          ];
        },
        caption() { return KIND[kindOf()]; },
        describe() { const i = im(); return KIND[kindOf()] + (i.atInfinity ? '.' : '. The image is ' + fmt(Math.abs(i.sp), 1) + ' centimetres from the lens and ' + fmt(Math.abs(i.m), 2) + ' times the size of the object.'); },
        thumb() { host.ctl.s = 20; },
        draw(g, V, c) {
          drawDiagram(g, V, c);
          if (V.thumb) return;
          drawSprime(g, V, c, L.c1);
          drawMag(g, V, c, L.c2);
        },
      };

      // --------------------------------------------------------- the ray diagram
      function drawDiagram(g, V, c) {
        const { k, ky, lx, ax } = geo();
        const f = fval(), s = host.ctl.s;
        const i = im();
        const r = L.diag;
        const X = (cm) => lx + cm * k, Y = (cm) => ax - cm * ky;
        const lw = (n) => V.px(n);
        const ink = c.ink;
        g.save();
        g.beginPath(); g.rect(r.x, r.y, r.w, r.h); g.clip();
        // axis and scale
        line(g, V, 4, ax, r.w - 4, ax, c.ink2, 1.3);
        const tickStep = V.narrow ? 10 : 5;
        for (let cm = -S_MAX; cm <= 60; cm += tickStep) {
          const x = X(cm);
          if (x < 8 || x > r.w - 8 || cm === 0) continue;
          line(g, V, x, ax - 3, x, ax + 3, c.ink3, 1);
          if (cm % (tickStep * 2) === 0 && !V.thumb) text(g, V, Math.abs(cm) + '', x, ax + 16, { px: 9.5, mono: true, color: c.ink3, align: 'center', halo: true });
        }
        if (!V.thumb) text(g, V, 'cm', r.w - 8, ax + 28, { px: 9.5, color: c.ink3, align: 'right', halo: true });
        // focal points
        const fs = [-Math.abs(f), Math.abs(f)];
        fs.forEach((fx) => {
          g.beginPath(); g.arc(X(fx), ax, 3.4, 0, Math.PI * 2); g.fillStyle = ink; g.fill();
          if (!V.thumb) text(g, V, 'F', X(fx), ax - 9, { px: 11, weight: 700, align: 'center', halo: true });
        });
        if (f > 0) [-2 * f, 2 * f].forEach((fx) => {
          if (X(fx) > 6 && X(fx) < r.w - 6) { g.beginPath(); g.arc(X(fx), ax, 2.4, 0, Math.PI * 2); g.fillStyle = c.ink3; g.fill(); if (!V.thumb) text(g, V, '2F', X(fx), ax - 9, { px: 10, color: c.ink2, align: 'center', halo: true }); }
        });
        // rays
        const cols = [c.hot, c.cold, c.elec];
        Ln.rays(f, s, H, (r.w - lx) / k + 5).forEach((ray, n) => {
          g.strokeStyle = cols[n]; g.lineWidth = lw(1.9); g.lineJoin = 'round';
          g.beginPath(); ray.pts.forEach((p, j) => { if (j) g.lineTo(X(p.x), Y(p.y)); else g.moveTo(X(p.x), Y(p.y)); }); g.stroke();
          if (ray.back) {
            g.setLineDash([lw(5), lw(4)]); g.globalAlpha = 0.8;
            g.beginPath(); ray.back.forEach((p, j) => { if (j) g.lineTo(X(p.x), Y(p.y)); else g.moveTo(X(p.x), Y(p.y)); }); g.stroke();
            g.setLineDash([]); g.globalAlpha = 1;
          }
        });
        // lens
        const lh = 8.5 * ky;
        g.beginPath();
        if (f > 0) { g.moveTo(lx, ax - lh); g.quadraticCurveTo(lx + 13, ax, lx, ax + lh); g.quadraticCurveTo(lx - 13, ax, lx, ax - lh); }
        else { g.moveTo(lx - 10, ax - lh); g.quadraticCurveTo(lx + 3, ax, lx - 10, ax + lh); g.lineTo(lx + 10, ax + lh); g.quadraticCurveTo(lx - 3, ax, lx + 10, ax - lh); g.closePath(); }
        g.fillStyle = alpha(c.glass, 0.5); g.fill(); g.strokeStyle = ink; g.lineWidth = lw(1.8); g.stroke();
        // object
        arrow(g, V, X(-s), ax, X(-s), Y(H), ink, 3, 11);
        if (!V.thumb) text(g, V, 'object', X(-s), Y(H) - 8, { px: 11.5, weight: 700, align: 'center' });
        // image
        if (!i.atInfinity) {
          const ix = X(i.sp), tipY = Y(i.h);
          const inView = ix > 6 && ix < r.w - 6;
          if (inView) {
            if (!i.real) g.setLineDash([lw(5), lw(3)]);
            arrow(g, V, ix, ax, ix, tipY, i.real ? c.bad : alpha(c.bad, 0.9), 3, 11);
            g.setLineDash([]);
            if (!V.thumb) {
              // the label sits beyond the arrow tip, unless that would land on the object's own label
              const crowded = i.h >= 0 && Math.abs(ix - X(-s)) < 96;
              const lab = i.real ? 'real image' : 'virtual image';
              const ly = crowded ? ax + 30 : tipY + (i.h >= 0 ? -8 : 17);
              text(g, V, lab, clamp(ix, 52, r.w - 52), ly, { px: 11.5, weight: 700, color: c.bad, align: 'center' });
            }
          } else if (!V.thumb) {
            const right = i.sp > 0;
            arrow(g, V, right ? r.w - 70 : 70, ax - 30, right ? r.w - 14 : 14, ax - 30, c.bad, 2, 9);
            text(g, V, (i.real ? 'real' : 'virtual') + ' image ' + fmt(Math.abs(i.sp), 0) + ' cm away', right ? r.w - 14 : 14, ax - 40, { px: 11, color: c.bad, weight: 700, align: right ? 'right' : 'left' });
          }
        }
        if (!V.thumb) {
          // distances are measured below the lens so that they never run into its outline
          const off = lh + 14;
          dim(g, V, X(-s), ax, lx, ax, 's = ' + fmt(s, 1) + ' cm', off);
          if (!i.atInfinity && i.sp > 0 && X(i.sp) < r.w - 8) dim(g, V, lx, ax, X(i.sp), ax, 's′ = ' + fmt(i.sp, 1) + ' cm', off);
          text(g, V, 'drag the object', clamp(X(-s), 50, r.w - 50), ax + off + 34, { px: 10, color: c.ink3, align: 'center', halo: false });
        }
        g.restore();
      }

      // -------------------------------------------------- image distance and magnification
      function drawSprime(g, V, c, r) {
        const f = fval();
        const conv = f > 0;
        const f1 = plotFrame(g, V, c, r, 'Image distance against object distance, cm', 'object distance s, cm', '');
        const YMIN = conv ? -45 : -(Math.abs(f) + 2), YMAX = conv ? 60 : 4;
        const X = (s) => f1.x0 + (s / S_MAX) * f1.w, Y = (v) => f1.y0 + f1.h - ((v - YMIN) / (YMAX - YMIN)) * f1.h;
        for (const s of [0, 10, 20, 30, 40]) { line(g, V, X(s), f1.y0 + f1.h, X(s), f1.y0 + f1.h + 4, c.ink, 1); text(g, V, String(s), X(s), f1.y0 + f1.h + 15, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false }); }
        const ticks = conv ? [-40, -20, 0, 20, 40, 60] : [-Math.round(Math.abs(f)), 0];
        ticks.forEach((v) => { line(g, V, f1.x0 - 4, Y(v), f1.x0, Y(v), c.ink, 1); text(g, V, String(v), f1.x0 - 6, Y(v) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); });
        line(g, V, f1.x0, Y(0), f1.x0 + f1.w, Y(0), c.ink2, 1.2, [4, 3]);
        if (conv) {
          // the three regions
          const reg = [[0, f, 'magnifier', c.accent], [f, 2 * f, 'projector', c.warn], [2 * f, S_MAX, 'camera', c.cold]];
          reg.forEach((q) => { const a = X(Math.min(q[0], S_MAX)), b = X(Math.min(q[1], S_MAX)); g.fillStyle = alpha(q[3], 0.13); g.fillRect(a, f1.y0, b - a, f1.h); if (b - a > 44) text(g, V, q[2], (a + b) / 2, f1.y0 + 12, { px: 10, color: c.ink2, align: 'center', halo: false }); });
          line(g, V, X(f), f1.y0, X(f), f1.y0 + f1.h, c.ink3, 1.2, [3, 3]);
        }
        g.strokeStyle = c.elec; g.lineWidth = V.px(2.6);
        let pen = false;
        g.beginPath();
        for (let s = 0.4; s <= S_MAX; s += 0.2) {
          if (Math.abs(s - f) < 0.15) { pen = false; continue; }
          const sp = (f * s) / (s - f);
          if (sp > YMAX || sp < YMIN) { pen = false; continue; }
          if (pen) g.lineTo(X(s), Y(sp)); else { g.moveTo(X(s), Y(sp)); pen = true; }
        }
        g.stroke();
        const i = im();
        if (!i.atInfinity && i.sp <= YMAX && i.sp >= YMIN) {
          g.beginPath(); g.arc(X(host.ctl.s), Y(i.sp), V.px(6), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
        }
        text(g, V, conv ? 'above the dashed line: real image, below: virtual' : 'always virtual', f1.x0 + f1.w - 4, f1.y0 + f1.h - 6, { px: 10, color: c.ink2, align: 'right', halo: false });
      }

      function drawMag(g, V, c, r) {
        const f = fval();
        const conv = f > 0;
        const f2 = plotFrame(g, V, c, r, 'Magnification against object distance', 'object distance s, cm', '');
        const MMIN = conv ? -4 : -0.2, MMAX = conv ? 4 : 1.2;
        const X = (s) => f2.x0 + (s / S_MAX) * f2.w, Y = (v) => f2.y0 + f2.h - ((v - MMIN) / (MMAX - MMIN)) * f2.h;
        for (const s of [0, 10, 20, 30, 40]) { line(g, V, X(s), f2.y0 + f2.h, X(s), f2.y0 + f2.h + 4, c.ink, 1); text(g, V, String(s), X(s), f2.y0 + f2.h + 15, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false }); }
        const ticks = conv ? [-3, -2, -1, 0, 1, 2, 3] : [0, 0.5, 1];
        ticks.forEach((v) => { line(g, V, f2.x0 - 4, Y(v), f2.x0, Y(v), c.ink, 1); text(g, V, String(v), f2.x0 - 6, Y(v) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); });
        line(g, V, f2.x0, Y(0), f2.x0 + f2.w, Y(0), c.ink2, 1.2, [4, 3]);
        if (conv) { line(g, V, f2.x0, Y(-1), f2.x0 + f2.w, Y(-1), alpha(c.ink3, 0.6), 1, [2, 4]); line(g, V, f2.x0, Y(1), f2.x0 + f2.w, Y(1), alpha(c.ink3, 0.6), 1, [2, 4]); line(g, V, X(f), f2.y0, X(f), f2.y0 + f2.h, c.ink3, 1.2, [3, 3]); }
        g.strokeStyle = c.hot; g.lineWidth = V.px(2.6);
        let pen = false;
        g.beginPath();
        for (let s = 0.4; s <= S_MAX; s += 0.2) {
          if (Math.abs(s - f) < 0.15) { pen = false; continue; }
          const m = -((f * s) / (s - f)) / s;
          if (m > MMAX || m < MMIN) { pen = false; continue; }
          if (pen) g.lineTo(X(s), Y(m)); else { g.moveTo(X(s), Y(m)); pen = true; }
        }
        g.stroke();
        const i = im();
        if (!i.atInfinity && i.m <= MMAX && i.m >= MMIN) {
          g.beginPath(); g.arc(X(host.ctl.s), Y(i.m), V.px(6), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
          text(g, V, fmt(i.m, 2) + ' ×', X(host.ctl.s) + (host.ctl.s > S_MAX * 0.7 ? -10 : 10), Y(i.m) - 10, { px: 11, mono: true, weight: 700, align: host.ctl.s > S_MAX * 0.7 ? 'right' : 'left' });
        }
        text(g, V, 'negative: upside down', f2.x0 + f2.w - 4, f2.y0 + f2.h - 6, { px: 10, color: c.ink2, align: 'right', halo: false });
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
