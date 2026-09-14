import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import {
  generateDispersedPositions,
  type ColorScheme,
} from "./particleGeometry";
import {
  applyGalaxyDeformation,
  applyWave,
  lerpPositions,
} from "./particleMath";
import { flourishTarget, morphInto } from "./particleMorph";
import { getParticleTexture } from "./particleTexture";
import {
  MAX_GALAXIES,
  axisCode,
  createParticleMaterial,
  sceneCode,
  usesFlourish,
  type ParticleUniforms,
} from "./particleShader";
import { FORMATION_MS } from "./cameraTargets";
import { PERF_DEBUG, perfStats } from "@/experience/lib/perfDebug";
import type { Flourish, SceneKey, Wave } from "./categoryScenes";

/**
 * One galaxy's rigid spin: the contiguous particle range [start, start+count)
 * rotates as a rigid body about the unit axis (nx,ny,nz) through (cx,cy,cz).
 * Rigid so the spiral shape is preserved exactly, no matter how long it spins.
 */
export interface GalaxySpin {
  key?: SceneKey;
  start: number;
  count: number;
  cx: number;
  cy: number;
  cz: number;
  nx: number;
  ny: number;
  nz: number;
  speed: number;
}

/**
 * Rotate one galaxy's slice of `arr` rigidly about its own axis and centre.
 *
 * The per-frame version of this now lives in the vertex shader
 * (`particleShader.ts`). This CPU copy is still needed once per morph, to
 * snapshot where the particles currently are before a new target takes over.
 */
function rotateGalaxy(
  src: Float32Array,
  dst: Float32Array,
  g: GalaxySpin,
  ang: number,
): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const one = 1 - ca;
  const { nx, ny, nz, cx, cy, cz } = g;
  const end = (g.start + g.count) * 3;
  for (let i = g.start * 3; i < end; i += 3) {
    const px = src[i] - cx;
    const py = src[i + 1] - cy;
    const pz = src[i + 2] - cz;
    const dot = nx * px + ny * py + nz * pz;
    dst[i] = cx + px * ca + (ny * pz - nz * py) * sa + nx * dot * one;
    dst[i + 1] = cy + py * ca + (nz * px - nx * pz) * sa + ny * dot * one;
    dst[i + 2] = cz + pz * ca + (nx * py - ny * px) * sa + nz * dot * one;
  }
}

const GLOW_OPACITY = 0.5;
const CORE_OPACITY = 0.95;
/** Sampling window for the dev frame meter. */
const METER_WINDOW_MS = 500;
const CATEGORIES = ["projetos", "stack", "sobre", "contato"] as const;

export interface GalaxyDetail {
  positions: Float32Array;
  colors: Float32Array;
  spin: GalaxySpin;
}

interface Props {
  count: number;
  reducedMotion: boolean;
  idle: boolean;
  shape: Float32Array;
  /** Per-particle RGB target for this scene (precomputed by GalaxyCanvas). */
  colors: Float32Array;
  galaxies: GalaxySpin[];
  wave: Wave;
  pointSize: number;
  pointOpacity: number;
  morphDuration: number;
  morphEase: string;
  flourish: Flourish;
  colorScheme: ColorScheme;
  glowScale: number;
  center?: [number, number, number];
  onFormed?: () => void;
  /** Active category detail layer (null when on Home). Multiplies that mini galaxy's particles by 4. */
  activeDetail?: GalaxyDetail | null;
  detailCount?: number;
  activeScene?: SceneKey;
  /**
   * Skip the entry formation and appear already settled. Set when the field is
   * remounted mid-session because the quality tier changed the particle count —
   * without it the galaxy would visibly explode and re-form.
   */
  instantForm?: boolean;
}

interface Buffers {
  count: number;
  /** Static morph target. Bound as `position`, so three can size the geometry. */
  target: Float32Array;
  from: Float32Array;
  overshoot: Float32Array;
  fromColor: Float32Array;
  targetColor: Float32Array;
  galaxy: Float32Array;
  /** Work area for the once-per-morph pose snapshot. Never bound to an attribute. */
  scratch: Float32Array;
}

function makeBuffers(
  count: number,
  shape: Float32Array,
  colors: Float32Array,
  dispersed: Float32Array,
): Buffers {
  const n = count * 3;
  const target = new Float32Array(n);
  target.set(shape.subarray(0, Math.min(n, shape.length)));
  const color = new Float32Array(n);
  color.set(colors.subarray(0, Math.min(n, colors.length)));
  const from = new Float32Array(n);
  from.set(dispersed.subarray(0, Math.min(n, dispersed.length)));
  return {
    count,
    target,
    from,
    overshoot: new Float32Array(n),
    fromColor: Float32Array.from(color),
    targetColor: color,
    galaxy: new Float32Array(count),
    scratch: new Float32Array(n),
  };
}

export function ParticleField({
  count,
  reducedMotion,
  idle,
  shape,
  colors,
  galaxies,
  wave,
  pointSize,
  pointOpacity,
  morphDuration,
  morphEase,
  flourish,
  colorScheme,
  glowScale,
  center = [0, 0, 0],
  onFormed,
  activeDetail,
  detailCount,
  activeScene = "menu",
  instantForm = false,
}: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const detailPointsRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const coreRef = useRef<THREE.Sprite>(null);

  const detailOpacity = useRef({ value: 0 });
  const detailSpin = useRef<GalaxySpin | null>(null);
  const detailTween = useRef<gsap.core.Tween | null>(null);

  const dispersed = useMemo(() => generateDispersedPositions(count), [count]);

  // Allocated once per mount. `count` only changes via a remount (GalaxyCanvas
  // keys the field on it), so the guard is a safety net, not a hot path.
  const buffersRef = useRef<Buffers | null>(null);
  if (!buffersRef.current || buffersRef.current.count !== count) {
    buffersRef.current = makeBuffers(count, shape, colors, dispersed);
  }
  const buffers = buffersRef.current;

  const detailBuffers = useMemo(() => {
    if (!detailCount) return null;
    return {
      positions: new Float32Array(detailCount * 3),
      colors: new Float32Array(detailCount * 3),
      galaxy: new Float32Array(detailCount),
    };
  }, [detailCount]);

  const main = useMemo(
    () => createParticleMaterial(pointSize, pointOpacity),
    // Built once per mount; the frame loop drives every value from here on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const detail = useMemo(() => {
    const built = createParticleMaterial(pointSize, 0);
    // The detail field never morphs; it is always drawn at its target pose.
    built.uniforms.uMorphT.value = 1;
    return built;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const mainMaterial = main.material;
    const detailMaterial = detail.material;
    return () => {
      mainMaterial.dispose();
      detailMaterial.dispose();
    };
  }, [main, detail]);

  const flourishRef = useRef<Flourish>("none");
  const morph = useRef({ t: reducedMotion ? 1 : 0 });
  const formed = useRef(false);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  // Seconds of spin accumulated since mount. Advances only at rest and is
  // never reset, so the spin phase stays continuous across a morph.
  const spinTime = useRef(0);
  // Last frame's clock time, so the once-per-morph snapshot can rebuild the
  // exact pose the shader was drawing.
  const lastElapsed = useRef(0);

  // Bright core-bulge glow that sits on the active galaxy.
  const targetGlowColor = useRef(new THREE.Color(...colorScheme.inner));
  const targetCenter = useRef(new THREE.Vector3(...center));

  // Scratch objects reused every frame. Allocating these inside useFrame
  // churned garbage into the GC on every single frame.
  const scratchGlowScale = useRef(new THREE.Vector3());
  const scratchCoreScale = useRef(new THREE.Vector3());
  const scratchBufferSize = useRef(new THREE.Vector2());

  // Dev-only frame meter. Reports FPS alongside the time actually spent inside
  // this useFrame body, which separates a CPU-bound frame (high body time) from
  // a GPU-bound one (low body time, low FPS).
  const meter = useRef({ frames: 0, bodyMs: 0, since: 0 });

  // Per-category deformation intensity for smooth entry and return transitions
  const intensities = useRef<Record<string, number>>({
    projetos: 0,
    stack: 0,
    sobre: 0,
    contato: 0,
  });
  const deformTweens = useRef<Record<string, gsap.core.Tween | null>>({
    projetos: null,
    stack: null,
    sobre: null,
    contato: null,
  });

  // Static per-galaxy uniforms plus the per-particle galaxy index. Uploaded
  // when the galaxy layout changes, never per frame.
  useEffect(() => {
    const u = main.uniforms;
    if (import.meta.env.DEV && galaxies.length > MAX_GALAXIES) {
      console.warn(
        `[ParticleField] ${galaxies.length} galaxies exceeds MAX_GALAXIES=${MAX_GALAXIES}; ` +
          `the extra ones will render with the first galaxy's spin. Raise MAX_GALAXIES in particleShader.ts.`,
      );
    }
    buffers.galaxy.fill(0);
    galaxies.forEach((g, i) => {
      if (i >= MAX_GALAXIES) return;
      u.uCenter.value[i].set(g.cx, g.cy, g.cz);
      u.uNormal.value[i].set(g.nx, g.ny, g.nz);
      u.uSpeed.value[i] = g.speed;
      u.uSceneOf.value[i] = sceneCode(g.key);
      const end = Math.min(g.start + g.count, buffers.count);
      for (let p = g.start; p < end; p++) buffers.galaxy[p] = i;
    });
    const attr = pointsRef.current?.geometry.getAttribute("aGalaxy");
    if (attr) attr.needsUpdate = true;
  }, [galaxies, buffers, main]);

  useEffect(() => {
    const u = main.uniforms;
    u.uWave.value.set(wave.amplitude, wave.frequency, wave.speed);
    u.uWaveDrive.value = axisCode(wave.drive);
    u.uWaveDisplace.value = axisCode(wave.displace);
    const d = detail.uniforms;
    d.uWave.value.set(wave.amplitude, wave.frequency, wave.speed);
    d.uWaveDrive.value = axisCode(wave.drive);
    d.uWaveDisplace.value = axisCode(wave.displace);
  }, [wave, main, detail]);

  // Fade in / out the extra detail particles for the active galaxy.
  useEffect(() => {
    detailTween.current?.kill();

    if (activeDetail && detailBuffers) {
      detailSpin.current = activeDetail.spin;
      detailBuffers.positions.set(
        activeDetail.positions.subarray(0, detailBuffers.positions.length),
      );
      detailBuffers.colors.set(
        activeDetail.colors.subarray(0, detailBuffers.colors.length),
      );
      detailBuffers.galaxy.fill(0);

      const d = detail.uniforms;
      const s = activeDetail.spin;
      d.uCenter.value[0].set(s.cx, s.cy, s.cz);
      d.uNormal.value[0].set(s.nx, s.ny, s.nz);
      d.uSpeed.value[0] = s.speed;
      d.uSceneOf.value[0] = sceneCode(s.key);
      d.uMorphT.value = 1;

      const geom = detailPointsRef.current?.geometry;
      if (geom) {
        for (const name of ["position", "aFrom", "aOvershoot", "aFromColor", "aTargetColor", "aGalaxy"]) {
          const a = geom.getAttribute(name);
          if (a) a.needsUpdate = true;
        }
      }

      detailTween.current = gsap.to(detailOpacity.current, {
        value: pointOpacity,
        duration: reducedMotion ? 0 : 1.5,
        ease: "power2.out",
      });
    } else {
      detailTween.current = gsap.to(detailOpacity.current, {
        value: 0,
        duration: reducedMotion ? 0 : 1.5,
        ease: "power2.out",
        onComplete: () => {
          detailSpin.current = null;
        },
      });
    }

    return () => {
      detailTween.current?.kill();
    };
  }, [activeDetail, detailBuffers, pointOpacity, reducedMotion, detail]);

  useEffect(() => {
    for (const cat of CATEGORIES) {
      deformTweens.current[cat]?.kill();
      const target = cat === activeScene ? 1 : 0;
      const isEntering = target === 1;

      if (reducedMotion) {
        intensities.current[cat] = target;
      } else {
        // Entering duration: 1.9s for stack/contato, 1.4s for others
        // Returning/relaxing duration: 1.8s for a very smooth return to home
        const duration = isEntering
          ? cat === "stack" || cat === "contato"
            ? 1.9
            : 1.4
          : 1.8;

        deformTweens.current[cat] = gsap.to(intensities.current, {
          [cat]: target,
          duration,
          ease: "power2.out",
        });
      }
    }

    return () => {
      const tweens = deformTweens.current;
      for (const cat of CATEGORIES) tweens[cat]?.kill();
    };
  }, [activeScene, reducedMotion]);

  // Start / restart a morph whenever the target shape, colorScheme or centre changes.
  useEffect(() => {
    const first = !formed.current;
    const kind: Flourish = first ? "none" : flourish;
    const t = morph.current.t;
    const { target, from, overshoot, fromColor, targetColor, scratch } = buffers;

    targetGlowColor.current.setRGB(...colorScheme.inner);
    targetCenter.current.set(...center);

    // Snapshot where the particles are right now. The shader owns the live
    // pose, so rebuild it here from the same inputs it uses — once per morph,
    // not once per frame.
    if (t >= 1) {
      scratch.set(target);
      for (const g of galaxies) {
        if (g.speed === 0) continue;
        let ang = (spinTime.current * g.speed) % (Math.PI * 2);
        if (ang < 0) ang += Math.PI * 2;
        rotateGalaxy(target, scratch, g, ang);
      }
      if (!reducedMotion) {
        for (const g of galaxies) {
          if (!g.key || g.key === "menu") continue;
          const intensity = intensities.current[g.key] ?? 0;
          if (intensity > 0.001) {
            applyGalaxyDeformation(
              scratch,
              g.start,
              g.count,
              g.key,
              intensity,
              lastElapsed.current,
              g,
            );
          }
        }
        applyWave(scratch, wave, lastElapsed.current, 1);
      }
      // UN-spin it: every buffer is stored un-rotated and the spin clock keeps
      // running across the morph, so galaxies that are not deforming never
      // jump or rewind.
      for (const g of galaxies) {
        if (g.speed === 0) continue;
        rotateGalaxy(scratch, scratch, g, -spinTime.current * g.speed);
      }
    } else {
      morphInto(from, overshoot, target, t, flourishRef.current, scratch);
      if (!reducedMotion) {
        applyWave(scratch, wave, lastElapsed.current, (t - 0.6) / 0.4);
      }
    }
    from.set(scratch);

    // Same idea for colour: freeze the currently displayed colour as the new
    // starting point before the new target overwrites it.
    lerpPositions(fromColor, targetColor, t, scratch.subarray(0, targetColor.length));
    fromColor.set(scratch.subarray(0, fromColor.length));

    target.set(shape.subarray(0, Math.min(target.length, shape.length)));
    targetColor.set(colors.subarray(0, Math.min(targetColor.length, colors.length)));
    flourishRef.current = kind;
    flourishTarget(target, kind, overshoot, center);
    main.uniforms.uFlourish.value = usesFlourish(kind);

    const geom = pointsRef.current?.geometry;
    if (geom) {
      for (const name of ["position", "aFrom", "aOvershoot", "aFromColor", "aTargetColor"]) {
        const a = geom.getAttribute(name);
        if (a) a.needsUpdate = true;
      }
    }

    morph.current.t = 0;
    tweenRef.current?.kill();

    const finish = () => {
      if (!formed.current) {
        formed.current = true;
        onFormed?.();
      }
    };

    if (reducedMotion || instantForm) {
      morph.current.t = 1;
      finish();
      return;
    }

    const durMs = first ? FORMATION_MS : morphDuration;
    const ease = first ? "power1.inOut" : morphEase;
    tweenRef.current = gsap.to(morph.current, {
      t: 1,
      duration: Math.max(0.001, durMs / 1000),
      ease,
      overwrite: true,
      onComplete: finish,
    });
    return () => {
      tweenRef.current?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, colors, center]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const meterStart = PERF_DEBUG ? performance.now() : 0;

    const u: ParticleUniforms = main.uniforms;
    const atRest = morph.current.t >= 1;
    const elapsed = state.clock.elapsedTime;
    lastElapsed.current = elapsed;

    if (atRest && !reducedMotion) spinTime.current += delta;

    u.uMorphT.value = morph.current.t;
    u.uSpinTime.value = spinTime.current;
    u.uTime.value = elapsed;
    u.uReducedMotion.value = reducedMotion;

    for (let i = 0; i < galaxies.length && i < MAX_GALAXIES; i++) {
      const g = galaxies[i];
      u.uIntensity.value[i] =
        g.key && g.key !== "menu" ? intensities.current[g.key] ?? 0 : 0;
    }

    const size = state.gl.getDrawingBufferSize(scratchBufferSize.current);
    u.uScale.value = size.y * 0.5;

    // Smoothly lerp point size and opacity
    const lerpSpeed = Math.min(1, delta * 2.0);
    u.uPointSize.value += (pointSize - u.uPointSize.value) * lerpSpeed;
    u.uOpacity.value += (pointOpacity - u.uOpacity.value) * lerpSpeed;

    // Bright core glow follows the active galaxy's centre, colour and scale.
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.SpriteMaterial;
      mat.color.lerp(targetGlowColor.current, lerpSpeed);
      glowRef.current.scale.lerp(
        scratchGlowScale.current.set(glowScale, glowScale, glowScale),
        lerpSpeed,
      );
      glowRef.current.position.lerp(targetCenter.current, lerpSpeed);
    }
    if (coreRef.current) {
      const cs = glowScale * 0.34;
      coreRef.current.scale.lerp(
        scratchCoreScale.current.set(cs, cs, cs),
        lerpSpeed,
      );
      coreRef.current.position.lerp(targetCenter.current, lerpSpeed);
    }

    // Detail layer: spin, deformation and visibility for the active galaxy.
    const detailPoints = detailPointsRef.current;
    if (detailPoints) {
      const op = detailOpacity.current.value;
      const spin = detailSpin.current;
      if (op > 0.001 && spin) {
        detailPoints.visible = true;
        const d = detail.uniforms;
        d.uOpacity.value = op;
        d.uPointSize.value = u.uPointSize.value;
        d.uScale.value = u.uScale.value;
        d.uSpinTime.value = spinTime.current;
        d.uTime.value = elapsed;
        d.uReducedMotion.value = reducedMotion;
        d.uIntensity.value[0] =
          spin.key && spin.key !== "menu"
            ? intensities.current[spin.key] ?? 0
            : 0;
      } else {
        detailPoints.visible = false;
      }
    }

    if (PERF_DEBUG) {
      const m = meter.current;
      const now = performance.now();
      if (m.since === 0) m.since = meterStart;
      m.bodyMs += now - meterStart;
      m.frames += 1;
      // Window by time, not by frame count. Counting 120 frames is a 41 ms
      // sample once the scene runs at ~2900 fps with vsync off, and any single
      // stall inside it wrecks the reading: two identical runs once reported
      // 2631 fps and 322 fps.
      if (now - m.since >= METER_WINDOW_MS && m.frames > 0) {
        const elapsedMs = now - m.since;
        const fps = (m.frames * 1000) / elapsedMs;
        const dpr = state.gl.getPixelRatio();
        perfStats.fps = fps;
        perfStats.bodyMs = m.bodyMs / m.frames;
        perfStats.particles = count;
        perfStats.detail = detailCount ?? 0;
        perfStats.dpr = dpr;
        perfStats.devicePixelRatio = window.devicePixelRatio;
        console.info(
          `[perf] fps=${fps.toFixed(1)} body=${perfStats.bodyMs.toFixed(2)}ms ` +
            `particles=${count} detail=${detailCount ?? 0} ` +
            `dpr=${dpr.toFixed(2)} devicePixelRatio=${window.devicePixelRatio}`,
        );
        m.frames = 0;
        m.bodyMs = 0;
        m.since = 0;
      }
    }
  });

  return (
    <group>
      {/* Soft core-bulge halo. */}
      <sprite
        ref={glowRef}
        position={center}
        scale={[glowScale, glowScale, glowScale]}
      >
        <spriteMaterial
          map={getParticleTexture()}
          color={new THREE.Color(...colorScheme.inner)}
          transparent
          opacity={GLOW_OPACITY}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      {/* Intense white pinpoint at the very centre — the galaxy's bright core. */}
      <sprite
        ref={coreRef}
        position={center}
        scale={[glowScale * 0.34, glowScale * 0.34, glowScale * 0.34]}
      >
        <spriteMaterial
          map={getParticleTexture()}
          color="#ffffff"
          transparent
          opacity={CORE_OPACITY}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      <points ref={pointsRef} frustumCulled={false} material={main.material}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[buffers.target, 3]}
            count={count}
          />
          <bufferAttribute
            attach="attributes-aFrom"
            args={[buffers.from, 3]}
            count={count}
          />
          <bufferAttribute
            attach="attributes-aOvershoot"
            args={[buffers.overshoot, 3]}
            count={count}
          />
          <bufferAttribute
            attach="attributes-aFromColor"
            args={[buffers.fromColor, 3]}
            count={count}
          />
          <bufferAttribute
            attach="attributes-aTargetColor"
            args={[buffers.targetColor, 3]}
            count={count}
          />
          <bufferAttribute
            attach="attributes-aGalaxy"
            args={[buffers.galaxy, 1]}
            count={count}
          />
        </bufferGeometry>
      </points>

      {detailBuffers && detailCount && (
        <points
          ref={detailPointsRef}
          frustumCulled={false}
          visible={false}
          material={detail.material}
        >
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[detailBuffers.positions, 3]}
              count={detailCount}
            />
            <bufferAttribute
              attach="attributes-aFrom"
              args={[detailBuffers.positions, 3]}
              count={detailCount}
            />
            <bufferAttribute
              attach="attributes-aOvershoot"
              args={[detailBuffers.positions, 3]}
              count={detailCount}
            />
            <bufferAttribute
              attach="attributes-aFromColor"
              args={[detailBuffers.colors, 3]}
              count={detailCount}
            />
            <bufferAttribute
              attach="attributes-aTargetColor"
              args={[detailBuffers.colors, 3]}
              count={detailCount}
            />
            <bufferAttribute
              attach="attributes-aGalaxy"
              args={[detailBuffers.galaxy, 1]}
              count={detailCount}
            />
          </bufferGeometry>
        </points>
      )}
    </group>
  );
}
