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
  galaxyDisk,
  galaxyField,
  galaxyFieldSplit,
  diskNormal,
  offsetPositions,
  type DiskParams,
} from "./particleGeometry";
import { SCENES, SCENE_ORDER, type SceneKey } from "./categoryScenes";
import { ORBITAL_ORDER } from "./orbitalAnchors";
import type { GalaxySpin } from "./ParticleField";
import { useDeviceCapabilities } from "@/experience/lib/useDeviceCapabilities";

/** A page's galaxy shrunk to a small distant one for the home layout. */
function miniGalaxy(d: DiskParams): DiskParams {
  return {
    ...d,
    bulge: d.bulge * 0.34,
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
  const dustCount = Math.round(count * 0.42);
  const initialScene = useRef(activeScene).current;

  const { shapes, spins } = useMemo(() => {
    const out = {} as Record<SceneKey, Float32Array>;
    const spinMap = {} as Record<SceneKey, GalaxySpin[]>;

    // Home: the central galaxy plus a small distant one toward each label.
    const minis = ORBITAL_ORDER.map((k) => ({
      params: miniGalaxy(SCENES[k].disk),
      center: SCENES[k].center,
    }));
    out.menu = galaxyField(count, SCENES.menu.disk, minis);

    const { main: mainCount, mini: miniCount } = galaxyFieldSplit(
      count,
      minis.length,
    );
    const spin = (
      start: number,
      n: number,
      center: readonly [number, number, number],
      tilt: [number, number, number],
      speed: number,
    ): GalaxySpin => {
      const [nx, ny, nz] = diskNormal(tilt);
      return { start, count: n, cx: center[0], cy: center[1], cz: center[2], nx, ny, nz, speed };
    };
    spinMap.menu = [
      spin(0, mainCount, [0, 0, 0], SCENES.menu.disk.tilt, SCENES.menu.swirl.speed),
      ...ORBITAL_ORDER.map((k, i) =>
        spin(
          mainCount + i * miniCount,
          miniCount,
          SCENES[k].center,
          SCENES[k].disk.tilt,
          SCENES[k].swirl.speed,
        ),
      ),
    ];

    // Each page: that galaxy's full form, at its world position.
    SCENE_ORDER.forEach((key, i) => {
      if (key === "menu") return;
      const s = SCENES[key];
      const buf = galaxyDisk(count, s.disk, 3 + i);
      offsetPositions(buf, s.center);
      out[key] = buf;
      spinMap[key] = [spin(0, count, s.center, s.disk.tilt, s.swirl.speed)];
    });
    return { shapes: out, spins: spinMap };
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
        galaxies={spins[activeScene]}
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
