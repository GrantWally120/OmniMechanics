import { useEffect, useMemo, useState } from "react";
import type { Mechanism } from "../types";
import { LiveDiagram } from "./Diagram";
import { useClock, useMotion } from "../lib/clock";
import { PERIOD } from "../lib/ui";
import { CategoryTag, Complexity } from "./Bits";

export default function DetailView({
  m,
  all,
  onClose,
  onNavigate,
}: {
  m: Mechanism;
  all: Mechanism[];
  onClose: () => void;
  onNavigate: (m: Mechanism) => void;
}) {
  const motion = useMotion();
  const period = PERIOD[m.diagram];
  const [mode, setMode] = useState<"live" | "manual">("live");
  const [phase, setPhase] = useState(0);

  const clockT = useClock(mode === "live");
  const t = mode === "live" ? clockT : phase * period;
  const curPhase = mode === "live" ? (((clockT / period) % 1) + 1) % 1 : phase;

  useEffect(() => {
    setMode("live");
    setPhase(0);
  }, [m.id]);

  const index = all.findIndex((x) => x.id === m.id);
  const prev = all[(index - 1 + all.length) % all.length];
  const next = all[(index + 1) % all.length];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onNavigate(prev);
      else if (e.key === "ArrowRight") onNavigate(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onClose, onNavigate]);

  const activeStep = useMemo(() => {
    let best = 0;
    let bd = 2;
    m.steps.forEach((s, i) => {
      let d = Math.abs(s.at - curPhase);
      d = Math.min(d, 1 - d);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  }, [curPhase, m.steps]);

  const goLive = () => {
    setMode("live");
    motion.setRunning(true);
  };
  const togglePlay = () => {
    if (mode === "live") {
      setPhase(curPhase);
      setMode("manual");
    } else goLive();
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={m.name} onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Close teardown">
          ✕
        </button>

        <div className="sheet-head">
          <div className="sheet-eyebrow">
            <span className="sheet-no">No.{String(m.index).padStart(3, "0")}</span>
            <CategoryTag category={m.category} />
            <span className="sheet-era">{m.era}</span>
          </div>
          <h2 className="sheet-title">{m.name}</h2>
          <p className="sheet-principle">{m.principle}</p>
        </div>

        <div className="sheet-grid">
          <div className="sheet-left">
            <div className="sheet-plate">
              <LiveDiagram kind={m.diagram} detailed manualT={t} />
            </div>

            <div className="scrubber">
              <button type="button" className="play" onClick={togglePlay}>
                {mode === "live" ? "❚❚ Scrub" : "▶ Play"}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.001}
                value={curPhase}
                onChange={(e) => {
                  setMode("manual");
                  setPhase(parseFloat(e.target.value));
                }}
                aria-label="Operating cycle position"
              />
              <span className="scrub-read">{String(Math.round(curPhase * 100)).padStart(2, "0")}%</span>
            </div>

            <ol className="steps">
              {m.steps.map((s, i) => (
                <li key={s.label}>
                  <button
                    type="button"
                    className={`step ${i === activeStep ? "active" : ""}`}
                    onClick={() => {
                      setMode("manual");
                      setPhase(s.at);
                    }}
                  >
                    <span className="step-n">{i + 1}</span>
                    <span className="step-body">
                      <span className="step-label">{s.label}</span>
                      <span className="step-text">{s.text}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <div className="sheet-right">
            <p className="sheet-summary">{m.summary}</p>

            <div className="sheet-block">
              <h4 className="block-title">
                Key parts <Complexity value={m.complexity} />
              </h4>
              <dl className="parts">
                {m.components.map((c) => (
                  <div key={c.name} className="part">
                    <dt>{c.name}</dt>
                    <dd>{c.note}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="sheet-block">
              <h4 className="block-title">Field notes</h4>
              <ul className="facts">
                {m.facts.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="sheet-nav">
          <button type="button" onClick={() => onNavigate(prev)}>
            ← {prev.name}
          </button>
          <span className="sheet-nav-hint">← / → to browse · Esc to close</span>
          <button type="button" onClick={() => onNavigate(next)}>
            {next.name} →
          </button>
        </div>
      </div>
    </div>
  );
}
