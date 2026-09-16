import { LADDER, indexOfId, type Rung } from "./qualityLadder";
import type { GpuClass } from "./gpuTier";

export interface PerfTier {
  id: string;
  particleCount: number;
  maxDpr: number;
  customCursor: boolean;
  /** Always false in the MVP; kept so consumers do not have to change. */
  bloom: boolean;
}

export interface PerfTierOptions {
  reducedMotion?: boolean;
  pointerFine?: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  gpuClass?: GpuClass;
}

/**
 * `customCursor` is a question about the input device, not about how many
 * particles the GPU can push, so it is derived here rather than carried on the
 * rung. It used to live on the ladder, which meant a touch device promoted from
 * `floor` to `low+` would silently switch the flag on.
 */
export function tierFromRung(
  rung: Rung,
  maxDpr: number,
  opts: { pointerFine?: boolean; reducedMotion?: boolean } = {},
): PerfTier {
  const { pointerFine = false, reducedMotion = false } = opts;
  return {
    id: rung.id,
    particleCount: rung.particleCount,
    maxDpr,
    customCursor: pointerFine && !reducedMotion,
    bloom: false,
  };
}

/**
 * Picks the rung the scene STARTS on. With promotion removed, this is also
 * the highest rung the session will ever use — the ladder only steps down
 * from here (see fix-performance-v2.md, RC1-RC3). Starting a "high" GPU class
 * straight on "ultra" is only safe because a step down is now a cheap
 * `geometry.groups` draw-count change, not a remount (Fase 2).
 *
 * `reducedMotion` is deliberately absent — that is an accessibility preference
 * handled by REDUCED_RUNG, not a performance verdict.
 */
export function getStartIndex(opts: PerfTierOptions = {}): number {
  const {
    pointerFine = false,
    hardwareConcurrency = 4,
    deviceMemory,
    gpuClass = "unknown",
  } = opts;

  // Touch and coarse pointers enter at the base.
  if (!pointerFine) return indexOfId("floor");

  // A weak GPU outranks a strong CPU. This is the original bug: 8 cores plus
  // weak integrated graphics used to land on the top tier and stutter.
  if (gpuClass === "low") return indexOfId("low");

  if (typeof deviceMemory === "number" && deviceMemory <= 4) {
    return indexOfId("low");
  }
  if (hardwareConcurrency <= 2) return indexOfId("low");

  if (gpuClass === "high") {
    return hardwareConcurrency >= 8 ? indexOfId("ultra") : indexOfId("mid");
  }
  if (gpuClass === "mid") return indexOfId("mid");

  // Safari blocks WEBGL_debug_renderer_info and always lands here. Promotion is
  // what carries a capable Mac back up.
  if (gpuClass === "unknown") return indexOfId("mid-");

  return indexOfId("low+");
}

export { LADDER };
