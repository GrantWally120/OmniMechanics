import type { Category } from "../types";

const SPEEDS = [0.5, 1, 2];

export default function Controls({
  running,
  onToggleRunning,
  speed,
  onSpeed,
  categories,
  active,
  onCategory,
  query,
  onQuery,
  onRandom,
}: {
  running: boolean;
  onToggleRunning: () => void;
  speed: number;
  onSpeed: (v: number) => void;
  categories: Category[];
  active: Category | "All";
  onCategory: (c: Category | "All") => void;
  query: string;
  onQuery: (v: string) => void;
  onRandom: () => void;
}) {
  return (
    <div className="controls" role="toolbar" aria-label="Workbench controls">
      <div className="controls-row">
        <button
          type="button"
          className={`power ${running ? "on" : "off"}`}
          onClick={onToggleRunning}
          aria-pressed={running}
        >
          <span className="power-dot" />
          {running ? "Running" : "Halted"}
        </button>

        <div className="speed" role="group" aria-label="Speed">
          <span className="speed-label">SPEED</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className={`speed-btn ${speed === s ? "sel" : ""}`}
              onClick={() => onSpeed(s)}
              aria-pressed={speed === s}
            >
              {s}×
            </button>
          ))}
        </div>

        <button type="button" className="random" onClick={onRandom}>
          <span aria-hidden="true">⟳</span> Random specimen
        </button>

        <div className="search">
          <input
            type="search"
            value={query}
            placeholder="Search mechanisms…"
            onChange={(e) => onQuery(e.target.value)}
            aria-label="Search mechanisms"
          />
        </div>
      </div>

      <div className="filters" role="group" aria-label="Filter by category">
        <button
          type="button"
          className={`chip ${active === "All" ? "sel" : ""}`}
          onClick={() => onCategory("All")}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip ${active === c ? "sel" : ""}`}
            onClick={() => onCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
