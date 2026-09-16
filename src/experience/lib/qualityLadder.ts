/**
 * The ordered quality ladder the adaptive tier walks.
 *
 * A rung is addressed by its integer index. Stepping down is `index + 1`.
 * Between two neighbouring rungs exactly one of `particleCount` and `maxDpr`
 * changes, never both, so the cheap lever (DPR: no buffer rebuild, no visible
 * particle loss) is always tried before the expensive one (particle count:
 * rebuilds megabytes of Float32Array and remounts the field).
 */

export interface Rung {
  id: string;
  particleCount: number;
  maxDpr: number;
}

export const LADDER: readonly Rung[] = [
  // Sized from measurement, not from the GPU headroom alone. At 220k the scene
  // costs 0.34 ms of GPU per frame — about 17x under a 165 Hz budget — so the
  // binding constraints are memory (~121 bytes per point) and the geometry
  // rebuild on mount (~0.197 ms per thousand points). 300k lands at roughly
  // 104 MB and a 248 ms rebuild; 440k would be 140 MB and 310 ms, for a gain
  // additive blending largely washes out.
  { id: "ultra", particleCount: 220000, maxDpr: 2.0 },
  { id: "high", particleCount: 220000, maxDpr: 1.5 },
  { id: "high-", particleCount: 150000, maxDpr: 1.5 },
  { id: "mid", particleCount: 150000, maxDpr: 1.25 },
  { id: "mid-", particleCount: 100000, maxDpr: 1.25 },
  { id: "low+", particleCount: 100000, maxDpr: 1.0 },
  { id: "low", particleCount: 48000, maxDpr: 1.0 },
  { id: "floor", particleCount: 16000, maxDpr: 1.0 },
  { id: "minimal", particleCount: 6000, maxDpr: 1.0 },
] as const;

/**
 * Reduced motion is an accessibility preference, not a performance verdict, so
 * it sits outside the ladder and never takes part in stepping.
 */
export const REDUCED_RUNG: Rung = {
  id: "reduced",
  particleCount: 6000,
  maxDpr: 1.0,
};

/** Roughly the pixel count a mid-range integrated GPU can fill with additive points. */
export const PIXEL_BUDGET = 5_000_000;

export function rungAt(index: number): Rung {
  const i = Math.min(LADDER.length - 1, Math.max(0, Math.trunc(index)));
  return LADDER[i];
}

export function indexOfId(id: string): number {
  return LADDER.findIndex((r) => r.id === id);
}

/**
 * A DPR-only step is a no-op when the display never reaches either rung's
 * ceiling: three clamps the pixel ratio to `window.devicePixelRatio`, so on a
 * 1080p screen at 100% scaling every `maxDpr` above 1 is already unreachable.
 * Taking such a step would change nothing on screen and burn a measurement
 * round, so the ladder skips it.
 */
export function isInertStep(
  from: number,
  to: number,
  devicePixelRatio: number,
): boolean {
  const a = rungAt(from);
  const b = rungAt(to);
  if (a.particleCount !== b.particleCount) return false;
  return devicePixelRatio <= Math.min(a.maxDpr, b.maxDpr);
}

/**
 * Both steppers return the ORIGINAL index when every remaining step in that
 * direction is inert. Landing on a rung that renders identically would report a
 * change that the viewer cannot see — and, on the way up, would spend one of
 * the two allowed promotions for nothing.
 */
export function stepDown(index: number, devicePixelRatio: number): number {
  const last = LADDER.length - 1;
  const start = Math.min(last, Math.max(0, Math.trunc(index)));
  let from = start;
  while (from < last) {
    const next = from + 1;
    if (!isInertStep(from, next, devicePixelRatio)) return next;
    from = next;
  }
  return start;
}

/**
 * Hold the rendered pixel count inside a budget. A 4K panel at DPR 2 is 33M
 * pixels per frame, which additive blending turns into a slideshow regardless
 * of particle count.
 */
export function clampDpr(
  maxDpr: number,
  widthCss: number,
  heightCss: number,
): number {
  if (
    !Number.isFinite(widthCss) ||
    !Number.isFinite(heightCss) ||
    widthCss <= 0 ||
    heightCss <= 0
  ) {
    return maxDpr;
  }
  const allowed = Math.sqrt(PIXEL_BUDGET / (widthCss * heightCss));
  return Math.max(1, Math.min(maxDpr, allowed));
}
