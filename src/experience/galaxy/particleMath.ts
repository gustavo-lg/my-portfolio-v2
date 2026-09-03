/** Pure helpers for animating the particle buffer. No three.js. */

import type { Wave, SceneKey } from "./categoryScenes";

const AXIS = { x: 0, y: 1, z: 2 } as const;

export interface GalaxyFrame {
  cx: number;
  cy: number;
  cz: number;
  nx: number;
  ny: number;
  nz: number;
}

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

/**
 * Apply category-specific unique deformation to a galaxy's particle buffer slice.
 * Operates in local coordinates relative to the galaxy's center and orientation.
 */
export function applyGalaxyDeformation(
  pos: Float32Array,
  start: number,
  count: number,
  sceneKey: SceneKey,
  intensity: number,
  time: number,
  frame: GalaxyFrame,
): void {
  if (intensity <= 0.001 || sceneKey === "menu" || count <= 0) return;

  const { cx, cy, cz, nx, ny, nz } = frame;
  const end = (start + count) * 3;

  // Compute tangent and bitangent vectors perpendicular to disk normal (nx, ny, nz)
  // to establish an orthonormal local coordinate system (u, v, normal)
  let ax = 0,
    ay = 1,
    az = 0;
  if (Math.abs(ny) > 0.92) {
    ax = 1;
    ay = 0;
    az = 0;
  }
  // u = normalize(a x n)
  let ux = ay * nz - az * ny;
  let uy = az * nx - ax * nz;
  let uz = ax * ny - ay * nx;
  const ulen = Math.hypot(ux, uy, uz) || 1;
  ux /= ulen;
  uy /= ulen;
  uz /= ulen;

  // v = n x u
  const vx = ny * uz - nz * uy;
  const vy = nz * ux - nx * uz;
  const vz = nx * uy - ny * ux;

  for (let i = start * 3; i < end; i += 3) {
    // Current world position relative to galaxy center
    const wx = pos[i] - cx;
    const wy = pos[i + 1] - cy;
    const wz = pos[i + 2] - cz;

    // Project into local galaxy coordinate space (lu = X_plane, lv = Y_plane, ln = Normal_height)
    const lu = wx * ux + wy * uy + wz * uz;
    const lv = wx * vx + wy * vy + wz * vz;
    const ln = wx * nx + wy * ny + wz * nz;

    const r = Math.sqrt(lu * lu + lv * lv);
    const angle = Math.atan2(lv, lu);

    let dLu = 0;
    let dLv = 0;
    let dLn = 0;

    switch (sceneKey) {
      case "projetos": {
        // ── 1. PROJETOS: Gravitational Vortex & Spiral Funnel ──
        // Radial inward suction + tight spiral vortex twist + z-funnel depression
        const vortexTwist = intensity * (2.8 / (r * 0.7 + 0.6));
        const newAngle =
          angle +
          vortexTwist +
          Math.sin(r * 2.2 - time * 2.5) * 0.3 * intensity;
        const targetLu = Math.cos(newAngle) * r;
        const targetLv = Math.sin(newAngle) * r;
        dLu = (targetLu - lu) * intensity;
        dLv = (targetLv - lv) * intensity;

        // Gravitational well funnel along normal
        const funnel =
          -intensity * (1.6 / (r * 0.9 + 0.5)) +
          Math.sin(r * 3.0 - time * 3.2) * 0.35 * intensity;
        dLn = funnel;
        break;
      }

      case "stack": {
        // ── 2. STACK: Quantum Harmonic Ripple & Multi-lattice Sheets ──
        // Perpendicular orthogonal waves & crystalline layered stratification (calm, smooth flow)
        const waveX =
          Math.sin(lu * 2.6 + time * 0.9) * Math.cos(lv * 2.0 - time * 0.6);
        const waveY =
          Math.cos(lu * 2.0 - time * 0.6) * Math.sin(lv * 2.6 + time * 0.8);
        const latticeH =
          Math.sin(r * 3.6 - time * 1.1) * Math.cos(angle * 4.0);

        dLu = waveX * 0.38 * intensity;
        dLv = waveY * 0.38 * intensity;
        dLn = (latticeH * 0.6 + waveX * 0.25) * intensity;
        break;
      }

      case "sobre": {
        // ── 3. SOBRE: Organic Möbius Saddle Warp & Breathing Swell ──
        // Asymmetric saddle curvature (bending opposite quadrants in opposite directions)
        // plus gentle radial breath
        const saddle =
          ((lu * lu - lv * lv) * 0.18 +
            Math.sin(angle * 2.0 + time * 1.2) * 0.6) *
          intensity;
        const breath =
          1.0 + 0.22 * intensity * Math.sin(time * 1.6 + r * 0.7);

        dLu = lu * (breath - 1.0);
        dLv = lv * (breath - 1.0);
        dLn = saddle;
        break;
      }

      case "contato": {
        // ── 4. CONTATO: Electromagnetic Pulsar & Polar Flare Jet ──
        // Elliptical compression (squeeze along U, stretch along V) + gentle, fluid polar jets
        const stretch = 1.0 + 0.38 * intensity;
        const squash = 1.0 / (1.0 + 0.32 * intensity);
        const coreDist = Math.max(0.1, r);
        const isCore = coreDist < 2.0;

        // Smooth pulsating polar jet along normal (calm, majestic pulsation)
        const jetSign =
          (ln >= 0 ? 1 : -1) *
          (1.0 + 0.25 * Math.sin(time * 2.2 + coreDist * 2.5));
        const jet = isCore
          ? jetSign * (2.2 - coreDist) * 0.75 * intensity
          : 0;
        const pulseWave =
          Math.sin(coreDist * 3.8 - time * 1.6) * 0.2 * intensity;

        dLu = (lu * squash - lu) * intensity;
        dLv = (lv * stretch - lv) * intensity;
        dLn = jet + pulseWave;
        break;
      }
    }

    // Reconstruct world delta displacement by unprojecting (dLu * u + dLv * v + dLn * n)
    pos[i] += dLu * ux + dLv * vx + dLn * nx;
    pos[i + 1] += dLu * uy + dLv * vy + dLn * ny;
    pos[i + 2] += dLu * uz + dLv * vz + dLn * nz;
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

