(function (root) {
  'use strict';
  const OM = root.OM;
  const Fr = OM.fridge;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, hatchRect, alpha, mix } = OM.gfx;

  const WARP = 600; // simulated seconds per real second
  const HIST = 360; // samples of 30 simulated seconds: three hours

  // The refrigerant loop as a path: evaporator up the left, compressor along the top,
  // condenser down the right, expansion valve along the bottom.
  const PATH = [[100, 330], [100, 92], [212, 92], [268, 92], [380, 92], [380, 330], [262, 330], [206, 330], [100, 330]];
  const STATES = ['evap', 'vaporLow', 'compress', 'vaporHigh', 'cond', 'liquid', 'valve', 'mixLow'];
  const SEG = PATH.slice(1).map((p, i) => ({ a: PATH[i], b: p, len: Math.hypot(p[0] - PATH[i][0], p[1] - PATH[i][1]), state: STATES[i] }));
  const TOTAL = SEG.reduce((s, q) => s + q.len, 0);

  function at(s) {
    let d = ((s % 1) + 1) % 1 * TOTAL;
    for (const q of SEG) {
      if (d <= q.len) { const t = d / q.len; return { x: q.a[0] + (q.b[0] - q.a[0]) * t, y: q.a[1] + (q.b[1] - q.a[1]) * t, state: q.state, t }; }
      d -= q.len;
    }
    return { x: PATH[0][0], y: PATH[0][1], state: 'evap', t: 0 };
  }

  OM.register({
    id: 'fridge',
    title: 'Refrigerator',
    group: 'heat',
    hook: 'A fridge does not make cold. It moves heat out of the box, using a fluid that boils at minus ten and condenses at forty.',
    units: 'bar, °C, kJ/kg, W',
    alt: 'The refrigerant loop with evaporator inside the cabinet, compressor, condenser outside and expansion valve; a pressure against enthalpy diagram with the R-134a saturation dome; and a chart of the cabinet temperature cycling around the thermostat setting.',
    controls: [
      { id: 'set', type: 'range', label: 'Thermostat setting', min: 0, max: 10, step: 0.5, value: 4, dec: 1, unit: '°C' },
      { id: 'room', type: 'range', label: 'Room temperature', min: 15, max: 40, step: 1, value: 28, unit: '°C' },
      { id: 'door', type: 'toggle', label: 'Door open', value: false },
      { id: 'warm', type: 'button', label: 'Put in warm groceries', hint: 'Adds about 6 °C of warmth to the contents.' },
    ],
    content: {
      intro: 'A fridge moves heat; it does not make cold. A liquid that boils at a very low temperature soaks up heat inside the box, a compressor squeezes that heat out to a hotter place, and the loop repeats.',
      steps: [
        { h: 'Evaporator: boil to absorb heat', p: 'Cold liquid refrigerant flows through a coil inside the cabinet. At this low pressure it boils at about −10 °C, so it takes heat from the food and air. Boiling needs energy, and that energy is the heat it removes.' },
        { h: 'Compressor: squeeze it hot', p: 'The vapour is squeezed to about five times the pressure. Squeezing heats it well above room temperature. This is where the electricity goes in.' },
        { h: 'Condenser: give the heat away', p: 'The hot high-pressure vapour flows through the coil at the back. It is hotter than the room, so heat flows out into the room and the vapour condenses back to liquid.' },
        { h: 'Expansion valve: drop the pressure', p: 'The liquid squirts through a narrow tube into the low-pressure side. A little of it flashes to vapour, which chills the rest, and it arrives at the evaporator ready to soak up heat again.' },
      ],
      principle: {
        lead: 'Pressure sets the boiling point. Low pressure inside means the fluid boils cold enough to take heat from the food. High pressure outside means it condenses hot enough to dump that heat into a warm room.',
        eqs: [
          { label: 'Heat taken from the cabinet', eq: 'Q~in~ = ṁ (h~1~ − h~4~)', note: 'ṁ is the refrigerant flow in kg/s and h the heat content (enthalpy) per kilogram at each corner of the loop.' },
          { label: 'Compressor work', eq: 'W = ṁ (h~2~ − h~1~)' },
          { label: 'Efficiency (COP)', eq: 'COP = Q~in~ / W', note: 'Heat moved for each unit of electricity. Around 2 to 3 here.' },
          { label: 'The ceiling', eq: 'COP~max~ = T~cold~ / (T~hot~ − T~cold~)', note: 'Temperatures in kelvin. No fridge can beat this, and a hotter room or a colder setting lowers it.' },
        ],
        points: [
          'The room gets back the heat removed plus the electricity used, Q + W. That is why the back of a fridge is warm, and why an open fridge door heats a room instead of cooling it.',
          'The diagram on the right is the standard pressure against enthalpy chart. The dome is where the fluid is part liquid, part vapour. The loop 1–2–3–4 is the cycle.',
          '**What this model leaves out:** superheat and subcooling, compressor oil, frost on the coil, fan power and real compressor maps. The fluid is R-134a with properties fitted to tables. Many modern fridges use isobutane (R-600a) instead.',
        ],
      },
      myth: {
        claim: 'Leaving the fridge door open cools the kitchen.',
        truth: 'The fridge moves heat from inside the box to the coil at the back and adds the electricity it used. So an open door makes the room slightly warmer, never cooler, and the compressor runs flat out trying to keep up.',
      },
      tries: [
        { label: 'Hot kitchen', text: 'A 38 °C room. The high side pressure and the electricity both go up.', set: { room: 38, set: 4, door: false } },
        { label: 'Colder setting', text: 'Colder inside means a lower evaporator pressure and a lower COP.', set: { set: 0, room: 28 } },
        { label: 'Door open', text: 'Watch the compressor run almost continuously.', set: { door: true } },
        { label: 'Cool night', text: 'An 18 °C room needs less lift and uses less power.', set: { room: 18, set: 4, door: false } },
        { label: 'Warm groceries', text: 'The cabinet warms up, then the compressor pulls it back down.', set: { door: false }, action: 'warm', play: true },
      ],
      quiz: [
        { q: 'Where does the heat from inside the fridge end up?', opts: ['It is destroyed by the refrigerant', 'Released into the room at the condenser at the back, along with the compressor’s electrical energy', 'Stored in the compressor', 'Sent down the drain'], a: 1, why: 'Energy is conserved. The condenser gives out the heat taken from the cabinet plus the electrical work put in by the compressor.' },
        { q: 'Why does the refrigerant boil at about −10 °C inside the evaporator?', opts: ['It is mixed with antifreeze', 'The pressure there is low, and the boiling point falls with pressure', 'The cabinet is an airtight vacuum', 'The compressor heats it'], a: 1, why: 'Every fluid boils at a temperature that depends on pressure. R-134a at about 2 bar boils at roughly −10 °C.' },
        { q: 'You open the fridge door in a sealed kitchen and leave it. What happens to the kitchen temperature?', opts: ['It falls slowly', 'It rises slightly', 'It stays exactly the same', 'It falls quickly'], a: 1, why: 'The fridge adds its electrical energy to the room as heat, and the heat it removes from the room’s own air comes straight back out of the condenser.' },
      ],
      sources: [
        'Y. A. Çengel and M. A. Boles, *Thermodynamics: An Engineering Approach* (the vapour-compression refrigeration cycle).',
        '*ASHRAE Handbook: Fundamentals* (thermophysical properties of refrigerants).',
      ],
    },

    create(host) {
      const st = { tCab: 10, on: true, t: 0, flow: 0, phase: 0, hist: [], lastHist: 0, duty: 0.4, cyc: null, leak: 0 };
      let L = null;

      const cyc = () => st.cyc || Fr.cycle(st.tCab - Fr.EVAP_DT, host.ctl.room + Fr.COND_DT);

      const sim = {
        ref: { w: 780, h: 470 },
        refNarrow: { w: 420, h: 900 },
        state: st,
        init() {
          st.tCab = 10; st.on = true; st.t = 0; st.flow = 1; st.phase = 0; st.hist = []; st.lastHist = -1e9; st.duty = 0.4;
          st.cyc = Fr.cycle(st.tCab - Fr.EVAP_DT, host.ctl.room + Fr.COND_DT);
          // pre-run 40 simulated minutes so the first frame shows a settled loop
          for (let i = 0; i < 480; i++) stepSim(5);
        },
        layout(V) {
          L = V.narrow
            ? { scene: { x: 0, y: 0, k: 0.95 }, ph: { x: 12, y: 440, w: 396, h: 240 }, hist: { x: 12, y: 700, w: 396, h: 180 } }
            : { scene: { x: 6, y: 10, k: 1 }, ph: { x: 452, y: 14, w: 318, h: 250 }, hist: { x: 452, y: 288, w: 318, h: 170 } };
        },
        step(dt) {
          let sim_ = dt * WARP;
          while (sim_ > 0) { const h = Math.min(5, sim_); stepSim(h); sim_ -= h; }
          const target = st.on ? 1 : 0;
          st.flow += (target - st.flow) * Math.min(1, dt * 3);
          st.phase += st.flow * dt * 0.11;
        },
        thumb() { st.phase = 0.3; },
        action(id) { if (id === 'warm') st.tCab += 6; },
        readouts() {
          const c = cyc();
          return [
            { k: 'Inside', v: fmt(st.tCab, 1) + ' °C' },
            { k: 'Compressor', v: st.on ? 'running' : 'off', tone: st.on ? 'warn' : 'good' },
            { k: 'Low side', v: fmt(c.pe, 1) + ' bar, ' + fmt(c.tEvap, 0) + ' °C' },
            { k: 'High side', v: fmt(c.pc, 1) + ' bar, ' + fmt(c.tCond, 0) + ' °C' },
            { k: 'COP now', v: fmt(c.cop, 2) + ' (max ' + fmt(c.carnot, 1) + ')' },
            { k: 'Cooling when on', v: fmt(c.qCool, 0) + ' W' },
            { k: 'Electricity when on', v: fmt(c.wElec, 0) + ' W' },
            { k: 'Runs', v: fmt(st.duty * 100, 0) + ' % of the time' },
          ];
        },
        caption() { return st.on ? 'Compressor running' : 'Compressor off'; },
        describe() { const c = cyc(); return 'Inside temperature ' + fmt(st.tCab, 1) + ' degrees. The compressor is ' + (st.on ? 'running' : 'off') + '. Coefficient of performance ' + fmt(c.cop, 2) + '.'; },

        draw(g, V, c) {
          drawLoop(g, V, c);
          if (V.thumb) return;
          drawPH(g, V, c);
          drawHist(g, V, c);
        },
      };

      function stepSim(h) {
        const r = Fr.step({ tCab: st.tCab, on: st.on }, h, { setpoint: host.ctl.set, tRoom: host.ctl.room, door: host.ctl.door });
        st.tCab = r.tCab; st.on = r.on; st.cyc = r.cyc; st.leak = r.leak;
        st.t += h;
        st.duty += ((st.on ? 1 : 0) - st.duty) * (h / 3600);
        if (st.t - st.lastHist >= 30) {
          st.lastHist = st.t;
          st.hist.push([st.t, st.tCab, st.on ? 1 : 0]);
          if (st.hist.length > HIST) st.hist.shift();
        }
      }

      function stateColor(c, name) {
        switch (name) {
          case 'evap': case 'mixLow': return c.cold;
          case 'vaporLow': return alpha(c.cold, 0.55);
          case 'vaporHigh': case 'cond': return c.hot;
          case 'liquid': return mix(c.hot, c.ink, 0.45);
          default: return c.ink3;
        }
      }

      function drawLoop(g, V, c) {
        const k = L.scene.k;
        g.save();
        g.translate(L.scene.x, L.scene.y);
        g.scale(k, k);
        const V2 = Object.assign({}, V, { s: V.s * k, px: (n) => n / (V.s * k) });
        const cy = cyc();
        const ink = c.ink;
        const lw = (n) => V2.px(n);

        // cabinet interior and wall
        g.fillStyle = alpha(c.cold, 0.1); g.fillRect(20, 52, 155, 298);
        g.fillStyle = c.paper2; g.fillRect(175, 40, 14, 322);
        hatchRect(g, V2, 175, 40, 14, 322, { gap: 7, color: c.line });
        g.strokeStyle = ink; g.lineWidth = lw(1.8);
        g.strokeRect(175, 40, 14, 322);
        g.beginPath(); g.moveTo(20, 40); g.lineTo(189, 40); g.moveTo(20, 362); g.lineTo(189, 362); g.moveTo(20, 40); g.lineTo(20, 362); g.stroke();
        if (host.ctl.door) { g.setLineDash([V2.px(6), V2.px(4)]); g.strokeStyle = c.bad; g.beginPath(); g.moveTo(20, 40); g.lineTo(20, 362); g.stroke(); g.setLineDash([]); }
        // food
        const food = [[36, 290, 44, 50], [86, 300, 36, 40], [126, 282, 34, 58], [44, 236, 40, 46]];
        food.forEach(([x, y, w, h], i) => { g.fillStyle = alpha([c.good, c.warn, c.hot, c.elec][i], 0.35); g.fillRect(x, y, w, h); g.strokeStyle = ink; g.lineWidth = lw(1.2); g.strokeRect(x, y, w, h); });
        text(g, V2, 'inside ' + fmt(st.tCab, 1) + ' °C', 28, 32, { px: 13, weight: 800, mono: true, color: c.cold });
        text(g, V2, 'room ' + fmt(host.ctl.room, 0) + ' °C', 440, 32, { px: 13, weight: 800, mono: true, align: 'right', color: c.hot });

        // pipes (drawn as a dark outline and a coloured core)
        const drawSeg = (q, col, width) => {
          g.lineCap = 'round';
          g.strokeStyle = ink; g.lineWidth = lw(width + 3.2); g.beginPath(); g.moveTo(q.a[0], q.a[1]); g.lineTo(q.b[0], q.b[1]); g.stroke();
          g.strokeStyle = col; g.lineWidth = lw(width); g.beginPath(); g.moveTo(q.a[0], q.a[1]); g.lineTo(q.b[0], q.b[1]); g.stroke();
          g.lineCap = 'butt';
        };
        SEG.forEach((q) => {
          if (q.state === 'compress' || q.state === 'valve') return;
          let col = stateColor(c, q.state);
          if (q.state === 'evap') { const gr = g.createLinearGradient(0, q.a[1], 0, q.b[1]); gr.addColorStop(0, alpha(c.cold, 0.95)); gr.addColorStop(1, alpha(c.cold, 0.5)); col = gr; }
          if (q.state === 'cond') { const gr = g.createLinearGradient(0, q.a[1], 0, q.b[1]); gr.addColorStop(0, c.hot); gr.addColorStop(1, mix(c.hot, c.ink, 0.45)); col = gr; }
          drawSeg(q, col, 9);
        });
        // coils drawn as zigzags over the straight pipe
        const coil = (x, y1, y2, col, label) => {
          g.strokeStyle = ink; g.lineWidth = lw(2); g.lineJoin = 'round';
          g.beginPath();
          const n = 9;
          for (let i = 0; i <= n; i++) { const y = y1 + ((y2 - y1) * i) / n; const xx = x + (i % 2 ? 15 : -15); if (i === 0) g.moveTo(x, y); else g.lineTo(xx, y); }
          g.lineTo(x, y2); g.stroke();
        };
        coil(100, 330, 92, c.cold); coil(380, 92, 330, c.hot);
        // compressor
        g.beginPath(); g.arc(240, 92, 30, 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill(); g.strokeStyle = ink; g.lineWidth = lw(2.4); g.stroke();
        g.beginPath(); g.moveTo(222, 106); g.lineTo(240, 74); g.lineTo(258, 106); g.stroke();
        text(g, V2, 'compressor', 240, 62 - 8, { px: 11.5, weight: 800, align: 'center' });
        if (st.on) text(g, V2, 'W', 240, 136, { px: 13, weight: 800, align: 'center', color: c.elec, mono: true });
        // expansion valve
        g.beginPath(); g.moveTo(206, 318); g.lineTo(234, 330); g.lineTo(206, 342); g.closePath(); g.moveTo(262, 318); g.lineTo(234, 330); g.lineTo(262, 342); g.closePath();
        g.fillStyle = c.paper2; g.fill(); g.strokeStyle = ink; g.lineWidth = lw(2.2); g.stroke();
        text(g, V2, 'expansion valve', 234, 368, { px: 11.5, weight: 800, align: 'center' });
        text(g, V2, 'evaporator', 100, 392, { px: 11.5, weight: 800, align: 'center', color: c.cold });
        text(g, V2, 'condenser', 436, 354, { px: 11.5, weight: 800, align: 'right', color: c.hot });
        // pressure tags
        text(g, V2, 'low pressure ' + fmt(cy.pe, 1) + ' bar', 100, 408, { px: 11, mono: true, align: 'center', color: c.cold, weight: 700 });
        text(g, V2, 'high pressure ' + fmt(cy.pc, 1) + ' bar', 436, 372, { px: 11, mono: true, align: 'right', color: c.hot, weight: 700 });

        // moving refrigerant
        const N = 44;
        for (let i = 0; i < N; i++) {
          const p = at(st.phase + i / N);
          if (p.state === 'compress' || p.state === 'valve') continue;
          const vapor = p.state === 'vaporLow' || p.state === 'vaporHigh' || (p.state === 'evap' && p.t > 0.45) || (p.state === 'cond' && p.t < 0.5);
          const mixed = p.state === 'mixLow' || (p.state === 'evap' && p.t <= 0.45);
          g.beginPath(); g.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
          if (vapor || (mixed && i % 2)) { g.fillStyle = c.paper2; g.fill(); g.strokeStyle = ink; g.lineWidth = lw(1); g.stroke(); }
          else { g.fillStyle = ink; g.fill(); }
        }

        // heat arrows
        const qIn = st.on ? cy.qCool : 0;
        const aIn = 10 + 26 * clamp(qIn / 260, 0, 1);
        if (st.on) for (const y of [150, 210, 270]) { arrow(g, V2, 40, y, 40 + aIn, y, c.hot, 2.4, 8); arrow(g, V2, 168, y, 168 - aIn, y, c.hot, 2.4, 8); }
        text(g, V2, st.on ? 'heat from the food ' + fmt(qIn, 0) + ' W' : 'compressor off', 28, 50, { px: 10.5, color: c.hot, weight: 700 });
        const qOut = st.on ? cy.qReject : 0;
        const aOut = 10 + 40 * clamp(qOut / 360, 0, 1);
        if (st.on) for (const y of [130, 200, 270]) arrow(g, V2, 404, y, 404 + aOut, y, c.hot, 3, 9);
        if (st.on) text(g, V2, 'heat out', 410 + aOut / 2, 118, { px: 10.5, color: c.hot, weight: 700, align: 'center' });
        if (st.on) text(g, V2, fmt(qOut, 0) + ' W', 410 + aOut / 2, 240, { px: 10.5, color: c.hot, weight: 700, align: 'center', mono: true });
        // leak through the walls
        const leakW = st.leak;
        for (const y of [72, 346]) arrow(g, V2, 228 - 40, y, 192, y, alpha(c.hot, 0.8), 1.6, 6);
        text(g, V2, 'leak in ' + fmt(leakW, 0) + ' W', 168, 66, { px: 10.5, color: c.ink2, align: 'right', mono: true, halo: false });
        g.restore();
      }

      function drawPH(g, V, c) {
        const b = L.ph;
        text(g, V, 'Pressure (bar) against enthalpy (R-134a)', b.x, b.y + 10, { px: 12, weight: 700, halo: false });
        const x0 = b.x + 38, y0 = b.y + 22, w = b.w - 48, h = b.h - 50;
        const H0 = 140, H1 = 460, P0 = Math.log10(1), P1 = Math.log10(30);
        const X = (hh) => x0 + ((hh - H0) / (H1 - H0)) * w;
        const Y = (p) => y0 + h - ((Math.log10(p) - P0) / (P1 - P0)) * h;
        g.fillStyle = alpha(c.paper2, 0.9); g.fillRect(x0, y0, w, h);
        for (const p of [1, 2, 5, 10, 20]) { line(g, V, x0, Y(p), x0 + w, Y(p), alpha(c.ink, 0.1), 1); text(g, V, String(p), x0 - 5, Y(p) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); }
        for (const hh of [200, 300, 400]) { line(g, V, X(hh), y0, X(hh), y0 + h, alpha(c.ink, 0.1), 1); text(g, V, String(hh), X(hh), y0 + h + 13, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false }); }
        g.strokeStyle = c.ink; g.lineWidth = V.px(1.5); g.strokeRect(x0, y0, w, h);
        text(g, V, 'enthalpy, kJ/kg', x0 + w, y0 + h + 28, { px: 10.5, color: c.ink2, align: 'right', halo: false });
        // saturation dome
        g.strokeStyle = c.ink2; g.lineWidth = V.px(1.8); g.beginPath();
        let first = true;
        for (let T = -30; T <= 80; T += 5) { const x = X(Fr.hf(T)), y = Y(Fr.psat(T)); if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y); }
        for (let T = 80; T >= -30; T -= 5) g.lineTo(X(Fr.hg(T)), Y(Fr.psat(T)));
        g.stroke();
        text(g, V, 'liquid', X(146), Y(24), { px: 10.5, color: c.ink2, halo: false });
        text(g, V, 'vapour', X(456), Y(1.25), { px: 10.5, color: c.ink2, halo: false, align: 'right' });
        // the cycle
        const cy = cyc();
        const pts = [[cy.h1, cy.pe], [cy.h2, cy.pc], [cy.h3, cy.pc], [cy.h4, cy.pe]];
        g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])))); g.closePath();
        g.fillStyle = alpha(c.accent, 0.35); g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2.4); g.stroke();
        pts.forEach((p, i) => {
          g.beginPath(); g.arc(X(p[0]), Y(p[1]), V.px(5), 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill(); g.stroke();
          const off = [[8, 14], [8, -6], [-10, -6], [-12, 14]][i];
          text(g, V, String(i + 1), X(p[0]) + off[0], Y(p[1]) + off[1], { px: 12, weight: 800, mono: true });
        });
        const tags = [['1  evaporator out', cy.h1 + 4, cy.pe * 0.8], ['compressor', (cy.h1 + cy.h2) / 2 + 18, (cy.pe * cy.pc) ** 0.5 * 0.92]];
        text(g, V, 'compressor adds h', X(cy.h2) - 4, Y(cy.pc) - 8, { px: 10, color: c.ink2, align: 'right', halo: false });
        text(g, V, 'valve', X(cy.h3) + 6, Y((cy.pe * cy.pc) ** 0.5), { px: 10, color: c.ink2, halo: false });
        text(g, V, 'heat in', X((cy.h4 + cy.h1) / 2), Y(cy.pe) + 14, { px: 10, color: c.ink2, align: 'center', halo: false });
        void tags;
      }

      function drawHist(g, V, c) {
        const b = L.hist;
        text(g, V, 'Inside temperature (°C), last 3 hours', b.x, b.y + 10, { px: 12, weight: 700, halo: false });
        const x0 = b.x + 34, y0 = b.y + 20, w = b.w - 42, h = b.h - 46;
        const T0 = 0, T1 = 20;
        const Y = (t) => y0 + h - ((t - T0) / (T1 - T0)) * h;
        g.fillStyle = alpha(c.paper2, 0.9); g.fillRect(x0, y0, w, h);
        g.fillStyle = alpha(c.good, 0.2); g.fillRect(x0, Y(host.ctl.set + 1), w, Y(host.ctl.set - 1) - Y(host.ctl.set + 1));
        for (const t of [0, 5, 10, 15, 20]) { line(g, V, x0, Y(t), x0 + w, Y(t), alpha(c.ink, 0.1), 1); text(g, V, String(t), x0 - 5, Y(t) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); }
        g.strokeStyle = c.ink; g.lineWidth = V.px(1.5); g.strokeRect(x0, y0, w, h);
        const hs = st.hist;
        if (hs.length > 1) {
          const tEnd = hs[hs.length - 1][0], tStart = tEnd - HIST * 30;
          const X = (t) => x0 + ((t - tStart) / (HIST * 30)) * w;
          // compressor-on shading
          g.fillStyle = alpha(c.hot, 0.28);
          for (let i = 0; i < hs.length - 1; i++) if (hs[i][2]) g.fillRect(X(hs[i][0]), y0 + h - 7, Math.max(1, X(hs[i + 1][0]) - X(hs[i][0])), 7);
          g.strokeStyle = c.cold; g.lineWidth = V.px(2.2); g.lineJoin = 'round'; g.beginPath();
          hs.forEach((p, i) => { const x = X(p[0]), y = Y(clamp(p[1], T0, T1)); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
          g.stroke();
        }
        text(g, V, 'green band: the thermostat range', x0 + 6, y0 + 14, { px: 10, color: c.good, weight: 700, halo: false });
        text(g, V, 'orange strip: compressor on', x0 + w - 4, y0 + h + 16, { px: 10, color: c.hot, weight: 700, align: 'right', halo: false });
        text(g, V, 'sped up ×' + WARP, x0 + 2, y0 + h + 16, { px: 10, color: c.ink2, halo: false });
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
