/**
 * Pure decision logic for the adaptive quality tier. No DOM, no React, no
 * requestAnimationFrame — everything here is unit-testable in jsdom.
 */

import { indexOfId, rungAt, stepDown, stepUp } from "./qualityLadder";
import type { GpuClass } from "./gpuTier";

export type Move = "down2" | "down1" | "hold" | "up1";

/** A move needs more than this fraction of the samples to agree. */
export const SAMPLE_THRESHOLD = 0.75;

/**
 * Frame-rate bounds, scaled to the display.
 *
 * Fixed thresholds were wrong: with vsync every machine that keeps up reports
 * its own refresh rate, so 60 means "comfortable" on a 60 Hz panel and "badly
 * behind" on a 165 Hz one. Same shape drei's PerformanceMonitor uses.
 *
 * This does not cure vsync blindness — a machine pinned exactly at 60 on a
 * 60 Hz panel still clears the upper bound, whether it has headroom to spare or
 * none at all. What it fixes is the comparison being meaningless across
 * displays.
 */
export function boundsFor(refreshRate: number): [number, number] {
  return refreshRate > 100 ? [60, 100] : [40, 60];
}

/**
 * Decides from a set of samples, not from one average.
 *
 * A single 2 s average is what let one garbage collection move the whole
 * ladder: two identical runs of the same measurement produced 2631 fps and
 * 322 fps. Requiring three quarters of the samples to agree makes an isolated
 * stall unable to move anything.
 *
 * Between the two bounds is a dead zone where nothing happens, which is what
 * keeps a machine sitting on a threshold from oscillating.
 */
export function decide(samples: number[], refreshRate: number): Move {
  const valid = samples.filter((s) => Number.isFinite(s) && s > 0);
  if (valid.length === 0) return "hold";

  const [lower, upper] = boundsFor(refreshRate);
  const need = valid.length * SAMPLE_THRESHOLD;
  const count = (pred: (s: number) => boolean) => valid.filter(pred).length;

  // Worst case first: far below the floor drops two rungs at once.
  if (count((s) => s < lower / 2) > need) return "down2";
  if (count((s) => s < lower) > need) return "down1";
  if (count((s) => s >= upper) > need) return "up1";
  return "hold";
}

export interface AdaptState {
  index: number;
  demoted: boolean;
  promotions: number;
}

export const MAX_PROMOTIONS = 2;

export function applyMove(
  state: AdaptState,
  move: Move,
  devicePixelRatio: number,
): AdaptState {
  if (move === "hold") return state;

  if (move === "up1") {
    // Once a machine has failed a measurement it is never promoted again this
    // session. Climbing back up is how oscillation starts.
    if (state.demoted) return state;
    if (state.promotions >= MAX_PROMOTIONS) return state;
    const next = stepUp(state.index, devicePixelRatio);
    if (next === state.index) return state;
    return { index: next, demoted: false, promotions: state.promotions + 1 };
  }

  const once = stepDown(state.index, devicePixelRatio);
  const index = move === "down2" ? stepDown(once, devicePixelRatio) : once;
  return { index, demoted: true, promotions: state.promotions };
}

export const STORAGE_KEY = "portfolio-quality-v1";
export const STORAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredQuality {
  id: string;
  gpu: GpuClass;
  at: number;
}

/**
 * A previous session's verdict, but only if it still applies: the entry expires
 * after 30 days and is discarded when the GPU changed, so one bad measurement
 * (or a new graphics card) cannot pin the machine to a low rung forever.
 */
export function loadStored(gpu: GpuClass): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredQuality>;
    if (typeof parsed?.at !== "number") return null;
    if (Date.now() - parsed.at > STORAGE_TTL_MS) return null;
    if (parsed.gpu !== gpu) return null;
    if (typeof parsed.id !== "string") return null;
    const index = indexOfId(parsed.id);
    return index === -1 ? null : index;
  } catch {
    return null;
  }
}

export function storeIndex(index: number, gpu: GpuClass): void {
  try {
    const entry: StoredQuality = { id: rungAt(index).id, gpu, at: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Private mode, blocked storage — the ladder still works, it just forgets.
  }
}
