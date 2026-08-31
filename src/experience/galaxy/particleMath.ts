/** Pure helpers for animating the particle buffer. No three.js. */

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

/** Small bounded pseudo-noise displacement for idle "breathing". |offset| < 0.06 */
export function idleOffset(
  i: number,
  time: number,
  seed = 0,
): [number, number, number] {
  const a = i * 12.9898 + seed;
  return [
    Math.sin(time * 0.24 + a) * 0.05,
    Math.sin(time * 0.19 + a * 1.7) * 0.05,
    Math.sin(time * 0.28 + a * 2.3) * 0.05,
  ];
}
