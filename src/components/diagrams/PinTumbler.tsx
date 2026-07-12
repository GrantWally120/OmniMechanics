import { clamp, frac, lerp, smoothstep, type DiagramProps } from "./shared";

const PIN_X = [98, 134, 170, 206, 242];
const KEY_PIN_LEN = [26, 18, 30, 22, 28];
const DRIVER_LEN = 30;
const CHAMBER_TOP = 56;
const SHEAR = 118;
const PIVOT = { x: 66, y: 146 };

function spring(x: number, y1: number, y2: number, coils = 4) {
  const h = y2 - y1;
  const seg = h / (coils * 2);
  let d = `M ${x} ${y1}`;
  for (let i = 0; i < coils * 2; i++) {
    const nx = x + (i % 2 === 0 ? 6 : -6);
    d += ` L ${nx} ${(y1 + seg * (i + 1)).toFixed(1)}`;
  }
  d += ` L ${x} ${y2}`;
  return d;
}

export default function PinTumbler({ t, detailed }: DiagramProps) {
  const cyc = frac(t / 6.5);
  const insert =
    smoothstep(clamp((cyc - 0.03) / 0.3, 0, 1)) -
    smoothstep(clamp((cyc - 0.86) / 0.12, 0, 1));
  const turn = Math.sin(clamp((cyc - 0.5) / 0.28, 0, 1) * Math.PI) * insert;
  const turnAngle = -turn * 15;
  const keyDX = (1 - insert) * 150;

  const driverBottom = lerp(130, SHEAR, insert);
  const driverTop = driverBottom - DRIVER_LEN;

  // key blade top edge: dips to each key-pin base, valleys in between
  const bladeY = 168;
  let keyTop = `M 292 ${bladeY}`;
  PIN_X.forEach((x, i) => {
    const base = driverBottom + KEY_PIN_LEN[i];
    keyTop += ` L ${x + 12} ${base + 6} L ${x} ${base} L ${x - 12} ${base + 6}`;
  });
  keyTop += ` L 62 ${bladeY}`;
  const keyPath = `${keyTop} L 62 ${bladeY + 4} L 292 ${bladeY + 4} Z`;

  return (
    <svg viewBox="0 0 340 240" className="diagram" role="img" aria-label="Pin-tumbler lock">
      {/* housing */}
      <rect x={40} y={CHAMBER_TOP - 8} width={260} height={172} rx={12} className="d-fill-2" />

      {/* pin chambers, springs & driver pins (fixed to housing) */}
      {PIN_X.map((x, i) => (
        <g key={`h${i}`}>
          <rect x={x - 7} y={CHAMBER_TOP} width={14} height={SHEAR - CHAMBER_TOP} className="d-chamber" />
          <path d={spring(x, CHAMBER_TOP + 2, driverTop)} className="d-stroke d-spring" fill="none" />
          <rect x={x - 5} y={driverTop} width={10} height={DRIVER_LEN} rx={3} className="d-driver" />
        </g>
      ))}

      {/* shear line */}
      <line x1={44} y1={SHEAR} x2={296} y2={SHEAR} className="d-stroke d-shear" strokeDasharray="5 4" />

      {/* rotating plug assembly: plug body + key pins + key */}
      <g transform={`rotate(${turnAngle} ${PIVOT.x} ${PIVOT.y})`}>
        <rect x={62} y={122} width={230} height={50} rx={10} className="d-plug" />
        <circle cx={PIVOT.x + 4} cy={146} r={5} className="d-hub" />

        {PIN_X.map((x, i) => {
          const kTop = driverBottom;
          return (
            <rect
              key={`k${i}`}
              x={x - 5}
              y={kTop}
              width={10}
              height={KEY_PIN_LEN[i]}
              rx={3}
              className="d-keypin"
            />
          );
        })}

        <g transform={`translate(${keyDX} 0)`} opacity={insert > 0.02 ? 1 : 0}>
          <path d={keyPath} className="d-key-blade" />
          {/* bow / handle */}
          <circle cx={302} cy={162} r={13} className="d-key-blade" />
          <circle cx={302} cy={162} r={5} className="d-plug" />
        </g>
      </g>

      <text x={22} y={30} className="d-label d-strong" style={{ fill: turn > 0.4 ? "var(--good)" : "var(--signal)" }}>
        {turn > 0.4 ? "OPEN" : insert > 0.5 ? "ALIGNED" : "LOCKED"}
      </text>

      {detailed && (
        <g className="d-anno">
          <text x={296} y={SHEAR - 4} textAnchor="end" className="d-label d-dim">shear line</text>
          <text x={PIN_X[0]} y={CHAMBER_TOP - 12} textAnchor="middle" className="d-label d-dim">springs</text>
          <text x={170} y={196} textAnchor="middle" className="d-label">key lifts each pin to the shear line</text>
        </g>
      )}
    </svg>
  );
}
