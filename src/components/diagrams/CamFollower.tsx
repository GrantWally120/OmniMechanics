import { TAU, type DiagramProps } from "./shared";

const CX = 138;
const CY = 162;
const RB = 40; // base circle
const H = 30; // lobe height
const ROLLER = 8;
const ROD_X = 138;

const norm = (a: number) => {
  let x = a % TAU;
  if (x > Math.PI) x -= TAU;
  if (x < -Math.PI) x += TAU;
  return x;
};
const lift = (a: number) => H * Math.exp(-Math.pow(norm(a) / 0.62, 2));

// Static cam outline in local coordinates (lobe points along +x / angle 0).
const CAM_PATH = (() => {
  const N = 140;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU;
    const r = RB + lift(a);
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return d + "Z";
})();

function spring(x: number, y1: number, y2: number, coils = 5) {
  const seg = (y2 - y1) / (coils * 2);
  let d = `M ${x} ${y1}`;
  for (let i = 0; i < coils * 2; i++) {
    const nx = x + (i % 2 === 0 ? 8 : -8);
    d += ` L ${nx} ${(y1 + seg * (i + 1)).toFixed(1)}`;
  }
  return d + ` L ${x} ${y2}`;
}

export default function CamFollower({ t, detailed }: DiagramProps) {
  const rot = 1.25 * t;
  const rotDeg = (rot * 180) / Math.PI;

  const contactR = RB + lift(-Math.PI / 2 - rot);
  const rollerCY = CY - contactR - ROLLER;
  const followerTop = 44;

  return (
    <svg viewBox="0 0 340 240" className="diagram" role="img" aria-label="Cam and follower">
      {/* guide */}
      <line x1={ROD_X - 12} y1={followerTop} x2={ROD_X - 12} y2={CY - RB + 6} className="d-stroke d-hair" />
      <line x1={ROD_X + 12} y1={followerTop} x2={ROD_X + 12} y2={CY - RB + 6} className="d-stroke d-hair" />

      {/* return spring */}
      <path d={spring(ROD_X, followerTop + 8, rollerCY - ROLLER - 2)} className="d-stroke d-spring" fill="none" />

      {/* follower */}
      <rect x={ROD_X - 16} y={followerTop - 8} width={32} height={10} rx={2} className="d-fill d-part" />
      <line x1={ROD_X} y1={rollerCY} x2={ROD_X} y2={followerTop} className="d-stroke d-rod" />
      <circle cx={ROD_X} cy={rollerCY} r={ROLLER} className="d-fill d-part" />
      <circle cx={ROD_X} cy={rollerCY} r={2.5} className="d-hub" />

      {/* rotating cam */}
      <g transform={`translate(${CX} ${CY}) rotate(${rotDeg})`}>
        <path d={CAM_PATH} className="d-fill d-part-2" />
        <circle r={7} className="d-hub" />
        <line x1={0} y1={0} x2={RB * 0.7} y2={0} className="d-stroke d-hair" style={{ stroke: "var(--part-drive)" }} />
        <circle r={3} className="d-hub" style={{ fill: "var(--part-drive)" }} />
      </g>

      {detailed && (
        <g className="d-anno">
          <text x={ROD_X + 24} y={followerTop} className="d-label d-dim">follower</text>
          <text x={CX + RB + 30} y={CY + 4} className="d-label d-dim">cam</text>
          <text x={170} y={222} textAnchor="middle" className="d-label">lobe height = follower lift</text>
        </g>
      )}
    </svg>
  );
}
