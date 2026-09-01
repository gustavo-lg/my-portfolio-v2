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
  blackHoleDisk,
  blackHoleLayout,
  offsetPositions,
  type DiskParams,
} from "./particleGeometry";
import { SCENES, SCENE_ORDER, type SceneKey } from "./categoryScenes";
import { ORBITAL_ORDER } from "./orbitalAnchors";
import { useDeviceCapabilities } from "@/experience/lib/useDeviceCapabilities";

/** A page's disk shrunk to a mini black hole for the home layout. */
function miniDisk(d: DiskParams): DiskParams {
  return {
    ...d,
    inner: d.inner * 0.32,
    outer: d.outer * 0.32,
    thickness: d.thickness * 0.42,
    warp: d.warp * 0.4,
  };
}

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
    const out = {} as Record<SceneKey, Float32Array>;
    // Home: the main black hole plus a mini one toward each label.
    out.menu = blackHoleLayout(
      count,
      SCENES.menu.disk,
      ORBITAL_ORDER.map((k) => ({
        params: miniDisk(SCENES[k].disk),
        center: SCENES[k].center,
      })),
    );
    // Each page: that black hole's full disk, at its world position.
    SCENE_ORDER.forEach((key, i) => {
      if (key === "menu") return;
      const buf = blackHoleDisk(count, SCENES[key].disk, 3 + i);
      offsetPositions(buf, SCENES[key].center);
      out[key] = buf;
    });
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
        holeRadius={scene.disk.inner}
        onFormed={onFormed}
      />
      {onAnchors && <AnchorProjector onChange={onAnchors} />}
    </Canvas>
  );
}
