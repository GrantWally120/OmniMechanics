import { clamp, frac, type DiagramProps } from "./shared";

const OCEAN_Y = 176;
const CLOUD = { x: 206, y: 82 };

export default function WaterCycle({ t, detailed }: DiagramProps) {
  const vapor = Array.from({ length: 5 }, (_, i) => {
    const p = frac(t * 0.22 + i / 5);
    const y = OCEAN_Y - p * (OCEAN_Y - 108);
    const x = 74 + Math.sin(p * 3.2) * 9;
    return { x, y, o: Math.sin(p * Math.PI) };
  });

  const rain = Array.from({ length: 7 }, (_, i) => {
    const p = frac(t * 0.55 + i / 7);
    const x = 168 + i * 12;
    const y = CLOUD.y + 20 + p * 74;
    return { x, y, o: clamp(Math.sin(p * Math.PI) * 1.4, 0, 1) };
  });

  const ray = 9 + 3 * Math.sin(t * 2);
  const flow = -(t * 26) % 1000;

  return (
    <svg viewBox="0 0 340 240" className="diagram" role="img" aria-label="The water cycle">
      {/* sun */}
      <g style={{ stroke: "var(--signal)" }} className="d-sun">
        <circle cx={54} cy={52} r={16} style={{ fill: "var(--paper)" }} strokeWidth={1.6} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          const x1 = 54 + Math.cos(a) * 21;
          const y1 = 52 + Math.sin(a) * 21;
          const x2 = 54 + Math.cos(a) * (21 + ray);
          const y2 = 52 + Math.sin(a) * (21 + ray);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={1.6} strokeLinecap="round" />;
        })}
      </g>

      {/* mountain (collection side) */}
      <path d={`M 214 ${OCEAN_Y} L 286 96 L 320 ${OCEAN_Y} Z`} className="d-fill-2" />
      {/* river returning to the sea */}
      <path
        d={`M 286 104 C 276 130, 262 150, 250 ${OCEAN_Y - 2}`}
        className="d-stroke d-river"
        fill="none"
        strokeDasharray="4 6"
        strokeDashoffset={flow}
      />

      {/* ocean */}
      <path
        d={`M 0 ${OCEAN_Y} Q 40 ${OCEAN_Y - 6} 80 ${OCEAN_Y} T 160 ${OCEAN_Y} T 240 ${OCEAN_Y} T 340 ${OCEAN_Y} V 240 H 0 Z`}
        className="d-fluid"
      />

      {/* evaporation */}
      {vapor.map((v, i) => (
        <circle key={i} cx={v.x} cy={v.y} r={3} className="d-vapor" opacity={v.o * 0.8} />
      ))}
      <path d="M 92 150 C 108 140, 120 128, 150 110" className="d-stroke d-hair" fill="none" markerEnd="" opacity={0.5} />

      {/* cloud */}
      <g className="d-cloud">
        <path
          d={`M ${CLOUD.x - 44} ${CLOUD.y + 12}
             a 18 18 0 0 1 6 -34
             a 22 22 0 0 1 40 -6
             a 16 16 0 0 1 22 12
             a 15 15 0 0 1 -6 28 Z`}
        />
      </g>

      {/* precipitation */}
      {rain.map((r, i) => (
        <line
          key={i}
          x1={r.x}
          y1={r.y}
          x2={r.x - 2}
          y2={r.y + 7}
          className="d-rain"
          opacity={r.o * 0.85}
        />
      ))}

      {detailed && (
        <g className="d-anno">
          <text x={74} y={124} textAnchor="middle" className="d-label d-dim">evaporation</text>
          <text x={CLOUD.x} y={44} textAnchor="middle" className="d-label d-dim">condensation</text>
          <text x={202} y={150} textAnchor="middle" className="d-label d-dim">rain</text>
          <text x={276} y={128} textAnchor="start" className="d-label d-dim">runoff</text>
        </g>
      )}
    </svg>
  );
}
