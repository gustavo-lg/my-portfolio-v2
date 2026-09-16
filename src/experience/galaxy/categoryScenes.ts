import type { CategoryKey } from "@/content/types";
import type { DiskParams, ColorScheme } from "./particleGeometry";
import { CAMERA_MS, type Vec3 } from "./cameraTargets";

export type SceneKey = CategoryKey | "menu";

export interface CameraFraming {
  position: Vec3;
  lookAt: Vec3;
  fov: number;
  /**
   * Half-extents that must stay in frame, in world units. Set it when the shot
   * has to hold a layout wider than a phone can show at this distance: the
   * camera is then pulled back until the extent fits. Omit it to keep the
   * authored position on every viewport.
   */
  fit?: { x: number; y: number };
  /**
   * Wider than `fit`, used only below NARROW_VIEWPORT_MAX_WIDTH
   * (responsiveFraming.ts) — phones, not tablets. Exists because on a phone
   * the mini galaxies sit close enough to the frame edge that "just barely
   * fits" reads as cramped; this asks for extra breathing room on top of the
   * minimum `fit` guarantee. Falls back to `fit` when absent.
   */
  fitNarrow?: { x: number; y: number };
}

/**
 * Differential rotation of the stars WITHIN a galaxy — the galaxy itself never
 * moves. `speed` sign sets the spin direction; inner stars orbit faster.
 */
export interface Swirl {
  speed: number;
}

export type Flourish = "none" | "fling" | "gather" | "rise" | "sweep";

/**
 * Continuous sine ripple layered on top of the formed shape. Each frame the
 * `displace` axis of every particle is nudged by
 * `amplitude * sin(pos[drive] * frequency + time * speed)`.
 */
export interface Wave {
  drive: "x" | "y" | "z";
  displace: "x" | "y" | "z";
  amplitude: number;
  frequency: number;
  speed: number;
}

export interface SceneTransition {
  camera: { duration: number; ease: string };
  morph: { duration: number; ease: string };
  flourish: Flourish;
}

export interface Scene {
  /** World-space position of this scene's galaxy. */
  center: Vec3;
  framing: CameraFraming;
  /**
   * Where the camera flies FIRST, from the home scene — a point further from
   * the galaxy so it reads as something being approached, before the particles
   * deform. Pages only; the camera then pushes in from here to `framing`.
   */
  approach?: CameraFraming;
  /** Spiral-galaxy shape for this scene. */
  disk: DiskParams;
  swirl: Swirl;
  wave: Wave;
  pointSize: number;
  pointOpacity: number;
  /** Size of the bright core bulge glow. */
  glowScale: number;
  colorScheme: ColorScheme;
  transition: SceneTransition;
}

/** Shared palette — cool-white core, lilac mid, deep blue arms. */
const GALAXY: ColorScheme = {
  inner: [0.85, 0.9, 1.0],
  mid: [0.45, 0.28, 0.95],
  outer: [0.13, 0.3, 1.0],
};

const CALM: SceneTransition = {
  camera: { duration: CAMERA_MS, ease: "power1.out" },
  morph: { duration: 1900, ease: "power1.out" },
  flourish: "none",
};

const PAGE_TRANSITION = {
  camera: { duration: 1700, ease: "power2.out" },
  morph: { duration: 1700, ease: "power2.out" },
};

export const SCENES: Record<SceneKey, Scene> = {
  /** ── HOME ──────────────────────────────────────────────────────────
   *  The central barred spiral (Milky Way): a strong luminous bar-bulge and
   *  two tight arms. Four small Andromeda-style galaxies sit out around it.  */
  menu: {
    center: [0, 0, 0],
    // The four minis sit at x = ±7.8, y = ±4.3. `fit` keeps them on screen in
    // portrait, where the authored distance would crop them away entirely.
    framing: {
      position: [0, 1, 16],
      lookAt: [0, 0, 0],
      fov: 64,
      fit: { x: 9.6, y: 6.2 },
      // Starting point, not final — tune visually against a real phone. Sits
      // ~20% further back than `fit` alone: on a 390px-wide phone `fit`
      // already pulls the camera to ~33 world units (vs. 16 authored for
      // desktop); this adds another ~20% of margin on top.
      fitNarrow: { x: 11.5, y: 7.4 },
    },
    disk: {
      bulge: 2.4,
      outer: 7.5,
      thickness: 0.34,
      arms: 2,
      twist: 4.2,
      armStrength: 0.76,
      warp: 0.4,
      bar: 2.5,
      tilt: [0.68, 0.12, 0.18],
    },
    swirl: { speed: 0.55 },
    wave: { drive: "y", displace: "x", amplitude: 0.12, frequency: 0.3, speed: 0.5 },
    pointSize: 0.044,
    pointOpacity: 0.82,
    glowScale: 5,
    colorScheme: GALAXY,
    transition: CALM,
  },

  /** ── PROJETOS ── Andromeda-type spiral, steeply inclined. */
  projetos: {
    center: [-7.8, 4.3, 0.8],
    framing: { position: [-6.3, 5, 4.1], lookAt: [-7.8, 4.3, 0.8], fov: 62 },
    approach: { position: [-5.2, 5.4, 6.4], lookAt: [-7.8, 4.3, 0.8], fov: 60 },
    disk: {
      bulge: 2.2,
      outer: 9,
      thickness: 0.32,
      arms: 2,
      twist: 3.6,
      armStrength: 0.68,
      warp: 0.35,
      tilt: [1.3, 0.15, 0.28],
    },
    swirl: { speed: 0.6 },
    wave: { drive: "x", displace: "y", amplitude: 0.45, frequency: 0.4, speed: 1.0 },
    pointSize: 0.052,
    pointOpacity: 0.82,
    glowScale: 3.2,
    colorScheme: GALAXY,
    transition: { ...PAGE_TRANSITION, flourish: "none" },
  },

  /** ── STACK ── Andromeda-type spiral seen almost edge-on and rolled. */
  stack: {
    center: [7.8, 4.3, -0.8],
    framing: { position: [9.5, 3.8, 1.9], lookAt: [7.8, 4.3, -0.8], fov: 58 },
    approach: { position: [10.7, 3.4, 3.8], lookAt: [7.8, 4.3, -0.8], fov: 56 },
    disk: {
      bulge: 2.0,
      outer: 10,
      thickness: 0.36,
      arms: 2,
      twist: 3.1,
      armStrength: 0.6,
      warp: 0.6,
      tilt: [1.42, 0.0, 1.3],
    },
    swirl: { speed: 0.3 },
    wave: { drive: "y", displace: "x", amplitude: 0.45, frequency: 0.35, speed: 0.6 },
    pointSize: 0.052,
    pointOpacity: 0.82,
    glowScale: 3,
    colorScheme: GALAXY,
    transition: { ...PAGE_TRANSITION, flourish: "none" },
  },

  /** ── SOBRE ── Andromeda-type spiral, banked, slow reverse churn. */
  sobre: {
    center: [-7.8, -4.3, 0.8],
    framing: { position: [-6.3, -5.4, 4.1], lookAt: [-7.8, -4.3, 0.8], fov: 62 },
    approach: { position: [-5.2, -6.1, 6.4], lookAt: [-7.8, -4.3, 0.8], fov: 60 },
    disk: {
      bulge: 2.5,
      outer: 8.5,
      thickness: 0.4,
      arms: 2,
      twist: 4,
      armStrength: 0.72,
      warp: 0.3,
      tilt: [1.2, 0.5, 0.1],
    },
    swirl: { speed: -0.35 },
    wave: { drive: "y", displace: "z", amplitude: 0.5, frequency: 0.55, speed: 0.9 },
    pointSize: 0.052,
    pointOpacity: 0.82,
    glowScale: 3.4,
    colorScheme: GALAXY,
    transition: { ...PAGE_TRANSITION, flourish: "none" },
  },

  /** ── CONTATO ── Andromeda-type spiral, tilted hard, calm churn. */
  contato: {
    center: [7.8, -4.3, -0.8],
    framing: { position: [9.5, -3.4, 1.9], lookAt: [7.8, -4.3, -0.8], fov: 60 },
    approach: { position: [10.7, -2.7, 3.8], lookAt: [7.8, -4.3, -0.8], fov: 58 },
    disk: {
      bulge: 1.9,
      outer: 9,
      thickness: 0.42,
      arms: 2,
      twist: 4.6,
      armStrength: 0.66,
      warp: 0.6,
      tilt: [1.34, 0.3, 0.55],
    },
    swirl: { speed: 0.4 },
    wave: { drive: "x", displace: "y", amplitude: 0.4, frequency: 0.45, speed: 0.7 },
    pointSize: 0.052,
    pointOpacity: 0.82,
    glowScale: 3,
    colorScheme: GALAXY,
    transition: { ...PAGE_TRANSITION, flourish: "none" },
  },
};

export const SCENE_ORDER: SceneKey[] = [
  "menu",
  "projetos",
  "stack",
  "sobre",
  "contato",
];
