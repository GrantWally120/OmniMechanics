export type Category =
  | "Machines"
  | "Force & Motion"
  | "Energy"
  | "Electronics"
  | "Timekeeping"
  | "Nature"
  | "Everyday";

export type DiagramKind =
  | "gearTrain"
  | "fourStroke"
  | "pinTumbler"
  | "camFollower"
  | "escapement"
  | "dcMotor"
  | "hydraulic"
  | "waterCycle";

export interface Step {
  label: string;
  text: string;
  /** Normalised position in the operating cycle, 0..1, where this step is clearest. */
  at: number;
}

export interface Component {
  name: string;
  note: string;
}

export interface Mechanism {
  id: string;
  /** Catalogue number, e.g. 001. */
  index: number;
  name: string;
  /** One-line "what it does". */
  tagline: string;
  category: Category;
  /** The core physical idea, in a phrase. */
  principle: string;
  /** 1..5 — rough intricacy, shown as filled marks. */
  complexity: number;
  /** Free-text origin/era, e.g. "c. 1876" or "Ancient". */
  era: string;
  summary: string;
  steps: Step[];
  components: Component[];
  facts: string[];
  diagram: DiagramKind;
}
