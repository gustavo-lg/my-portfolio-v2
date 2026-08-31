/**
 * Deterministic particle-cloud geometry helpers. Pure math — no three.js.
 * All functions return Float32Array of length `count * 3` (xyz interleaved).
 */

/** mulberry32 seeded PRNG → [0, 1) */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CORE_FRACTION = 0.35;
export const CORE_RADIUS = 0.8;
export const HALO_INNER = 2;
export const HALO_OUTER = 5;
export const HALO_Y_SQUASH = 0.18;
export const DISPERSED_RADIUS = 14;

/** Dense central cluster + flattened orbital halo. */
export function generateTargetPositions(count: number, seed = 1): Float32Array {
  const rng = mulberry32(seed);
  const out = new Float32Array(count * 3);
  const coreCount = Math.floor(count * CORE_FRACTION);

  for (let i = 0; i < count; i++) {
    const isCore = i < coreCount;
    // random unit direction
    const u = rng() * 2 - 1;
    const theta = rng() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    let x = s * Math.cos(theta);
    let y = u;
    let z = s * Math.sin(theta);

    if (isCore) {
      const r = CORE_RADIUS * Math.cbrt(rng());
      x *= r;
      y *= r;
      z *= r;
    } else {
      const r = HALO_INNER + (HALO_OUTER - HALO_INNER) * rng();
      x *= r;
      y *= r * HALO_Y_SQUASH;
      z *= r;
    }

    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

/** Uniformly scattered in a large sphere — the pre-formation state. */
export function generateDispersedPositions(
  count: number,
  seed = 2,
): Float32Array {
  const rng = mulberry32(seed);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = rng() * 2 - 1;
    const theta = rng() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = DISPERSED_RADIUS * Math.cbrt(rng());
    out[i * 3] = s * Math.cos(theta) * r;
    out[i * 3 + 1] = u * r;
    out[i * 3 + 2] = s * Math.sin(theta) * r;
  }
  return out;
}

const CYAN: [number, number, number] = [0, 0.83, 1];
const PURPLE: [number, number, number] = [0.55, 0.3, 0.92];

/** Per-particle color lerped cyan→purple by distance from origin. */
export function generateColors(
  count: number,
  targets: Float32Array,
): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = targets[i * 3];
    const y = targets[i * 3 + 1];
    const z = targets[i * 3 + 2];
    const d = Math.sqrt(x * x + y * y + z * z);
    const t = Math.min(1, d / HALO_OUTER);
    out[i * 3] = CYAN[0] + (PURPLE[0] - CYAN[0]) * t;
    out[i * 3 + 1] = CYAN[1] + (PURPLE[1] - CYAN[1]) * t;
    out[i * 3 + 2] = CYAN[2] + (PURPLE[2] - CYAN[2]) * t;
  }
  return out;
}
