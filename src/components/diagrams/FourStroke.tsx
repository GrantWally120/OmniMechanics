import { TAU, type DiagramProps } from "./shared";

const CX = 150;
const CY = 202;
const R = 30; // crank radius
const L = 80; // rod length
const BORE_L = 122;
const BORE_R = 178;
const HEAD_Y = 78; // underside of the head
const SKIRT_Y = 176;

const STROKES = ["INTAKE", "COMPRESSION", "POWER", "EXHAUST"];
const CHAMBER_FILL = [
  "var(--charge-intake)",
  "var(--charge-compress)",
  "var(--charge-power)",
  "var(--charge-exhaust)",
];

export default function FourStroke({ t, detailed }: DiagramProps) {
  const theta = 1.5 * t;
  const cycle = ((theta % (2 * TAU)) + 2 * TAU) % (2 * TAU);
  const idx = Math.floor(cycle / Math.PI) % 4;
  const phase = (cycle / Math.PI) % 1;

  const pinX = CX + R * Math.sin(theta);
  const pinY = CY - R * Math.cos(theta);
  const pistonPinY = pinY - Math.sqrt(L * L - Math.pow(R * Math.sin(theta), 2));
  const pistonTop = pistonPinY - 12;

  const intakeLift = idx === 0 ? Math.sin(phase * Math.PI) * 8 : 0;
  const exhaustLift = idx === 3 ? Math.sin(phase * Math.PI) * 8 : 0;
  const spark = idx === 2 && phase < 0.22;

  // counterweight sits opposite the crank pin
  const cwX = CX - R * 0.62 * Math.sin(theta);
  const cwY = CY + R * 0.62 * Math.cos(theta);

  const chamberH = pistonTop - HEAD_Y;

  return (
    <svg viewBox="0 0 340 240" className="diagram" role="img" aria-label="Four-stroke engine">
      {/* cylinder walls */}
      <path
        d={`M ${BORE_L - 6} ${HEAD_Y} L ${BORE_L - 6} ${SKIRT_Y} M ${BORE_R + 6} ${HEAD_Y} L ${BORE_R + 6} ${SKIRT_Y}`}
        className="d-stroke d-thick"
      />
      {/* head */}
      <rect x={BORE_L - 6} y={58} width={BORE_R - BORE_L + 12} height={HEAD_Y - 58} className="d-fill-2" />

      {/* combustion chamber tint */}
      {chamberH > 1 && (
        <rect
          x={BORE_L}
          y={HEAD_Y}
          width={BORE_R - BORE_L}
          height={chamberH}
          style={{ fill: CHAMBER_FILL[idx] }}
          opacity={0.85}
        />
      )}

      {/* valves */}
      {[
        { x: 138, lift: intakeLift },
        { x: 162, lift: exhaustLift },
      ].map((v, i) => (
        <g key={i} className="d-stroke">
          <line x1={v.x} y1={50} x2={v.x} y2={HEAD_Y + v.lift} className="d-thick" />
          <path
            d={`M ${v.x - 7} ${HEAD_Y + v.lift} L ${v.x + 7} ${HEAD_Y + v.lift}`}
            className="d-thick"
          />
        </g>
      ))}

      {/* spark */}
      {spark && (
        <g style={{ stroke: "var(--signal)" }} className="d-spark">
          <path d={`M 150 80 l -3 5 l 4 0 l -3 6`} fill="none" strokeWidth={1.6} />
          <circle cx={150} cy={80} r={9} fill="none" strokeWidth={1} opacity={0.5} />
        </g>
      )}

      {/* piston */}
      <rect
        x={BORE_L + 1}
        y={pistonTop}
        width={BORE_R - BORE_L - 2}
        height={24}
        rx={2}
        className="d-fill d-part"
      />
      <line x1={BORE_L + 1} y1={pistonTop + 7} x2={BORE_R - 1} y2={pistonTop + 7} className="d-stroke d-hair" />
      <line x1={BORE_L + 1} y1={pistonTop + 12} x2={BORE_R - 1} y2={pistonTop + 12} className="d-stroke d-hair" />

      {/* connecting rod */}
      <line x1={CX} y1={pistonPinY} x2={pinX} y2={pinY} className="d-stroke d-rod" />
      <circle cx={CX} cy={pistonPinY} r={3.2} className="d-hub" />

      {/* crank */}
      <circle cx={CX} cy={CY} r={R + 5} className="d-fill-2" />
      <circle cx={cwX} cy={cwY} r={14} className="d-fill d-part" />
      <line x1={CX} y1={CY} x2={pinX} y2={pinY} className="d-stroke d-thick" />
      <circle cx={pinX} cy={pinY} r={3.6} className="d-hub" style={{ fill: "var(--part-drive)" }} />
      <circle cx={CX} cy={CY} r={4} className="d-hub" />

      {/* stroke caption — always shown, it is the whole point */}
      <g>
        {STROKES.map((s, i) => (
          <text
            key={s}
            x={22}
            y={36 + i * 15}
            className={i === idx ? "d-label d-strong" : "d-label d-dim"}
          >
            {i === idx ? "▸ " : "  "}
            {s}
          </text>
        ))}
      </g>

      {detailed && (
        <g className="d-anno">
          <text x={138} y={44} textAnchor="middle" className="d-label d-dim">IN</text>
          <text x={162} y={44} textAnchor="middle" className="d-label d-dim">EX</text>
          <text x={296} y={CY + 4} textAnchor="end" className="d-label">crankshaft</text>
          <text x={296} y={pistonTop + 4} textAnchor="end" className="d-label">piston</text>
        </g>
      )}
    </svg>
  );
}
