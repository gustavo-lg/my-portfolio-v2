import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import {
  generateDispersedPositions,
  generateColors,
} from "./particleGeometry";
import { idleOffset } from "./particleMath";
import { flourishTarget, morphInto } from "./particleMorph";
import { getParticleTexture } from "./particleTexture";
import { FORMATION_MS } from "./cameraTargets";
import type { Spin, Flourish } from "./categoryScenes";

interface Props {
  count: number;
  reducedMotion: boolean;
  idle: boolean;
  shape: Float32Array;
  spin: Spin;
  pointSize: number;
  pointOpacity: number;
  morphDuration: number;
  morphEase: string;
  flourish: Flourish;
  onFormed?: () => void;
}

export function ParticleField({
  count,
  reducedMotion,
  idle,
  shape,
  spin,
  pointSize,
  pointOpacity,
  morphDuration,
  morphEase,
  flourish,
  onFormed,
}: Props) {
  const pointsRef = useRef<THREE.Points>(null);

  const dispersed = useMemo(() => generateDispersedPositions(count), [count]);
  // Hue is "by distance from origin" and per-page hue changes are forbidden, so
  // colours are computed once from the first shape and held (shape omitted from deps).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colors = useMemo(() => generateColors(count, shape), [count]);
  // `live` IS the buffer R3F builds the position BufferAttribute from, so in
  // useFrame `attr.array === live`: writing `arr` there and snapshotting `live`
  // on a scene change both operate on this same buffer, intentionally.
  const live = useMemo(() => Float32Array.from(dispersed), [dispersed]);

  const fromRef = useRef<Float32Array>(Float32Array.from(dispersed));
  const overshootRef = useRef<Float32Array>(new Float32Array(count * 3));
  const targetRef = useRef<Float32Array>(shape);
  const flourishRef = useRef<Flourish>("none");
  const morph = useRef({ t: reducedMotion ? 1 : 0 });
  const formed = useRef(false);
  const spinSpeed = useRef(0);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  // Start / restart a morph whenever the target shape changes.
  useEffect(() => {
    const first = !formed.current;
    targetRef.current = shape;
    flourishRef.current = first ? "none" : flourish;
    // `count` can change without a remount (pointer-fine media query flips the
    // tier); keep the overshoot buffer sized to the current shape.
    if (overshootRef.current.length !== shape.length) {
      overshootRef.current = new Float32Array(shape.length);
    }
    flourishTarget(shape, flourishRef.current, overshootRef.current);
    fromRef.current = Float32Array.from(live);
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
  }, [shape]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const attr = points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;

    morphInto(
      fromRef.current,
      overshootRef.current,
      targetRef.current,
      morph.current.t,
      flourishRef.current,
      arr,
    );

    const atRest = morph.current.t >= 1;

    if (!reducedMotion && atRest && idle) {
      const time = state.clock.elapsedTime;
      for (let i = 0; i < count; i++) {
        const [ox, oy, oz] = idleOffset(i, time, 0);
        arr[i * 3] += ox;
        arr[i * 3 + 1] += oy;
        arr[i * 3 + 2] += oz;
      }
    }

    if (!reducedMotion && formed.current) {
      // Ease the spin rate toward the active scene's, don't snap.
      spinSpeed.current += (spin.speed - spinSpeed.current) * Math.min(1, delta * 1.5);
      points.rotation[spin.axis] += delta * spinSpeed.current;
      const w = spin.wobble ?? 0;
      const other = spin.axis === "x" ? "y" : "x";
      points.rotation[other] = Math.sin(state.clock.elapsedTime * 0.12) * w;
    }

    attr.needsUpdate = true;
  });

  return (
    <group>
      <sprite scale={[7.5, 7.5, 7.5]}>
        <spriteMaterial
          map={getParticleTexture()}
          color="#0fbfe8"
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite scale={[2.8, 2.8, 2.8]}>
        <spriteMaterial
          map={getParticleTexture()}
          color="#7d54e6"
          transparent
          opacity={0.28}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      <points ref={pointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[live, 3]}
            count={count}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
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
