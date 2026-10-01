/* A very small sound helper: short clicks made with the Web Audio API, nothing downloaded.
 * Sound is always opt-in (a switch in the mechanism that uses it), and every call is safe
 * on a device with no audio: it just does nothing. */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});
  let ctx = null;

  function context() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') { try { ctx.resume().catch(() => {}); } catch (e) { /* no audio */ } }
    return ctx;
  }

  // Call from a click or key press so the browser lets the sound start.
  function prime() { context(); }

  // A short click. pitch 1 is about 900 Hz; louder gain is up to 1.
  function tick(pitch, gain, ms) {
    const c = context();
    if (!c || c.state !== 'running') return;
    try {
      const t = c.currentTime;
      const dur = (ms || 45) / 1000;
      const osc = c.createOscillator();
      const flt = c.createBiquadFilter();
      const amp = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900 * (pitch || 1), t);
      osc.frequency.exponentialRampToValueAtTime(300 * (pitch || 1), t + dur);
      flt.type = 'bandpass';
      flt.frequency.value = 1400 * (pitch || 1);
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.4 * (gain == null ? 0.5 : gain)), t + 0.003);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(flt); flt.connect(amp); amp.connect(c.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch (e) { /* no audio */ }
  }

  OM.audio = { prime, tick };
  if (typeof module !== 'undefined' && module.exports) module.exports = OM.audio;
})(typeof globalThis !== 'undefined' ? globalThis : this);
