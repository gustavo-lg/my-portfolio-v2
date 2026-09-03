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
  generateColors,
  diskNormal,
  offsetPositions,
  type DiskParams,
} from "./particleGeometry";
import { SCENES, type SceneKey } from "./categoryScenes";
import { ORBITAL_ORDER } from "./orbitalAnchors";
import type { GalaxySpin } from "./ParticleField";
import { useDeviceCapabilities } from "@/experience/lib/useDeviceCapabilities";

/**
 * The distant version seen on HOME: same footprint as the focused form but
 * flattened, barely warped and with its arms only part-wound. Diving in
 * restores all of that — that difference IS the deformation, and keeping the
 * radius close means the density never drops.
 */
function miniGalaxy(d: DiskParams): DiskParams {
  return {
    ...d,
    bulge: d.bulge * 0.3,
    outer: d.outer * 0.3,
    thickness: d.thickness * 0.4,
    warp: d.warp * 0.35,
    twist: d.twist * 0.6,
  };
}

/**
 * The focused form on a page: the mini opened up — thicker, warped, arms fully
 * wound, disk tipped over — and grown only slightly. Held compact on purpose:
 * areal density goes as particles / radius², and the camera sits ~3.7 units
 * away, so this still overflows the frame while staying as dense as HOME.
 */
function focusedGalaxy(d: DiskParams): DiskParams {
  return { ...d, bulge: d.bulge * 0.34, outer: d.outer * 0.34 };
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
  const dustCount = Math.round(count * 0.33);
  const initialScene = useRef(activeScene).current;

  const { shapes, spins, colors } = useMemo(() => {
    const out = {} as Record<SceneKey, Float32Array>;
    const spinMap = {} as Record<SceneKey, GalaxySpin[]>;
    const colorMap = {} as Record<SceneKey, Float32Array>;

    // Home: the central galaxy plus a small distant one toward each label.
    const minis = ORBITAL_ORDER.map((k) => ({
      params: miniGalaxy(SCENES[k].disk),
      center: SCENES[k].center,
    }));
    out.menu = galaxyField(count, SCENES.menu.disk, minis);
    colorMap.menu = generateColors(
      count,
      out.menu,
      SCENES.menu.colorScheme,
      SCENES.menu.center,
    );

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

    // Each page keeps the HOME layout as a continuous backdrop and swaps ONLY
    // that page's mini galaxy for its grown form. Every other particle has the
    // same position in both buffers, so the central galaxy and the other three
    // minis do not move at all during the morph — the galaxy the camera dived
    // into is the only thing that deforms.
    ORBITAL_ORDER.forEach((key, miniIdx) => {
      const s2 = SCENES[key];
      const buf = Float32Array.from(out.menu);
      const focus = galaxyDisk(miniCount, focusedGalaxy(s2.disk), 3 + miniIdx);
      offsetPositions(focus, s2.center);
      buf.set(focus, (mainCount + miniIdx * miniCount) * 3);
      out[key] = buf;
      // Same five galaxies in the same places, so the spins carry straight over.
      spinMap[key] = spinMap.menu;
      // Colour ramp is anchored on this page's centre so the focused galaxy
      // gets a hot core; the untouched galaxies keep the home ramp closely
      // enough that the cross-fade over the morph is imperceptible.
      colorMap[key] = generateColors(count, buf, s2.colorScheme, s2.center);
    });

    return { shapes: out, spins: spinMap, colors: colorMap };
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
        colors={colors[activeScene]}
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
