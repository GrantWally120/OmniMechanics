(function (root) {
  'use strict';
  const OM = root.OM;
  const Wa = OM.water;
  const { clamp, fmt } = OM.util;
  const { text, line, arrow, alpha, mix, plotFrame } = OM.gfx;

  const Z_MAX = 3000; // m, top of the height scale
  const N_PART = 95;
  const N_DROP = 46;
  const hash = (i, k) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

  OM.register({
    id: 'water',
    title: 'The water cycle over a mountain',
    group: 'heat',
    hook: 'Sunlight lifts water off the sea, a mountain wrings it out as rain, and the air on the far side comes down warm and dry.',
    units: '°C, m, mm per day, g per kg',
    alt: 'A side view of the sea, a coast and a mountain. Vapour rises from the sea and is carried up the windward slope, where a cloud forms above a dashed cloud-base line and rain falls and runs back to the sea in a river. The far side is dry. Below are a chart of the air temperature against height and bars showing how much water the air holds at the coast and at the crest.',
    controls: [
      { id: 'sea', type: 'range', label: 'Sea temperature', min: 5, max: 35, step: 1, value: 26, unit: '°C' },
      { id: 'rh', type: 'range', label: 'Humidity of the air off the sea', min: 50, max: 100, step: 1, value: 80, unit: '%' },
      { id: 'wind', type: 'range', label: 'Wind speed', min: 2, max: 15, step: 1, value: 7, unit: 'm/s' },
      { id: 'ridge', type: 'range', label: 'Mountain height', min: 0, max: 3000, step: 100, value: 1800, unit: 'm' },
    ],
    content: {
      intro: 'Water never leaves the Earth. The Sun lifts it off the sea as invisible vapour, rising air cools it into cloud, rain brings it down, and rivers carry it home. This drawing follows one stream of air from the sea, up a mountain and down the far side, and puts numbers on every step.',
      steps: [
        { h: 'Evaporation', p: 'Sunlight gives water molecules at the surface enough energy to escape as vapour. It takes about 2.5 megajoules to evaporate a kilogram of sea water, which is why evaporation cools the sea. About 90 percent of the water vapour in the air comes from oceans, lakes and rivers, and the rest from plants.' },
        { h: 'Rising and cooling', p: 'The wind forces the damp air up the slope. Higher up the pressure is lower, so the air expands and cools, by about 9.8 °C for every kilometre while it is unsaturated.' },
        { h: 'Condensation', p: 'Once the air has cooled to its dew point it can hold no more vapour. The vapour condenses on tiny specks into cloud droplets, and gives back the heat that evaporation took in. The air now cools more slowly, by about 4 to 6.5 °C per kilometre.' },
        { h: 'Rain and return', p: 'Droplets join until they are heavy enough to fall. The rain runs down the slope in rivers to the sea. The air, now drier and warmed by the heat that was released, sinks on the far side and warms again at 9.8 °C per kilometre.' },
      ],
      principle: {
        lead: 'The water cycle is a heat engine run by sunlight. Evaporation stores heat in the vapour, condensation releases it high up, and gravity returns the water.',
        eqs: [
          { label: 'Evaporation from the sea', eq: 'E = ρ C~E~ U (q~s~ − q~a~)', note: 'U is the wind speed. q_s is the vapour the air could hold right at the sea surface and q_a what it already holds. C_E is about 1.2 × 10⁻³. Double the wind and the evaporation doubles.' },
          { label: 'How much air can hold', eq: 'e~s~ = 6.11 exp( 17.6 T / (T + 243) ) hPa', note: 'Warm air holds much more vapour: about 7 percent more for every degree. This is the Clausius–Clapeyron relation.' },
          { label: 'Height of the cloud base', eq: 'z ≈ 125 (T − T~d~)', note: 'z in metres, with the air temperature T and the dew point T_d in °C. The drawing uses the more exact Bolton formula, which agrees to a few percent.' },
          { label: 'Heat released by condensation', eq: 'ΔT = L~v~ Δq / c~p~', note: 'Each gram of vapour that condenses in a kilogram of air warms that air by about 2.5 °C. This is why the far side of the mountain is warmer.' },
        ],
        points: [
          'The chart shows the air\'s temperature against height. The dashed grey line is where the air would be if no cloud formed. The gap at the crest is the heat released by condensation, and that same heat is what warms the air on the far side.',
          'The air that comes down the far side has lost its water but kept the heat, and so it is warm and dry. This is the **rain shadow**, and it is why deserts lie behind many mountain ranges.',
          '**What this model leaves out:** only a 400 m layer of air is lifted, and 60 percent of the water that condenses on the way to the crest falls as rain over a 40 km slope. The other 40 percent evaporates again on the way down the far side, which cools the sinking air a little. Real rain is patchy and varies a lot from place to place. Snow, plants, groundwater and the sea itself cooling are not modelled.',
        ],
      },
      myth: {
        claim: 'Clouds are made of water vapour.',
        truth: 'Water vapour is an invisible gas, like the rest of the air. A cloud is made of tiny liquid droplets (or ice crystals), which form only once the vapour has condensed. The white "steam" above a kettle is the same thing: droplets, a little way from the spout where the vapour has cooled.',
      },
      tries: [
        { label: 'Warm tropical sea', text: 'A warm sea, damp air and a tall mountain: heavy rain.', set: { sea: 30, rh: 85, wind: 8, ridge: 2500 } },
        { label: 'Cold sea', text: 'Less than a third of the evaporation, and noticeably less rain.', set: { sea: 8, rh: 80, wind: 7, ridge: 1800 } },
        { label: 'Low hills', text: 'The hills are below the cloud base, so there is no cloud and no rain.', set: { sea: 26, rh: 80, wind: 7, ridge: 300 } },
        { label: 'Dry air', text: 'With 50 percent humidity the cloud base is about 1.4 km up. A 1.8 km ridge barely reaches it.', set: { sea: 26, rh: 50, wind: 7, ridge: 1800 } },
        { label: 'Big mountain', text: 'The tallest ridge: most rain, and the hottest, driest air on the far side.', set: { sea: 26, rh: 80, wind: 7, ridge: 3000 } },
        { label: 'Gale', text: 'Double the wind: double the evaporation and double the rain.', set: { sea: 26, rh: 80, wind: 14, ridge: 1800 } },
      ],
      quiz: [
        { q: 'Why does the cloud start partway up the slope and not at the sea?', opts: ['The air has to rise and cool to its dew point first', 'The mountain is colder than the sea', 'Clouds only form over land', 'Sea water does not evaporate'], a: 0, why: 'Air at the sea is not cool enough to be saturated. It has to rise, expand and cool until it reaches the dew point, which for these conditions is a few hundred metres up.' },
        { q: 'What happens to the heat taken up when the sea water evaporated?', opts: ['It is lost for good', 'It is released again when the vapour condenses into cloud', 'It warms the sea', 'It turns into wind'], a: 1, why: 'The heat is stored in the vapour (latent heat). When the vapour condenses the heat comes back, which is why air in a cloud cools more slowly as it rises.' },
        { q: 'Why is the air on the far side of the mountain warmer and drier than when it left the sea?', opts: ['The Sun is stronger there', 'It lost its water as rain, kept the heat from condensation, and sinking air warms by compression', 'The mountain heats it', 'It came from a desert'], a: 1, why: 'Rain removes the water, condensation has added heat to the air, and air sinking down the far side warms by about 9.8 °C per kilometre as it is squeezed.' },
      ],
      era: 'Perrault, 1674',
      level: 3,
      parts: [
        { name: 'Sun', note: 'Supplies the energy for evaporation.' },
        { name: 'Sea', note: 'The main source of the vapour.' },
        { name: 'Cloud', note: 'Condensed droplets, formed above the cloud base.' },
        { name: 'Mountain', note: 'Forces the damp air upward so it cools.' },
        { name: 'River', note: 'Carries the rain back to the sea.' },
      ],
      facts: [
        'The oceans hold about 96.5 percent of the water on Earth. About 90 percent of the water vapour in the air comes from evaporation from oceans, seas, lakes and rivers, and the rest from plants.',
        'A water molecule spends about nine days in the air on average before it falls as rain or snow.',
        'In 1674 Pierre Perrault measured the rain that falls on the Seine basin and showed that rain alone was enough to feed the river. Until then many people thought springs were fed from the sea.',
        'Evaporating a kilogram of water takes about 2.5 megajoules at sea temperatures, and 2.26 megajoules at boiling point. The same heat is released when the vapour condenses into cloud.',
      ],
      sources: [
        'R. R. Rogers and M. K. Yau, *A Short Course in Cloud Physics*, Pergamon (condensation level, moist adiabatic lapse rate).',
        'D. L. Hartmann, *Global Physical Climatology*, Academic Press (evaporation, latent heat, the hydrological cycle).',
        'D. M. Romps, "Exact expression for the lifting condensation level", *Journal of the Atmospheric Sciences* 74, 3891 (2017).',
        'O. A. Alduchov and R. E. Eskridge, "Improved Magnus form approximation of saturation vapor pressure", *Journal of Applied Meteorology* 35, 601 (1996).',
        'U.S. Geological Survey, Water Science School, "The Water Cycle" (evaporation and the atmosphere).',
      ],
    },

    create(host) {
      const st = { t: 0 };
      let L = null;
      let cache = null;

      // Everything that depends only on the controls.
      function model() {
        const c = host.ctl;
        const key = [c.sea, c.rh, c.wind, c.ridge].join('|');
        if (!cache || cache.key !== key) {
          const ev = Wa.evaporation(c.sea, c.rh / 100, c.wind);
          const r = Wa.rain(c.sea, c.rh / 100, c.wind, c.ridge);
          cache = { key, ev, rain: r.mmDay, asc: r.asc, lee: r.lee, dryTop: r.asc.tAir - Wa.GAMMA_D * c.ridge };
        }
        return cache;
      }

      // Geometry of the side view, in the scene's own pixels.
      function geo() {
        const s = L.scene;
        const w = s.w, h = s.h;
        const xc = 0.3 * w, xr = 0.63 * w, xl = 0.9 * w;
        const ySea = 0.78 * h;
        const kz = (0.66 * h) / Z_MAX;
        const ridge = host.ctl.ridge;
        const ground = (x) => {
          if (x <= xc || x >= xl) return 0;
          if (x < xr) { const u = (x - xc) / (xr - xc); return ridge * Math.pow(u, 1.25); }
          const v = (x - xr) / (xl - xr);
          return ridge * (1 - Math.pow(v, 1.25));
        };
        const Y = (z) => ySea - z * kz;
        // x on the windward slope where the ground reaches altitude z
        const xAt = (z) => (ridge <= 0 ? xc : xc + (xr - xc) * Math.pow(clamp(z / ridge, 0, 1), 1 / 1.25));
        return { w, h, xc, xr, xl, ySea, kz, ground, Y, xAt, ridge };
      }

      const sim = {
        ref: { w: 780, h: 590 },
        refNarrow: { w: 420, h: 930 },
        state: st,
        init() { st.t = 0; },
        layout(V) {
          L = V.narrow
            ? { scene: { x: 0, y: 6, w: 420, h: 430 }, temp: { x: 14, y: 446, w: 392, h: 270 }, bars: { x: 20, y: 742, w: 380 } }
            : { scene: { x: 0, y: 6, w: 780, h: 356 }, temp: { x: 10, y: 372, w: 390, h: 214 }, bars: { x: 430, y: 402, w: 330 } };
        },
        step(dt) { st.t += dt; },
        thumb() { st.t = 3.1; },
        readouts() {
          const m = model();
          const a = m.asc;
          const cloud = a.cloud;
          return [
            { k: 'Evaporation from the sea', v: fmt(m.ev.mmDay, 1) + ' mm a day' },
            { k: 'Sunlight it uses', v: fmt(m.ev.watts, 0) + ' W/m²' },
            { k: 'Cloud base', v: fmt(a.zLcl, 0) + ' m', tone: cloud ? '' : 'warn' },
            { k: 'Air at the crest', v: fmt(a.Ttop, 0) + ' °C' },
            { k: 'Rain on the slope', v: fmt(m.rain, 1) + ' mm a day' },
            { k: 'Air on the far side', v: fmt(m.lee.T, 0) + ' °C, ' + fmt(m.lee.rh * 100, 0) + ' % damp', tone: m.lee.rh < 0.5 ? 'warn' : '' },
          ];
        },
        caption() {
          const m = model();
          if (!m.asc.cloud) return host.ctl.ridge <= 0 ? 'Flat land: nothing lifts the air' : 'Ridge below the cloud base: dry';
          if (m.rain >= 15) return 'Heavy rain on the windward slope';
          if (m.rain >= 3) return 'Rain on the windward slope';
          return 'Cloud, but little rain';
        },
        describe() {
          const m = model();
          return 'Sea evaporation ' + fmt(m.ev.mmDay, 1) + ' millimetres a day. ' + (m.asc.cloud
            ? 'Cloud forms above ' + fmt(m.asc.zLcl, 0) + ' metres and ' + fmt(m.rain, 0) + ' millimetres a day fall on the slope. The far side is ' + fmt(m.lee.T, 0) + ' degrees and ' + fmt(m.lee.rh * 100, 0) + ' percent humid.'
            : 'The ridge is below the cloud base, so there is no cloud or rain.');
        },

        draw(g, V, c) {
          drawScene(g, V, c);
          if (V.thumb) return;
          drawTemp(g, V, c);
          drawBars(g, V, c);
        },
      };

      // ------------------------------------------------------------ scene
      function drawScene(g, V, c) {
        const m = model();
        const o = geo();
        const { w, h, xc, xr, xl, ySea, kz, ground, Y, xAt, ridge } = o;
        const lw = (n) => V.px(n);
        const a = m.asc;
        g.save();
        g.translate(L.scene.x, L.scene.y);

        // height scale
        if (!V.thumb) {
          for (const z of [1000, 2000, 3000]) {
            line(g, V, 0, Y(z), w, Y(z), alpha(c.ink3, 0.35), 1, [2, 5]);
            text(g, V, fmt(z, 0) + ' m', w - 10, Y(z) - 3, { px: 10, mono: true, color: c.ink3, align: 'right', halo: false });
          }
        }

        // the rain-soaked side and the dry side get a tint
        const wet = clamp(m.rain / 30, 0, 1);
        const dry = clamp((0.8 - m.lee.rh) / 0.6, 0, 1) * (a.cloud ? 1 : 0);

        // land
        g.beginPath();
        g.moveTo(xc, ySea);
        for (let x = xc; x <= xl; x += 4) g.lineTo(x, Y(ground(x)));
        g.lineTo(xl, ySea);
        g.lineTo(w, ySea); g.lineTo(w, h); g.lineTo(xc, h);
        g.closePath();
        g.fillStyle = mix(c.paper2, c.ink, 0.10); g.fill();
        g.save(); g.clip();
        g.fillStyle = alpha(c.cold, 0.10 + 0.22 * wet); g.fillRect(xc, 0, xr - xc, h);
        g.fillStyle = alpha(c.hot, 0.07 + 0.22 * dry); g.fillRect(xr, 0, w - xr, h);
        g.restore();
        g.beginPath();
        g.moveTo(xc, ySea);
        for (let x = xc; x <= xl; x += 4) g.lineTo(x, Y(ground(x)));
        g.lineTo(xl, ySea); g.lineTo(w, ySea);
        g.strokeStyle = c.ink; g.lineWidth = lw(2); g.lineJoin = 'round'; g.stroke();

        // sea
        g.beginPath();
        g.moveTo(0, ySea);
        for (let x = 0; x <= xc + 1; x += 4) g.lineTo(x, ySea + Math.sin(x * 0.07 + st.t * 1.6) * 2.2);
        g.lineTo(xc + 2, h); g.lineTo(0, h); g.closePath();
        g.fillStyle = alpha(c.cold, 0.32); g.fill();
        g.strokeStyle = c.cold; g.lineWidth = lw(2);
        g.beginPath();
        for (let x = 0; x <= xc + 1; x += 4) { const y = ySea + Math.sin(x * 0.07 + st.t * 1.6) * 2.2; if (x) g.lineTo(x, y); else g.moveTo(x, y); }
        g.stroke();

        // the sun, and the heat it puts into evaporation
        const sunX = 0.075 * w, sunY = 0.15 * h;
        const pulse = 1 + 0.12 * Math.sin(st.t * 2);
        g.strokeStyle = c.accent; g.lineWidth = lw(2.2); g.lineCap = 'round';
        for (let i = 0; i < 12; i++) {
          const an = (i / 12) * Math.PI * 2 + st.t * 0.12;
          g.beginPath(); g.moveTo(sunX + Math.cos(an) * 24, sunY + Math.sin(an) * 24); g.lineTo(sunX + Math.cos(an) * 24 * (1 + 0.45 * pulse), sunY + Math.sin(an) * 24 * (1 + 0.45 * pulse)); g.stroke();
        }
        g.beginPath(); g.arc(sunX, sunY, 17, 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = lw(2); g.stroke();
        g.lineCap = 'butt';
        const heat = clamp(m.ev.watts / 200, 0.1, 1);
        for (let k = 0; k < 2; k++) {
          const x1 = sunX + 24 + k * 16, y1 = sunY + 22 + k * 10;
          const x2 = 0.1 * w + k * 0.075 * w, y2 = ySea - 6;
          arrow(g, V, x1, y1, x2, y2, alpha(c.warn, 0.5 + 0.35 * heat), 1 + 1.8 * heat, 8);
        }

        // cloud base
        const zl = a.zLcl;
        if (zl <= Z_MAX) {
          line(g, V, 0, Y(zl), xl, Y(zl), c.cold, 1.4, [6, 4]);
          if (!V.thumb) text(g, V, 'cloud base ' + fmt(zl, 0) + ' m' + (a.cloud ? '' : ' (above the ridge)'), 6, Y(zl) - 5, { px: 11, color: c.cold, weight: 700 });
        }

        // wind-driven air: vapour below the cloud base, droplets in it, warm dry air after the crest
        const speed = (16 + 9 * host.ctl.wind) / w;
        for (let i = 0; i < N_PART; i++) {
          const hp = 20 + Math.pow(hash(i, 1), 1.6) * 560; // metres above the surface it travels at
          const s = (hash(i, 2) + st.t * speed * (0.8 + 0.4 * hash(i, 3))) % 1;
          const x = s * w * 0.96;
          let lift = x < xc ? Math.pow(x / xc, 0.7) : 1; // rising off the sea
          const gz = ground(x);
          const z = gz + hp * lift * (1 - 0.5 * Math.min(1, gz / Math.max(ridge, 1)));
          const y = Y(z);
          if (y > ySea + 1) continue;
          const windward = x >= xc && x <= xr;
          const inCloud = a.cloud && windward && z >= zl && gz >= zl * 0.6;
          const lee = x > xr;
          if (inCloud) {
            g.beginPath(); g.arc(x, y, 4.2, 0, Math.PI * 2); g.fillStyle = alpha(c.paper, 0.92); g.fill();
            g.strokeStyle = alpha(c.ink2, 0.75); g.lineWidth = lw(1.2); g.stroke();
          } else {
            g.beginPath(); g.arc(x, y, lee ? 2.4 : 2.1, 0, Math.PI * 2);
            g.fillStyle = lee ? alpha(c.hot, 0.55) : alpha(c.cold, 0.7); g.fill();
          }
        }

        // rain and river
        if (a.cloud && m.rain > 0.2) {
          const nd = Math.round(N_DROP * clamp(m.rain / 30, 0.15, 1));
          const xs = xAt(zl), xe = xr;
          // cloud puffs along the slope above the cloud base, then the rain under them
          puffs(g, V, c, o, xs, 9, 0.9, wet);
          g.strokeStyle = alpha(c.cold, 0.95); g.lineWidth = lw(1.9);
          for (let i = 0; i < nd; i++) {
            const x0 = xs + (xe - xs) * (0.05 + 0.9 * hash(i, 5));
            const gy = Y(ground(x0));
            const top = Math.max(gy - 85 * (w / 780 + 0.3), 10);
            const p = (hash(i, 6) + st.t * 0.9) % 1;
            const yy = top + (gy - top) * p;
            g.beginPath(); g.moveTo(x0 - 4 * (1 - p), yy - 7); g.lineTo(x0 - 4 * (1 - p) + 1.6, yy); g.stroke();
          }
        } else if (a.cloud) {
          puffs(g, V, c, o, xAt(zl), 5, 0.7, 0);
        }
        // river back to the sea
        g.lineCap = 'round';
        g.strokeStyle = m.rain > 0.2 ? c.cold : alpha(c.ink3, 0.6);
        g.lineWidth = lw(1.2 + 3 * clamp(m.rain / 30, 0, 1));
        g.setLineDash([V.px(7), V.px(6)]);
        g.lineDashOffset = -V.px(((st.t * 26) % 13) * -1);
        g.beginPath();
        const rx0 = xc + (xr - xc) * 0.72;
        for (let x = rx0; x >= xc; x -= 4) { const y = Y(ground(x)) + 1; if (x === rx0) g.moveTo(x, y); else g.lineTo(x, y); }
        g.lineTo(xc - 10, ySea + 4);
        g.stroke();
        g.setLineDash([]); g.lineDashOffset = 0; g.lineCap = 'butt';

        // labels
        if (!V.thumb) {
          const lx0 = 6;
          text(g, V, 'evaporation', lx0, ySea + 20, { px: 11, weight: 700, color: c.ink, halo: false });
          text(g, V, fmt(m.ev.mmDay, 1) + ' mm a day', lx0, ySea + 34, { px: 10.5, mono: true, color: c.ink2, halo: false });
          text(g, V, 'uses ' + fmt(m.ev.watts, 0) + ' W/m²', lx0, ySea + 48, { px: 10.5, mono: true, color: c.ink2, halo: false });
          text(g, V, 'wind ' + fmt(host.ctl.wind, 0) + ' m/s', lx0, ySea + 63, { px: 10.5, mono: true, color: c.ink2, halo: false });
          arrow(g, V, lx0 + 74, ySea + 59, lx0 + 108, ySea + 59, c.ink2, 1.6, 8);
          if (a.cloud) text(g, V, m.rain >= 0.2 ? 'rain ' + fmt(m.rain, 0) + ' mm a day' : 'cloud', (xAt(zl) + xr) / 2, Math.max(Y(ridge) - 50, 16), { px: 11.5, weight: 700, color: c.cold, align: 'center' });
          text(g, V, 'river back to the sea', xc + 10, ySea + 18, { px: 10.5, color: c.ink2, halo: false });
          const shadow = a.cloud && m.rain >= 0.2;
          text(g, V, shadow ? 'rain shadow' : 'air on the far side', w - 8, ySea + 20, { px: 11.5, weight: 700, color: c.hot, align: 'right', halo: false });
          text(g, V, fmt(m.lee.T, 0) + ' °C, ' + fmt(m.lee.rh * 100, 0) + ' % damp', w - 8, ySea + 35, { px: 10.5, mono: true, color: c.ink2, align: 'right', halo: false });
        }
        g.restore();
      }

      function puffs(g, V, c, o, xs, n, alp, wet) {
        const { w, xr, Y, ground, ridge } = o;
        const z0 = geoZl();
        const sc = w / 780 + 0.35;
        const grey = mix(c.paper, c.ink, 0.12 * wet);
        for (let k = 0; k <= n; k++) {
          const x0 = Math.min(xs + (xr - xs + 14) * (k / n), xr + 14);
          const zb = Math.max(ground(x0), z0);
          const yc = Y(zb) - 17 * sc - (k % 2) * 7;
          const r = (10 + (k % 3) * 2.2) * sc;
          g.fillStyle = alpha(grey, alp); g.strokeStyle = alpha(c.ink2, 0.75); g.lineWidth = V.px(1.2);
          g.beginPath(); g.arc(x0, yc, r, 0, Math.PI * 2); g.fill(); g.stroke();
          g.beginPath(); g.arc(x0 + r * 0.9, yc + 3 * sc, r * 0.72, 0, Math.PI * 2); g.fill(); g.stroke();
        }
      }
      const geoZl = () => model().asc.zLcl;

      // ------------------------------------------------ air temperature chart
      function drawTemp(g, V, c) {
        const m = model();
        const a = m.asc;
        const ridge = host.ctl.ridge;
        const f = plotFrame(g, V, c, L.temp, 'Temperature of the air against height (m)', 'temperature, °C', '');
        const TMIN = -25, TMAX = 50;
        const X = (t) => f.x0 + ((t - TMIN) / (TMAX - TMIN)) * f.w;
        const Y = (z) => f.y0 + f.h - (z / Z_MAX) * f.h;
        for (const t of [-20, 0, 20, 40]) { line(g, V, X(t), f.y0 + f.h, X(t), f.y0 + f.h + 4, c.ink, 1); text(g, V, String(t), X(t), f.y0 + f.h + 15, { px: 10, mono: true, align: 'center', color: c.ink2, halo: false }); }
        for (const z of [0, 1000, 2000, 3000]) { line(g, V, f.x0 - 4, Y(z), f.x0, Y(z), c.ink, 1); text(g, V, fmt(z, 0), f.x0 - 6, Y(z) + 4, { px: 10, mono: true, align: 'right', color: c.ink2, halo: false }); line(g, V, f.x0, Y(z), f.x0 + f.w, Y(z), alpha(c.ink3, 0.25), 1, [2, 4]); }
                // the ridge
        if (ridge > 0) {
          g.fillStyle = alpha(c.ink, 0.08);
          g.fillRect(f.x0, f.y0 + f.h - (ridge / Z_MAX) * f.h, f.w, (ridge / Z_MAX) * f.h);
        }
        // what dry cooling alone would give
        const t0 = a.tAir;
        const dry = (z) => t0 - Wa.GAMMA_D * z;
        g.setLineDash([V.px(5), V.px(4)]);
        g.strokeStyle = c.ink3; g.lineWidth = V.px(1.6);
        g.beginPath(); g.moveTo(X(dry(0)), Y(0)); g.lineTo(X(dry(Z_MAX)), Y(Z_MAX)); g.stroke();
        g.setLineDash([]);
        {
          const lx = X(dry(2800));
          const onLeft = lx > f.x0 + 100;
          text(g, V, 'cooling with no cloud', lx + (onLeft ? -6 : 8), Y(2800) + 3, { px: 10, color: c.ink3, align: onLeft ? 'right' : 'left', halo: false });
        }
        // the parcel, dry then moist
        if (ridge > 0) {
          g.lineWidth = V.px(3); g.lineCap = 'round'; g.lineJoin = 'round';
          let prevCloud = false;
          g.strokeStyle = c.ink;
          g.beginPath(); g.moveTo(X(a.path[0].T), Y(0));
          a.path.forEach((p, i) => {
            if (i === 0) return;
            if (p.cloud && !prevCloud) { g.stroke(); g.strokeStyle = c.cold; g.beginPath(); g.moveTo(X(a.path[i - 1].T), Y(a.path[i - 1].z)); }
            g.lineTo(X(p.T), Y(p.z));
            prevCloud = p.cloud;
          });
          g.stroke();
          // down the far side
          g.setLineDash([V.px(5), V.px(3)]);
          g.strokeStyle = c.hot; g.lineWidth = V.px(2.6);
          g.beginPath(); g.moveTo(X(a.Ttop), Y(ridge)); g.lineTo(X(m.lee.T), Y(0)); g.stroke();
          g.setLineDash([]); g.lineCap = 'butt';
          // markers
          const dot = (x, y, col) => { g.beginPath(); g.arc(x, y, V.px(5.5), 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(1.8); g.stroke(); };
          dot(X(a.tAir), Y(0), c.accent);
          if (a.cloud) { dot(X(t0 - Wa.GAMMA_D * a.zLcl), Y(a.zLcl), c.paper); text(g, V, 'cloud base', X(t0 - Wa.GAMMA_D * a.zLcl) - 10, Y(a.zLcl) - 2, { px: 10.5, color: c.cold, weight: 700, align: 'right' }); }
          dot(X(a.Ttop), Y(ridge), c.accent);
          dot(X(m.lee.T), Y(0), c.hot);
          text(g, V, 'sea', X(a.tAir) - 8, Y(0) - 8, { px: 10.5, color: c.ink2, align: 'right', halo: false });
          text(g, V, 'far side', X(m.lee.T) + 8, Y(0) - 8, { px: 10.5, color: c.hot, weight: 700 });
          if (a.cloud && ridge > a.zLcl + 100) {
            const gap = a.Ttop - m.dryTop;
            const right = X(a.Ttop) < f.x0 + f.w * 0.55;
            text(g, V, 'latent heat: +' + fmt(gap, 1) + ' °C', X(a.Ttop) + (right ? 10 : -10), Y(ridge) - 6, { px: 10.5, color: c.bad, weight: 700, align: right ? 'left' : 'right' });
          }
        } else {
          g.beginPath(); g.arc(X(a.tAir), Y(0), V.px(5.5), 0, Math.PI * 2); g.fillStyle = c.accent; g.fill(); g.strokeStyle = c.ink; g.lineWidth = V.px(1.8); g.stroke();
          text(g, V, 'flat land: the air is not lifted', f.x0 + f.w / 2, f.y0 + f.h / 2, { px: 11, color: c.ink2, align: 'center' });
        }
      }

      // --------------------------------------------------- water in the air
      function drawBars(g, V, c) {
        const m = model();
        const a = m.asc;
        const x = L.bars.x, y = L.bars.y, w = L.bars.w;
        text(g, V, 'Water in each kilogram of air, grams', x, y - 4, { px: 12, weight: 700, halo: false });
        const rows = [
          { k: 'At the coast', v: a.q0 * 1000, col: c.cold },
          { k: 'At the crest', v: a.qtop * 1000, col: alpha(c.cold, 0.55) },
          { k: 'Fell as rain', v: a.condensed * Wa.PRECIP_EFF * 1000, col: c.accent },
          { k: 'Far side', v: m.lee.q * 1000, col: c.hot },
        ];
        const labelW = 96;
        const max = 30;
        const barMax = Math.max(40, w - labelW - 70);
        rows.forEach((r, i) => {
          const yy = y + 10 + i * 28;
          text(g, V, r.k, x, yy + 13, { px: 11, color: c.ink2, halo: false });
          const bw = Math.max(2, (r.v / max) * barMax);
          g.fillStyle = r.col; g.fillRect(x + labelW, yy, bw, 18);
          g.strokeStyle = c.ink; g.lineWidth = V.px(1.2); g.strokeRect(x + labelW, yy, bw, 18);
          const extra = r.k === 'Far side' ? '  ' + fmt(m.lee.rh * 100, 0) + ' % damp' : '';
          text(g, V, fmt(r.v, 1) + extra, x + labelW + bw + 6, yy + 13, { px: 11, mono: true, weight: 600, halo: false });
        });
        text(g, V, 'Warm air can carry far more vapour than cold air.', x, y + 10 + 4 * 28 + 6, { px: 10.5, color: c.ink2, halo: false });
      }
      return sim;
    },
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
