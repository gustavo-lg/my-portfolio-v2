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
  stratify,
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
import {
  perfStats,
  markSceneSettled,
  resetSceneSettled,
} from "@/experience/lib/perfDebug";
import { useNarrowViewport } from "@/experience/lib/useNarrowViewport";

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

/**
 * Shrinks only the central galaxy's radial reach, on phones. The minis sit at
 * ~8.9 world units out with their own radius of ~2.7-3, so their near edge is
 * around 5.9 — inside the unscaled core's outer radius of 7.5. Worse, the
 * core's sparse halo (particleGeometry.ts's galaxyDisk) reaches up to
 * `1.2 * outer` ≈ 9, past the mini centres entirely. On a phone, already
 * zoomed in tighter than desktop, this reads as the core's arms and halo
 * touching each mini. Shrinking bulge/outer opens a visible gap without
 * moving anything else — mini positions, camera flight targets and label
 * anchors are untouched.
 *
 * `bar` (a stretch factor, not a radius — see DiskParams) only shapes the
 * inner third of the disk and never reaches the minis either way, so it is
 * deliberately left alone here.
 *
 * Starting point (~0.7x), not final: tune visually against a real phone.
 */
function narrowMenuDisk(d: DiskParams): DiskParams {
  return {
    ...d,
    bulge: d.bulge * 0.7,
    outer: d.outer * 0.7,
  };
}

interface Props {
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
  activeScene,
  onFormed,
  onAnchors,
}: Props) {
  const { tier, reducedMotion } = useDeviceCapabilities();
  const isNarrow = useNarrowViewport();
  const count = tier.particleCount;
  // The session's highest rung — since the ladder only steps down (Fase 1),
  // this is also the most the scene will ever need to draw. Buffers are
  // allocated once at this size; stepping down only shrinks the draw range
  // (Fase 2), it never remounts or reallocates.
  const allocCount = useRef(count).current;
  const allocDustCount = Math.round(allocCount * 0.33);
  const dustCount = Math.round(count * 0.33);
  const initialScene = useRef(activeScene).current;

  // The particle count no longer remounts the fields when the adaptive tier
  // steps (Fase 2) — allocation is fixed at `allocCount` and stepping only
  // changes the drawn range. `mountedOnce` still guards `instantForm` for any
  // other cause of a fresh mount.
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
    markSceneSettled();
    onFormed?.();
  }, [onFormed]);

  useEffect(() => resetSceneSettled, []);

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
    // On phones, shrink only the core's radial reach so its arms/halo stop
    // touching the minis (narrowMenuDisk above). Mini params, positions,
    // camera targets and label anchors are untouched by this.
    const mainDisk = isNarrow ? narrowMenuDisk(SCENES.menu.disk) : SCENES.menu.disk;
    // Central galaxy gets 3x particles. Allocated at `allocCount` — the
    // session's highest rung — never at the live, possibly-lower `count`
    // (Fase 2): the buffer is sized once and only the drawn range shrinks.
    const positions = galaxyField(allocCount, mainDisk, minis, 3);
    const { main: mainCount, mini: miniCount, total } = galaxyFieldSplit(
      allocCount,
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
      spin("menu", 0, mainCount, [0, 0, 0], mainDisk.tilt, SCENES.menu.swirl.speed),
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
      stratify(p, detailExtra, 101 + idx * 7);
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
  }, [allocCount, isNarrow]);

  // How much of the allocated buffer to actually draw at the CURRENT (live,
  // possibly lower) tier. `galaxyFieldSplit` on both sides gives the exact
  // proportion — not an approximation — because the mini share is a fraction
  // of the total, not a fixed count (fix-performance-v2.md, Fase 2.3).
  const drawCounts = useMemo(() => {
    const alloc = galaxyFieldSplit(allocCount, ORBITAL_ORDER.length, 3);
    const want = galaxyFieldSplit(count, ORBITAL_ORDER.length, 3);
    return {
      main: Math.min(alloc.main, want.main),
      mini: Math.min(alloc.mini, want.mini),
    };
  }, [allocCount, count]);

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
        count={allocDustCount}
        drawn={dustCount}
        reducedMotion={reducedMotion}
      />
      <ParticleField
        instantForm={mountedOnce.current}
        count={totalCount}
        drawCounts={drawCounts}
        reducedMotion={reducedMotion}
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
        detailDrawn={drawCounts.mini}
        activeScene={activeScene}
      />
      {onAnchors && <AnchorProjector onChange={onAnchors} />}
    </Canvas>
    </>
  );
}

export default memo(GalaxyCanvas);
