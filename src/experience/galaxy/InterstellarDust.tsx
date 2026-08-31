import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { generateDustPositions } from "./particleGeometry";
import { getParticleTexture } from "./particleTexture";

interface Props {
  count: number;
  reducedMotion: boolean;
}

/**
 * Sparse static dust particles spread across a large volume (~120-unit radius).
 * They don't morph or change — they simply exist to give the camera something
 * to fly past during scene transitions, creating depth and motion parallax.
 */
export function InterstellarDust({ count, reducedMotion }: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => generateDustPositions(count, 120), [count]);
  const colors = useMemo(() => {
    const c = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Pale blue-white with slight variance
      const brightness = 0.5 + Math.random() * 0.5;
      c[i * 3] = brightness * 0.7;
      c[i * 3 + 1] = brightness * 0.8;
      c[i * 3 + 2] = brightness;
    }
    return c;
  }, [count]);

  // Gentle sparkle / twinkle effect
  useFrame((state) => {
    if (reducedMotion || !pointsRef.current) return;
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    mat.opacity = 0.22 + Math.sin(state.clock.elapsedTime * 0.4) * 0.06;
  });

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        sizeAttenuation
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        map={getParticleTexture()}
        opacity={0.25}
      />
    </points>
  );
}
