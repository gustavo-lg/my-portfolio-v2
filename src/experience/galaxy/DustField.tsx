import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { generateDustField } from "./particleGeometry";
import { getParticleTexture } from "./particleTexture";

interface Props {
  count: number;
  reducedMotion: boolean;
}

/**
 * Static dust motes filling the whole volume the camera moves through — a near
 * shell and a sparse far field. It never morphs; during a camera dive the near
 * motes sweep past while the far ones barely shift, which is what sells the
 * depth. A slow drift keeps it alive when the camera is still.
 */
export function DustField({ count, reducedMotion }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  const positions = useMemo(() => generateDustField(count), [count]);
  const colors = useMemo(() => {
    const c = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Mostly deep violet, a few bluer motes.
      const blue = Math.random() < 0.25;
      const b = 0.4 + Math.random() * 0.5;
      c[i * 3] = (blue ? 0.3 : 0.52) * b;
      c[i * 3 + 1] = (blue ? 0.5 : 0.24) * b;
      c[i * 3 + 2] = (blue ? 1.0 : 0.9) * b;
    }
    return c;
  }, [count]);

  useFrame((_, delta) => {
    if (reducedMotion || !groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.006;
  });

  return (
    <group ref={groupRef}>
      <points frustumCulled={false}>
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
          size={0.055}
          sizeAttenuation
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          map={getParticleTexture()}
          opacity={0.4}
        />
      </points>
    </group>
  );
}
