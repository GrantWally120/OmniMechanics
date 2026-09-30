/* Small utilities shared by everything else: maths helpers, a tiny DOM
 * builder, a safe rich-text parser (no innerHTML anywhere), and guarded
 * localStorage. */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const wrap = (v, m) => ((v % m) + m) % m;
  const smooth = (t) => t * t * (3 - 2 * t);
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

  // Number formatting with a real minus sign and thousands separators.
  function fmt(v, d) {
    if (!Number.isFinite(v)) return '–';
    const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
    return (v < 0 && Number(s.replace(/,/g, '')) !== 0 ? '−' : '') + s;
  }

  // ---- DOM builder -------------------------------------------------------
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function h(tag, props) {
    const svg = tag.charAt(0) === '@';
    const el = svg ? document.createElementNS(SVG_NS, tag.slice(1)) : document.createElement(tag);
    if (props) {
      for (const k of Object.keys(props)) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.setAttribute('class', v);
        else if (k === 'on') for (const ev of Object.keys(v)) el.addEventListener(ev, v[ev]);
        else if (k === 'dataset') for (const d of Object.keys(v)) el.dataset[d] = v[d];
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, String(v));
      }
    }
    for (let i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) kid.forEach((k) => append(el, k));
    else if (kid instanceof Node) el.appendChild(kid);
    else el.appendChild(document.createTextNode(String(kid)));
  }
  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  // ---- Rich text ---------------------------------------------------------
  // **bold**  *italic*  `code`  ~subscript~  ^superscript^
  const RICH = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|~[^~\s]+~|\^[^^\s]+\^)/;
  function rich(str) {
    const frag = document.createDocumentFragment();
    String(str).split(RICH).forEach((part) => {
      if (!part) return;
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) frag.appendChild(h('strong', { text: part.slice(2, -2) }));
      else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) frag.appendChild(h('code', { text: part.slice(1, -1) }));
      else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) frag.appendChild(h('em', { text: part.slice(1, -1) }));
      else if (part.startsWith('~') && part.endsWith('~') && part.length > 2) frag.appendChild(h('sub', { text: part.slice(1, -1) }));
      else if (part.startsWith('^') && part.endsWith('^') && part.length > 2) frag.appendChild(h('sup', { text: part.slice(1, -1) }));
      else frag.appendChild(document.createTextNode(part));
    });
    return frag;
  }
  const richText = (str) => str.replace(/\*\*|\*|`|~|\^/g, '');

  // ---- Storage (never throws) -------------------------------------------
  const KEY = 'omnimech:v2';
  let memory = {};
  const store = {
    all() {
      try {
        const s = localStorage.getItem(KEY);
        if (s) memory = JSON.parse(s) || {};
      } catch (e) { /* private mode or blocked: keep the in-memory copy */ }
      return memory;
    },
    get(k, dflt) {
      const a = store.all();
      return k in a ? a[k] : dflt;
    },
    set(k, v) {
      memory[k] = v;
      try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch (e) { /* ignore */ }
    },
  };

  // Collect every finite-number problem in a plain object (used by the tests).
  function findBadNumbers(obj, path, out, depth) {
    out = out || [];
    path = path || 'state';
    depth = depth || 0;
    if (depth > 6 || obj == null) return out;
    if (typeof obj === 'number') {
      if (!Number.isFinite(obj)) out.push(path + ' = ' + obj);
    } else if (ArrayBuffer.isView(obj)) {
      for (let i = 0; i < obj.length; i++) if (!Number.isFinite(obj[i])) { out.push(path + '[' + i + '] = ' + obj[i]); break; }
    } else if (Array.isArray(obj)) {
      obj.slice(0, 400).forEach((v, i) => findBadNumbers(v, path + '[' + i + ']', out, depth + 1));
    } else if (typeof obj === 'object' && !(obj instanceof Node)) {
      Object.keys(obj).forEach((k) => {
        if (typeof obj[k] !== 'function') findBadNumbers(obj[k], path + '.' + k, out, depth + 1);
      });
    }
    return out;
  }

  OM.util = { clamp, lerp, wrap, smooth, TAU, DEG, fmt, h, clear, rich, richText, store, findBadNumbers };
  if (typeof module !== 'undefined' && module.exports) module.exports = OM.util;
})(typeof globalThis !== 'undefined' ? globalThis : this);
