import { lerpPositions } from "./particleMath";
import type { Flourish } from "./categoryScenes";

export const FLOURISH_SPLIT = 0.55;

export function flourishTarget(
  shape: Float32Array,
  kind: Flourish,
  out: Float32Array,
): void {
  switch (kind) {
    case "fling":
      for (let i = 0; i < shape.length; i++) out[i] = shape[i] * 1.35;
      return;
    case "gather":
      for (let i = 0; i < shape.length; i++) out[i] = shape[i] * 0.6;
      return;
    case "rise":
      for (let i = 0; i < shape.length; i += 3) {
        out[i] = shape[i];
        out[i + 1] = shape[i + 1] + 3.5;
        out[i + 2] = shape[i + 2];
      }
      return;
    case "sweep":
      for (let i = 0; i < shape.length; i += 3) {
        out[i] = shape[i] + 0.5 * shape[i + 1];
        out[i + 1] = shape[i + 1];
        out[i + 2] = shape[i + 2];
      }
      return;
    default:
      out.set(shape);
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
