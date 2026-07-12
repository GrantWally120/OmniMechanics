import type { Category } from "../types";
import { CAT_COLOR } from "../lib/ui";

export function CategoryTag({ category }: { category: Category }) {
  return (
    <span className="cat-tag">
      <span className="cat-dot" style={{ background: CAT_COLOR[category] }} />
      {category}
    </span>
  );
}

export function Complexity({ value }: { value: number }) {
  return (
    <span className="complexity" title={`Intricacy ${value} of 5`} aria-label={`Intricacy ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`cx-mark ${i <= value ? "on" : ""}`} />
      ))}
    </span>
  );
}
