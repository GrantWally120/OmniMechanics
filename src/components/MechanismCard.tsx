import type { Mechanism } from "../types";
import { LiveDiagram } from "./Diagram";
import { CategoryTag, Complexity } from "./Bits";

export default function MechanismCard({
  m,
  onOpen,
}: {
  m: Mechanism;
  onOpen: (m: Mechanism) => void;
}) {
  return (
    <article className="card">
      <button
        type="button"
        className="card-btn"
        onClick={() => onOpen(m)}
        aria-label={`Open teardown: ${m.name}`}
      >
        <div className="card-head">
          <span className="card-no">No.{String(m.index).padStart(3, "0")}</span>
          <CategoryTag category={m.category} />
        </div>

        <div className="plate">
          <LiveDiagram kind={m.diagram} />
          <span className="plate-corner tl" />
          <span className="plate-corner tr" />
          <span className="plate-corner bl" />
          <span className="plate-corner br" />
        </div>

        <div className="card-body">
          <h3 className="card-name">{m.name}</h3>
          <p className="card-tag">{m.tagline}</p>
          <div className="card-foot">
            <Complexity value={m.complexity} />
            <span className="card-open">Teardown →</span>
          </div>
        </div>
      </button>
    </article>
  );
}
