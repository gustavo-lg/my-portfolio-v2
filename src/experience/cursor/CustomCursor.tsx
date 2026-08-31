import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { lerp2d, distance, type Point } from "./cursorMath";

export interface CursorApi {
  /** Whether a custom cursor is actually active (pointer:fine, motion allowed). */
  enabled: boolean;
  /** Animate the ring to a screen point; resolves when it arrives. */
  travelTo: (point: Point) => Promise<void>;
}

const CursorCtx = createContext<CursorApi>({
  enabled: false,
  travelTo: () => Promise.resolve(),
});

export function useCursor(): CursorApi {
  return useContext(CursorCtx);
}

const ARRIVE_THRESHOLD = 6;

export function CursorProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const travelRef = useRef<((p: Point) => Promise<void>) | null>(null);

  const travelTo = useCallback((point: Point) => {
    return travelRef.current
      ? travelRef.current(point)
      : Promise.resolve();
  }, []);

  const api = useMemo<CursorApi>(
    () => ({ enabled, travelTo }),
    [enabled, travelTo],
  );

  return (
    <CursorCtx.Provider value={api}>
      {children}
      {enabled && <CursorRing register={(fn) => (travelRef.current = fn)} />}
    </CursorCtx.Provider>
  );
}

function CursorRing({
  register,
}: {
  register: (fn: (p: Point) => Promise<void>) => void;
}) {
  const ringRef = useRef<HTMLDivElement>(null);
  const pos = useRef<Point>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const pointer = useRef<Point>({ ...pos.current });
  const mode = useRef<"follow" | "travel">("follow");
  const travelTarget = useRef<Point>({ ...pos.current });
  const resolveTravel = useRef<(() => void) | null>(null);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    document.body.style.cursor = "none";
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  useEffect(() => {
    register((point: Point) => {
      mode.current = "travel";
      travelTarget.current = point;
      return new Promise<void>((resolve) => {
        resolveTravel.current = resolve;
      });
    });
  }, [register]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY };
    };
    const onOver = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("[data-orbital-label], a, button")) setHovering(true);
    };
    const onOut = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("[data-orbital-label], a, button")) setHovering(false);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerout", onOut);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const target =
        mode.current === "travel" ? travelTarget.current : pointer.current;
      const ease = mode.current === "travel" ? 0.16 : 0.18;
      pos.current = lerp2d(pos.current, target, ease);

      if (
        mode.current === "travel" &&
        distance(pos.current, travelTarget.current) < ARRIVE_THRESHOLD
      ) {
        pos.current = { ...travelTarget.current };
        mode.current = "follow";
        pointer.current = { ...travelTarget.current };
        resolveTravel.current?.();
        resolveTravel.current = null;
      }

      const el = ringRef.current;
      if (el) {
        el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) translate(-50%, -50%) scale(${hovering ? 1.8 : 1})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hovering]);

  return (
    <div
      ref={ringRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] h-8 w-8 rounded-full border border-primary/80 mix-blend-screen transition-[background-color,border-color] duration-200"
      style={{
        backgroundColor: hovering
          ? "hsl(var(--primary) / 0.18)"
          : "transparent",
        boxShadow: "0 0 18px hsl(var(--primary) / 0.4)",
      }}
    />
  );
}
