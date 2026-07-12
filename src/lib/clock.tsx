import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ *
 *  Global motion state — the "power" and "speed" of the whole shop.  *
 * ------------------------------------------------------------------ */

interface MotionState {
  running: boolean;
  speed: number;
  reduced: boolean;
  setRunning: (v: boolean) => void;
  toggle: () => void;
  setSpeed: (v: number) => void;
}

const MotionContext = createContext<MotionState | null>(null);

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);

  // Honour reduced-motion by starting powered-down; the user can still
  // opt in with the POWER control.
  useEffect(() => {
    if (reduced) setRunning(false);
  }, [reduced]);

  const value: MotionState = {
    running,
    speed,
    reduced,
    setRunning,
    toggle: () => setRunning((r) => !r),
    setSpeed,
  };

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotion(): MotionState {
  const ctx = useContext(MotionContext);
  if (!ctx) throw new Error("useMotion must be used within a MotionProvider");
  return ctx;
}

/* ------------------------------------------------------------------ *
 *  Per-diagram clock. Accumulates elapsed "shaft time" in seconds,   *
 *  scaled by global speed, frozen when powered off or off-screen.    *
 * ------------------------------------------------------------------ */

export function useClock(active: boolean = true): number {
  const { running, speed } = useMotion();
  const [t, setT] = useState(0);
  const tRef = useRef(0);

  useEffect(() => {
    if (!active || !running) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      // Clamp large gaps (tab was backgrounded) so nothing lurches.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tRef.current += dt * speed;
      setT(tRef.current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, running, speed]);

  return t;
}

/* ------------------------------------------------------------------ *
 *  Pause work that has scrolled out of view.                         *
 * ------------------------------------------------------------------ */

export function useOnScreen<T extends Element>(
  rootMargin = "160px"
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver !== "function") return;
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin }
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [rootMargin]);

  return [ref, visible];
}
