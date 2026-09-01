import type { CategoryKey } from "@/content/types";
import type { DiskParams, ColorScheme } from "./particleGeometry";
import { CAMERA_MS, type Vec3 } from "./cameraTargets";

export type SceneKey = CategoryKey | "menu";

export interface CameraFraming {
  position: Vec3;
  lookAt: Vec3;
  fov: number;
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
  camera: { duration: CAMERA_MS, ease: "power2.inOut" },
  morph: { duration: 2200, ease: "power2.inOut" },
  flourish: "none",
};

const PAGE_TRANSITION = {
  camera: { duration: 3000, ease: "power2.inOut" },
  morph: { duration: 2800, ease: "power2.inOut" },
};

export const SCENES: Record<SceneKey, Scene> = {
  /** ── HOME ──────────────────────────────────────────────────────────
   *  The central spiral galaxy, with a small distant galaxy toward each
   *  label.                                                            */
  menu: {
    center: [0, 0, 0],
    framing: { position: [0, 1, 16], lookAt: [0, 0, 0], fov: 64 },
    disk: {
      bulge: 1.8,
      outer: 6.5,
      thickness: 0.4,
      arms: 2,
      twist: 3.6,
      armStrength: 0.6,
      warp: 0.8,
      tilt: [1.05, 0.15, 0.2],
    },
    swirl: { speed: 0.5 },
    wave: { drive: "y", displace: "x", amplitude: 0.12, frequency: 0.3, speed: 0.5 },
    pointSize: 0.044,
    pointOpacity: 0.72,
    glowScale: 2.6,
    colorScheme: GALAXY,
    transition: CALM,
  },

  /** ── PROJETOS ── grand-design 3-arm spiral, near face-on. */
  projetos: {
    center: [-7.8, 4.3, 0.8],
    framing: { position: [-4, 6, 9], lookAt: [-7.8, 4.3, 0.8], fov: 60 },
    disk: {
      bulge: 1.5,
      outer: 9,
      thickness: 0.3,
      arms: 3,
      twist: 5,
      armStrength: 0.6,
      warp: 0.3,
      tilt: [0.5, 0.2, 0.3],
    },
    swirl: { speed: 0.85 },
    wave: { drive: "x", displace: "y", amplitude: 0.45, frequency: 0.4, speed: 1.0 },
    pointSize: 0.044,
    pointOpacity: 0.72,
    glowScale: 2.6,
    colorScheme: GALAXY,
    transition: { ...PAGE_TRANSITION, flourish: "fling" },
  },

  /** ── STACK ── edge-on galaxy; the stars stream along its length. */
  stack: {
    center: [7.8, 4.3, -0.8],
    framing: { position: [12, 3, 6], lookAt: [7.8, 4.3, -0.8], fov: 56 },
    disk: {
      bulge: 1.8,
      outer: 10,
      thickness: 0.45,
      arms: 2,
      twist: 2.2,
      armStrength: 0.4,
      warp: 1.6,
      tilt: [0.08, 0.0, 1.5],
    },
    swirl: { speed: 0.35 },
    wave: { drive: "y", displace: "x", amplitude: 0.8, frequency: 0.45, speed: 1.4 },
    pointSize: 0.044,
    pointOpacity: 0.72,
    glowScale: 2.4,
    colorScheme: GALAXY,
    transition: { ...PAGE_TRANSITION, flourish: "rise" },
  },

  /** ── SOBRE ── barred spiral, slow churn, seen from below. */
  sobre: {
    center: [-7.8, -4.3, 0.8],
    framing: { position: [-4, -7, 9], lookAt: [-7.8, -4.3, 0.8], fov: 60 },
    disk: {
      bulge: 2.6,
      outer: 8,
      thickness: 0.7,
      arms: 2,
      twist: 6.5,
      armStrength: 0.68,
      warp: 0.2,
      tilt: [0.4, 0.5, 0.15],
    },
    swirl: { speed: -0.28 },
    wave: { drive: "y", displace: "z", amplitude: 0.5, frequency: 0.55, speed: 0.9 },
    pointSize: 0.044,
    pointOpacity: 0.72,
    glowScale: 2.4,
    colorScheme: GALAXY,
    transition: { ...PAGE_TRANSITION, flourish: "gather" },
  },

  /** ── CONTATO ── irregular starburst; scattered, pulsing stars. */
  contato: {
    center: [7.8, -4.3, -0.8],
    framing: { position: [12, -2, 6], lookAt: [7.8, -4.3, -0.8], fov: 58 },
    disk: {
      bulge: 1.2,
      outer: 9,
      thickness: 1.4,
      arms: 5,
      twist: 3,
      armStrength: 0.35,
      warp: 1.2,
      tilt: [0.9, 0.3, 0.6],
    },
    swirl: { speed: 1.15 },
    wave: { drive: "x", displace: "y", amplitude: 0.9, frequency: 0.7, speed: 1.8 },
    pointSize: 0.044,
    pointOpacity: 0.72,
    glowScale: 2.2,
    colorScheme: GALAXY,
    transition: { ...PAGE_TRANSITION, flourish: "sweep" },
  },
};

export const SCENE_ORDER: SceneKey[] = [
  "menu",
  "projetos",
  "stack",
  "sobre",
  "contato",
];
