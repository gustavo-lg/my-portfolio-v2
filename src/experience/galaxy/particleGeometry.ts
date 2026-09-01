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

// Two zones now — no bright nucleus. A broad mid cloud and a sparser outer
// scatter, both clumped, so the nebula reads as an even volumetric drift with
// no "sun" at its centre.
export const CORE_FRACTION = 0;
export const MID_FRACTION = 0.66;
export const CORE_RADIUS = 2.0;
export const MID_INNER = 0.8;
export const MID_OUTER = 8;
export const OUTER_INNER = 5;
export const OUTER_OUTER = 15;
export const HALO_Y_SQUASH = 0.62;
export const DISPERSED_RADIUS = 24;
// Colour lerps blue→violet by distance from the formation centre; kept short
// so most of the dust takes the violet hue.
export const COLOR_RANGE = 9;

// Most of the dust condenses onto soft overlapping knots, so the field reads
// as thick nebula clouds and density lanes rather than a thin sparkle field.
const CLUMP_COUNT = 16;
const CLUMP_BIAS = 0.72;

interface Clump {
  x: number;
  y: number;
  z: number;
  spread: number;
}

function makeClumps(rng: () => number): Clump[] {
  const clumps: Clump[] = [];
  for (let i = 0; i < CLUMP_COUNT; i++) {
    const u = rng() * 2 - 1;
    const theta = rng() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = MID_INNER + (OUTER_OUTER - MID_INNER) * Math.pow(rng(), 0.6);
    clumps.push({
      x: s * Math.cos(theta) * r,
      y: u * r * 0.5,
      z: s * Math.sin(theta) * r,
      spread: 2.6 + rng() * 4.2,
    });
  }
  return clumps;
}

/** Triangular noise in [-1.5, 1.5] — a cheap bell curve for jitter. */
function bell(rng: () => number): number {
  return rng() + rng() + rng() - 1.5;
}

/** Nucleus + broad mid cloud + sparse outer scatter, with clumped dust lanes. */
export function generateTargetPositions(count: number, seed = 1): Float32Array {
  const rng = mulberry32(seed);
  const clumps = makeClumps(rng);
  const out = new Float32Array(count * 3);
  const coreCount = Math.floor(count * CORE_FRACTION);
  const midCount = coreCount + Math.floor(count * MID_FRACTION);

  for (let i = 0; i < count; i++) {
    const u = rng() * 2 - 1;
    const theta = rng() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    let x = s * Math.cos(theta);
    let y = u;
    let z = s * Math.sin(theta);

    if (i < coreCount) {
      const r = CORE_RADIUS * Math.pow(rng(), 1.7);
      x *= r;
      y *= r * 0.85;
      z *= r;
    } else if (i < midCount) {
      const r = MID_INNER + (MID_OUTER - MID_INNER) * Math.pow(rng(), 0.8);
      x *= r;
      y *= r * HALO_Y_SQUASH;
      z *= r;
    } else {
      // Sparse outer haze — nearly spherical so it fills the corners.
      const r = OUTER_INNER + (OUTER_OUTER - OUTER_INNER) * Math.pow(rng(), 0.6);
      x *= r;
      y *= r * 0.8;
      z *= r;
    }

    // Non-core dust mostly condenses onto a nearby knot.
    if (i >= coreCount && rng() < CLUMP_BIAS) {
      const c = clumps[(rng() * clumps.length) | 0];
      x = c.x + bell(rng) * c.spread;
      y = c.y + bell(rng) * c.spread * 0.6;
      z = c.z + bell(rng) * c.spread;
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

export type ColorScheme = {
  /** Near-center color [r, g, b] in 0-1 range */
  inner: [number, number, number];
  /** Far-from-center color [r, g, b] in 0-1 range */
  outer: [number, number, number];
};

const DEFAULT_SCHEME: ColorScheme = {
  inner: [0, 0.83, 1],    // cyan
  outer: [0.55, 0.3, 0.92], // purple
};

/** Per-particle color lerped inner→outer by distance from the formation centre. */
export function generateColors(
  count: number,
  targets: Float32Array,
  scheme: ColorScheme = DEFAULT_SCHEME,
  center: [number, number, number] = [0, 0, 0],
): Float32Array {
  const { inner, outer } = scheme;
  const [cx, cy, cz] = center;
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = targets[i * 3] - cx;
    const y = targets[i * 3 + 1] - cy;
    const z = targets[i * 3 + 2] - cz;
    const d = Math.sqrt(x * x + y * y + z * z);
    const t = Math.min(1, d / COLOR_RANGE);
    out[i * 3]     = inner[0] + (outer[0] - inner[0]) * t;
    out[i * 3 + 1] = inner[1] + (outer[1] - inner[1]) * t;
    out[i * 3 + 2] = inner[2] + (outer[2] - inner[2]) * t;
  }
  return out;
}

export interface Deformation {
  scale: [number, number, number];
  shearXY?: number;
  shearZX?: number;
  tilt?: [number, number, number];
}

/** base nebula positions -> a per-page deformed shape. Pure, no three.js. */
export function deformPositions(
  base: Float32Array,
  d: Deformation,
  out: Float32Array,
): void {
  const [sx, sy, sz] = d.scale;
  const shearXY = d.shearXY ?? 0;
  const shearZX = d.shearZX ?? 0;
  const [tx, ty, tz] = d.tilt ?? [0, 0, 0];
  const cx = Math.cos(tx),
    sxx = Math.sin(tx);
  const cy = Math.cos(ty),
    syy = Math.sin(ty);
  const cz = Math.cos(tz),
    szz = Math.sin(tz);

  for (let i = 0; i < base.length; i += 3) {
    const x0 = base[i];
    const y0 = base[i + 1];
    const z0 = base[i + 2];

    let x = x0 * sx + shearXY * y0;
    let y = y0 * sy;
    let z = z0 * sz + shearZX * x0;

    if (tx || ty || tz) {
      // Z
      let nx = x * cz - y * szz;
      let ny = x * szz + y * cz;
      x = nx;
      y = ny;
      // Y
      nx = x * cy + z * syy;
      let nz = -x * syy + z * cy;
      x = nx;
      z = nz;
      // X
      ny = y * cx - z * sxx;
      nz = y * sxx + z * cx;
      y = ny;
      z = nz;
    }

    out[i] = x;
    out[i + 1] = y;
    out[i + 2] = z;
  }
}

/** Translate every xyz triple in `positions` by `center`, in place. */
export function offsetPositions(
  positions: Float32Array,
  center: [number, number, number],
): void {
  const [cx, cy, cz] = center;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] += cx;
    positions[i + 1] += cy;
    positions[i + 2] += cz;
  }
}

/**
 * Static dust that surrounds the camera and never morphs — a near shell for
 * immediate parallax motes plus a sparse far field for depth. `nearFrac` of
 * the points land between `nearInner`..`nearOuter`, the rest out to `farOuter`.
 */
export function generateDustField(
  count: number,
  seed = 99,
  nearInner = 3,
  nearOuter = 24,
  farOuter = 60,
  nearFrac = 0.62,
): Float32Array {
  const rng = mulberry32(seed);
  const out = new Float32Array(count * 3);
  const nearCount = Math.floor(count * nearFrac);
  for (let i = 0; i < count; i++) {
    const u = rng() * 2 - 1;
    const theta = rng() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r =
      i < nearCount
        ? nearInner + (nearOuter - nearInner) * Math.pow(rng(), 0.55)
        : nearOuter + (farOuter - nearOuter) * Math.pow(rng(), 0.7);
    out[i * 3] = s * Math.cos(theta) * r;
    out[i * 3 + 1] = u * r * 0.85;
    out[i * 3 + 2] = s * Math.sin(theta) * r;
  }
  return out;
}
