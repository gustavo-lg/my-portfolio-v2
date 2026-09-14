import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, type RootState } from "@react-three/fiber";
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
import { GalaxyBackdrop } from "./GalaxyBackdrop";
import { storeIndex } from "@/experience/lib/adaptiveTier";
import { LADDER } from "@/experience/lib/qualityLadder";
import { classifyGpu, getGpuRendererString } from "@/experience/lib/gpuTier";
import { perfStats } from "@/experience/lib/perfDebug";

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

const GL_CONFIG = {
  antialias: false,
  alpha: true,
  // Hybrid laptops otherwise pick the integrated chip for a background canvas.
  powerPreference: "high-performance" as const,
  failIfMajorPerformanceCaveat: false,
};
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

  // The particle count changes when the adaptive tier steps, which remounts the
  // fields. Only the very first mount should play the entry formation; a later
  // remount must appear already settled.
  const mountedOnce = useRef(false);
  useEffect(() => {
    mountedOnce.current = true;
  }, []);

  // Remounting re-fires onFormed, which would replay the state machine's entry
  // sequence. It may only ever fire once.
  const formedRef = useRef(false);
  const handleFormed = useCallback(() => {
    if (formedRef.current) return;
    formedRef.current = true;
    onFormed?.();
  }, [onFormed]);

  const [contextLost, setContextLost] = useState(false);

  // R3F creates the renderer from its own layout effect, which lands AFTER this
  // component's mount effect — so an effect here would find no canvas to listen
  // on. Register inside onCreated instead, and keep the detach for unmount.
  // (R3F discards whatever onCreated returns, hence the ref.)
  const detachRef = useRef<(() => void) | null>(null);
  const handleCreated = useCallback((state: RootState) => {
    // A shader that fails to compile is otherwise invisible to the app: the
    // scene just renders nothing, the frame rate climbs because there is no
    // work left, and the perf meter reports an excellent, meaningless number.
    // Never gated behind a debug flag — it only fires on a real failure, and a
    // GPU out in the wild rejecting the shader is exactly what must not be
    // silent.
    state.gl.debug.onShaderError = (
      gl,
      program,
      glVertexShader,
      glFragmentShader,
    ) => {
      const read = (shader: WebGLShader, label: string) => {
        const info = gl.getShaderInfoLog(shader);
        if (info) console.error(`[galaxy] ${label} shader failed:\n${info}`);
        return info ? `${label}: ${info.split("\n")[0]}` : "";
      };
      const messages = [
        read(glVertexShader, "vertex"),
        read(glFragmentShader, "fragment"),
      ].filter(Boolean);
      console.error(
        "[galaxy] particle program did not link. The scene will render " +
          "nothing and any FPS reading is meaningless.",
        gl.getProgramInfoLog(program),
      );
      // Surface it on the HUD too, for machines reached only through a deploy.
      perfStats.shaderError = messages.join(" | ") || "link failed";
    };

    const el = state.gl.domElement;
    const onLost = (event: Event) => {
      // Without preventDefault the browser never attempts to restore.
      event.preventDefault();
      setContextLost(true);
      // Losing the context means this machine could not hold the scene. The
      // next load must start at the bottom rather than repeat the crash.
      storeIndex(LADDER.length - 1, classifyGpu(getGpuRendererString()));
    };
    const onRestored = () => setContextLost(false);
    el.addEventListener("webglcontextlost", onLost);
    el.addEventListener("webglcontextrestored", onRestored);
    detachRef.current = () => {
      el.removeEventListener("webglcontextlost", onLost);
      el.removeEventListener("webglcontextrestored", onRestored);
    };
  }, []);

  useEffect(() => () => detachRef.current?.(), []);

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
      key: SceneKey,
      start: number,
      n: number,
      center: readonly [number, number, number],
      tilt: [number, number, number],
      speed: number,
    ): GalaxySpin => {
      const [nx, ny, nz] = diskNormal(tilt);
      return { key, start, count: n, cx: center[0], cy: center[1], cz: center[2], nx, ny, nz, speed };
    };
    const galaxies = [
      spin("menu", 0, mainCount, [0, 0, 0], SCENES.menu.disk.tilt, SCENES.menu.swirl.speed),
      ...ORBITAL_ORDER.map((k, i) =>
        spin(
          k,
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
          key,
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

  // The Canvas stays mounted while the context is lost: unmounting it would
  // destroy the element the browser needs in order to fire webglcontextrestored,
  // stranding the page on the backdrop until a manual reload.
  return (
    <>
      {contextLost && <GalaxyBackdrop />}
    <Canvas
      dpr={dpr}
      camera={camera}
      gl={GL_CONFIG}
      style={CANVAS_STYLE}
      onCreated={handleCreated}
    >
      <GalaxyCamera initial={initialScene} />
      <DustField
        key={dustCount}
        count={dustCount}
        reducedMotion={reducedMotion}
      />
      <ParticleField
        key={totalCount}
        instantForm={mountedOnce.current}
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
        onFormed={handleFormed}
        activeDetail={activeDetail}
        detailCount={extraCount}
        activeScene={activeScene}
      />
      {onAnchors && <AnchorProjector onChange={onAnchors} />}
    </Canvas>
    </>
  );
}

export default memo(GalaxyCanvas);
