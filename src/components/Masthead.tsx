import { gearPath } from "./diagrams/shared";

function LogoGear({ running, speed }: { running: boolean; speed: number }) {
  return (
    <svg viewBox="0 0 44 44" className="logo-gear" aria-hidden="true">
      <g
        style={{
          transformOrigin: "22px 22px",
          animationPlayState: running ? "running" : "paused",
          animationDuration: `${6 / Math.max(0.25, speed)}s`,
        }}
        className="logo-gear-spin"
      >
        <path d={gearPath(22, 22, 18, 9, 6)} className="logo-gear-body" />
      </g>
      <circle cx={22} cy={22} r={6.5} className="logo-gear-hub" />
      <circle cx={22} cy={22} r={2.4} className="logo-gear-pin" />
    </svg>
  );
}

export default function Masthead({
  count,
  theme,
  onToggleTheme,
  running,
  speed,
}: {
  count: number;
  theme: "paper" | "workshop";
  onToggleTheme: () => void;
  running: boolean;
  speed: number;
}) {
  return (
    <header className="masthead">
      <div className="masthead-brand">
        <LogoGear running={running} speed={speed} />
        <div>
          <h1 className="wordmark">
            Omni<span>Mechanics</span>
          </h1>
          <p className="masthead-sub">
            A field guide to how things really work
          </p>
        </div>
      </div>

      <div className="masthead-meta">
        <span className="meta-index">
          <b>{String(count).padStart(3, "0")}</b> specimens catalogued
        </span>
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "paper" ? "workshop" : "paper"} theme`}
          title={theme === "paper" ? "Workshop (dark)" : "Drafting paper (light)"}
        >
          {theme === "paper" ? "Workshop" : "Paper"}
        </button>
      </div>
    </header>
  );
}
