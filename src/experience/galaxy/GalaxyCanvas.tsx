import { memo, useMemo, useRef } from "react";
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
import type { CategoryKey } from "@/content/types";
import { useDeviceCapabilities } from "@/experience/lib/useDeviceCapabilities";

/**
 * The distant version seen on HOME and ALL pages: same footprint as the full
 * disk params but scaled down. The camera flies toward each mini on page
 * navigation but the particle field never morphs — the background is continuous
 * and identical across every route.
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

interface Props {
  idle: boolean;
  activeScene: SceneKey;
  onFormed?: () => void;
  onAnchors?: (positions: AnchorScreenPositions) => void;
}

const GL_CONFIG = { antialias: false, alpha: true };
const CANVAS_STYLE: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
};

/** Full-viewport WebGL backdrop. Default export so it can be React.lazy'd. */
function GalaxyCanvas({
  idle,
  activeScene,
  onFormed,
  onAnchors,
}: Props) {
  const { tier, reducedMotion } = useDeviceCapabilities();
  const count = tier.particleCount;
  const dustCount = Math.round(count * 0.33);
  const initialScene = useRef(activeScene).current;

  const dpr = useMemo<[number, number]>(() => [1, tier.maxDpr], [tier.maxDpr]);
  const camera = useMemo(
    () => ({
      fov: SCENES[initialScene].framing.fov,
      position: SCENES[initialScene].framing.position,
    }),
    [initialScene],
  );

  // Single unified particle field with:
  // 1. Central galaxy multiplied by 3x particles (super dense home core).
  // 2. 4 minis with 1x particles on Home.
  // 3. Precomputed 3x extra detail particles for each mini, which smoothly fade in
  //    when entering that page so the active galaxy multiplies by 4x particles (1x + 3x = 4x),
  //    and smoothly fade out when returning to Home.
  const { shape, spins, colors, totalCount, detailLayers, extraCount } = useMemo(() => {
    const minis = ORBITAL_ORDER.map((k) => ({
      params: miniGalaxy(SCENES[k].disk),
      center: SCENES[k].center,
    }));
    // Central galaxy gets 3x particles:
    const positions = galaxyField(count, SCENES.menu.disk, minis, 3);
    const { main: mainCount, mini: miniCount, total } = galaxyFieldSplit(
      count,
      minis.length,
      3,
    );
    const colorBuf = generateColors(
      total,
      positions,
      SCENES.menu.colorScheme,
      SCENES.menu.center,
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
    const galaxies = [
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

    // Detail layer: when a page is entered, that mini reaches 2x particles
    // (1x base + 1x extra = 2x total, keeping it clean and not overcrowded).
    const detailExtra = miniCount;
    const details = {} as Record<
      CategoryKey,
      { positions: Float32Array; colors: Float32Array; spin: GalaxySpin }
    >;
    ORBITAL_ORDER.forEach((key, idx) => {
      const s = SCENES[key];
      const p = galaxyDisk(detailExtra, miniGalaxy(s.disk), 101 + idx * 7);
      offsetPositions(p, s.center);
      const c = generateColors(detailExtra, p, s.colorScheme, s.center);
      const [nx, ny, nz] = diskNormal(s.disk.tilt);
      details[key] = {
        positions: p,
        colors: c,
        spin: {
          start: 0,
          count: detailExtra,
          cx: s.center[0],
          cy: s.center[1],
          cz: s.center[2],
          nx,
          ny,
          nz,
          speed: s.swirl.speed,
        },
      };
    });

    return {
      shape: positions,
      spins: galaxies,
      colors: colorBuf,
      totalCount: total,
      detailLayers: details,
      extraCount: detailExtra,
    };
  }, [count]);

  // All visual props are fixed to the menu scene so the base particle field never
  // morphs between routes — only the camera moves.
  const menuScene = SCENES.menu;
  const activeDetail = activeScene !== "menu" ? detailLayers[activeScene] : null;

  return (
    <Canvas
      dpr={dpr}
      camera={camera}
      gl={GL_CONFIG}
      style={CANVAS_STYLE}
    >
      <GalaxyCamera initial={initialScene} />
      <DustField count={dustCount} reducedMotion={reducedMotion} />
      <ParticleField
        count={totalCount}
        reducedMotion={reducedMotion}
        idle={idle}
        shape={shape}
        colors={colors}
        galaxies={spins}
        wave={menuScene.wave}
        pointSize={menuScene.pointSize}
        pointOpacity={menuScene.pointOpacity}
        morphDuration={reducedMotion ? 0 : menuScene.transition.morph.duration}
        morphEase={menuScene.transition.morph.ease}
        flourish={reducedMotion ? "none" : menuScene.transition.flourish}
        colorScheme={menuScene.colorScheme}
        glowScale={menuScene.glowScale}
        center={menuScene.center}
        onFormed={onFormed}
        activeDetail={activeDetail}
        detailCount={extraCount}
      />
      {onAnchors && <AnchorProjector onChange={onAnchors} />}
    </Canvas>
  );
}

export default memo(GalaxyCanvas);
