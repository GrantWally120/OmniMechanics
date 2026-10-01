/* Simulation host.
 *
 * SimCore   owns one simulation instance: control values, canvas sizing,
 *           stepping and drawing. It has no idea about the page around it, so
 *           it can also render still thumbnails.
 * createStage builds the "drawing sheet" (toolbar, canvas, readouts, title
 *           block) and the controls, and runs the animation loop.
 *
 * A simulation object returned by def.create(host) may provide:
 *   ref {w,h}          reference size in world units (required)
 *   refNarrow {w,h}    alternative layout used when the canvas is under 560px wide
 *   init()             (re)start from the current host.ctl
 *   step(dt)           advance by dt seconds (omit and set static:true for still diagrams)
 *   draw(g, V, c)      paint one frame; V = {w,h,s,px(n),narrow,thumb}, c = theme colours
 *   readouts()         [{k, v, tone}]   tone: good | warn | bad
 *   caption()          short live status text, phase() -> step index
 *   describe()         sentence read out by screen readers after a change
 *   onControl(id, value, ctl), action(id), pointer(type,x,y,ev), key(k,ev), cursor(x,y)
 *   drag: 'x' | 'y' | 'both'   which touch drags the canvas may claim
 *   stepSize           seconds advanced by the Step button (default 0.05)
 *   thumb()            pose the sim for its card thumbnail */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});
  const { h, clear, rich, fmt, clamp, store } = OM.util;

  // ------------------------------------------------------------------ core
  class SimCore {
    constructor(def, canvas, opts) {
      opts = opts || {};
      this.def = def;
      this.canvas = canvas;
      this.g = canvas.getContext('2d');
      this.thumb = !!opts.thumb;
      this.onRequest = opts.onRequest || null;
      this.ctl = {};
      def.controls.forEach((c) => { if (c.id) this.ctl[c.id] = c.value; });
      this.time = 0;
      this.V = null;
      this.cw = 0;
      this.ch = 0;
      this.errors = 0;
      this.sim = def.create(this);
      if (this.sim.init) this.sim.init();
    }
    request() { if (this.onRequest) this.onRequest(); }
    // Change a control from inside the simulation (keeps the control panel in sync).
    set(id, v) { if (this.ui) this.ui(id, v); else this.setControl(id, v); }
    refFor(cw) { const s = this.sim; return cw < 560 && s.refNarrow ? s.refNarrow : s.ref; }

    makeView(cw, ch, ref, contain) {
      const dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
      const s = contain ? Math.min(cw / ref.w, ch / ref.h) : cw / ref.w;
      const V = {
        w: ref.w, h: ref.h, s, dpr, cw, ch,
        ox: contain ? (cw - ref.w * s) / 2 : 0,
        oy: contain ? (ch - ref.h * s) / 2 : 0,
        narrow: ref === this.sim.refNarrow,
        thumb: this.thumb,
        px(n) { return n / s; },
      };
      const c = this.canvas;
      c.width = Math.max(1, Math.round(cw * dpr));
      c.height = Math.max(1, Math.round(ch * dpr));
      c.style.width = cw + 'px';
      c.style.height = ch + 'px';
      this.V = V;
      this.cw = cw;
      this.ch = ch;
      if (this.sim.layout) this.sim.layout(V);
      return V;
    }
    resize(cw) {
      const ref = this.refFor(cw);
      return this.makeView(cw, Math.round((cw * ref.h) / ref.w), ref, false);
    }
    resizeThumb(cw, ch) { return this.makeView(cw, ch, this.sim.ref, true); }

    draw() {
      const V = this.V;
      if (!V || this.errors >= 3) return;
      const g = this.g;
      g.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
      g.clearRect(0, 0, V.cw, V.ch);
      g.save();
      g.translate(V.ox, V.oy);
      g.scale(V.s, V.s);
      try {
        this.sim.draw(g, V, OM.theme.c);
      } catch (e) {
        this.errors++;
        console.error('Draw error in ' + this.def.id + ':', e);
      }
      g.restore();
    }
    step(dt) {
      if (this.errors >= 3) return;
      try {
        if (this.sim.step) this.sim.step(dt);
        this.time += dt;
      } catch (e) {
        this.errors++;
        console.error('Step error in ' + this.def.id + ':', e);
      }
    }
    setControl(id, v) {
      this.ctl[id] = v;
      if (this.sim.onControl) this.sim.onControl(id, v, this.ctl);
    }
    reset() {
      this.time = 0;
      this.errors = 0;
      if (this.sim.init) this.sim.init();
    }
    destroy() { if (this.sim.destroy) this.sim.destroy(); }
  }

  // Still image of a mechanism for the library cards.
  function renderThumb(def, canvas, w, hgt) {
    const core = new SimCore(def, canvas, { thumb: true });
    core.resizeThumb(w, hgt);
    if (core.sim.thumb) core.sim.thumb();
    else if (def.thumbAdvance) for (let t = 0; t < def.thumbAdvance; t += 1 / 30) core.step(1 / 30);
    core.draw();
    core.destroy();
  }

  // ---------------------------------------------------------------- icons
  const ICONS = {
    play: 'M8 5v14l11-7z',
    pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
    reset: 'M12 5a7 7 0 1 1-6.6 9.3l1.9-.6A5 5 0 1 0 12 7v3L7 6l5-4z',
    step: 'M6 5v14l9-7zM17 5h2v14h-2z',
  };
  function icon(name) {
    return h('@svg', { viewBox: '0 0 24 24', width: 18, height: 18, 'aria-hidden': 'true', focusable: 'false', class: 'ico' },
      h('@path', { d: ICONS[name], fill: 'currentColor' }));
  }

  // ---------------------------------------------------------------- stage
  function createStage(def, opts) {
    opts = opts || {};
    const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let speed = store.get('speed', 1);
    if ([0.25, 0.5, 1, 2].indexOf(speed) < 0) speed = 1;

    const canvas = h('canvas', {
      class: 'sheet-canvas',
      role: 'img',
      'aria-label': def.title + ' diagram. ' + (def.alt || 'Use the controls below to change it.'),
    });
    const wrap = h('div', { class: 'sheet-stage' }, canvas);
    const capText = h('span', { class: 'cap-text' });
    const caption = h('p', { class: 'sheet-caption' }, h('span', { class: 'cap-dot', 'aria-hidden': 'true' }), capText);
    const roEl = h('dl', { class: 'readouts' });
    const live = h('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    const notice = h('p', { class: 'sheet-notice', hidden: true });

    const core = new SimCore(def, canvas, { onRequest: requestDraw });
    core.ui = (id, v) => setValue(id, v, false);
    const sim = core.sim;
    const isStatic = !!sim.static || !sim.step;

    let playing = !reduceMotion && !isStatic;
    let visible = true;
    let docVisible = typeof document === 'undefined' ? true : !document.hidden;
    let destroyed = false;
    let raf = 0;
    let last = 0;
    let lastRo = 0;
    let lastPhase = -1;
    let announceTimer = 0;

    // ---- toolbar
    const playBtn = h('button', { type: 'button', class: 'tool', 'aria-label': 'Pause' }, icon('pause'));
    const resetBtn = h('button', { type: 'button', class: 'tool', 'aria-label': 'Restart', title: 'Restart' }, icon('reset'), h('span', { class: 'tool-lbl', text: 'Restart' }));
    const stepBtn = h('button', { type: 'button', class: 'tool', 'aria-label': 'Step forward', title: 'Step forward' }, icon('step'), h('span', { class: 'tool-lbl', text: 'Step' }));
    const speedBtns = [0.25, 0.5, 1, 2].map((v) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': String(v === speed), tabindex: v === speed ? 0 : -1, dataset: { v },
      on: { click: () => setSpeed(v) },
    }, v + '×'));
    const speedGroup = h('div', { class: 'seg seg-small', role: 'radiogroup', 'aria-label': 'Animation speed' }, speedBtns);
    rovingKeys(speedGroup, speedBtns, (b) => setSpeed(+b.dataset.v));
    const toolbar = h('div', { class: 'sheet-bar' },
      isStatic ? null : [playBtn, stepBtn],
      resetBtn,
      isStatic ? null : speedGroup,
      caption);

    function setSpeed(v) {
      speed = v;
      store.set('speed', v);
      speedBtns.forEach((b) => { const on = +b.dataset.v === v; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    }
    function setPlaying(p) {
      playing = p;
      const lbl = p ? 'Pause' : 'Play';
      playBtn.setAttribute('aria-label', lbl);
      playBtn.title = lbl;
      clear(playBtn).appendChild(icon(p ? 'pause' : 'play'));
      notice.hidden = !(reduceMotion && !p && !isStatic);
      if (p) kick();
      announceSoon(p ? 'Playing.' : 'Paused.');
    }
    playBtn.addEventListener('click', () => setPlaying(!playing));
    stepBtn.addEventListener('click', () => {
      if (playing) setPlaying(false);
      core.step(sim.stepSize || 0.05);
      core.draw();
      updateReadouts(true);
    });
    resetBtn.addEventListener('click', () => {
      core.reset();
      core.draw();
      updateReadouts(true);
      announceSoon('Restarted.');
    });
    if (reduceMotion && !isStatic) {
      notice.hidden = false;
      notice.textContent = 'Animation is paused because your device asks for less motion. Press Play, or use Step to move it a little at a time.';
    }
    setPlayingUi();
    function setPlayingUi() {
      const lbl = playing ? 'Pause' : 'Play';
      playBtn.setAttribute('aria-label', lbl);
      playBtn.title = lbl;
      clear(playBtn).appendChild(icon(playing ? 'pause' : 'play'));
    }

    // ---- title block
    const block = h('div', { class: 'titleblock' },
      cell('Drawing', def.number),
      cell('Subject', def.title),
      cell('Units', def.units),
      cell('Sheet', 'Live, not to scale'));
    function cell(k, v) { return h('div', { class: 'tb-cell' }, h('span', { class: 'tb-k', text: k }), h('span', { class: 'tb-v', text: v })); }

    const sheet = h('section', { class: 'sheet', 'aria-label': def.title + ' simulation' },
      toolbar, notice, wrap, roEl, block, live);

    // ---- controls
    const refs = {};
    const controlsEl = h('section', { class: 'controls', 'aria-label': 'Controls for ' + def.title }, h('h2', { class: 'sr-only', text: 'Controls' }));
    const ctlNodes = [];
    def.controls.forEach((c) => {
      const node = buildControl(c);
      if (node) { ctlNodes.push({ c, node }); controlsEl.appendChild(node); }
    });
    if (!def.controls.length) controlsEl.hidden = true;

    function valueText(c, v) {
      if (c.fmt) return c.fmt(v, core.ctl);
      return fmt(v, c.dec || 0) + (c.unit ? ' ' + c.unit : '');
    }
    function buildControl(c) {
      const uid = def.id + '-' + (c.id || 'h' + Math.random().toString(36).slice(2, 6));
      if (c.type === 'heading') return h('h3', { class: 'ctl-heading', text: c.label });
      if (c.type === 'range') {
        const out = h('output', { for: uid, class: 'ctl-val' });
        const input = h('input', { type: 'range', id: uid, min: c.min, max: c.max, step: c.step || 1, value: c.value });
        input.addEventListener('input', () => setValue(c.id, parseFloat(input.value), true));
        refs[c.id] = {
          c, input, out,
          set(v) {
            input.value = String(v);
            const t = valueText(c, v);
            out.textContent = t;
            input.setAttribute('aria-valuetext', t);
            input.style.setProperty('--fill', ((v - c.min) / (c.max - c.min)) * 100 + '%');
          },
        };
        refs[c.id].set(c.value);
        return h('div', { class: 'ctl ctl-range', dataset: { id: c.id } },
          h('div', { class: 'ctl-row' }, h('label', { for: uid, text: c.label }), out),
          input,
          c.hint ? h('p', { class: 'ctl-hint', text: c.hint }) : null);
      }
      if (c.type === 'seg') {
        const btns = c.options.map((o) => h('button', {
          type: 'button', role: 'radio', 'aria-checked': String(o.v === c.value), tabindex: o.v === c.value ? 0 : -1,
          dataset: { v: String(o.v) },
          on: { click: () => setValue(c.id, o.v, true) },
        }, o.l));
        const group = h('div', { class: 'seg', role: 'radiogroup', 'aria-labelledby': uid + '-l' }, btns);
        rovingKeys(group, btns, (b) => setValue(c.id, c.options.find((o) => String(o.v) === b.dataset.v).v, true));
        refs[c.id] = {
          c,
          set(v) {
            btns.forEach((b) => { const on = b.dataset.v === String(v); b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
          },
        };
        return h('div', { class: 'ctl ctl-seg', dataset: { id: c.id } },
          h('span', { class: 'ctl-label', id: uid + '-l', text: c.label }), group,
          c.hint ? h('p', { class: 'ctl-hint', text: c.hint }) : null);
      }
      if (c.type === 'toggle') {
        const btn = h('button', { type: 'button', role: 'switch', 'aria-checked': String(!!c.value), 'aria-labelledby': uid + '-l', class: 'switch' }, h('span', { class: 'knob' }));
        btn.addEventListener('click', () => setValue(c.id, !core.ctl[c.id], true));
        refs[c.id] = { c, set(v) { btn.setAttribute('aria-checked', String(!!v)); } };
        return h('div', { class: 'ctl ctl-toggle', dataset: { id: c.id } },
          h('span', { class: 'ctl-label', id: uid + '-l', text: c.label }), btn,
          c.hint ? h('p', { class: 'ctl-hint', text: c.hint }) : null);
      }
      // button
      const b = h('button', { type: 'button', class: 'btn' + (c.primary ? ' btn-primary' : ''), id: uid, text: c.label });
      b.addEventListener('click', () => {
        if (sim.action) sim.action(c.id);
        if (c.playOnClick && !playing && !isStatic) setPlaying(true);
        core.draw();
        updateReadouts(true);
        announceSoon(c.label + '.');
      });
      refs[c.id] = { c, set() {} };
      return h('div', { class: 'ctl ctl-button', dataset: { id: c.id } }, b, c.hint ? h('p', { class: 'ctl-hint', text: c.hint }) : null);
    }
    function refreshVisibility() {
      ctlNodes.forEach(({ c, node }) => { if (c.showIf) node.hidden = !c.showIf(core.ctl); });
    }
    function setValue(id, v, user) {
      const r = refs[id];
      if (!r) return;
      const c = r.c;
      if (c.type === 'range') v = clamp(v, c.min, c.max);
      core.setControl(id, v);
      r.set(v);
      refreshVisibility();
      core.request();
      updateReadouts(true);
      if (user) announceSoon(c.label + ' ' + (c.type === 'range' ? valueText(c, v) : c.type === 'toggle' ? (v ? 'on' : 'off') : (c.options.find((o) => o.v === v) || {}).l) + '.');
      if (opts.onControl) opts.onControl(id, v, user);
    }
    refreshVisibility();

    // ---- readouts and caption
    let roKeys = '';
    let roCells = [];
    function updateReadouts(force) {
      if (!sim.readouts) return;
      const list = sim.readouts();
      const keys = list.map((r) => r.k).join('|');
      if (keys !== roKeys) {
        roKeys = keys;
        clear(roEl);
        roCells = list.map((r) => {
          const dd = h('dd');
          roEl.appendChild(h('div', { class: 'ro' }, h('dt', { text: r.k }), dd));
          return dd;
        });
      }
      list.forEach((r, i) => {
        const dd = roCells[i];
        if (dd.textContent !== r.v) dd.textContent = r.v;
        const tone = r.tone || '';
        if (dd.dataset.tone !== tone) dd.dataset.tone = tone;
      });
      if (sim.caption) {
        const t = sim.caption();
        if (capText.textContent !== t) capText.textContent = t;
      }
      if (sim.phase && opts.onPhase) {
        const p = sim.phase();
        if (p !== lastPhase) { lastPhase = p; opts.onPhase(p); }
      }
    }
    function announceSoon(msg) {
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => {
        const extra = sim.describe ? ' ' + sim.describe() : '';
        live.textContent = (msg + extra).trim();
      }, 650);
    }

    // ---- loop
    function running() { return playing && visible && docVisible && !destroyed && core.errors < 3; }
    function frame(t) {
      raf = 0;
      if (destroyed) return;
      if (!running()) { last = 0; return; }
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      core.step(dt * speed);
      core.draw();
      if (t - lastRo > 100) { lastRo = t; updateReadouts(); }
      raf = requestAnimationFrame(frame);
    }
    function kick() {
      if (!raf && running()) { last = 0; raf = requestAnimationFrame(frame); }
    }
    let drawPending = false;
    function requestDraw() {
      if (destroyed || drawPending) return;
      if (running()) return; // the loop will draw
      drawPending = true;
      requestAnimationFrame(() => { drawPending = false; if (!destroyed) core.draw(); });
    }
    const onVis = () => { docVisible = !document.hidden; kick(); };
    document.addEventListener('visibilitychange', onVis);
    let io = null;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; kick(); }, { threshold: 0 });
      io.observe(sheet);
    }
    let ro = null;
    function measure() {
      const w = Math.floor(wrap.clientWidth);
      if (w < 40) return;
      core.resize(w);
      canvas.dataset.layout = core.V.narrow ? 'narrow' : 'wide';
      core.draw();
    }
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(() => measure());
      ro.observe(wrap);
    }
    const onTheme = OM.theme.onChange(() => core.draw());

    // ---- pointer and keyboard
    if (sim.drag) canvas.style.touchAction = sim.drag === 'x' ? 'pan-y' : sim.drag === 'y' ? 'pan-x' : 'none';
    function toWorld(ev) {
      const r = canvas.getBoundingClientRect();
      const V = core.V;
      return { x: (ev.clientX - r.left - V.ox) / V.s, y: (ev.clientY - r.top - V.oy) / V.s };
    }
    let dragging = false;
    if (sim.pointer) {
      canvas.addEventListener('pointerdown', (ev) => {
        const p = toWorld(ev);
        if (sim.pointer('down', p.x, p.y, ev)) {
          dragging = true;
          try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ }
          ev.preventDefault();
          core.request();
          if (!running()) core.draw();
        }
      });
      canvas.addEventListener('pointermove', (ev) => {
        const p = toWorld(ev);
        if (dragging) {
          sim.pointer('move', p.x, p.y, ev);
          if (!running()) core.draw();
          updateReadouts();
        } else if (sim.cursor) canvas.style.cursor = sim.cursor(p.x, p.y) || '';
      });
      const end = (ev) => {
        if (!dragging) return;
        dragging = false;
        const p = toWorld(ev);
        sim.pointer('up', p.x, p.y, ev);
        if (!running()) core.draw();
        updateReadouts(true);
        announceSoon('');
      };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
    }
    if (sim.key) {
      canvas.tabIndex = 0;
      canvas.classList.add('focusable');
      canvas.addEventListener('keydown', (ev) => {
        if (sim.key(ev.key, ev)) {
          ev.preventDefault();
          if (!running()) core.draw();
          updateReadouts(true);
          announceSoon('');
        }
      });
    }

    // ---- start
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => { measure(); updateReadouts(true); kick(); });
    }

    const stage = {
      def, core, sheet, controlsEl, canvas,
      setValue: (id, v) => setValue(id, v, true),
      applyPreset(p) {
        if (p.reset) core.reset();
        Object.keys(p.set || {}).forEach((k) => setValue(k, p.set[k], false));
        if (p.action && sim.action) sim.action(p.action);
        if (p.play && !isStatic && !playing) setPlaying(true);
        core.request();
        core.draw();
        updateReadouts(true);
        announceSoon(p.label + '.');
      },
      // Deterministic stepping for tests: advance simulated time without rendering.
      advance(seconds, dt) {
        dt = dt || 1 / 60;
        for (let t = 0; t < seconds; t += dt) core.step(dt);
        core.draw();
        updateReadouts(true);
      },
      getPlaying: () => playing,
      setPlaying,
      isStatic,
      // used by the keyboard shortcuts
      togglePlay() { if (!isStatic) setPlaying(!playing); },
      restart() { core.reset(); core.draw(); updateReadouts(true); announceSoon('Restarted.'); },
      stepOnce() { if (isStatic) return; if (playing) setPlaying(false); core.step(sim.stepSize || 0.05); core.draw(); updateReadouts(true); },
      setSpeed(v) { if (!isStatic && [0.25, 0.5, 1, 2].indexOf(v) >= 0) setSpeed(v); },
      // current control values, and the values the controls started with
      values() { return Object.assign({}, core.ctl); },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        clearTimeout(announceTimer);
        document.removeEventListener('visibilitychange', onVis);
        if (io) io.disconnect();
        if (ro) ro.disconnect();
        onTheme();
        core.destroy();
      },
    };
    return stage;
  }

  // Arrow-key navigation inside a radiogroup (roving tabindex).
  function rovingKeys(group, btns, pick) {
    group.addEventListener('keydown', (ev) => {
      const k = ev.key;
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].indexOf(k) < 0) return;
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      let n = i;
      if (k === 'ArrowRight' || k === 'ArrowDown') n = (i + 1) % btns.length;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') n = (i - 1 + btns.length) % btns.length;
      else if (k === 'Home') n = 0;
      else n = btns.length - 1;
      ev.preventDefault();
      btns[n].focus();
      pick(btns[n]);
    });
  }

  OM.SimCore = SimCore;
  OM.createStage = createStage;
  OM.renderThumb = renderThumb;
})(typeof globalThis !== 'undefined' ? globalThis : this);
