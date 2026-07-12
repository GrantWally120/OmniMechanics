export interface DiagramProps {
  /** Elapsed shaft time in seconds. */
  t: number;
  /** Detail view shows extra labels & annotations. */
  detailed?: boolean;
}

export const TAU = Math.PI * 2;

export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smooth 0→1 ease with zero slope at both ends. */
export const smoothstep = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

/** Cartesian point on a circle. SVG y grows downward, handled by caller. */
export function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/** Triangle-wave 0→1→0 over one unit of phase — handy for reciprocating parts. */
export const pingpong = (t: number) => {
  const p = ((t % 1) + 1) % 1;
  return p < 0.5 ? p * 2 : 2 - p * 2;
};

/** Fractional part, always in [0,1). */
export const frac = (t: number) => ((t % 1) + 1) % 1;

/**
 * Build the outline of a spur gear as an SVG path string.
 * A clean trapezoidal-tooth approximation — reads unmistakably as a gear.
 */
export function gearPath(
  cx: number,
  cy: number,
  rOuter: number,
  teeth: number,
  toothDepth = rOuter * 0.16,
  toothWidth = 0.42 // fraction of the tooth pitch occupied by the tooth tip
): string {
  const rRoot = rOuter - toothDepth;
  const step = TAU / teeth;
  const half = step / 2;
  const tip = half * toothWidth;
  const cmds: string[] = [];

  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const p1 = polar(cx, cy, rRoot, a - half);
    const p2 = polar(cx, cy, rRoot, a - tip);
    const p3 = polar(cx, cy, rOuter, a - tip * 0.7);
    const p4 = polar(cx, cy, rOuter, a + tip * 0.7);
    const p5 = polar(cx, cy, rRoot, a + tip);
    if (i === 0) cmds.push(`M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`);
    else cmds.push(`L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`);
    cmds.push(`L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`);
    cmds.push(`L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`);
    cmds.push(`L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`);
    cmds.push(`L ${p5.x.toFixed(2)} ${p5.y.toFixed(2)}`);
  }
  cmds.push("Z");
  return cmds.join(" ");
}

export const deg = (rad: number) => (rad * 180) / Math.PI;
