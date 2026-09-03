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
 * The starfield — motes filling the whole volume the camera moves through, a
 * near shell plus a sparse far field. It never morphs; during a camera dive the
 * near motes sweep past while the far ones barely shift, which sells the depth.
 * It also guarantees the frame is never empty of particles.
 */
export function DustField({ count, reducedMotion }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  const positions = useMemo(() => generateDustField(count), [count]);
  const colors = useMemo(() => {
    const c = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // White / blue / lilac stars.
      const roll = Math.random();
      const b = 0.5 + Math.random() * 0.5;
      if (roll < 0.5) {
        c[i * 3] = 0.9 * b;
        c[i * 3 + 1] = 0.93 * b;
        c[i * 3 + 2] = 1.0 * b; // near-white
      } else if (roll < 0.8) {
        c[i * 3] = 0.4 * b;
        c[i * 3 + 1] = 0.55 * b;
        c[i * 3 + 2] = 1.0 * b; // blue
      } else {
        c[i * 3] = 0.72 * b;
        c[i * 3 + 1] = 0.55 * b;
        c[i * 3 + 2] = 0.98 * b; // lilac
      }
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
          size={0.05}
          sizeAttenuation
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          map={getParticleTexture()}
          opacity={0.55}
        />
      </points>
    </group>
  );
}
