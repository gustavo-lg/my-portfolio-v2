import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import {
  generateDispersedPositions,
  generateColors,
  type ColorScheme,
} from "./particleGeometry";
import { applyWave, idleOffset, lerpPositions } from "./particleMath";
import { flourishTarget, morphInto } from "./particleMorph";
import { getParticleTexture } from "./particleTexture";
import { FORMATION_MS } from "./cameraTargets";
import type { Flourish, Wave } from "./categoryScenes";

/**
 * One galaxy's rigid spin: the contiguous particle range [start, start+count)
 * rotates as a rigid body about the unit axis (nx,ny,nz) through (cx,cy,cz).
 * Rigid so the spiral shape is preserved exactly, no matter how long it spins.
 */
export interface GalaxySpin {
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

interface Props {
  count: number;
  reducedMotion: boolean;
  idle: boolean;
  shape: Float32Array;
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
}

export function ParticleField({
  count,
  reducedMotion,
  idle,
  shape,
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
}: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const coreRef = useRef<THREE.Sprite>(null);

  const dispersed = useMemo(() => generateDispersedPositions(count), [count]);
  // Initial color buffer
  const initialColors = useMemo(
    () => generateColors(count, shape, colorScheme, center),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count],
  );
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
  // Seconds each galaxy has been spinning since it last (re)formed. Only
  // advances at rest, and resets on every morph, so a galaxy always spins out
  // from the clean formed orientation instead of snapping.
  const spinTime = useRef(0);

  // Bright core-bulge glow that sits on the active galaxy.
  const targetGlowColor = useRef(new THREE.Color(...colorScheme.inner));
  const targetCenter = useRef(new THREE.Vector3(...center));

  // Start / restart a morph whenever the target shape, colorScheme or centre changes.
  useEffect(() => {
    const first = !formed.current;
    targetRef.current = shape;
    targetColorsRef.current = generateColors(count, shape, colorScheme, center);
    targetGlowColor.current.setRGB(...colorScheme.inner);
    targetCenter.current.set(...center);
    flourishRef.current = first ? "none" : flourish;

    if (overshootRef.current.length !== shape.length) {
      overshootRef.current = new Float32Array(shape.length);
    }
    flourishTarget(shape, flourishRef.current, overshootRef.current);
    fromRef.current = Float32Array.from(livePositions);
    spinTime.current = 0;

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
  }, [shape, colorScheme, center]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const posAttr = points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    morphInto(
      fromRef.current,
      overshootRef.current,
      targetRef.current,
      morph.current.t,
      flourishRef.current,
      posArr,
    );

    const atRest = morph.current.t >= 1;

    // Smoothly morph particle vertex colors in lockstep with the shape transition
    const colorAttr = points.geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
    if (colorAttr) {
      const colorArr = colorAttr.array as Float32Array;
      if (!atRest) {
        lerpPositions(fromColorsRef.current, targetColorsRef.current, morph.current.t, colorArr);
        colorAttr.needsUpdate = true;
      }
    }

    if (!reducedMotion && atRest && idle) {
      const time = state.clock.elapsedTime;
      for (let i = 0; i < count; i++) {
        const [ox, oy, oz] = idleOffset(i, time, 0);
        posArr[i * 3] += ox;
        posArr[i * 3 + 1] += oy;
        posArr[i * 3 + 2] += oz;
      }
    }

    // Each galaxy spins as a RIGID body about its own axis and centre — the
    // spiral shape is preserved exactly however long it runs, and the distant
    // galaxies spin in place instead of orbiting the centre. Only advances at
    // rest so it never fights a morph.
    if (!reducedMotion && atRest) {
      spinTime.current += delta;
      const t = spinTime.current;
      for (let g = 0; g < galaxies.length; g++) {
        const gg = galaxies[g];
        if (gg.speed === 0) continue;
        const ang = t * gg.speed;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const one = 1 - ca;
        const { nx, ny, nz, cx, cy, cz } = gg;
        const end = (gg.start + gg.count) * 3;
        for (let i = gg.start * 3; i < end; i += 3) {
          const px = posArr[i] - cx;
          const py = posArr[i + 1] - cy;
          const pz = posArr[i + 2] - cz;
          const dot = nx * px + ny * py + nz * pz;
          // Rodrigues rotation of p about unit n by `ang`
          posArr[i] = cx + px * ca + (ny * pz - nz * py) * sa + nx * dot * one;
          posArr[i + 1] = cy + py * ca + (nz * px - nx * pz) * sa + ny * dot * one;
          posArr[i + 2] = cz + pz * ca + (nx * py - ny * px) * sa + nz * dot * one;
        }
      }
    }

    // Continuous sine ripple over the formed shape — ramps in over the last
    // 40% of the morph so it never fights the formation itself.
    if (!reducedMotion) {
      const waveStrength = (morph.current.t - 0.6) / 0.4;
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
          opacity={0.5}
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
          opacity={0.95}
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
    </group>
  );
}


