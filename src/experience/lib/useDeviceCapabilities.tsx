import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getStartIndex, tierFromRung, type PerfTier } from "./perfTier";
import { REDUCED_RUNG, clampDpr, rungAt } from "./qualityLadder";
import { classifyGpu, getGpuRendererString } from "./gpuTier";
import { loadStored } from "./adaptiveTier";
import { perfStats } from "./perfDebug";
import { useAdaptivePerfTier } from "./useAdaptivePerfTier";
import { usePrefersReducedMotion } from "./useReducedMotion";
import { usePointerFine } from "./usePointerFine";

const RESIZE_DEBOUNCE_MS = 200;

export interface DeviceCapabilities {
  tier: PerfTier;
  reducedMotion: boolean;
  pointerFine: boolean;
}

function viewport(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 0, height: 0 };
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Resolves the tier. Must run exactly once per page: it owns an adaptive FPS
 * probe with its own requestAnimationFrame loop, so a second instance would
 * measure and write the stored verdict in parallel with the first.
 */
function useResolveDeviceCapabilities(): DeviceCapabilities {
  const reducedMotion = usePrefersReducedMotion();
  const pointerFine = usePointerFine();

  // One probe per page load; creating a WebGL context is not free.
  const gpuClass = useMemo(() => classifyGpu(getGpuRendererString()), []);

  const startIndex = useMemo(() => {
    const fresh = getStartIndex({
      reducedMotion,
      pointerFine,
      hardwareConcurrency:
        typeof navigator !== "undefined"
          ? navigator.hardwareConcurrency
          : undefined,
      deviceMemory:
        typeof navigator !== "undefined"
          ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
          : undefined,
      gpuClass,
    });
    const stored = loadStored(gpuClass);
    // A higher index is a lower rung: a previous session may only lower the
    // starting point, never raise it.
    return stored === null ? fresh : Math.max(fresh, stored);
  }, [reducedMotion, pointerFine, gpuClass]);

  const index = useAdaptivePerfTier(startIndex, gpuClass, !reducedMotion);

  const [size, setSize] = useState(viewport);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setSize(viewport()), RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const tier = useMemo(() => {
    const rung = reducedMotion ? REDUCED_RUNG : rungAt(index);
    return tierFromRung(rung, clampDpr(rung.maxDpr, size.width, size.height), {
      pointerFine,
      reducedMotion,
    });
  }, [reducedMotion, pointerFine, index, size.width, size.height]);

  // Report the resolved rung to the debug HUD, which has no other way to know
  // it before the first probe round finishes.
  useEffect(() => {
    perfStats.rung = tier.id;
  }, [tier.id]);

  return useMemo(
    () => ({ tier, reducedMotion, pointerFine }),
    [tier, reducedMotion, pointerFine],
  );
}

const DeviceCapabilitiesContext = createContext<DeviceCapabilities | null>(null);

/**
 * Resolves the performance tier once and shares it. Place it above every
 * consumer.
 */
export function DeviceCapabilitiesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const value = useResolveDeviceCapabilities();
  return (
    <DeviceCapabilitiesContext.Provider value={value}>
      {children}
    </DeviceCapabilitiesContext.Provider>
  );
}

/** Reads the live browser capabilities and the resolved performance tier. */
export function useDeviceCapabilities(): DeviceCapabilities {
  const value = useContext(DeviceCapabilitiesContext);
  if (!value) {
    throw new Error(
      "useDeviceCapabilities must be called inside <DeviceCapabilitiesProvider>. " +
        "Resolving the tier per consumer would start one FPS probe per caller, " +
        "each with its own requestAnimationFrame loop and its own stored verdict.",
    );
  }
  return value;
}
