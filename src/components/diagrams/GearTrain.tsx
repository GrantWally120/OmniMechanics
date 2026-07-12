import { gearPath, polar, TAU, type DiagramProps } from "./shared";

interface GearSpec {
  cx: number;
  cy: number;
  teeth: number;
  rOuter: number;
  module: number;
}

// Meshing set: pitch radius = module * teeth / 2. Centres are placed the
// correct distance apart (plus a hair of clearance) so the teeth read as
// engaged without ever interpenetrating.
const M = 5.2;
const A: GearSpec = { cx: 92, cy: 150, teeth: 12, rOuter: 12 * M / 2 + M, module: M };
const dAB = (A.teeth + 20) * (M / 2) * 1.02;
const angAB = -0.32;
const B: GearSpec = {
  cx: A.cx + dAB * Math.cos(angAB),
  cy: A.cy + dAB * Math.sin(angAB),
  teeth: 20,
  rOuter: (20 * M) / 2 + M,
  module: M,
};
const dBC = (B.teeth + 13) * (M / 2) * 1.02;
const angBC = 0.42;
const C: GearSpec = {
  cx: B.cx + dBC * Math.cos(angBC),
  cy: B.cy + dBC * Math.sin(angBC),
  teeth: 13,
  rOuter: (13 * M) / 2 + M,
  module: M,
};

function Gear({
  spec,
  angle,
  accent,
}: {
  spec: GearSpec;
  angle: number;
  accent?: boolean;
}) {
  const { cx, cy, teeth, rOuter } = spec;
  const holeR = rOuter * 0.52;
  const holes = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * TAU;
    return polar(cx, cy, holeR, a);
  });
  return (
    <g transform={`rotate(${(angle * 180) / Math.PI} ${cx} ${cy})`}>
      <path
        d={gearPath(cx, cy, rOuter, teeth, 2 * spec.module)}
        className="d-fill"
        style={accent ? { fill: "var(--part-drive)" } : undefined}
      />
      {holes.map((h, i) => (
        <circle key={i} cx={h.x} cy={h.y} r={rOuter * 0.11} className="d-hole" />
      ))}
      <circle cx={cx} cy={cy} r={rOuter * 0.2} className="d-hub" />
      {/* keyway mark makes the rotation legible */}
      <rect
        x={cx - 1.4}
        y={cy - rOuter * 0.2}
        width={2.8}
        height={rOuter * 0.2}
        className="d-key"
      />
    </g>
  );
}

export default function GearTrain({ t, detailed }: DiagramProps) {
  const w = 1.15 * t; // base shaft speed (rad/s)
  const angA = w;
  const angB = -angA * (A.teeth / B.teeth) + Math.PI / B.teeth;
  const angC = -angB * (B.teeth / C.teeth) + Math.PI / C.teeth;

  return (
    <svg viewBox="0 0 340 240" className="diagram" role="img" aria-label="Meshing spur gears">
      <Gear spec={A} angle={angA} accent />
      <Gear spec={B} angle={angB} />
      <Gear spec={C} angle={angC} />

      {detailed && (
        <g className="d-anno">
          <text x={A.cx} y={A.cy + A.rOuter + 16} textAnchor="middle" className="d-label d-strong">
            DRIVER · 12T
          </text>
          <text x={B.cx} y={B.cy - B.rOuter - 8} textAnchor="middle" className="d-label">
            20T
          </text>
          <text x={C.cx} y={C.cy + C.rOuter + 16} textAnchor="middle" className="d-label">
            13T
          </text>
          <text x={170} y={26} textAnchor="middle" className="d-label d-dim">
            ratio 12 : 20 — output turns 0.6× as fast, 1.67× the torque
          </text>
        </g>
      )}
    </svg>
  );
}
