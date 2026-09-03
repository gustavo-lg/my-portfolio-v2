import { useMemo } from "react";
import { getPerfTier, type PerfTier } from "./perfTier";
import { usePrefersReducedMotion } from "./useReducedMotion";
import { usePointerFine } from "./usePointerFine";

/** Reads the live browser capabilities and resolves the performance tier. */
export function useDeviceCapabilities(): {
  tier: PerfTier;
  reducedMotion: boolean;
  pointerFine: boolean;
} {
  const reducedMotion = usePrefersReducedMotion();
  const pointerFine = usePointerFine();

  const tier = useMemo(
    () =>
      getPerfTier({
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
      }),
    [reducedMotion, pointerFine],
  );

  return { tier, reducedMotion, pointerFine };
}
