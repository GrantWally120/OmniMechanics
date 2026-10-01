/* The thin lens.
 *
 * All distances in one unit (the page uses centimetres). The lens is at x = 0, light travels left to right,
 * an object stands at x = -s with height h. A converging lens has f > 0 and a diverging lens f < 0.
 *     1 / s + 1 / s' = 1 / f        s' > 0: real image on the right, s' < 0: virtual image on the left
 *     m = -s' / s                    m < 0: upside down, m > 0: upright
 * The three principal rays: parallel to the axis then through the far focal point; through the centre of the
 * lens unbent; toward the near focal point then parallel to the axis. */
(function (root) {
  'use strict';
  const OM = root.OM || (root.OM = {});

  // Image of an object at distance s. atInfinity is true when the object sits on the focal point.
  function image(f, s, h) {
    const hh = h == null ? 1 : h;
    const d = s - f;
    if (Math.abs(d) < 1e-9) return { sp: Infinity, m: -Infinity, h: -Infinity, real: true, upright: false, atInfinity: true, kind: 'none' };
    const sp = (f * s) / d;
    const m = -sp / s;
    const real = sp > 0;
    return { sp, m, h: m * hh, real, upright: m > 0, enlarged: Math.abs(m) > 1, atInfinity: false, kind: kind(f, s) };
  }

  // What sort of instrument this arrangement is.
  function kind(f, s) {
    if (f < 0) return 'diverging';
    if (s > 2 * f + 1e-9) return 'camera';
    if (Math.abs(s - 2 * f) <= 1e-9) return 'copier';
    if (s > f + 1e-9) return 'projector';
    return 'magnifier';
  }

  // The principal rays as polylines in lens coordinates. Each ray is a list of points
  // [{x, y}] up to xEnd on the right, plus the dashed back-extension of the part after the lens when the
  // image is virtual. The object tip is at (-s, h).
  function rays(f, s, h, xEnd) {
    xEnd = xEnd == null ? 4 * Math.max(Math.abs(f), s) : xEnd;
    const tip = { x: -s, y: h };
    const out = [];
    // 1. parallel to the axis, then through (f, 0)
    const y1 = (x) => h - (h / f) * x;
    out.push({ name: 'parallel', pts: [tip, { x: 0, y: h }, { x: xEnd, y: y1(xEnd) }], back: f < 0 || s < f ? [{ x: 0, y: h }, { x: -xEnd, y: y1(-xEnd) }] : null });
    // 2. through the centre, straight on
    const y2 = (x) => -(h / s) * x;
    out.push({ name: 'centre', pts: [tip, { x: 0, y: 0 }, { x: xEnd, y: y2(xEnd) }], back: null });
    // 3. toward the near focal point (-f, 0), then horizontal
    if (Math.abs(s - f) > 1e-9) {
      const yL = (-h * f) / (s - f); // height at the lens
      out.push({ name: 'focal', pts: [tip, { x: 0, y: yL }, { x: xEnd, y: yL }], back: f < 0 || s < f ? [{ x: 0, y: yL }, { x: -xEnd, y: yL }] : null });
    }
    return out;
  }

  // Power in dioptres of a lens of focal length fMetres.
  const power = (fMetres) => 1 / fMetres;
  // Two thin lenses touching: the powers add.
  const combine = (f1, f2) => 1 / (1 / f1 + 1 / f2);
  // Distance of the object from the lens that gives magnification m (real image, converging lens).
  const objectForMagnification = (f, m) => f * (1 + 1 / Math.abs(m));

  const api = { image, kind, rays, power, combine, objectForMagnification };
  OM.lens = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
