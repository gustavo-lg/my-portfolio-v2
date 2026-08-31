import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import {
  generateTargetPositions,
  generateDispersedPositions,
  generateColors,
} from "./particleGeometry";
import { lerpPositions, idleOffset } from "./particleMath";
import { getParticleTexture } from "./particleTexture";
import { FORMATION_MS } from "./cameraTargets";

interface Props {
  count: number;
  reducedMotion: boolean;
  idle: boolean;
  onFormed?: () => void;
}

export function ParticleField({ count, reducedMotion, idle, onFormed }: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const progress = useRef({ t: reducedMotion ? 1 : 0 });
  const formedNotified = useRef(false);

  const { target, dispersed, colors } = useMemo(() => {
    const target = generateTargetPositions(count);
    return {
      target,
      dispersed: generateDispersedPositions(count),
      colors: generateColors(count, target),
    };
  }, [count]);

  // Live buffer the geometry actually renders from.
  const live = useMemo(() => {
    const arr = new Float32Array(count * 3);
    lerpPositions(dispersed, target, progress.current.t, arr);
    return arr;
  }, [count, dispersed, target]);

  useEffect(() => {
    if (reducedMotion) {
      if (!formedNotified.current) {
        formedNotified.current = true;
        onFormed?.();
      }
      return;
    }
    const tween = gsap.to(progress.current, {
      t: 1,
      duration: FORMATION_MS / 1000,
      ease: "power1.inOut",
      onComplete: () => {
        if (!formedNotified.current) {
          formedNotified.current = true;
          onFormed?.();
        }
      },
    });
    return () => {
      tween.kill();
    };
  }, [reducedMotion, onFormed]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const formed = progress.current.t >= 1;
    if (formed && !reducedMotion) {
      // Slow galaxy spin plus a faint tilt wobble — most of the visible life.
      points.rotation.z += delta * 0.05;
      points.rotation.x = Math.sin(state.clock.elapsedTime * 0.12) * 0.06;
    }
    const attr = points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;

    lerpPositions(dispersed, target, progress.current.t, arr);

    if (idle && !reducedMotion && formed) {
      const time = state.clock.elapsedTime;
      for (let i = 0; i < count; i++) {
        const [ox, oy, oz] = idleOffset(i, time, 0);
        arr[i * 3] += ox;
        arr[i * 3 + 1] += oy;
        arr[i * 3 + 2] += oz;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <group>
      {/* Volumetric-ish glow standing in for a real bloom pass. */}
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
        size={0.042}
        sizeAttenuation
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        map={getParticleTexture()}
        opacity={0.72}
      />
    </points>
    </group>
  );
}
