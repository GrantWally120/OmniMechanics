import { type DiagramProps } from "./shared";

const L = { x: 64, w: 36 }; // master (small)
const R = { x: 208, w: 86 }; // ram (large)
const BASE = 176;
const RATIO = L.w / R.w;

export default function Hydraulic({ t, detailed }: DiagramProps) {
  const press = (1 - Math.cos(1.35 * t)) / 2;
  const dLeft = press * 52;

  const lTop = 76 + dLeft;
  const lBot = lTop + 12;
  const dRight = dLeft * RATIO;
  const rTop = 116 - dRight;
  const rBot = rTop + 14;

  return (
    <svg viewBox="0 0 340 240" className="diagram" role="img" aria-label="Hydraulic press">
      {/* frame */}
      <rect x={40} y={BASE} width={264} height={10} className="d-fill-2" />
      <rect x={40} y={44} width={264} height={11} className="d-fill-2" />
      <rect x={40} y={44} width={11} height={142} className="d-fill-2" />
      <rect x={293} y={44} width={11} height={142} className="d-fill-2" />

      {/* fluid: two columns + connecting channel */}
      <g className="d-fluid">
        <rect x={L.x} y={lBot} width={L.w} height={BASE - lBot} />
        <rect x={R.x} y={rBot} width={R.w} height={BASE - rBot} />
        <rect x={L.x} y={BASE - 16} width={R.x + R.w - L.x} height={16} />
      </g>

      {/* cylinder walls */}
      <path
        d={`M ${L.x} 68 V ${BASE} M ${L.x + L.w} 68 V ${BASE}`}
        className="d-stroke d-thick"
      />
      <path
        d={`M ${R.x} 68 V ${BASE} M ${R.x + R.w} 68 V ${BASE}`}
        className="d-stroke d-thick"
      />

      {/* master piston + input rod */}
      <rect x={L.x + 1} y={lTop} width={L.w - 2} height={12} className="d-fill d-part" />
      <line x1={L.x + L.w / 2} y1={lTop} x2={L.x + L.w / 2} y2={55} className="d-stroke d-rod" />
      <rect x={L.x - 4} y={50} width={L.w + 8} height={6} className="d-fill d-part" />

      {/* ram piston + workpiece */}
      <rect x={R.x + 1} y={rTop} width={R.w - 2} height={14} className="d-fill d-part" />
      <rect x={R.x + 12} y={rTop - 20} width={R.w - 24} height={20} className="d-fill d-part-2" />

      {/* force arrows */}
      <g style={{ stroke: "var(--signal)" }}>
        <line x1={L.x + L.w / 2} y1={30} x2={L.x + L.w / 2} y2={48} strokeWidth={2.4} />
        <path d={`M ${L.x + L.w / 2} 48 l -4 -7 l 8 0 z`} style={{ fill: "var(--signal)" }} stroke="none" />
      </g>
      <g style={{ stroke: "var(--good)" }}>
        <line x1={R.x + R.w / 2} y1={rTop - 24} x2={R.x + R.w / 2} y2={rTop - 44} strokeWidth={6} />
        <path
          d={`M ${R.x + R.w / 2} ${rTop - 48} l -8 10 l 16 0 z`}
          style={{ fill: "var(--good)" }}
          stroke="none"
        />
      </g>

      <text x={L.x + L.w / 2} y={24} textAnchor="middle" className="d-label d-strong">F</text>
      <text x={R.x + R.w / 2} y={rTop - 52} textAnchor="middle" className="d-label d-strong" style={{ fill: "var(--good)" }}>
        ≈2.4F
      </text>

      {detailed && (
        <g className="d-anno">
          <text x={L.x + L.w / 2} y={200} textAnchor="middle" className="d-label d-dim">small area</text>
          <text x={R.x + R.w / 2} y={200} textAnchor="middle" className="d-label d-dim">large area</text>
          <text x={170} y={228} textAnchor="middle" className="d-label">equal pressure · unequal force</text>
        </g>
      )}
    </svg>
  );
}
