import type { CategoryKey } from "@/content/types";
import type { DiskParams, ColorScheme } from "./particleGeometry";
import { CAMERA_MS, type Vec3 } from "./cameraTargets";

export type SceneKey = CategoryKey | "menu";

export interface CameraFraming {
  position: Vec3;
  lookAt: Vec3;
  fov: number;
}

export interface Spin {
  axis: "x" | "y" | "z";
  speed: number;
  wobble?: number;
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
  /** World-space position of this scene's black hole. */
  center: Vec3;
  framing: CameraFraming;
  /** Accretion-disk shape for this scene's black hole. */
  disk: DiskParams;
  spin: Spin;
  wave: Wave;
  pointSize: number;
  pointOpacity: number;
  /** Size of the hot ring glow sprite. */
  glowScale: number;
  colorScheme: ColorScheme;
  transition: SceneTransition;
}

/** Shared accretion palette — hot orange-white core, crimson mid, blue arms. */
const ACCRETION: ColorScheme = {
  inner: [1.0, 0.72, 0.42],
  mid: [1.0, 0.24, 0.32],
  outer: [0.3, 0.46, 1.0],
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
   *  The main black hole fills the frame; the four mini black holes sit
   *  out around it, one toward each label.                             */
  menu: {
    center: [0, 0, 0],
    framing: { position: [0, 1, 16], lookAt: [0, 0, 0], fov: 64 },
    disk: {
      inner: 1.15,
      outer: 6.6,
      thickness: 0.45,
      arms: 2,
      twist: 3.4,
      armStrength: 0.5,
      warp: 0.85,
      tilt: [0.95, 0.15, 0.18],
    },
    spin: { axis: "z", speed: 0.08, wobble: 0.04 },
    wave: { drive: "y", displace: "x", amplitude: 0.14, frequency: 0.3, speed: 0.5 },
    pointSize: 0.045,
    pointOpacity: 1.0,
    glowScale: 3,
    colorScheme: ACCRETION,
    transition: CALM,
  },

  /** ── PROJETOS ── wide, many-armed disk, seen from low on the left. */
  projetos: {
    center: [-7.8, 4.3, 0.8],
    framing: { position: [-2.5, 8, 10], lookAt: [-7.8, 4.3, 0.8], fov: 60 },
    disk: {
      inner: 1.4,
      outer: 9,
      thickness: 0.34,
      arms: 3,
      twist: 4.6,
      armStrength: 0.72,
      warp: 0.4,
      tilt: [1.15, 0.1, 0.32],
    },
    spin: { axis: "z", speed: 0.12, wobble: 0.03 },
    wave: { drive: "x", displace: "y", amplitude: 0.6, frequency: 0.4, speed: 1.1 },
    pointSize: 0.042,
    pointOpacity: 1.0,
    glowScale: 3.4,
    colorScheme: ACCRETION,
    transition: { ...PAGE_TRANSITION, flourish: "fling" },
  },

  /** ── STACK ── steep, near edge-on disk, seen from the side. */
  stack: {
    center: [7.8, 4.3, -0.8],
    framing: { position: [12.5, 1.5, 5], lookAt: [7.8, 4.3, -0.8], fov: 54 },
    disk: {
      inner: 1.1,
      outer: 8.5,
      thickness: 0.42,
      arms: 2,
      twist: 2.6,
      armStrength: 0.5,
      warp: 1.5,
      tilt: [0.2, 0.1, 1.42],
    },
    spin: { axis: "y", speed: 0.14, wobble: 0.02 },
    wave: { drive: "y", displace: "x", amplitude: 0.7, frequency: 0.5, speed: 1.3 },
    pointSize: 0.042,
    pointOpacity: 1.0,
    glowScale: 3,
    colorScheme: ACCRETION,
    transition: { ...PAGE_TRANSITION, flourish: "rise" },
  },

  /** ── SOBRE ── near face-on, many tight arms, seen from below. */
  sobre: {
    center: [-7.8, -4.3, 0.8],
    framing: { position: [-3, -8, 10], lookAt: [-7.8, -4.3, 0.8], fov: 60 },
    disk: {
      inner: 1.6,
      outer: 8,
      thickness: 0.85,
      arms: 4,
      twist: 6.2,
      armStrength: 0.8,
      warp: 0.25,
      tilt: [0.32, 0.4, 0.15],
    },
    spin: { axis: "y", speed: 0.06, wobble: 0.08 },
    wave: { drive: "y", displace: "z", amplitude: 0.55, frequency: 0.6, speed: 1.0 },
    pointSize: 0.042,
    pointOpacity: 1.0,
    glowScale: 3.6,
    colorScheme: ACCRETION,
    transition: { ...PAGE_TRANSITION, flourish: "gather" },
  },

  /** ── CONTATO ── tight fast spiral, tilted, seen from the upper right. */
  contato: {
    center: [7.8, -4.3, -0.8],
    framing: { position: [12.5, -1.5, 5], lookAt: [7.8, -4.3, -0.8], fov: 58 },
    disk: {
      inner: 0.95,
      outer: 9,
      thickness: 0.3,
      arms: 2,
      twist: 5.6,
      armStrength: 0.76,
      warp: 0.9,
      tilt: [1.0, 0.0, 0.7],
    },
    spin: { axis: "z", speed: 0.16, wobble: 0.04 },
    wave: { drive: "x", displace: "y", amplitude: 0.5, frequency: 0.55, speed: 1.5 },
    pointSize: 0.042,
    pointOpacity: 1.0,
    glowScale: 3.2,
    colorScheme: ACCRETION,
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
