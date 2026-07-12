import type { Category, DiagramKind } from "../types";

/** Muted, earthy category hues — deliberately not neon. */
export const CAT_COLOR: Record<Category, string> = {
  Machines: "#3a5a86",
  "Force & Motion": "#7a5a38",
  Energy: "#bd4a22",
  Electronics: "#3f7d54",
  Timekeeping: "#8a5a3c",
  Nature: "#4f7d63",
  Everyday: "#6f7178",
};

/** Seconds of shaft-time for one full, legible cycle of each diagram. */
export const PERIOD: Record<DiagramKind, number> = {
  gearTrain: 5.46,
  fourStroke: 8.38,
  pinTumbler: 6.5,
  camFollower: 5.03,
  escapement: 5.71,
  dcMotor: 4.49,
  hydraulic: 4.65,
  waterCycle: 8,
};
