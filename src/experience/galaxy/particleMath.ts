/** Pure helpers for animating the particle buffer. No three.js. */

import type { Wave } from "./categoryScenes";

const AXIS = { x: 0, y: 1, z: 2 } as const;

/**
 * Layer a continuous sine ripple onto an already-positioned buffer, in place.
 * `strength` (0→1) ramps the effect in so it doesn't fight the formation morph.
 */
export function applyWave(
  pos: Float32Array,
  wave: Wave,
  time: number,
  strength: number,
): void {
  if (strength <= 0 || wave.amplitude === 0) return;
  const d = AXIS[wave.drive];
  const p = AXIS[wave.displace];
  const a = wave.amplitude * (strength > 1 ? 1 : strength);
  for (let i = 0; i < pos.length; i += 3) {
    pos[i + p] += a * Math.sin(pos[i + d] * wave.frequency + time * wave.speed);
  }
}

/** Linear interpolation of every component from `from`→`to` at `t`, into `out`. */
export function lerpPositions(
  from: Float32Array,
  to: Float32Array,
  t: number,
  out: Float32Array,
): void {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  for (let i = 0; i < out.length; i++) {
    out[i] = from[i] + (to[i] - from[i]) * k;
  }
}

/** Bounded pseudo-noise displacement for the idle "breathing". |offset| < 0.12 */
export function idleOffset(
  i: number,
  time: number,
  seed = 0,
): [number, number, number] {
  const a = i * 12.9898 + seed;
  return [
    Math.sin(time * 0.33 + a) * 0.09,
    Math.sin(time * 0.27 + a * 1.7) * 0.09,
    Math.sin(time * 0.38 + a * 2.3) * 0.09,
  ];
}
