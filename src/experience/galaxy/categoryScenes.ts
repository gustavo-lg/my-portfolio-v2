import type { CategoryKey } from "@/content/types";
import type { Deformation, ColorScheme } from "./particleGeometry";
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
  /** Which pocket of the nebula this page's formation sits in (world space). */
  center: Vec3;
  framing: CameraFraming;
  deform: Deformation;
  spin: Spin;
  wave: Wave;
  pointSize: number;
  pointOpacity: number;
  glowScale: number;
  colorScheme: ColorScheme;
  transition: SceneTransition;
}

/** One palette for the whole galaxy — blue near a formation's heart, deep violet out in the dust. */
const BLUE: ColorScheme = {
  inner: [0.22, 0.5, 1.0],
  outer: [0.5, 0.14, 0.9],
};

const CALM: SceneTransition = {
  camera: { duration: CAMERA_MS, ease: "power2.inOut" },
  morph: { duration: 2200, ease: "power2.inOut" },
  flourish: "none",
};

const PAGE_TRANSITION = {
  camera: { duration: 2800, ease: "power2.inOut" },
  morph: { duration: 2600, ease: "power2.inOut" },
};

export const SCENES: Record<SceneKey, Scene> = {
  /** ── HOME ──────────────────────────────────────────────────────────
   *  Dense nebula at the heart of the galaxy. The calm anchor. Every page
   *  is a dive INTO this same cloud from a different angle.            */
  menu: {
    center: [0, 0, 0],
    framing: { position: [0, 0, 13], lookAt: [0, 0, 0], fov: 58 },
    deform: { scale: [1, 1, 1] },
    spin: { axis: "z", speed: 0.05, wobble: 0.06 },
    wave: { drive: "y", displace: "x", amplitude: 0.16, frequency: 0.3, speed: 0.5 },
    pointSize: 0.05,
    pointOpacity: 0.6,
    glowScale: 9,
    colorScheme: BLUE,
    transition: CALM,
  },

  /** ── PROJETOS ───────────────────────────────────────────────────────
   *  The camera dives past the core, off to the left, toward a pocket
   *  that flattens into a wide sheet rippling like a banner.           */
  projetos: {
    center: [8, 1.5, 3],
    framing: { position: [-7, -2, 16], lookAt: [8, 1.5, 3], fov: 60 },
    deform: { scale: [1.95, 0.42, 1.25] },
    spin: { axis: "z", speed: 0.06, wobble: 0.03 },
    wave: { drive: "x", displace: "y", amplitude: 1.3, frequency: 0.5, speed: 1.4 },
    pointSize: 0.048,
    pointOpacity: 0.57,
    glowScale: 8,
    colorScheme: BLUE,
    transition: { ...PAGE_TRANSITION, flourish: "fling" },
  },

  /** ── STACK ─────────────────────────────────────────────────────────
   *  The camera climbs into a high pocket and looks up a tall column
   *  that undulates side to side up its length.                       */
  stack: {
    center: [-4, 5, -8],
    framing: { position: [-4, -4, 8], lookAt: [-4, 6, -8], fov: 46 },
    deform: { scale: [0.42, 2.6, 0.42], tilt: [0.1, 0, 0] },
    spin: { axis: "y", speed: 0.12, wobble: 0.02 },
    wave: { drive: "y", displace: "x", amplitude: 1.5, frequency: 0.55, speed: 1.6 },
    pointSize: 0.05,
    pointOpacity: 0.6,
    glowScale: 7,
    colorScheme: BLUE,
    transition: { ...PAGE_TRANSITION, flourish: "rise" },
  },

  /** ── SOBRE ─────────────────────────────────────────────────────────
   *  The camera drops and banks toward a lower-right pocket that tilts
   *  into a swirling vortex whose depth ripples with height.          */
  sobre: {
    center: [7, -3, 6],
    framing: { position: [-3, -11, 15], lookAt: [7, -2, 6], fov: 56 },
    deform: { scale: [1.5, 1.4, 1.0], shearXY: 0.4, tilt: [0.5, 0.2, 0.35] },
    spin: { axis: "y", speed: 0.05, wobble: 0.1 },
    wave: { drive: "y", displace: "z", amplitude: 0.9, frequency: 0.7, speed: 1.2 },
    pointSize: 0.048,
    pointOpacity: 0.57,
    glowScale: 8,
    colorScheme: BLUE,
    transition: { ...PAGE_TRANSITION, flourish: "gather" },
  },

  /** ── CONTATO ────────────────────────────────────────────────────────
   *  The camera swings in from the upper right toward a far pocket that
   *  shears into a streaking comet with a trailing ripple.            */
  contato: {
    center: [-8, 4, -5],
    framing: { position: [8, 9, 12], lookAt: [-8, 4, -5], fov: 60 },
    deform: { scale: [1.7, 0.6, 1.1], shearXY: 1.0, tilt: [0, 0, 0.4] },
    spin: { axis: "z", speed: 0.1, wobble: 0.04 },
    wave: { drive: "x", displace: "y", amplitude: 0.75, frequency: 0.55, speed: 1.8 },
    pointSize: 0.048,
    pointOpacity: 0.57,
    glowScale: 8,
    colorScheme: BLUE,
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
