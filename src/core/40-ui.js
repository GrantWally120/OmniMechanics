/* Shell, router and views.
 * Routes use plain fragments (#engine, #about, and no fragment for the library)
 * so deep links survive hosts that only pass simple anchors. */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});
  const { h, clear, rich, richText, store } = OM.util;

  let current = null; // active stage
  let cleanup = []; // functions to run when leaving a view
  let firstRoute = true;
  let railEl = null;
  let mainEl = null;
  let backdrop = null;
  let menuBtn = null;

  // ---------------------------------------------------------------- progress
  const progress = () => store.get('progress', {});
  function markDone(id, score, total) {
    const p = progress();
    p[id] = { done: true, score, total };
    store.set('progress', p);
    updateRailChecks();
  }
  const isDone = (id) => !!(progress()[id] && progress()[id].done);

  // ---------------------------------------------------------------- shell
  const THEME_MODES = ['auto', 'light', 'dark'];
  const THEME_LABEL = { auto: 'Auto', light: 'Light', dark: 'Dark' };
  function applyTheme(mode) {
    const el = document.documentElement;
    if (mode === 'auto') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', mode);
    OM.theme.refresh();
  }

  function themeIcon(mode) {
    const d = {
      auto: 'M12 3a9 9 0 1 0 0 18V3z',
      light: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3zM4.2 5.6l1.4-1.4 2.1 2.1-1.4 1.4zM16.3 17.7l1.4-1.4 2.1 2.1-1.4 1.4zM4.2 18.4l2.1-2.1 1.4 1.4-2.1 2.1zM16.3 6.3l2.1-2.1 1.4 1.4-2.1 2.1z',
      dark: 'M20 14.5A8 8 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z',
    }[mode];
    return h('@svg', { viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': 'true', class: 'ico' }, h('@path', { d, fill: 'currentColor' }));
  }

  function buildShell(app) {
    let mode = store.get('theme', 'auto');
    if (THEME_MODES.indexOf(mode) < 0) mode = 'auto';
    if (mode !== 'auto') applyTheme(mode);

    const themeBtn = h('button', { type: 'button', class: 'hbtn', id: 'theme-btn' });
    function paintThemeBtn() {
      clear(themeBtn).append(themeIcon(mode), h('span', { class: 'hbtn-lbl', text: THEME_LABEL[mode] }));
      themeBtn.setAttribute('aria-label', 'Colour theme: ' + THEME_LABEL[mode] + '. Activate to change.');
    }
    themeBtn.addEventListener('click', () => {
      mode = THEME_MODES[(THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length];
      store.set('theme', mode);
      applyTheme(mode);
      paintThemeBtn();
    });
    paintThemeBtn();
    if (typeof matchMedia === 'function') {
      const mq = matchMedia('(prefers-color-scheme: dark)');
      const on = () => OM.theme.refresh();
      if (mq.addEventListener) mq.addEventListener('change', on);
    }

    menuBtn = h('button', { type: 'button', class: 'hbtn menu-btn', 'aria-expanded': 'false', 'aria-controls': 'rail' },
      h('@svg', { viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': 'true', class: 'ico' }, h('@path', { d: 'M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z', fill: 'currentColor' })),
      h('span', { class: 'hbtn-lbl', text: 'Mechanisms' }));
    menuBtn.addEventListener('click', () => toggleRail());

    const header = h('header', { class: 'site-header' },
      h('div', { class: 'header-in' },
        menuBtn,
        h('a', { class: 'brand', href: '#', 'aria-label': 'OmniMechanics, library' },
          h('@svg', { viewBox: '0 0 32 32', width: 26, height: 26, 'aria-hidden': 'true', class: 'brand-mark' },
            h('@circle', { cx: 16, cy: 16, r: 9.5, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4 }),
            h('@circle', { cx: 16, cy: 16, r: 3, fill: 'currentColor' }),
            h('@path', { d: 'M16 2v5M16 25v5M2 16h5M25 16h5M6.1 6.1l3.5 3.5M22.4 22.4l3.5 3.5M6.1 25.9l3.5-3.5M22.4 9.6l3.5-3.5', stroke: 'currentColor', 'stroke-width': 2.6, fill: 'none' })),
          h('span', { class: 'brand-name' }, 'Omni', h('b', { text: 'Mechanics' }))),
        h('nav', { class: 'top-nav', 'aria-label': 'Site' },
          h('a', { href: '#', id: 'nav-library', text: 'Library' }),
          h('a', { href: '#about', id: 'nav-about', text: 'About' })),
        themeBtn));

    railEl = h('nav', { class: 'rail', id: 'rail', 'aria-label': 'Mechanisms' });
    OM.groups.forEach((g) => {
      const list = OM.mods.filter((m) => m.group === g.id);
      if (!list.length) return;
      railEl.appendChild(h('div', { class: 'rail-group' },
        h('h2', { class: 'rail-h', text: g.name }),
        h('ul', null, list.map((m) => h('li', null,
          h('a', { href: '#' + m.id, dataset: { id: m.id }, on: { click: () => toggleRail(false) } },
            h('span', { class: 'rail-no', text: m.number.replace('OM-', '') }),
            h('span', { class: 'rail-t', text: m.title }),
            h('span', { class: 'rail-ck', 'aria-hidden': 'true' })))))));
    });
    backdrop = h('div', { class: 'rail-backdrop', hidden: true, on: { click: () => toggleRail(false) } });
    mainEl = h('main', { class: 'main', id: 'main', tabindex: '-1' });
    const footer = h('footer', { class: 'site-footer' },
      h('p', null, 'OmniMechanics 2.0. Runs offline, keeps nothing but your quiz progress and theme on this device.'),
      h('p', null, 'Type: Archivo (SIL Open Font License).'));

    const skip = h('a', { class: 'skip', href: '#main', text: 'Skip to content' });
    skip.addEventListener('click', (ev) => { ev.preventDefault(); mainEl.focus(); });

    clear(app).append(skip, header, h('div', { class: 'layout' }, railEl, h('div', { class: 'content' }, mainEl, footer)), backdrop);
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && railEl.classList.contains('open')) { toggleRail(false); menuBtn.focus(); } });
  }

  function toggleRail(open) {
    if (open == null) open = !railEl.classList.contains('open');
    railEl.classList.toggle('open', open);
    backdrop.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('no-scroll', open && matchMedia('(max-width: 1179px)').matches);
    if (open) { const a = railEl.querySelector('a[aria-current="page"]') || railEl.querySelector('a'); if (a) a.focus(); }
  }

  function updateRailChecks() {
    if (!railEl) return;
    railEl.querySelectorAll('a[data-id]').forEach((a) => a.classList.toggle('done', isDone(a.dataset.id)));
  }
  function markActive(id, page) {
    railEl.querySelectorAll('a[data-id]').forEach((a) => {
      if (a.dataset.id === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    ['library', 'about'].forEach((n) => {
      const a = document.getElementById('nav-' + n);
      if (a) { if (page === n) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
    });
  }

  // ---------------------------------------------------------------- views
  function leave() {
    cleanup.forEach((f) => { try { f(); } catch (e) { console.error(e); } });
    cleanup = [];
    if (current) { current.destroy(); current = null; }
    OM.debug.stage = null;
  }

  function viewHome() {
    document.title = 'OmniMechanics: how things really work';
    markActive(null, 'library');
    const filters = [{ id: 'all', name: 'Everything' }].concat(OM.groups.map((g) => ({ id: g.id, name: g.name })));
    let group = 'all';
    let query = '';

    const heroCanvas = h('canvas', { class: 'hero-canvas', 'aria-hidden': 'true' });
    const grid = h('div', { class: 'lib' });
    const empty = h('p', { class: 'empty', hidden: true, text: 'Nothing matches that search. Try a word like "motor", "orbit" or "lock".' });
    const search = h('input', { type: 'search', id: 'lib-search', class: 'search', placeholder: 'Search mechanisms', 'aria-label': 'Search mechanisms', autocomplete: 'off' });
    const chipBtns = filters.map((f) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(f.id === 'all'), dataset: { g: f.id }, text: f.name }));
    const count = h('span', { class: 'lib-count' });

    const node = h('div', { class: 'view view-home' },
      h('section', { class: 'hero' },
        h('div', { class: 'hero-copy' },
          h('p', { class: 'eyebrow', text: 'Interactive drawings' }),
          h('h1', { id: 'page-h', tabindex: '-1' }, 'How things ', h('span', { class: 'mark', text: 'really' }), ' work.'),
          h('p', { class: 'hero-sub', text: 'Thirteen machines, circuits and systems you can poke. Each one runs on the equations engineers use, with the numbers beside the picture, and each one says what it leaves out.' })),
        h('div', { class: 'hero-art' }, heroCanvas)),
      h('section', { class: 'lib-tools', 'aria-label': 'Filter the library' },
        h('div', { class: 'chips', role: 'group', 'aria-label': 'Topic' }, chipBtns),
        h('div', { class: 'lib-search-wrap' }, search, count)),
      grid, empty);

    const cards = OM.mods.map((m) => {
      const cv = h('canvas', { class: 'thumb', 'aria-hidden': 'true' });
      const el = h('a', { class: 'card', href: '#' + m.id, dataset: { id: m.id, g: m.group, q: (m.title + ' ' + m.hook).toLowerCase() } },
        h('div', { class: 'thumb-wrap' }, cv),
        h('div', { class: 'card-body' },
          h('div', { class: 'card-top' },
            h('span', { class: 'card-no', text: m.number }),
            h('span', { class: 'card-done', text: 'Quiz done', hidden: !isDone(m.id) })),
          h('h3', { text: m.title }),
          h('p', { text: m.hook })));
      return { m, el, cv };
    });

    function paintGrid() {
      clear(grid);
      let shown = 0;
      OM.groups.forEach((g) => {
        const items = cards.filter((c) => c.m.group === g.id && (group === 'all' || group === g.id) && (!query || c.el.dataset.q.indexOf(query) >= 0));
        if (!items.length) return;
        shown += items.length;
        grid.appendChild(h('section', { class: 'lib-group' },
          h('div', { class: 'lib-group-h' }, h('h2', { text: g.name }), h('p', { text: g.blurb })),
          h('div', { class: 'cards' }, items.map((c) => c.el))));
      });
      empty.hidden = shown > 0;
      count.textContent = shown + (shown === 1 ? ' mechanism' : ' mechanisms');
    }
    chipBtns.forEach((b) => b.addEventListener('click', () => {
      group = b.dataset.g;
      chipBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      paintGrid();
    }));
    search.addEventListener('input', () => { query = search.value.trim().toLowerCase(); paintGrid(); });
    paintGrid();

    // Thumbnails are real drawings from the simulations, painted a few at a time.
    let cancelled = false;
    function paintThumbs() {
      cards.forEach((c, i) => {
        setTimeout(() => {
          if (cancelled) return;
          try {
            const w = c.cv.parentElement.clientWidth || 320;
            OM.renderThumb(c.m, c.cv, w, Math.round(w * 0.625));
          } catch (e) { console.error('Thumbnail failed for ' + c.m.id + ':', e); }
        }, 20 + i * 25);
      });
    }
    requestAnimationFrame(paintThumbs);
    cleanup.push(() => { cancelled = true; });
    cleanup.push(OM.theme.onChange(() => paintThumbs()));
    cleanup.push(heroGears(heroCanvas));
    return node;
  }

  // Two meshing involute gears: the app's own theme in motion.
  function heroGears(canvas) {
    const G = OM.gears;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const g = canvas.getContext('2d');
    let raf = 0;
    let t0 = 0;
    let visible = true;
    let dead = false;
    const NA = 14, NB = 22, NC = 12;
    function size() {
      const w = canvas.clientWidth || 360;
      const hgt = Math.round(w * 0.72);
      const dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = w * dpr; canvas.height = hgt * dpr; canvas.style.height = hgt + 'px';
      return { w, hgt, dpr };
    }
    let S = size();
    function drawGear(N, cx, cy, ang, unit, fill, stroke, mark) {
      const o = G.outline(N).pts;
      const c = Math.cos(ang), s = Math.sin(ang);
      g.beginPath();
      o.forEach(([x, y], i) => {
        const X = cx + (x * c - y * s) * unit, Y = cy + (x * s + y * c) * unit;
        if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
      });
      g.closePath();
      g.fillStyle = fill; g.fill();
      g.lineWidth = 1.6; g.strokeStyle = stroke; g.lineJoin = 'round'; g.stroke();
      // spokes
      const r = (N / 2 - 1.25) * unit;
      g.beginPath(); g.arc(cx, cy, r * 0.62, 0, Math.PI * 2); g.strokeStyle = stroke; g.lineWidth = 1.2; g.stroke();
      g.beginPath(); g.arc(cx, cy, r * 0.16, 0, Math.PI * 2); g.fillStyle = stroke; g.fill();
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * r * 0.62, cy + Math.sin(ang) * r * 0.62); g.strokeStyle = mark; g.lineWidth = 3; g.stroke();
    }
    function frame(t) {
      raf = 0;
      if (dead) return;
      const c = OM.theme.c;
      const time = reduce ? 0.6 : (t - t0) / 1000;
      g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
      g.clearRect(0, 0, S.w, S.hgt);
      const unit = Math.min(S.w / (NA / 2 + NB + NC / 2 + 4), S.hgt / 30);
      // A drives B; C is on B's shaft and drives nothing (a compound pair for looks).
      const ax = S.w * 0.24, ay = S.hgt * 0.62;
      const dAB = ((NA + NB) / 2) * unit;
      const alpha = -0.42;
      const bx = ax + Math.cos(alpha) * dAB, by = ay + Math.sin(alpha) * dAB;
      const thA = time * 0.9;
      const thB = G.meshAngle(thA, alpha, NA, NB);
      const alpha2 = -0.2;
      const dBC = ((NB + NC) / 2) * unit;
      const cx = bx + Math.cos(alpha2) * dBC, cy = by + Math.sin(alpha2) * dBC;
      const thC = G.meshAngle(thB, alpha2, NB, NC);
      drawGear(NB, bx, by, thB, unit, OM.gfx.alpha(c.accent, 0.55), c.ink, c.ink);
      drawGear(NA, ax, ay, thA, unit, c.paper2, c.ink, c.hot);
      drawGear(NC, cx, cy, thC, unit, c.paper2, c.ink, c.cold);
      if (!reduce && visible) raf = requestAnimationFrame(frame);
    }
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { S = size(); frame(performance.now()); }) : null;
    if (ro) ro.observe(canvas);
    const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => {
      visible = es[es.length - 1].isIntersecting;
      if (visible && !raf && !dead && !reduce) { t0 = t0 || performance.now(); raf = requestAnimationFrame(frame); }
    }) : null;
    if (io) io.observe(canvas);
    t0 = performance.now();
    raf = requestAnimationFrame(frame);
    const off = OM.theme.onChange(() => frame(performance.now()));
    return () => { dead = true; cancelAnimationFrame(raf); if (ro) ro.disconnect(); if (io) io.disconnect(); off(); };
  }

  function section(id, title, kids) {
    return h('section', { class: 'notes-sec', 'aria-labelledby': id }, h('h2', { id, text: title }), kids);
  }

  function viewMech(def) {
    document.title = def.title + ' · OmniMechanics';
    markActive(def.id);
    const ct = def.content;
    const stepEls = ct.steps.map((s, i) => h('li', { class: 'step', dataset: { i } },
      h('h3', null, h('span', { class: 'step-t', text: s.h })),
      h('p', null, rich(s.p))));
    let stage = null;

    // Try this
    const tryBtns = (ct.tries || []).map((t) => {
      const b = h('button', { type: 'button', class: 'try', 'aria-pressed': 'false' },
        h('span', { class: 'try-l', text: t.label }),
        t.text ? h('span', { class: 'try-t', text: t.text }) : null);
      b.addEventListener('click', () => {
        stage.applyPreset(t);
        tryBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      });
      return b;
    });

    stage = OM.createStage(def, {
      onPhase(i) { stepEls.forEach((el, k) => { el.classList.toggle('is-now', k === i); if (k === i) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current'); }); },
      onControl(_id, _v, user) { if (user) tryBtns.forEach((x) => x.setAttribute('aria-pressed', 'false')); },
    });
    current = stage;
    OM.debug.stage = stage;

    // Principle
    const p = ct.principle;
    const principle = section('h-principle', 'The principle', [
      p.lead ? h('p', { class: 'lead' }, rich(p.lead)) : null,
      (p.eqs || []).map((e) => h('figure', { class: 'eq' },
        h('figcaption', { text: e.label }),
        h('div', { class: 'eq-line' }, rich(e.eq)),
        e.note ? h('p', { class: 'eq-note' }, rich(e.note)) : null)),
      p.points ? h('ul', { class: 'points' }, p.points.map((x) => h('li', null, rich(x)))) : null,
    ]);

    // Myth
    const myth = h('aside', { class: 'myth', 'aria-labelledby': 'h-myth' },
      h('h2', { id: 'h-myth', class: 'tag', text: ct.myth.title || 'Common myth' }),
      h('p', { class: 'claim' }, rich(ct.myth.claim)),
      h('p', { class: 'tag tag-true', text: 'What actually happens' }),
      h('p', null, rich(ct.myth.truth)));

    // Quiz
    const quiz = buildQuiz(def);

    // Sources
    const sources = ct.sources && ct.sources.length
      ? section('h-src', 'Sources and further reading', h('ul', { class: 'sources' }, ct.sources.map((s) => h('li', null, rich(s)))))
      : null;

    // Prev / next
    const i = def.order;
    const prev = OM.mods[i - 1], next = OM.mods[i + 1];
    const pn = h('nav', { class: 'prevnext', 'aria-label': 'More mechanisms' },
      prev ? h('a', { href: '#' + prev.id, class: 'pn pn-prev' }, h('span', { class: 'pn-k', text: 'Previous' }), h('span', { class: 'pn-t', text: prev.title })) : h('span'),
      next ? h('a', { href: '#' + next.id, class: 'pn pn-next' }, h('span', { class: 'pn-k', text: 'Next' }), h('span', { class: 'pn-t', text: next.title })) : h('span'));

    const grp = OM.groups.find((g) => g.id === def.group);
    const node = h('div', { class: 'view view-mech' },
      h('header', { class: 'mech-head' },
        h('p', { class: 'eyebrow' }, def.number, ' · ', grp.name),
        h('h1', { id: 'page-h', tabindex: '-1', text: def.title }),
        h('p', { class: 'mech-hook' }, rich(ct.intro || def.hook))),
      h('div', { class: 'mech-grid' },
        h('div', { class: 'mech-stage' }, stage.sheet, stage.controlsEl),
        h('div', { class: 'mech-notes' },
          section('h-steps', 'What you are seeing', h('ol', { class: 'steps' }, stepEls)),
          principle,
          myth,
          tryBtns.length ? section('h-try', 'Try this', h('div', { class: 'tries' }, tryBtns)) : null,
          quiz,
          sources)),
      pn);
    return node;
  }

  function buildQuiz(def) {
    const qs = def.content.quiz;
    let correctFirst = 0;
    const answered = new Array(qs.length).fill(false);
    const attempts = new Array(qs.length).fill(0);
    const status = h('p', { class: 'quiz-status', 'aria-live': 'polite' });
    function refreshStatus() {
      const n = answered.filter(Boolean).length;
      status.textContent = n === qs.length
        ? 'All done. ' + correctFirst + ' of ' + qs.length + ' right on the first try.'
        : n + ' of ' + qs.length + ' answered';
    }
    const items = qs.map((q, qi) => {
      const fb = h('div', { class: 'quiz-fb', hidden: true });
      const opts = q.opts.map((o, oi) => h('button', { type: 'button', class: 'opt', dataset: { i: oi } },
        h('span', { class: 'opt-k', text: String.fromCharCode(65 + oi) }), h('span', { class: 'opt-t' }, rich(o))));
      opts.forEach((b, oi) => b.addEventListener('click', () => {
        if (answered[qi]) return;
        attempts[qi]++;
        const ok = oi === q.a;
        b.classList.add(ok ? 'right' : 'wrong');
        b.setAttribute('aria-pressed', 'true');
        clear(fb);
        if (ok) {
          answered[qi] = true;
          if (attempts[qi] === 1) correctFirst++;
          opts.forEach((x) => { x.disabled = true; });
          fb.append(h('p', { class: 'fb-ok' }, h('strong', { text: 'Right. ' }), rich(q.why)));
        } else {
          b.disabled = true;
          fb.append(h('p', { class: 'fb-no' }, h('strong', { text: 'Not quite. ' }), 'Have another go.'));
        }
        fb.hidden = false;
        refreshStatus();
        if (answered.every(Boolean)) markDone(def.id, correctFirst, qs.length);
      }));
      return h('fieldset', { class: 'q' },
        h('legend', null, h('span', { class: 'q-n', text: String(qi + 1) }), rich(q.q)),
        h('div', { class: 'opts' }, opts), fb);
    });
    refreshStatus();
    return section('h-quiz', 'Quick check', [items, status]);
  }

  function viewAbout() {
    document.title = 'About · OmniMechanics';
    markActive(null, 'about');
    const swatch = (color, label, what) => h('li', null, h('span', { class: 'sw', style: { background: 'var(' + color + ')' } }), h('span', null, h('strong', { text: label + ' ' }), what));
    return h('div', { class: 'view view-about' },
      h('header', { class: 'mech-head' },
        h('p', { class: 'eyebrow', text: 'About' }),
        h('h1', { id: 'page-h', tabindex: '-1', text: 'Machines you can poke at' }),
        h('p', { class: 'mech-hook', text: 'OmniMechanics is a library of live drawings. Every one is a working simulation, and every one puts numbers next to the picture so you can see cause and effect.' })),
      h('div', { class: 'about-grid' },
        section('a-trust', 'How far can you trust the numbers?', [
          h('p', null, rich('Each model is written from the equations engineers actually use, then checked by automated tests against known results. The engine is compared with typical figures for a small petrol engine. Orbits are checked against Kepler\'s law and conservation of energy. The wing\'s lift is calculated two independent ways and the answers must agree. The logic adder is tested on every possible input.')),
          h('p', null, rich('The models are simplified on purpose, and every page lists what it leaves out. Treat the values as realistic teaching numbers. They are not design data for building anything real.'))]),
        section('a-read', 'Reading the drawings', [
          h('ul', { class: 'legend' },
            swatch('--c-hot', 'Orange.', 'Heat, force and pressure: the things doing the pushing.'),
            swatch('--c-cold', 'Blue.', 'Cold, air and water, the stuff being pushed or cooled.'),
            swatch('--c-elec', 'Teal.', 'Electricity: current, voltage and signals.'),
            swatch('--c-metal', 'Grey.', 'Solid parts. Diagonal hatching marks metal that has been cut through, as in a workshop manual.'),
            swatch('--accent', 'Yellow.', 'Whatever you are meant to look at right now.')),
          h('p', null, 'Colour is never the only clue. Labels and numbers say the same thing.')]),
        section('a-use', 'Using it', [
          h('ul', { class: 'points' },
            h('li', null, rich('Every animation has **Play/Pause**, **Step** and a speed control. If your device asks for reduced motion, animations start paused.')),
            h('li', null, rich('Sliders work with the arrow keys. Diagrams you can drag also respond to the arrow keys when focused.')),
            h('li', null, rich('The **quick check** at the bottom of each page remembers what you have finished on this device only.')),
            h('li', null, 'The whole thing is one file. It works offline and sends nothing anywhere.'))]),
        section('a-credit', 'Credits', [
          h('p', null, rich('Type is Archivo by Omnibus-Type, under the SIL Open Font License 1.1. Numbers for R-134a are fitted to standard refrigerant tables. Each mechanism page lists the textbooks its equations come from.'))])));
  }

  function viewMissing(id) {
    document.title = 'Not found · OmniMechanics';
    markActive(null, null);
    return h('div', { class: 'view' },
      h('header', { class: 'mech-head' },
        h('p', { class: 'eyebrow', text: 'Not found' }),
        h('h1', { id: 'page-h', tabindex: '-1', text: 'That drawing is not in the library' }),
        h('p', { class: 'mech-hook' }, 'There is no mechanism called "' + id + '". ', h('a', { href: '#', text: 'Go back to the library' }), '.')));
  }

  // ---------------------------------------------------------------- router
  function route() {
    const raw = decodeURIComponent((location.hash || '').replace(/^#\/?/, ''));
    leave();
    let node;
    if (!raw || raw === 'main') node = viewHome();
    else if (raw === 'about') node = viewAbout();
    else {
      const def = OM.getMod(raw);
      node = def ? viewMech(def) : viewMissing(raw);
    }
    clear(mainEl).appendChild(node);
    updateRailChecks();
    if (!firstRoute) {
      window.scrollTo(0, 0);
      const hd = document.getElementById('page-h');
      if (hd) hd.focus({ preventScroll: true });
    }
    firstRoute = false;
  }

  function start() {
    OM.theme.refresh();
    const app = document.getElementById('app');
    buildShell(app);
    OM.theme.refresh();
    window.addEventListener('hashchange', route);
    route();
  }

  OM.debug = { stage: null };
  OM.ui = { start, route };
})(typeof globalThis !== 'undefined' ? globalThis : this);
