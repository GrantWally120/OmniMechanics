/* Mechanism registry.
 *
 * A mechanism definition looks like:
 *   {
 *     id, title, group, hook,               // hook: one line shown on the card
 *     units,                                // shown in the drawing title block
 *     controls: [ {id, type, label, ...} ], // see core/30-sim.js for control types
 *     create(host) -> sim,                  // sim: {ref, init, step, draw, readouts, ...}
 *     content: { intro, steps, principle, myth, tries, quiz, sources,
 *                era, level (1 to 5), parts: [{name, note}], facts: [text] },
 *   }
 * register() validates the shape so a typo fails loudly at load time. */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  const groups = [
    { id: 'machines', name: 'Machines and forces', blurb: 'Engines, gears and lifting: how small pushes become big ones.' },
    { id: 'electric', name: 'Electricity and logic', blurb: 'Motors, transformers, solar panels and the gates that add numbers.' },
    { id: 'heat', name: 'Heat, air and water', blurb: 'Cooling, lift, rain and wind: heat and air at work.' },
    { id: 'signals', name: 'Waves, signals and space', blurb: 'Silence made from sound, position from time, orbits from falling, images from glass.' },
  ];

  const mods = [];
  const CONTROL_TYPES = ['range', 'seg', 'toggle', 'button', 'heading'];

  function fail(id, msg) { throw new Error('Mechanism "' + id + '": ' + msg); }

  function register(def) {
    const id = def && def.id;
    if (!id || !/^[a-z0-9-]+$/.test(id)) fail(id, 'needs a lowercase id');
    if (mods.some((m) => m.id === id)) fail(id, 'duplicate id');
    ['title', 'hook', 'units'].forEach((k) => { if (typeof def[k] !== 'string' || !def[k]) fail(id, 'missing ' + k); });
    if (!groups.some((g) => g.id === def.group)) fail(id, 'unknown group ' + def.group);
    if (typeof def.create !== 'function') fail(id, 'missing create()');
    def.controls = def.controls || [];
    const seen = {};
    def.controls.forEach((c) => {
      if (CONTROL_TYPES.indexOf(c.type) < 0) fail(id, 'bad control type ' + c.type);
      if (c.type !== 'heading' && !c.id) fail(id, 'control without id');
      if (c.id) { if (seen[c.id]) fail(id, 'duplicate control ' + c.id); seen[c.id] = 1; }
      if (c.type === 'range' && !(c.min < c.max && c.value >= c.min && c.value <= c.max)) fail(id, 'bad range ' + c.id);
      if (c.type === 'seg' && !(c.options && c.options.length > 1)) fail(id, 'seg needs options ' + c.id);
    });
    const ct = def.content;
    if (!ct || !ct.steps || !ct.steps.length || !ct.principle || !ct.myth || !ct.quiz || !ct.quiz.length) fail(id, 'incomplete content');
    if (typeof ct.era !== 'string' || !ct.era) fail(id, 'content needs an era');
    if (!(ct.level >= 1 && ct.level <= 5)) fail(id, 'content.level must be 1 to 5');
    if (!Array.isArray(ct.parts) || ct.parts.length < 3 || ct.parts.some((p) => !p.name || !p.note)) fail(id, 'content needs at least 3 parts with name and note');
    if (!Array.isArray(ct.facts) || ct.facts.length < 2) fail(id, 'content needs at least 2 facts');
    ct.quiz.forEach((q, i) => {
      if (!(q.a >= 0 && q.a < q.opts.length)) fail(id, 'quiz ' + i + ' answer index out of range');
    });
    (ct.tries || []).forEach((t) => {
      Object.keys(t.set || {}).forEach((k) => { if (!seen[k]) fail(id, 'try-this sets unknown control ' + k); });
    });
    def.order = mods.length;
    def.number = 'OM-' + String(mods.length + 1).padStart(2, '0');
    mods.push(def);
    return def;
  }

  // Once every module has registered: list them group by group (files within a group keep
  // their load order) and number them in that order, so the numbers read 01, 02, 03 down the page.
  function finalize() {
    const gi = (m) => groups.findIndex((g) => g.id === m.group);
    mods.sort((a, b) => gi(a) - gi(b) || a.order - b.order);
    mods.forEach((m, i) => { m.order = i; m.number = 'OM-' + String(i + 1).padStart(2, '0'); });
  }

  OM.groups = groups;
  OM.mods = mods;
  OM.register = register;
  OM.finalize = finalize;
  OM.getMod = (id) => mods.find((m) => m.id === id) || null;
  if (typeof module !== 'undefined' && module.exports) module.exports = { groups, mods, register, finalize };
})(typeof globalThis !== 'undefined' ? globalThis : this);
