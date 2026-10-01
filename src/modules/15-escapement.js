(function (root) {
  'use strict';
  const OM = root.OM;
  const Es = OM.escapement;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, alpha, pairBars, plotFrame } = OM.gfx;

  const DEG = Es.DEG;
  const S = 100; // drawing pixels per wheel radius
  const CX = 200, CY = 272; // centre of the escape wheel in the scene
  const A_FULL = 6 * DEG; // swing held by 100 percent drive
  const D_FULL = Es.driveFor(A_FULL);
  const WINDOW = 8; // seconds shown in the swing chart
  const GRAV = { earth: 9.80665, mars: 3.71, moon: 1.62, jupiter: 24.79 };
  const STONES = [Es.stonePolygon('left'), Es.stonePolygon('right')];

  const wp = (p) => [CX + p.x * S, CY - p.y * S];

  OM.register({
    id: 'escapement',
    title: 'Pendulum clock escapement',
    group: 'machines',
    hook: 'A swinging pendulum lets a toothed wheel go forward one notch at a time, and pays for it with a tiny push each swing.',
    units: 's, m, degrees, mJ',
    alt: 'A deadbeat clock escapement: a 30-tooth escape wheel, a two-pallet anchor rocking with a pendulum below it, and charts of the swing against time, how the period grows with swing size, and the energy pushed in against lost each swing.',
    controls: [
      { id: 'len', type: 'range', label: 'Pendulum length', min: 0.25, max: 2, step: 0.005, value: 0.995, dec: 3, unit: 'm' },
      { id: 'where', type: 'seg', label: 'Where is the clock?', value: 'earth', options: [{ v: 'earth', l: 'Earth' }, { v: 'mars', l: 'Mars' }, { v: 'moon', l: 'Moon' }, { v: 'jupiter', l: 'Jupiter' }] },
      { id: 'mass', type: 'range', label: 'Bob mass', min: 0.2, max: 10, step: 0.1, value: 2, dec: 1, unit: 'kg' },
      { id: 'drive', type: 'range', label: 'Drive (weight or spring)', min: 0, max: 100, step: 5, value: 45, unit: '%' },
      { id: 'sound', type: 'toggle', label: 'Sound: tick and tock', value: false, hint: 'A short click on every beat. Off until you switch it on.' },
      { id: 'kick', type: 'button', label: 'Give the pendulum a push', hint: 'A clock has to be started by hand, and so does this one after it has run down.' },
    ],
    content: {
      intro: 'A falling weight or an unwinding spring would spin the clock wheels in a few seconds. The escapement holds the wheel back and lets it go one notch at a time, timed by a pendulum. In return the wheel gives the pendulum a small push on every swing, so the swing never dies out.',
      steps: [
        { h: 'Locked', p: 'One pallet holds a tooth of the escape wheel. The wheel is pulled on by the weight but cannot move, and the pendulum swings freely with nothing but gravity acting on it.' },
        { h: 'Released', p: 'As the pendulum passes the middle of its swing, the pallet slides off the end of its locking face and the wheel is free to turn.' },
        { h: 'Impulse', p: 'The tooth slides down the slanted impulse face. The wheel moves on, and the pallet is pushed the same way the pendulum is already going. That push is the energy that keeps the clock running.' },
        { h: 'Caught', p: 'The other pallet has swung into the wheel. The next tooth drops onto it and stops dead. That drop is the tick, and one full swing has two ticks.' },
      ],
      principle: {
        lead: 'The pendulum is the timekeeper. The escapement is only a gate that counts its swings and tops up its energy. The period depends on the length and on gravity, and on almost nothing else.',
        eqs: [
          { label: 'Period for a small swing', eq: 'T~0~ = 2π √(L / g)', note: 'L is the distance from the pivot to the centre of the bob. The mass does not appear. A pendulum 0.994 m long on Earth has T = 2 s, one tick a second.' },
          { label: 'Period for any swing', eq: 'T = T~0~ / AGM(1, cos(A/2))', note: 'A is the amplitude, and AGM is the arithmetic-geometric mean. For small swings this is T₀ (1 + A²/16): a wider swing is a slower swing.' },
          { label: 'Energy balance', eq: 'energy pushed in per swing = energy lost per swing', note: 'The bars in the drawing are that balance. The swing grows or shrinks until the two are equal.' },
          { label: 'The wheel', eq: 'the wheel turns once every N × T', note: 'The wheel moves on one tooth for each full swing (two ticks). With N = 30 teeth and T = 2 s, that is 60 seconds, so a seconds hand can sit on its shaft.' },
        ],
        points: [
          'The locking faces are arcs centred on the anchor pivot. The locked wheel therefore pushes straight at the pivot and gives no push and no recoil. This is the Graham dead-beat escapement. The slanted impulse faces in the picture are worked out from the path the tooth tip takes across the anchor.',
          'Accuracy depends on the swing. A bigger swing is slightly slower, so a clock whose swing changes (a tired spring, thicker oil) changes its rate. Between 3° and 4° the difference is about 11 seconds a day.',
          '**What this model leaves out:** the rod and bob are treated as a single point mass, and there is no temperature expansion, suspension spring, friction at the pallets, or bounce when the wheel drops. The drag is exaggerated so that the swing settles in under a minute. A real clock is many times less damped and takes much longer to settle.',
        ],
      },
      myth: {
        claim: 'A heavier pendulum swings more slowly.',
        truth: 'The period does not depend on the mass at all. Gravity pulls harder on a heavy bob, but it is harder to move, and the two cancel exactly. Try it with the mass slider. A heavy bob does help a real clock in another way: it stores more energy, so the small pushes and puffs of air disturb it less.',
      },
      tries: [
        { label: 'Seconds pendulum', text: 'About one metre gives a two-second swing and one tick a second.', set: { len: 0.995, where: 'earth', mass: 2, drive: 45 } },
        { label: 'Short and quick', text: 'A quarter of the length gives half the period.', set: { len: 0.25, where: 'earth', drive: 45 } },
        { label: 'On the Moon', text: 'With a sixth of the gravity the same pendulum takes about 2.5 times as long.', set: { len: 0.995, where: 'moon', drive: 45 } },
        { label: 'Heaviest bob', text: 'Ten kilograms instead of two, and the period does not move.', set: { len: 0.995, where: 'earth', mass: 10, drive: 45 } },
        { label: 'Wide swing', text: 'Full drive: a bigger swing, and a clock that loses minutes a day.', set: { len: 0.995, where: 'earth', drive: 100 } },
        { label: 'Let it run down', text: 'With no drive the swing dies away until it is too small to release the wheel.', set: { len: 0.995, where: 'earth', drive: 0 } },
      ],
      quiz: [
        { q: 'You make the pendulum four times longer. What happens to the period?', opts: ['It stays the same', 'It doubles', 'It quadruples', 'It halves'], a: 1, why: 'The period goes with the square root of the length, and the square root of 4 is 2.' },
        { q: 'Which of these does not change the period of a small swing?', opts: ['The length of the pendulum', 'The strength of gravity', 'The mass of the bob', 'All three change it'], a: 2, why: 'Mass cancels out: a heavier bob is pulled harder but is also harder to move.' },
        { q: 'Why does the escapement push the pendulum a little on every swing?', opts: ['To make it swing faster', 'To replace the energy lost to air and friction', 'To keep the wheel from turning', 'To make the tick louder'], a: 1, why: 'Without the push, drag would wear the swing away. The escapement gives back exactly what is lost, and the swing settles where the two are equal.' },
      ],
      era: 'Huygens, 1657',
      level: 4,
      parts: [
        { name: 'Pendulum', note: 'The timekeeper. Its length and gravity fix the beat.' },
        { name: 'Anchor and pallets', note: 'Rock with the pendulum. The pallets hold the wheel and then let it go.' },
        { name: 'Escape wheel', note: 'Has 30 teeth here. It moves on half a tooth for every beat.' },
        { name: 'Drive', note: 'A falling weight or a spring. It turns the wheel and, through the pallets, pushes the pendulum.' },
      ],
      facts: [
        'Christiaan Huygens patented the first pendulum clock in 1657. It cut the error of a good clock from about 15 minutes a day to about 15 seconds.',
        'A pendulum about 0.994 m long beats seconds, which is why longcase clocks are so tall: the pendulum needs a metre to hang.',
        'Big Ben is kept to time by adding or taking away old pennies on its pendulum. One penny changes the rate by two fifths of a second a day.',
        'The dead-beat escapement drawn here was worked out by Richard Towneley around 1675 and made famous by George Graham in 1715.',
      ],
      sources: [
        'M. V. Headrick, *Clock and Watch Escapement Mechanics* (1997), on the Graham dead-beat escapement.',
        'R. A. Nelson and M. G. Olsson, "The pendulum: rich physics from a simple system", *American Journal of Physics* 54, 112 (1986).',
        'Christiaan Huygens, *Horologium* (1658), which describes the first pendulum clock, patented in 1657.',
      ],
    },

    create(host) {
      const st = { c: null, hist: [], lastHist: 0, flash: 0, heard: 0 };
      let L = null;

      const grav = () => GRAV[host.ctl.where] || Es.G_EARTH;
      const drive = () => D_FULL * (host.ctl.drive / 100);
      const w0 = () => Math.sqrt(grav() / host.ctl.len);
      const sync = () => { st.c.L = host.ctl.len; st.c.g = grav(); };
      const stopped = () => Math.abs(st.c.th) < st.c.p.thetaI && st.c.amp < st.c.p.thetaI * 0.98;

      function restart() {
        st.c = Es.create(host.ctl.len, grav());
        const a0 = Math.max(Es.steadyAmplitude(drive()), 0);
        st.c.th = a0 >= st.c.p.thetaI ? a0 : 0;
        st.c.amp = a0;
        st.c.side = st.c.th >= 0 ? 1 : -1;
        st.hist = []; st.lastHist = 0;
        if (a0 >= st.c.p.thetaI) for (let i = 0; i < 1500; i++) Es.step(st.c, 0.01, drive());
        st.c.t = 0;
        st.hist = []; st.lastHist = 0;
        st.heard = st.c.beats;
      }

      const sim = {
        ref: { w: 780, h: 560 },
        refNarrow: { w: 420, h: 1060 },
        state: st,
        stepSize: 0.1,
        init() { restart(); },
        layout(V) {
          L = V.narrow
            ? { scene: { x: 10, y: 0 }, swing: { x: 14, y: 560, w: 392, h: 150 }, per: { x: 14, y: 720, w: 392, h: 170 }, bars: { x: 20, y: 920, w: 380 } }
            : { scene: { x: 0, y: 0 }, swing: { x: 420, y: 10, w: 350, h: 170 }, per: { x: 420, y: 196, w: 350, h: 190 }, bars: { x: 430, y: 430, w: 330 } };
        },
        step(dt) {
          sync();
          Es.step(st.c, dt, drive());
          if (st.c.beats !== st.heard) {
            if (host.ctl.sound && OM.audio) OM.audio.tick(st.c.beats % 2 ? 1 : 0.8, 0.7, 40);
            st.heard = st.c.beats;
          }
          st.flash = Math.max(0, st.flash - dt);
          if (st.c.tick < dt + 1e-9) st.flash = 0.18;
          st.lastHist += dt;
          if (st.lastHist >= 1 / 30) {
            st.lastHist = 0;
            st.hist.push({ t: st.c.t, th: st.c.th, b: st.c.beats });
            while (st.hist.length && st.c.t - st.hist[0].t > WINDOW + 0.5) st.hist.shift();
          }
        },
        action(id) {
          if (id !== 'kick') return;
          const dir = st.c.w >= 0 ? 1 : -1;
          st.c.w += dir * 0.14 * w0();
        },
        thumb() {
          st.c = Es.create(host.ctl.len, grav());
          st.c.amp = 6 * DEG;
          st.c.th = 0.9 * DEG; st.c.side = 1; st.c.u = (st.c.p.thetaI - st.c.th) / (2 * st.c.p.thetaI);
        },
        onControl(id, v) { if (id === 'drive' || id === 'where' || id === 'len') sync(); if (id === 'sound' && v && OM.audio) OM.audio.prime(); },
        phase() {
          if (stopped()) return 0;
          const c = st.c;
          if (c.tick < 0.12) return 3;
          if (Math.abs(c.th) < c.p.thetaI) return c.u < 0.25 ? 1 : 2;
          return 0;
        },
        readouts() {
          const c = st.c;
          const T = Es.period(host.ctl.len, grav(), Math.max(c.amp, 1e-4));
          const A = c.amp / DEG;
          const lost = Es.secondsLostPerDay(c.amp);
          const m = host.ctl.mass, l = host.ctl.len;
          return [
            { k: 'Period', v: fmt(T, 3) + ' s' },
            { k: 'One tick every', v: fmt(T / 2, 3) + ' s' },
            { k: 'Swing (each side)', v: fmt(A, 1) + '°', tone: stopped() ? 'bad' : A < 2.6 ? 'warn' : '' },
            { k: 'Slower than a tiny swing by', v: fmt(lost, 0) + ' s a day' },
            { k: 'Wheel turns once every', v: fmt(Es.TEETH * T, 0) + ' s' },
            { k: 'Pushed in per swing', v: fmt(c.lastIn * m * l * l * 1000, 2) + ' mJ' },
            { k: 'Lost per swing', v: fmt(c.lastOut * m * l * l * 1000, 2) + ' mJ' },
          ];
        },
        caption() {
          if (stopped()) return 'Stopped: the swing is too small to release the wheel';
          return ['Wheel locked, pendulum swinging', 'Pallet letting go', 'Impulse: the tooth pushes the pallet', 'Tick: the next tooth drops onto the pallet'][sim.phase()];
        },
        describe() {
          const c = st.c;
          return stopped()
            ? 'The clock has stopped. The swing is smaller than the escapement arc.'
            : 'Period ' + fmt(Es.period(host.ctl.len, grav(), c.amp), 2) + ' seconds, swing ' + fmt(c.amp / DEG, 1) + ' degrees on each side.';
        },

        draw(g, V, c) {
          drawScene(g, V, c);
          if (V.thumb) return;
          drawSwing(g, V, c);
          drawPeriod(g, V, c);
          drawBars(g, V, c);
        },
      };

      // ------------------------------------------------------------ scene
      function drawScene(g, V, c) {
        const cl = st.c;
        const th = cl.th;
        const ink = c.ink;
        g.save();
        g.translate(L.scene.x, L.scene.y);
        const piv = wp(Es.PIV);
        const lw = (n) => V.px(n);

        // pendulum: rod and bob, behind the wheel
        const Lpx = 235 + ((host.ctl.len - 0.25) / 1.75) * 110;
        const r = 10 + 6 * Math.cbrt(host.ctl.mass);
        g.save();
        g.translate(piv[0], piv[1]);
        g.rotate(-th); // canvas rotation is clockwise, theta is counter-clockwise
        g.strokeStyle = c.ink2; g.lineWidth = lw(3); g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, Lpx); g.stroke();
        g.beginPath(); g.arc(0, Lpx + r, r, 0, Math.PI * 2);
        g.fillStyle = c.hot; g.fill(); g.strokeStyle = ink; g.lineWidth = lw(2); g.stroke();
        g.beginPath(); g.moveTo(-r * 0.6, Lpx + r); g.lineTo(r * 0.6, Lpx + r); g.strokeStyle = alpha(ink, 0.6); g.lineWidth = lw(1.2); g.stroke();
        g.restore();

        // escape wheel: thin leaning teeth on a ring with open spokes
        const phi = Es.wheelAngle(cl);
        const teeth = Es.TEETH, pitch = Es.PITCH, TH = Es.TOOTH;
        const polar = (r, a) => [CX + r * Math.cos(a) * S, CY - r * Math.sin(a) * S];
        g.beginPath();
        for (let i = 0; i < teeth; i++) {
          const a = Es.LOCK_A + i * pitch - phi;
          const r1 = polar(TH.root, a - TH.lead * pitch), tip = polar(1, a), r2 = polar(TH.root, a + TH.trail * pitch);
          if (i) g.lineTo(r1[0], r1[1]); else g.moveTo(r1[0], r1[1]);
          g.lineTo(tip[0], tip[1]);
          g.lineTo(r2[0], r2[1]);
        }
        g.closePath();
        g.moveTo(CX + 0.62 * S, CY);
        g.arc(CX, CY, 0.62 * S, 0, Math.PI * 2, true);
        g.fillStyle = c.metal2; g.fill('evenodd');
        g.strokeStyle = ink; g.lineWidth = lw(1.6); g.lineJoin = 'round'; g.stroke();
        g.beginPath(); g.arc(CX, CY, 0.62 * S, 0, Math.PI * 2); g.lineWidth = lw(1.4); g.stroke();
        // spokes turn with the wheel
        g.strokeStyle = ink; g.lineWidth = lw(3.4); g.lineCap = 'butt';
        for (let k = 0; k < 5; k++) {
          const a = -phi + (k / 5) * Math.PI * 2 + 0.3;
          g.beginPath(); g.moveTo(CX + 0.2 * S * Math.cos(a), CY - 0.2 * S * Math.sin(a)); g.lineTo(CX + 0.62 * S * Math.cos(a), CY - 0.62 * S * Math.sin(a)); g.stroke();
        }
        g.beginPath(); g.arc(CX, CY, 0.22 * S, 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill(); g.lineWidth = lw(2); g.stroke();
        g.beginPath(); g.arc(CX, CY, 3.5, 0, Math.PI * 2); g.fillStyle = ink; g.fill();

        // anchor: two arms and two thin pallet stones, riding on the pendulum
        const tw = (q) => wp(Es.anchorToWorld(q, th));
        g.lineCap = 'round'; g.lineJoin = 'round';
        STONES.forEach((poly) => {
          const a = poly[0], b = poly[poly.length - 1];
          const e = tw({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          g.strokeStyle = ink; g.lineWidth = lw(8.5);
          g.beginPath(); g.moveTo(piv[0], piv[1]); g.lineTo(e[0], e[1]); g.stroke();
          g.strokeStyle = c.metal; g.lineWidth = lw(5.5);
          g.beginPath(); g.moveTo(piv[0], piv[1]); g.lineTo(e[0], e[1]); g.stroke();
        });
        STONES.forEach((poly) => {
          g.beginPath();
          poly.forEach((q, i) => { const p = tw(q); if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
          g.closePath();
          g.fillStyle = c.accent; g.fill();
          g.strokeStyle = ink; g.lineWidth = lw(1.6); g.stroke();
        });
        g.beginPath(); g.arc(piv[0], piv[1], 7, 0, Math.PI * 2); g.fillStyle = c.paper2; g.fill(); g.lineWidth = lw(2); g.strokeStyle = ink; g.stroke();
        g.beginPath(); g.arc(piv[0], piv[1], 2.5, 0, Math.PI * 2); g.fillStyle = ink; g.fill();

        // a flash where the tooth lands
        if (st.flash > 0 && !V.thumb) {
          const lock = cl.side === 1 ? Es.tipAt(Es.LOCK_A) : Es.tipAt(Es.LOCK_B);
          const p = wp(lock);
          g.strokeStyle = alpha(c.bad, st.flash / 0.18); g.lineWidth = lw(3);
          g.beginPath(); g.arc(p[0], p[1], V.px(10 + (0.18 - st.flash) * 90), 0, Math.PI * 2); g.stroke();
        }

        // labels
        if (!V.thumb) {
          text(g, V, 'anchor', piv[0] + 14, piv[1] - 10, { px: 11, color: c.ink2, halo: false });
          text(g, V, 'escape wheel', CX - 1.08 * S, CY - 0.25 * S, { px: 11, color: c.ink2, halo: false, align: 'right' });
          text(g, V, 'pendulum', 12, CY + S + 34, { px: 11, color: c.ink2, halo: false });
          text(g, V, 'length ' + fmt(host.ctl.len, 3) + ' m', 12, CY + S + 49, { px: 11, mono: true, color: c.ink2, halo: false });
          text(g, V, 'bob ' + fmt(host.ctl.mass, 1) + ' kg', 12, CY + S + 64, { px: 11, mono: true, color: c.ink2, halo: false });
        }
        g.restore();
      }

      // ----------------------------------------------------------- charts
      function drawSwing(g, V, c) {
        const f = plotFrame(g, V, c, L.swing, 'Swing angle against time, degrees', 'last 8 seconds', '');
        const cl = st.c;
        const AX = 12; // degrees, top of the axis
        const t1 = cl.t, t0 = t1 - WINDOW;
        const X = (t) => f.x0 + ((t - t0) / WINDOW) * f.w;
        const Y = (d) => f.y0 + f.h / 2 - (d / AX) * (f.h / 2 - 3);
        const zi = cl.p.thetaI / DEG;
        g.fillStyle = alpha(c.accent, 0.22);
        g.fillRect(f.x0, Y(zi), f.w, Y(-zi) - Y(zi));
        text(g, V, 'wheel released', f.x0 + 4, Y(zi) - 3, { px: 10, color: c.ink2, halo: false });
        line(g, V, f.x0, Y(0), f.x0 + f.w, Y(0), c.ink2, 1, [4, 3]);
        for (const d of [10, 0, -10]) { line(g, V, f.x0 - 4, Y(d), f.x0, Y(d), c.ink, 1); text(g, V, fmt(d, 0), f.x0 - 6, Y(d) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); }
        // ticks
        let prevB = st.hist.length ? st.hist[0].b : 0;
        g.strokeStyle = c.bad; g.lineWidth = V.px(1.4);
        st.hist.forEach((hh) => {
          if (hh.b !== prevB) {
            const x = X(hh.t);
            if (x >= f.x0) { g.beginPath(); g.moveTo(x, f.y0 + f.h - 10); g.lineTo(x, f.y0 + f.h); g.stroke(); }
            prevB = hh.b;
          }
        });
        g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.beginPath();
        let started = false;
        st.hist.forEach((hh) => {
          const x = X(hh.t);
          if (x < f.x0) return;
          const y = Y(clamp(hh.th / DEG, -AX, AX));
          if (started) g.lineTo(x, y); else { g.moveTo(x, y); started = true; }
        });
        g.lineTo(X(t1), Y(clamp(cl.th / DEG, -AX, AX)));
        g.stroke();
        g.beginPath(); g.arc(X(t1), Y(clamp(cl.th / DEG, -AX, AX)), V.px(5.5), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
        text(g, V, 'tick', f.x0 + f.w, f.y0 + f.h - 12, { px: 10, color: c.bad, weight: 700, align: 'right', halo: false });
        text(g, V, 'pendulum right of centre = +', f.x0 + f.w - 4, f.y0 + 11, { px: 10, color: c.ink2, align: 'right', halo: false });
      }

      function drawPeriod(g, V, c) {
        const f = plotFrame(g, V, c, L.per, 'Wider swing, slower swing: period change, %', 'swing each side, degrees', '');
        const AMAX = 40, RMAX = 1.06;
        const X = (a) => f.x0 + (a / AMAX) * f.w;
        const Y = (r) => f.y0 + f.h - ((r - 1) / (RMAX - 1)) * f.h;
        for (const a of [0, 10, 20, 30, 40]) { line(g, V, X(a), f.y0 + f.h, X(a), f.y0 + f.h + 4, c.ink, 1); text(g, V, String(a), X(a), f.y0 + f.h + 15, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false }); }
        for (const r of [1, 1.03, 1.06]) { line(g, V, f.x0 - 4, Y(r), f.x0, Y(r), c.ink, 1); text(g, V, fmt((r - 1) * 100, 0) + '%', f.x0 - 6, Y(r) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); }
        line(g, V, f.x0, Y(1), f.x0 + f.w, Y(1), c.ink2, 1, [4, 3]);
        text(g, V, 'tiny swing', f.x0 + f.w - 4, Y(1) - 5, { px: 10, color: c.ink2, align: 'right', halo: false });
        g.strokeStyle = c.cold; g.lineWidth = V.px(2.4); g.beginPath();
        for (let a = 0; a <= AMAX; a += 1) { const r = Es.periodRatio(a * DEG); if (a) g.lineTo(X(a), Y(r)); else g.moveTo(X(a), Y(r)); }
        g.stroke();
        const a = clamp(st.c.amp / DEG, 0, AMAX);
        const r = Es.periodRatio(a * DEG);
        g.beginPath(); g.arc(X(a), Y(r), V.px(6), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(2); g.stroke();
        text(g, V, 'period +' + fmt((r - 1) * 100, 2) + '%', X(a) + 10, Y(r) - 10, { px: 11, mono: true, weight: 700 });
      }

      function drawBars(g, V, c) {
        const cl = st.c, m = host.ctl.mass, l = host.ctl.len;
        const a = cl.lastIn * m * l * l * 1000, b = cl.lastOut * m * l * l * 1000;
        text(g, V, 'Energy in each half swing', L.bars.x, L.bars.y - 4, { px: 12, weight: 700, halo: false });
        pairBars(g, V, c, L.bars.x, L.bars.y + 6, L.bars.w, [
          { label: 'balance', a: { v: Math.max(a, 1e-9), text: fmt(a, 2) + ' mJ', color: c.cold, name: 'in' }, b: { v: Math.max(b, 1e-9), text: fmt(b, 2) + ' mJ', color: c.hot, name: 'lost' } },
        ], 54);
        text(g, V, 'in = from the drive, lost = to air drag. Equal when the swing has settled.', L.bars.x, L.bars.y + 72, { px: 10.5, color: c.ink2, halo: false });
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
