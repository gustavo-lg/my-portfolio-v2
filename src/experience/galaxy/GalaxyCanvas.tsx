import { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ParticleField } from "./ParticleField";
import { DustField } from "./DustField";
import { GalaxyCamera } from "./GalaxyCamera";
import {
  AnchorProjector,
  type AnchorScreenPositions,
} from "./useAnchorProjection";
import {
  generateTargetPositions,
  deformPositions,
  offsetPositions,
} from "./particleGeometry";
import { SCENES, SCENE_ORDER, type SceneKey } from "./categoryScenes";
import { useDeviceCapabilities } from "@/experience/lib/useDeviceCapabilities";

interface Props {
  idle: boolean;
  activeScene: SceneKey;
  onFormed?: () => void;
  onAnchors?: (positions: AnchorScreenPositions) => void;
}

/** Full-viewport WebGL backdrop. Default export so it can be React.lazy'd. */
export default function GalaxyCanvas({
  idle,
  activeScene,
  onFormed,
  onAnchors,
}: Props) {
  const { tier, reducedMotion } = useDeviceCapabilities();
  const count = tier.particleCount;
  const dustCount = Math.round(count * 0.32);
  const initialScene = useRef(activeScene).current;

  const shapes = useMemo(() => {
    const base = generateTargetPositions(count);
    const out = {} as Record<SceneKey, Float32Array>;
    for (const key of SCENE_ORDER) {
      const buf = new Float32Array(count * 3);
      deformPositions(base, SCENES[key].deform, buf);
      offsetPositions(buf, SCENES[key].center);
      out[key] = buf;
    }
    return out;
  }, [count]);

  const scene = SCENES[activeScene];

  return (
    <Canvas
      dpr={[1, tier.maxDpr]}
      camera={{
        fov: SCENES[initialScene].framing.fov,
        position: SCENES[initialScene].framing.position,
      }}
      gl={{ antialias: false, alpha: true }}
      style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
    >
      <GalaxyCamera initial={initialScene} />
      <DustField count={dustCount} reducedMotion={reducedMotion} />
      <ParticleField
        count={count}
        reducedMotion={reducedMotion}
        idle={idle}
        shape={shapes[activeScene]}
        spin={scene.spin}
        wave={scene.wave}
        pointSize={scene.pointSize}
        pointOpacity={scene.pointOpacity}
        morphDuration={reducedMotion ? 0 : scene.transition.morph.duration}
        morphEase={scene.transition.morph.ease}
        flourish={reducedMotion ? "none" : scene.transition.flourish}
        colorScheme={scene.colorScheme}
        glowScale={scene.glowScale}
        center={scene.center}
        onFormed={onFormed}
      />
      {onAnchors && <AnchorProjector onChange={onAnchors} />}
    </Canvas>
  );
}
