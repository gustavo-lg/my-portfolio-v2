import { lerpPositions } from "./particleMath";
import type { Flourish } from "./categoryScenes";

export const FLOURISH_SPLIT = 0.55;

/**
 * Build the exaggerated intermediate pose a flourished morph passes through.
 * Scaling/shearing flourishes work RELATIVE TO `center` — the galaxy this shape
 * belongs to — so a galaxy sitting away from the world origin puffs out and
 * settles in place instead of being flung sideways.
 */
export function flourishTarget(
  shape: Float32Array,
  kind: Flourish,
  out: Float32Array,
  center: readonly [number, number, number] = [0, 0, 0],
): void {
  const n = Math.min(shape.length, out.length);
  const [cx, cy, cz] = center;
  switch (kind) {
    case "fling":
      for (let i = 0; i < n; i += 3) {
        out[i] = cx + (shape[i] - cx) * 1.35;
        out[i + 1] = cy + (shape[i + 1] - cy) * 1.35;
        out[i + 2] = cz + (shape[i + 2] - cz) * 1.35;
      }
      return;
    case "gather":
      for (let i = 0; i < n; i += 3) {
        out[i] = cx + (shape[i] - cx) * 0.6;
        out[i + 1] = cy + (shape[i + 1] - cy) * 0.6;
        out[i + 2] = cz + (shape[i + 2] - cz) * 0.6;
      }
      return;
    case "rise":
      for (let i = 0; i < n; i += 3) {
        out[i] = shape[i];
        out[i + 1] = shape[i + 1] + 3.5;
        out[i + 2] = shape[i + 2];
      }
      return;
    case "sweep":
      for (let i = 0; i < n; i += 3) {
        out[i] = shape[i] + 0.5 * (shape[i + 1] - cy);
        out[i + 1] = shape[i + 1];
        out[i + 2] = shape[i + 2];
      }
      return;
    default:
      if (shape.length <= out.length) out.set(shape);
      else out.set(shape.subarray(0, out.length));
  }
}

export function morphInto(
  from: Float32Array,
  overshoot: Float32Array,
  shape: Float32Array,
  t: number,
  kind: Flourish,
  out: Float32Array,
): void {
  if (kind === "none") {
    lerpPositions(from, shape, t, out);
    return;
  }
  if (t <= FLOURISH_SPLIT) {
    lerpPositions(from, overshoot, t / FLOURISH_SPLIT, out);
  } else {
    lerpPositions(overshoot, shape, (t - FLOURISH_SPLIT) / (1 - FLOURISH_SPLIT), out);
  }
}
