import { type DiagramProps } from "./shared";

const C = { x: 170, y: 118 };
const LX = 50;
const HY = 18;

function Current({ x, y, out }: { x: number; y: number; out: boolean }) {
  return (
    <g style={{ stroke: out ? "var(--blueprint)" : "var(--signal)" }}>
      <circle cx={x} cy={y} r={8} style={{ fill: "var(--paper)" }} strokeWidth={1.4} />
      {out ? (
        <circle cx={x} cy={y} r={2} style={{ fill: "var(--blueprint)" }} stroke="none" />
      ) : (
        <>
          <line x1={x - 4} y1={y - 4} x2={x + 4} y2={y + 4} strokeWidth={1.4} />
          <line x1={x + 4} y1={y - 4} x2={x - 4} y2={y + 4} strokeWidth={1.4} />
        </>
      )}
    </g>
  );
}

export default function DcMotor({ t, detailed }: DiagramProps) {
  const a = 1.4 * t;
  const deg = (a * 180) / Math.PI;
  const outLeft = Math.floor(a / Math.PI) % 2 === 0;

  return (
    <svg viewBox="0 0 340 240" className="diagram" role="img" aria-label="DC electric motor">
      {/* field lines N -> S (behind) */}
      {[-26, 0, 26].map((dy) => (
        <g key={dy} className="d-stroke d-field">
          <line x1={78} y1={C.y + dy} x2={258} y2={C.y + dy} strokeDasharray="2 6" />
          <path d={`M 258 ${C.y + dy} l -7 -3 l 0 6 z`} className="d-fill-field" />
        </g>
      ))}

      {/* pole pieces */}
      <g className="d-fill-2">
        <path d={`M 30 62 H 74 A 46 46 0 0 1 74 174 H 30 Z`} />
        <path d={`M 310 62 H 266 A 46 46 0 0 0 266 174 H 310 Z`} />
      </g>
      <text x={50} y={C.y + 6} textAnchor="middle" className="d-pole">N</text>
      <text x={290} y={C.y + 6} textAnchor="middle" className="d-pole">S</text>

      {/* rotation sense */}
      <path d="M 170 46 A 30 30 0 0 1 200 76" className="d-stroke d-hair" fill="none" />
      <path d="M 200 76 l 2 -8 l -8 3 z" className="d-fill" />

      {/* rotating armature coil */}
      <g transform={`rotate(${deg} ${C.x} ${C.y})`}>
        <rect x={C.x - LX} y={C.y - HY} width={LX * 2} height={HY * 2} rx={9} className="d-coil" />
        <Current x={C.x - LX} y={C.y} out={outLeft} />
        <Current x={C.x + LX} y={C.y} out={!outLeft} />
      </g>

      {/* commutator + brushes */}
      <circle cx={C.x} cy={C.y} r={13} style={{ fill: "var(--paper)", stroke: "var(--ink)", strokeWidth: 1 }} />
      <g transform={`rotate(${deg} ${C.x} ${C.y})`}>
        <path d={`M ${C.x} ${C.y - 13} A 13 13 0 0 1 ${C.x} ${C.y + 13} Z`} className="d-comm" />
        <path d={`M ${C.x} ${C.y - 13} A 13 13 0 0 0 ${C.x} ${C.y + 13} Z`} className="d-comm-2" />
      </g>
      <rect x={C.x - 20} y={C.y - 4} width={7} height={8} className="d-fill d-part" />
      <rect x={C.x + 13} y={C.y - 4} width={7} height={8} className="d-fill d-part" />

      {/* supply */}
      <line x1={C.x - 20} y1={C.y} x2={120} y2={210} className="d-stroke d-rod" />
      <line x1={C.x + 20} y1={C.y} x2={220} y2={210} className="d-stroke d-rod" />
      <line x1={150} y1={210} x2={162} y2={210} className="d-stroke d-thick" />
      <line x1={168} y1={204} x2={168} y2={216} className="d-stroke d-thick" />
      <line x1={174} y1={210} x2={190} y2={210} className="d-stroke d-hair" />
      <line x1={178} y1={206} x2={178} y2={214} className="d-stroke d-thick" />

      {detailed && (
        <g className="d-anno">
          <text x={C.x} y={150} textAnchor="middle" className="d-label d-dim">commutator</text>
          <text x={C.x} y={228} textAnchor="middle" className="d-label">supply reverses each half-turn</text>
        </g>
      )}
    </svg>
  );
}
