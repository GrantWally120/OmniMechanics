(function (root) {
  'use strict';
  const OM = root.OM;
  const Ob = OM.orbit;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, alpha } = OM.gfx;

  const R = Ob.RE;

  OM.register({
    id: 'orbit',
    title: 'Orbits and Newton’s cannon',
    group: 'signals',
    hook: 'A satellite is not floating. It is falling, and moving sideways so fast that it keeps missing the ground.',
    units: 'km, km/s, min, m/s²',
    alt: 'Earth seen from above the pole with a cannon on a tower firing sideways. The shot follows a path that falls back, circles the Earth, swings out in an ellipse or escapes, depending on its speed. A chart shows circular orbit period against altitude.',
    controls: [
      { id: 'speed', type: 'range', label: 'Launch speed (sideways)', min: 0, max: 12, step: 0.05, value: 7.67, dec: 2, unit: 'km/s', hint: 'Orbit speed at 400 km is 7.67 km/s, about 27,600 km/h.' },
      { id: 'alt', type: 'range', label: 'Launch height', min: 0, max: 2000, step: 50, value: 400, unit: 'km' },
      { id: 'angle', type: 'range', label: 'Launch direction above level', min: -10, max: 60, step: 1, value: 0, unit: '°' },
      { id: 'warp', type: 'seg', label: 'Time', value: 400, options: [{ v: 150, l: 'Slow' }, { v: 400, l: 'Normal' }, { v: 1500, l: 'Fast' }] },
      { id: 'zoom', type: 'seg', label: 'View', value: 'near', options: [{ v: 'near', l: 'Near' }, { v: 'far', l: 'Far out' }] },
      { id: 'fire', type: 'button', label: 'Fire again', primary: true, playOnClick: true },
    ],
    content: {
      intro: 'Newton imagined a cannon on a very tall mountain. Fire it sideways and the ball curves down to the ground. Fire it faster and it lands farther away. Fire it fast enough and the ground curves away as quickly as the ball falls, so it never lands.',
      steps: [
        { h: 'Everything falls', p: 'Gravity pulls the ball towards the centre of the Earth all the time. A ball fired sideways falls just as fast as one dropped, it simply lands farther off.' },
        { h: 'The ground curves away', p: 'The Earth is round. The faster the ball travels, the more the surface curves away underneath it before it can land.' },
        { h: 'Fast enough and it never lands', p: 'At about 7.9 km/s at ground level (7.67 at 400 km up) the ground drops away as fast as the ball falls. The ball is in a circular orbit: always falling, always missing.' },
        { h: 'Faster still', p: 'Go above circular speed and the path becomes an ellipse that swings out farther. Reach √2 times circular speed, 10.85 km/s up there, and you never come back.' },
      ],
      principle: {
        lead: 'An orbit is nothing more than free fall with enough sideways speed. The same gravity that pulls an apple down keeps the Moon and the space station going round.',
        eqs: [
          { label: 'Gravity at distance r', eq: 'g = GM / r²', note: 'GM = 398,600 km³/s² for Earth. At 400 km up gravity is still 89 percent of its strength at the ground.' },
          { label: 'Circular orbit speed', eq: 'v~c~ = √(GM / r)' },
          { label: 'Escape speed', eq: 'v~esc~ = √2 × v~c~' },
          { label: 'Period (Kepler’s third law)', eq: 'T = 2π √(a³ / GM)', note: 'a is the average distance from the centre. Low orbits go round quickly: 92 minutes at 400 km. Far ones take longer.' },
        ],
        points: [
          'Higher orbits are slower, not faster. Speed falls as 1 ÷ √r, which is why the Moon crawls along at 1 km/s while the space station moves at 7.7.',
          'A satellite at 35,786 km goes round once in 23.9 hours, the same as the Earth turns, so it hangs over one spot. That is the geostationary orbit.',
          '**What this model leaves out:** air drag, the Earth’s slight bulge, the Moon and Sun, and the rocket needed to get up there. Here the launch is instant. The path is computed by stepping Newton’s law forward in time.',
        ],
      },
      myth: {
        claim: 'There is no gravity in space, which is why astronauts float.',
        truth: 'At the space station’s height gravity is still about 89 percent as strong as on the ground. Astronauts float because they and the station are in free fall together, continuously falling around the Earth.',
      },
      tries: [
        { label: 'Just drop it', text: 'No sideways speed. It falls straight down.', set: { speed: 0, alt: 400, angle: 0 } },
        { label: 'A cannonball, 3 km/s', text: 'It curves down and lands far away.', set: { speed: 3, alt: 400, angle: 0 } },
        { label: 'The space station', text: 'Circular orbit at 400 km. One lap takes 92 minutes.', set: { speed: 7.67, alt: 400, angle: 0 } },
        { label: 'Faster: an ellipse', text: 'Above circular speed it swings out and comes back.', set: { speed: 9, alt: 400, angle: 0 } },
        { label: 'Escape', text: 'Above 10.85 km/s at this height, it never returns.', set: { speed: 11, alt: 400, angle: 0 }, },
      ],
      quiz: [
        { q: 'Why do astronauts on the space station float?', opts: ['There is no gravity up there', 'They and the station are in free fall together, going round the Earth', 'They are beyond the pull of the Moon', 'The station is spinning'], a: 1, why: 'Gravity at 400 km is about 89 percent of its ground value. Everything aboard is falling at the same rate, so nothing presses on anything else.' },
        { q: 'Roughly how fast must a satellite move sideways to stay in low Earth orbit?', opts: ['About 800 km/h', 'About 8,000 km/h', 'About 28,000 km/h', 'About 280,000 km/h'], a: 2, why: '7.67 km/s is about 27,600 km/h.' },
        { q: 'You launch faster than circular speed but slower than escape speed. What path do you follow?', opts: ['A straight line away', 'An ellipse that swings out farther and comes back', 'A smaller circle', 'A spiral into the ground'], a: 1, why: 'Bound orbits are ellipses with the Earth at one focus. Circular is the special case of an ellipse with no stretch.' },
      ],
      era: 'Newton, 1687',
      level: 3,
      parts: [
        { name: 'Gravity', note: 'Pulls the satellite toward the centre of the Earth all the time.' },
        { name: 'Velocity', note: 'Sideways speed. It is what keeps the satellite from falling straight down.' },
        { name: 'Orbit', note: 'The path that results: a circle, an ellipse, or an open curve if the speed is high enough.' },
      ],
      facts: [
        'Newton imagined firing a cannonball sideways from a very high mountain. Fast enough, and it never lands.',
        'The International Space Station moves at about 7.7 km/s and goes round the Earth every 93 minutes. It is falling all the time and keeps missing the ground.',
        'The speed needed to escape from the surface of the Earth is 11.2 km/s, which is the square root of 2 times the speed of a low circular orbit.',
      ],
      sources: [
        'H. D. Curtis, *Orbital Mechanics for Engineering Students*, Butterworth-Heinemann.',
        'I. Newton, *A Treatise of the System of the World* (the cannon thought experiment).',
      ],
    },

    create(host) {
      const st = { s: null, trail: [], status: 'flying', t: 0, cool: 0, pred: [], predKey: '', lastTrail: 0, crashAt: null };
      let elem = null; // orbital elements (infinite for escape orbits, so kept out of the plain-number state)
      let L = null;

      const launch = () => {
        const c = host.ctl, a = (c.angle * Math.PI) / 180;
        return { x: 0, y: R + c.alt, vx: c.speed * Math.cos(a), vy: c.speed * Math.sin(a) };
      };
      function fire() {
        st.s = launch(); st.trail = [[st.s.x, st.s.y]]; st.status = 'flying'; st.t = 0; st.cool = 0; st.lastTrail = 0; st.crashAt = null;
        elem = Ob.elements(st.s);
        computePred();
      }
      function computePred() {
        const s = launch(); const el = Ob.elements(s);
        const pts = [[s.x, s.y]];
        const dtStep = el.bound ? Math.max(15, el.period / 360) : 90;
        const limit = el.bound ? Math.min(1.05 * el.period, 8 * 3600) : 12 * 3600;
        let t = 0, hit = false;
        while (t < limit && !hit) {
          hit = Ob.advance(s, dtStep); t += dtStep;
          pts.push([s.x, s.y]);
          if (Math.hypot(s.x, s.y) > 40 * R) break;
        }
        st.pred = pts;
        st.predHit = hit;
        st.predKey = [host.ctl.speed, host.ctl.alt, host.ctl.angle].join('|');
      }
      const view = () => { const far = host.ctl.zoom === 'far'; const half = (far ? 9 : 2.3) * R; return { half, s: (L.map.h / 2 - 6) / half }; };

      function result(el) {
        if (el.rp < R - 1 && el.bound) return 'Falls back to Earth';
        if (!el.bound) return 'Escapes the Earth';
        if (el.e < 0.02) return 'Circular orbit';
        return 'Elliptical orbit';
      }

      const sim = {
        ref: { w: 780, h: 470 },
        refNarrow: { w: 420, h: 830 },
        state: st,
        init() { fire(); },
        layout(V) {
          L = V.narrow
            ? { map: { x: 6, y: 6, w: 408, h: 408 }, bar: { x: 14, y: 426, w: 392 }, chart: { x: 14, y: 560, w: 392, h: 250 } }
            : { map: { x: 6, y: 8, w: 472, h: 454 }, bar: { x: 500, y: 12, w: 268 }, chart: { x: 500, y: 220, w: 268, h: 240 } };
        },
        step(dt) {
          const key = [host.ctl.speed, host.ctl.alt, host.ctl.angle].join('|');
          if (key !== st.predKey) fire();
          if (st.status === 'flying') {
            let left = dt * host.ctl.warp;
            while (left > 0 && st.status === 'flying') {
              const h = Math.min(left, 30);
              const hit = Ob.advance(st.s, h);
              st.t += h; left -= h;
              if (st.t - st.lastTrail > 12) { st.trail.push([st.s.x, st.s.y]); st.lastTrail = st.t; if (st.trail.length > 1600) st.trail.shift(); }
              if (hit) { st.status = 'crashed'; st.crashAt = [st.s.x, st.s.y]; }
              else if (Math.hypot(st.s.x, st.s.y) > 40 * R) st.status = 'escaped';
            }
          } else { st.cool += dt; if (st.cool > 3.2) fire(); }
        },
        thumb() { fire(); for (let i = 0; i < 40; i++) sim.step(1 / 30); },
        action(id) { if (id === 'fire') fire(); },
        readouts() {
          const c = host.ctl, r0 = R + c.alt;
          const el = elem || Ob.elements(launch());
          const res = result(el);
          const g = Ob.gAt(c.alt);
          return [
            { k: 'Result', v: res, tone: res.startsWith('Falls') ? 'bad' : res.startsWith('Escapes') ? 'warn' : 'good' },
            { k: 'Circular speed here', v: fmt(Ob.circularSpeed(r0), 2) + ' km/s' },
            { k: 'Escape speed here', v: fmt(Ob.escapeSpeed(r0), 2) + ' km/s' },
            { k: 'One lap takes', v: el.bound && el.rp >= R - 1 ? fmt(el.period / 60, 0) + ' min' : '–' },
            { k: 'Highest point', v: el.bound ? fmt(el.ra - R, 0) + ' km' : 'no limit' },
            { k: 'Lowest point', v: el.rp >= R - 1 ? fmt(el.rp - R, 0) + ' km' : 'underground' },
            { k: 'Gravity here', v: fmt(g, 2) + ' m/s² (' + fmt((g / Ob.G0) * 100, 0) + ' %)' },
            { k: 'Flight time', v: fmt(st.t / 60, 0) + ' min' },
          ];
        },
        caption() { return st.status === 'crashed' ? 'Hit the ground' : st.status === 'escaped' ? 'Gone for good' : result(elem || Ob.elements(launch())); },
        describe() { const el = elem || Ob.elements(launch()); return result(el) + '. Launched at ' + fmt(host.ctl.speed, 2) + ' kilometres per second from ' + host.ctl.alt + ' kilometres up.'; },

        draw(g, V, c) {
          const M = L.map, cx = M.x + M.w / 2, cy = M.y + M.h / 2;
          const vw = view();
          const X = (x) => cx + x * vw.s, Y = (y) => cy - y * vw.s;
          g.save();
          g.beginPath(); g.rect(M.x, M.y, M.w, M.h); g.clip();
          g.fillStyle = alpha(c.paper2, 0.9); g.fillRect(M.x, M.y, M.w, M.h);
          // faint stars
          for (let i = 0; i < 60; i++) { const sx = M.x + ((i * 97.3) % M.w), sy = M.y + ((i * 61.7) % M.h); g.fillStyle = alpha(c.ink, 0.18); g.fillRect(sx, sy, 1.4, 1.4); }
          // Earth and the edge of space
          g.beginPath(); g.arc(cx, cy, R * vw.s, 0, Math.PI * 2);
          g.fillStyle = alpha(c.cold, 0.3); g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
          g.beginPath(); g.arc(cx, cy, (R + 100) * vw.s, 0, Math.PI * 2); g.strokeStyle = alpha(c.ink2, 0.6); g.lineWidth = V.px(1); g.setLineDash([V.px(3), V.px(3)]); g.stroke(); g.setLineDash([]);
          text(g, V, 'Earth', cx, cy + 4, { px: 13, weight: 800, align: 'center', color: c.ink, halo: false });
          // predicted path
          g.strokeStyle = alpha(c.ink, 0.45); g.lineWidth = V.px(1.6); g.setLineDash([V.px(5), V.px(4)]); g.beginPath();
          st.pred.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))));
          g.stroke(); g.setLineDash([]);
          // actual path
          g.strokeStyle = c.ink; g.lineWidth = V.px(2.4); g.lineJoin = 'round'; g.beginPath();
          st.trail.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))));
          if (st.s) g.lineTo(X(st.s.x), Y(st.s.y));
          g.stroke();
          // cannon and tower
          const ls = launch(), a = (host.ctl.angle * Math.PI) / 180;
          line(g, V, X(0), Y(R), X(0), Y(R + host.ctl.alt), c.ink, 2.4);
          g.strokeStyle = c.ink; g.lineWidth = V.px(5); g.lineCap = 'round';
          g.beginPath(); g.moveTo(X(0), Y(ls.y)); g.lineTo(X(0) + Math.cos(a) * V.px(18), Y(ls.y) - Math.sin(a) * V.px(18)); g.stroke(); g.lineCap = 'butt';
          g.beginPath(); g.arc(X(0), Y(ls.y), V.px(5), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(1.6); g.stroke();
          // the ball
          if (st.s && st.status === 'flying') {
            const bx = X(st.s.x), by = Y(st.s.y);
            g.beginPath(); g.arc(bx, by, V.px(7), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2.2); g.stroke();
            const sp = Math.hypot(st.s.vx, st.s.vy), r = Math.hypot(st.s.x, st.s.y);
            if (sp > 0.01) arrow(g, V, bx, by, bx + (st.s.vx / sp) * V.px(14 + sp * 6), by - (st.s.vy / sp) * V.px(14 + sp * 6), c.elec, 2.6, 9);
            const gg = Ob.gAt(r - R);
            arrow(g, V, bx, by, bx - (st.s.x / r) * V.px(12 + gg * 3), by + (st.s.y / r) * V.px(12 + gg * 3), c.hot, 2.6, 9);
          }
          if (st.crashAt) {
            const px = X(st.crashAt[0]), py = Y(st.crashAt[1]);
            g.strokeStyle = c.bad; g.lineWidth = V.px(3);
            g.beginPath(); g.moveTo(px - V.px(8), py - V.px(8)); g.lineTo(px + V.px(8), py + V.px(8)); g.moveTo(px + V.px(8), py - V.px(8)); g.lineTo(px - V.px(8), py + V.px(8)); g.stroke();
            text(g, V, 'landed after ' + fmt(st.t / 60, 0) + ' min', px, py - V.px(14), { px: 12, weight: 800, align: 'center', color: c.bad });
          }
          if (st.status === 'escaped') text(g, V, 'escaped, never coming back', cx, M.y + 26, { px: 13, weight: 800, align: 'center', color: c.warn });
          g.restore();
          g.strokeStyle = c.ink; g.lineWidth = V.px(1.5); g.strokeRect(M.x, M.y, M.w, M.h);
          text(g, V, 'blue arrow: velocity   orange arrow: gravity   dashed: where it will go', M.x + 8, M.y + M.h - 10, { px: 10.5, color: c.ink2 });
          text(g, V, 'dashed ring: edge of space, 100 km', M.x + 8, M.y + 16, { px: 10.5, color: c.ink2 });
          if (V.thumb) return;
          drawBar(g, V, c);
          drawChart(g, V, c);
        },
      };

      function drawBar(g, V, c) {
        const b = L.bar, r0 = R + host.ctl.alt;
        text(g, V, 'Launch speed at this height', b.x, b.y + 4, { px: 12, weight: 700, halo: false });
        const vc = Ob.circularSpeed(r0), ve = Ob.escapeSpeed(r0);
        const X = (v) => b.x + (v / 12) * (b.w - 4), y = b.y + 34, h = 26;
        g.fillStyle = alpha(c.hot, 0.4); g.fillRect(X(0), y, X(vc) - X(0), h);
        g.fillStyle = alpha(c.good, 0.45); g.fillRect(X(vc), y, X(ve) - X(vc), h);
        g.fillStyle = alpha(c.cold, 0.4); g.fillRect(X(ve), y, X(12) - X(ve), h);
        g.strokeStyle = c.ink; g.lineWidth = V.px(1.5); g.strokeRect(X(0), y, X(12) - X(0), h);
        text(g, V, 'falls back', X(vc / 2), y + 17, { px: 10.5, weight: 800, align: 'center', halo: false });
        text(g, V, 'orbits', X((vc + ve) / 2), y + 17, { px: 10.5, weight: 800, align: 'center', halo: false });
        text(g, V, 'orange: falls back   green: orbits   blue: escapes', b.x, y + h + 48, { px: 10.5, color: c.ink2, halo: false });
        text(g, V, fmt(vc, 2), X(vc), y + h + 30, { px: 10.5, mono: true, align: 'center', weight: 700, halo: false });
        text(g, V, fmt(ve, 2), X(ve), y + h + 30, { px: 10.5, mono: true, align: 'center', weight: 700, halo: false });
        for (const v of [0, 4, 8, 12]) text(g, V, String(v), X(v), y - 5, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false });
        const sx = X(clamp(host.ctl.speed, 0, 12));
        g.fillStyle = c.accent; g.strokeStyle = c.ink; g.lineWidth = V.px(2);
        g.beginPath(); g.moveTo(sx, y + h + 3); g.lineTo(sx - V.px(7), y + h + V.px(15)); g.lineTo(sx + V.px(7), y + h + V.px(15)); g.closePath(); g.fill(); g.stroke();
        const gg = Ob.gAt(host.ctl.alt);
        text(g, V, 'Gravity here: ' + fmt(gg, 2) + ' m/s²', b.x, y + h + 70, { px: 12.5, weight: 800, mono: true, halo: false, color: c.hot });
        text(g, V, fmt((gg / Ob.G0) * 100, 0) + ' % of its strength on the ground', b.x, y + h + 87, { px: 11.5, mono: true, halo: false, color: c.hot });
      }

      function drawChart(g, V, c) {
        const b = L.chart;
        text(g, V, 'Lap time for circular orbits', b.x, b.y + 10, { px: 12, weight: 700, halo: false });
        const x0 = b.x + 34, y0 = b.y + 22, w = b.w - 46, h = b.h - 58;
        const A1 = 40000, T1 = 28;
        const PX = (alt) => x0 + (alt / A1) * w, PY = (hrs) => y0 + h - (hrs / T1) * h;
        g.fillStyle = alpha(c.paper2, 0.9); g.fillRect(x0, y0, w, h);
        for (const t of [0, 6, 12, 18, 24]) { line(g, V, x0, PY(t), x0 + w, PY(t), alpha(c.ink, 0.12), 1); text(g, V, String(t), x0 - 5, PY(t) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); }
        for (const a of [0, 10000, 20000, 30000, 40000]) text(g, V, a === 0 ? '0' : a / 1000 + 'k', PX(a), y0 + h + 13, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false });
        g.strokeStyle = c.ink; g.lineWidth = V.px(1.5); g.strokeRect(x0, y0, w, h);
        const per = (alt) => (2 * Math.PI * Math.sqrt(Math.pow(R + alt, 3) / Ob.GM)) / 3600;
        g.strokeStyle = c.cold; g.lineWidth = V.px(2.6); g.beginPath();
        for (let a = 0; a <= A1; a += 250) { const t = per(a); if (a === 0) g.moveTo(PX(a), PY(t)); else g.lineTo(PX(a), PY(t)); }
        g.stroke();
        const marks = [[400, 'space station', 'left'], [20200, 'GPS', 'right'], [35786, 'geostationary', 'right']];
        marks.forEach(([a, lab, al]) => {
          g.beginPath(); g.arc(PX(a), PY(per(a)), V.px(4.5), 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(1.6); g.stroke();
          text(g, V, lab + ' ' + fmt(per(a), a < 1000 ? 1 : 0) + ' h', PX(a) + (al === 'left' ? 8 : -8), PY(per(a)) + (al === 'left' ? -8 : 16), { px: 10.5, weight: 700, align: al, halo: true });
        });
        const cur = host.ctl.alt;
        g.beginPath(); g.arc(PX(cur), PY(per(cur)), V.px(6), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
        text(g, V, 'hours for one lap', x0 + 4, y0 + 14, { px: 10.5, color: c.ink2, halo: false });
        text(g, V, 'height above the ground, km', x0 + w, y0 + h + 28, { px: 10.5, color: c.ink2, align: 'right', halo: false });
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
