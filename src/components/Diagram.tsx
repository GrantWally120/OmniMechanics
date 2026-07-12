import type { DiagramKind } from "../types";
import { useClock, useOnScreen } from "../lib/clock";
import GearTrain from "./diagrams/GearTrain";
import FourStroke from "./diagrams/FourStroke";
import PinTumbler from "./diagrams/PinTumbler";
import CamFollower from "./diagrams/CamFollower";
import Escapement from "./diagrams/Escapement";
import DcMotor from "./diagrams/DcMotor";
import Hydraulic from "./diagrams/Hydraulic";
import WaterCycle from "./diagrams/WaterCycle";

const MAP: Record<DiagramKind, (p: { t: number; detailed?: boolean }) => JSX.Element> = {
  gearTrain: GearTrain,
  fourStroke: FourStroke,
  pinTumbler: PinTumbler,
  camFollower: CamFollower,
  escapement: Escapement,
  dcMotor: DcMotor,
  hydraulic: Hydraulic,
  waterCycle: WaterCycle,
};

export function Diagram({
  kind,
  t,
  detailed,
}: {
  kind: DiagramKind;
  t: number;
  detailed?: boolean;
}) {
  const Comp = MAP[kind];
  return <Comp t={t} detailed={detailed} />;
}

export function LiveDiagram({
  kind,
  detailed,
  manualT,
}: {
  kind: DiagramKind;
  detailed?: boolean;
  /** When provided, freezes the clock and renders this exact frame (scrubbing). */
  manualT?: number;
}) {
  const [ref, onScreen] = useOnScreen<HTMLDivElement>();
  const active = manualT === undefined && onScreen;
  const clockT = useClock(active);
  const t = manualT !== undefined ? manualT : clockT;
  return (
    <div ref={ref} className="diagram-frame">
      <Diagram kind={kind} t={t} detailed={detailed} />
    </div>
  );
}
