import { clamp, polar, smoothstep, TAU, type DiagramProps } from "./shared";

const PIVOT = { x: 170, y: 44 };
const WHEEL = { x: 170, y: 152, r: 46 };
const TEETH = 16;
const AMP = 15; // pendulum amplitude, degrees

const WHEEL_PATH = (() => {
  const step = TAU / TEETH;
  let d = "";
  for (let i = 0; i < TEETH; i++) {
    const tip = polar(WHEEL.x, WHEEL.y, WHEEL.r, i * step);
    const back = polar(WHEEL.x, WHEEL.y, WHEEL.r * 0.8, i * step + step * 0.82);
    d += `${i === 0 ? "M" : "L"} ${tip.x.toFixed(2)} ${tip.y.toFixed(2)} L ${back.x.toFixed(2)} ${back.y.toFixed(2)} `;
  }
  return d + "Z";
})();

export default function Escapement({ t, detailed }: DiagramProps) {
  const w = 2.2;
  const phase = w * t;
  const angle = AMP * Math.sin(phase);

  const p = phase / Math.PI;
  const n = Math.floor(p);
  const frac = p - n;
  const step = smoothstep(clamp((frac - 0.5) / 0.32, 0, 1));
  const wheelDeg = ((n + step) * 360) / TEETH;

  return (
    <svg viewBox="0 0 340 240" className="diagram" role="img" aria-label="Pendulum escapement">
      {/* escape wheel */}
      <g transform={`rotate(${wheelDeg} ${WHEEL.x} ${WHEEL.y})`}>
        <path d={WHEEL_PATH} className="d-fill d-part-2" />
        <circle cx={WHEEL.x} cy={WHEEL.y} r={WHEEL.r * 0.28} className="d-fill-2" />
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * TAU;
          const o = polar(WHEEL.x, WHEEL.y, WHEEL.r * 0.72, a);
          return <line key={i} x1={WHEEL.x} y1={WHEEL.y} x2={o.x} y2={o.y} className="d-stroke d-hair" />;
        })}
        <circle cx={WHEEL.x} cy={WHEEL.y} r={4} className="d-hub" />
      </g>

      {/* pendulum + anchor share the pivot shaft */}
      <g transform={`rotate(${angle} ${PIVOT.x} ${PIVOT.y})`}>
        {/* anchor arms */}
        <path
          d={`M ${PIVOT.x} ${PIVOT.y + 6}
              L 150 108 L 156 116 L ${PIVOT.x} ${PIVOT.y + 20}
              L 184 116 L 190 108 Z`}
          className="d-fill d-part"
        />
        {/* pendulum rod + bob */}
        <line x1={PIVOT.x} y1={PIVOT.y} x2={PIVOT.x} y2={214} className="d-stroke d-rod" />
        <circle cx={PIVOT.x} cy={216} r={15} className="d-fill" style={{ fill: "var(--part-drive)" }} />
        <circle cx={PIVOT.x} cy={216} r={15} className="d-stroke" />
        <line x1={PIVOT.x - 6} y1={216} x2={PIVOT.x + 6} y2={216} className="d-stroke d-hair" />
      </g>

      {/* pivot */}
      <circle cx={PIVOT.x} cy={PIVOT.y} r={5} className="d-hub" />
      <line x1={140} y1={PIVOT.y} x2={200} y2={PIVOT.y} className="d-stroke d-thick" />

      {detailed && (
        <g className="d-anno">
          <text x={210} y={PIVOT.y + 4} className="d-label d-dim">anchor</text>
          <text x={WHEEL.x + WHEEL.r + 26} y={WHEEL.y + 4} className="d-label d-dim">escape wheel</text>
          <text x={PIVOT.x + 22} y={200} className="d-label d-dim">pendulum</text>
        </g>
      )}
    </svg>
  );
}
