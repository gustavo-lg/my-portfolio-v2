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
import type { Spin, Flourish, Wave } from "./categoryScenes";

interface Props {
  count: number;
  reducedMotion: boolean;
  idle: boolean;
  shape: Float32Array;
  spin: Spin;
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
  spin,
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
  const spinSpeed = useRef(0);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  // Soft violet ambient wash that sits on the active pocket of the nebula.
  const targetGlowColor = useRef(new THREE.Color(...colorScheme.outer));
  const targetCenter = useRef(new THREE.Vector3(...center));

  // Start / restart a morph whenever the target shape, colorScheme or centre changes.
  useEffect(() => {
    const first = !formed.current;
    targetRef.current = shape;
    targetColorsRef.current = generateColors(count, shape, colorScheme, center);
    targetGlowColor.current.setRGB(...colorScheme.outer);
    targetCenter.current.set(...center);
    flourishRef.current = first ? "none" : flourish;

    if (overshootRef.current.length !== shape.length) {
      overshootRef.current = new Float32Array(shape.length);
    }
    flourishTarget(shape, flourishRef.current, overshootRef.current);
    fromRef.current = Float32Array.from(livePositions);

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

    // Continuous sine ripple over the formed shape — ramps in over the last
    // 40% of the morph so it never fights the formation itself.
    if (!reducedMotion) {
      const waveStrength = (morph.current.t - 0.6) / 0.4;
      applyWave(posArr, wave, state.clock.elapsedTime, waveStrength);
    }

    if (!reducedMotion && formed.current) {
      spinSpeed.current += (spin.speed - spinSpeed.current) * Math.min(1, delta * 1.5);
      points.rotation[spin.axis] += delta * spinSpeed.current;
      const w = spin.wobble ?? 0;
      const other = spin.axis === "x" ? "y" : "x";
      points.rotation[other] = Math.sin(state.clock.elapsedTime * 0.12) * w;
    }

    // Soft ambient wash follows the active pocket's colour, scale and position.
    const lerpSpeed = Math.min(1, delta * 2.0);
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.SpriteMaterial;
      mat.color.lerp(targetGlowColor.current, lerpSpeed);
      glowRef.current.scale.lerp(new THREE.Vector3(glowScale, glowScale, glowScale), lerpSpeed);
      glowRef.current.position.lerp(targetCenter.current, lerpSpeed);
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
      {/* Soft violet ambient wash — no hard nucleus, just a gentle glow that
          rides the active pocket of the cloud. */}
      <sprite
        ref={glowRef}
        position={center}
        scale={[glowScale, glowScale, glowScale]}
      >
        <spriteMaterial
          map={getParticleTexture()}
          color={new THREE.Color(...colorScheme.outer)}
          transparent
          opacity={0.16}
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


