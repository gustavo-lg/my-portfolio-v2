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
// Radius at which the 3-stop colour ramp reaches its cool blue arm colour.
export const COLOR_RANGE = 4.2;

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
  /** Hot centre color [r, g, b] in 0-1 range */
  inner: [number, number, number];
  /** Optional mid-radius color; defaults to the inner/outer average */
  mid?: [number, number, number];
  /** Cool outer-arm color [r, g, b] in 0-1 range */
  outer: [number, number, number];
};

const DEFAULT_SCHEME: ColorScheme = {
  inner: [1.0, 0.98, 0.96], // white core
  mid: [0.68, 0.55, 0.95], // lilac
  outer: [0.35, 0.55, 1.0], // blue arms
};

function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/**
 * Per-particle color across a 3-stop ramp (hot centre → mid → cool arm) by
 * distance from the formation centre.
 */
export function generateColors(
  count: number,
  targets: Float32Array,
  scheme: ColorScheme = DEFAULT_SCHEME,
  center: [number, number, number] = [0, 0, 0],
): Float32Array {
  const { inner, outer } = scheme;
  const mid =
    scheme.mid ?? lerp3(inner, outer, 0.5);
  const [cx, cy, cz] = center;
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const x = targets[i * 3] - cx;
    const y = targets[i * 3 + 1] - cy;
    const z = targets[i * 3 + 2] - cz;
    const d = Math.sqrt(x * x + y * y + z * z);
    const t = Math.min(1, d / COLOR_RANGE);
    const c =
      t < 0.5 ? lerp3(inner, mid, t / 0.5) : lerp3(mid, outer, (t - 0.5) / 0.5);
    out[i * 3] = c[0];
    out[i * 3 + 1] = c[1];
    out[i * 3 + 2] = c[2];
  }
  return out;
}

export interface DiskParams {
  /** Radius of the bright central bulge. */
  bulge: number;
  /** Outer edge of the spiral disk. */
  outer: number;
  /** Vertical half-thickness of the disk sheet. */
  thickness: number;
  /** Number of spiral arms. */
  arms: number;
  /** Total winding (radians) from bulge to rim. */
  twist: number;
  /** 0 = uniform disk, 1 = stars hug the spiral arms tightly. */
  armStrength: number;
  /** Vertical S-warp amplitude toward the rim. */
  warp: number;
  /** Central bar: stretch factor along X for the bulge and inner disk (1 = none). */
  bar?: number;
  /** Euler tilt [x, y, z] applied after the disk is built in the XZ plane. */
  tilt: [number, number, number];
}

/** Fraction of the HOME budget each mini (distant) galaxy gets. */
export const MINI_SHARE = 0.06;

/** Split the HOME particle budget into main + per-mini counts. */
export function galaxyFieldSplit(
  count: number,
  miniCount: number,
): { main: number; mini: number } {
  const mini = Math.floor(count * MINI_SHARE);
  return { main: count - mini * miniCount, mini };
}

/** Unit normal of a disk built in the XZ plane then tilted by `tilt`. */
export function diskNormal(
  tilt: [number, number, number],
): [number, number, number] {
  return rotateEuler(0, 1, 0, tilt);
}

function rotateEuler(
  x: number,
  y: number,
  z: number,
  tilt: [number, number, number],
): [number, number, number] {
  const [tx, ty, tz] = tilt;
  let c = Math.cos(tz),
    s = Math.sin(tz);
  let nx = x * c - y * s;
  let ny = x * s + y * c;
  x = nx;
  y = ny;
  c = Math.cos(ty);
  s = Math.sin(ty);
  nx = x * c + z * s;
  let nz = -x * s + z * c;
  x = nx;
  z = nz;
  c = Math.cos(tx);
  s = Math.sin(tx);
  ny = y * c - z * s;
  nz = y * s + z * c;
  return [x, ny, nz];
}

/**
 * A spiral galaxy: a dense central bulge, a thin spiral-armed disk, and a
 * sparse spherical halo of outer stars. Built in the XZ plane around the
 * origin, then rotated by `tilt`. Pure math.
 */
export function galaxyDisk(
  count: number,
  p: DiskParams,
  seed = 1,
): Float32Array {
  const rng = mulberry32(seed);
  const out = new Float32Array(count * 3);
  const bulgeCount = Math.floor(count * 0.18);
  const haloCount = Math.floor(count * 0.04);
  const diskEnd = count - haloCount;
  const armStep = (Math.PI * 2) / Math.max(1, p.arms);
  const diskInner = p.bulge * 0.55;
  const diskSpan = p.outer - diskInner;
  const bar = p.bar ?? 1;
  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    let z: number;
    if (i < bulgeCount) {
      // Flattened ellipsoid bulge, packed hard toward the centre.
      const rr = p.bulge * Math.pow(rng(), 1.2);
      const u = rng() * 2 - 1;
      const th = rng() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      x = s * Math.cos(th) * rr * bar;
      z = s * Math.sin(th) * rr;
      y = u * rr * 0.5;
    } else if (i < diskEnd) {
      const rt = Math.pow(rng(), 1.45); // denser toward the inner disk
      const r = diskInner + diskSpan * rt;
      const wind = p.twist * rt;
      let ang = rng() * Math.PI * 2;
      const armTarget = Math.round((ang - wind) / armStep) * armStep + wind;
      ang += (armTarget - ang) * p.armStrength;
      ang += (rng() - 0.5) * (0.18 + rt * 0.85);
      x = Math.cos(ang) * r;
      z = Math.sin(ang) * r;
      // The bar fades out over the inner third of the disk.
      if (bar !== 1 && rt < 0.33) x *= 1 + (bar - 1) * (1 - rt / 0.33);
      y =
        (rng() - 0.5) * 2 * p.thickness * (0.3 + 0.7 * (1 - rt)) +
        Math.sin(ang + wind) * p.warp * rt;
      const turb = 0.24 * (0.4 + rt);
      x += (rng() - 0.5) * turb;
      z += (rng() - 0.5) * turb;
      y += (rng() - 0.5) * turb * 0.4;
    } else {
      // Sparse spherical halo reaching a little past the disk.
      const rr = p.outer * (0.65 + 0.55 * Math.pow(rng(), 0.5));
      const u = rng() * 2 - 1;
      const th = rng() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      x = s * Math.cos(th) * rr;
      z = s * Math.sin(th) * rr;
      y = u * rr * 0.55;
    }
    const [rx, ry, rz] = rotateEuler(x, y, z, p.tilt);
    out[i * 3] = rx;
    out[i * 3 + 1] = ry;
    out[i * 3 + 2] = rz;
  }
  return out;
}

/**
 * The HOME scene: the central galaxy at the origin plus a small distant galaxy
 * toward each label, all packed into a single buffer.
 */
export function galaxyField(
  count: number,
  main: DiskParams,
  minis: { params: DiskParams; center: [number, number, number] }[],
): Float32Array {
  const out = new Float32Array(count * 3);
  const { main: mainCount, mini: miniCount } = galaxyFieldSplit(
    count,
    minis.length,
  );
  out.set(galaxyDisk(mainCount, main, 1), 0);
  let offset = mainCount * 3;
  minis.forEach((m, idx) => {
    const buf = galaxyDisk(miniCount, m.params, 21 + idx);
    offsetPositions(buf, m.center);
    out.set(buf, offset);
    offset += buf.length;
  });
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
