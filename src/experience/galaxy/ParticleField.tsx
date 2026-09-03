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
import { FORMATION_MS } from "./cameraTargets";
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

/** Rotate one galaxy's slice of `arr` rigidly about its own axis and centre. */
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
}: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const detailPointsRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const coreRef = useRef<THREE.Sprite>(null);

  const detailOpacity = useRef({ value: 0 });
  const detailTargetPositions = useRef<Float32Array | null>(null);
  const detailSpin = useRef<GalaxySpin | null>(null);
  const detailTween = useRef<gsap.core.Tween | null>(null);

  const detailPositions = useMemo(
    () => (detailCount ? new Float32Array(detailCount * 3) : null),
    [detailCount],
  );
  const detailColors = useMemo(
    () => (detailCount ? new Float32Array(detailCount * 3) : null),
    [detailCount],
  );

  const dispersed = useMemo(() => generateDispersedPositions(count), [count]);
  // Colours come from GalaxyCanvas fully baked (one per scene); this snapshot
  // is only the initial value the geometry mounts with.
  const initialColors = useRef(colors).current;
  const livePositions = useMemo(() => Float32Array.from(dispersed), [dispersed]);
  const liveColors = useMemo(() => Float32Array.from(initialColors), [initialColors]);

  const fromRef = useRef<Float32Array>(Float32Array.from(dispersed));
  const fromColorsRef = useRef<Float32Array>(Float32Array.from(initialColors));
  const targetColorsRef = useRef<Float32Array>(initialColors);
  const overshootRef = useRef<Float32Array>(new Float32Array(count * 3));
  const targetRef = useRef<Float32Array>(shape);
  const flourishRef = useRef<Flourish>("none");
  const morph = useRef({ t: reducedMotion ? 1 : 0 });
  const formed = useRef(false);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  // Seconds of spin accumulated since mount. Advances only at rest and is
  // never reset, so the spin phase stays continuous across a morph.
  const spinTime = useRef(0);

  // Bright core-bulge glow that sits on the active galaxy.
  const targetGlowColor = useRef(new THREE.Color(...colorScheme.inner));
  const targetCenter = useRef(new THREE.Vector3(...center));

  // Fade in / out the extra 3x detail particles for the active galaxy
  useEffect(() => {
    detailTween.current?.kill();

    if (activeDetail && detailPointsRef.current) {
      detailTargetPositions.current = activeDetail.positions;
      detailSpin.current = activeDetail.spin;

      const colorAttr = detailPointsRef.current.geometry.getAttribute(
        "color",
      ) as THREE.BufferAttribute;
      if (colorAttr) {
        (colorAttr.array as Float32Array).set(activeDetail.colors);
        colorAttr.needsUpdate = true;
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
          detailTargetPositions.current = null;
          detailSpin.current = null;
        },
      });
    }

    return () => {
      detailTween.current?.kill();
    };
  }, [activeDetail, pointOpacity, reducedMotion]);

  // Deformation intensity tween for the active page galaxy
  const deformIntensity = useRef({ value: 0 });
  const deformTween = useRef<gsap.core.Tween | null>(null);
  const activeSceneRef = useRef<SceneKey>(activeScene);

  useEffect(() => {
    deformTween.current?.kill();
    activeSceneRef.current = activeScene;
    const target = activeScene !== "menu" ? 1 : 0;
    const duration =
      activeScene === "stack" || activeScene === "contato" ? 1.9 : 1.4;
    if (reducedMotion) {
      deformIntensity.current.value = target;
    } else {
      deformTween.current = gsap.to(deformIntensity.current, {
        value: target,
        duration,
        ease: "power2.out",
      });
    }
    return () => {
      deformTween.current?.kill();
    };
  }, [activeScene, reducedMotion]);

  // Start / restart a morph whenever the target shape, colorScheme or centre changes.
  useEffect(() => {
    const first = !formed.current;
    targetRef.current = shape;
    targetColorsRef.current = colors;
    targetGlowColor.current.setRGB(...colorScheme.inner);
    targetCenter.current.set(...center);
    flourishRef.current = first ? "none" : flourish;

    if (overshootRef.current.length !== shape.length) {
      overshootRef.current = new Float32Array(shape.length);
    }
    flourishTarget(shape, flourishRef.current, overshootRef.current, center);
    // Snapshot where the particles are, then UN-spin it: every buffer is
    // stored un-rotated and the spin clock keeps running across the morph, so
    // the galaxies that are not deforming never jump or rewind.
    fromRef.current = Float32Array.from(livePositions);
    for (const g of galaxies) {
      if (g.speed === 0) continue;
      rotateGalaxy(
        fromRef.current,
        fromRef.current,
        g,
        -spinTime.current * g.speed,
      );
    }

    if (pointsRef.current) {
      const colorAttr = pointsRef.current.geometry.getAttribute("color") as THREE.BufferAttribute;
      if (colorAttr) {
        fromColorsRef.current = Float32Array.from(colorAttr.array as Float32Array);
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

    if (reducedMotion) {
      morph.current.t = 1;
      if (pointsRef.current) {
        const colorAttr = pointsRef.current.geometry.getAttribute("color") as THREE.BufferAttribute;
        if (colorAttr) {
          (colorAttr.array as Float32Array).set(targetColorsRef.current);
          colorAttr.needsUpdate = true;
        }
      }
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

    const posAttr = points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    const atRest = morph.current.t >= 1;

    if (!atRest) {
      morphInto(
        fromRef.current,
        overshootRef.current,
        targetRef.current,
        morph.current.t,
        flourishRef.current,
        posArr,
      );
    } else {
      // Rest state: rebuild from the STATIC target every frame -- one copy plus
      // one in-place spin pass per galaxy slice. Skips the redundant
      // full-buffer morph lerp and the per-particle idle-noise loop, which
      // together cost 50ms+ of JS per frame during the return-to-home settle.
      posArr.set(targetRef.current);
      if (!reducedMotion) {
        spinTime.current += delta;
        const st = spinTime.current;
        const TAU = 6.283185307179586;
        for (const g of galaxies) {
          if (g.speed === 0) continue;
          let ang = (st * g.speed) % TAU;
          if (ang < 0) ang += TAU;
          rotateGalaxy(targetRef.current, posArr, g, ang);
        }

        const dIntensity = deformIntensity.current.value;
        const curScene = activeSceneRef.current;
        if (dIntensity > 0.001 && curScene !== "menu") {
          const activeG = galaxies.find((g) => g.key === curScene);
          if (activeG) {
            applyGalaxyDeformation(
              posArr,
              activeG.start,
              activeG.count,
              curScene,
              dIntensity,
              state.clock.elapsedTime,
              activeG,
            );
          }
        }
      }
    }

    // Smoothly morph particle vertex colors in lockstep with the shape transition
    const colorAttr = points.geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
    if (colorAttr) {
      const colorArr = colorAttr.array as Float32Array;
      if (!atRest) {
        lerpPositions(fromColorsRef.current, targetColorsRef.current, morph.current.t, colorArr);
        colorAttr.needsUpdate = true;
      }
    }

    // Ripple: full strength at rest, ramping in over the last 40% of a morph.
    if (!reducedMotion) {
      const waveStrength = atRest ? 1 : (morph.current.t - 0.6) / 0.4;
      applyWave(posArr, wave, state.clock.elapsedTime, waveStrength);
    }

    // Bright core glow follows the active galaxy's centre, colour and scale.
    const lerpSpeed = Math.min(1, delta * 2.0);
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.SpriteMaterial;
      mat.color.lerp(targetGlowColor.current, lerpSpeed);
      glowRef.current.scale.lerp(new THREE.Vector3(glowScale, glowScale, glowScale), lerpSpeed);
      glowRef.current.position.lerp(targetCenter.current, lerpSpeed);
    }
    if (coreRef.current) {
      const cs = glowScale * 0.34;
      coreRef.current.scale.lerp(new THREE.Vector3(cs, cs, cs), lerpSpeed);
      coreRef.current.position.lerp(targetCenter.current, lerpSpeed);
    }

    // Smoothly lerp point size and opacity
    const ptsMat = points.material as THREE.PointsMaterial;
    if (ptsMat) {
      ptsMat.size += (pointSize - ptsMat.size) * lerpSpeed;
      ptsMat.opacity += (pointOpacity - ptsMat.opacity) * lerpSpeed;
    }

    posAttr.needsUpdate = true;

    // Detail layer: update rotation, wave and visibility for 4x active galaxy
    const detailPoints = detailPointsRef.current;
    if (detailPoints && detailPositions) {
      const op = detailOpacity.current.value;
      if (op > 0.001 && detailTargetPositions.current && detailSpin.current) {
        detailPoints.visible = true;
        const dMat = detailPoints.material as THREE.PointsMaterial;
        if (dMat) {
          dMat.opacity = op;
          dMat.size = pointSize;
        }

        const dPosAttr = detailPoints.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        const dPosArr = dPosAttr.array as Float32Array;
        const target = detailTargetPositions.current;
        dPosArr.set(target);

        if (!reducedMotion) {
          const g = detailSpin.current;
          const TAU = 6.283185307179586;
          let ang = (spinTime.current * g.speed) % TAU;
          if (ang < 0) ang += TAU;
          rotateGalaxy(target, dPosArr, g, ang);

          const dIntensity = deformIntensity.current.value;
          const curScene = activeSceneRef.current;
          if (dIntensity > 0.001 && curScene !== "menu") {
            applyGalaxyDeformation(
              dPosArr,
              0,
              detailCount ?? 0,
              curScene,
              dIntensity,
              state.clock.elapsedTime,
              g,
            );
          }
          applyWave(dPosArr, wave, state.clock.elapsedTime, 1);
        }

        dPosAttr.needsUpdate = true;
      } else {
        detailPoints.visible = false;
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

      <points ref={pointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[livePositions, 3]}
            count={count}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[liveColors, 3]}
            count={count}
          />
        </bufferGeometry>
        <pointsMaterial
          size={pointSize}
          sizeAttenuation
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          map={getParticleTexture()}
          opacity={pointOpacity}
        />
      </points>

      {detailPositions && detailColors && detailCount && (
        <points ref={detailPointsRef} frustumCulled={false} visible={false}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[detailPositions, 3]}
              count={detailCount}
            />
            <bufferAttribute
              attach="attributes-color"
              args={[detailColors, 3]}
              count={detailCount}
            />
          </bufferGeometry>
          <pointsMaterial
            size={pointSize}
            sizeAttenuation
            vertexColors
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            map={getParticleTexture()}
            opacity={0}
          />
        </points>
      )}
    </group>
  );
}


