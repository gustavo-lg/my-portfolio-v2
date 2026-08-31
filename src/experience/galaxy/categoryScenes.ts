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

export type Flourish = "none" | "fling" | "gather" | "rise" | "sweep" | "explode" | "vortex";

export interface SceneTransition {
  camera: { duration: number; ease: string };
  morph: { duration: number; ease: string };
  flourish: Flourish;
}

export interface Scene {
  /** World-space origin of this formation */
  center: Vec3;
  framing: CameraFraming;
  deform: Deformation;
  spin: Spin;
  pointSize: number;
  pointOpacity: number;
  glowScale: number;
  colorScheme: ColorScheme;
  transition: SceneTransition;
}

const CALM: SceneTransition = {
  camera: { duration: CAMERA_MS, ease: "power2.inOut" },
  morph: { duration: 2200, ease: "power2.inOut" },
  flourish: "none",
};

export const SCENES: Record<SceneKey, Scene> = {
  /** ── HOME ──────────────────────────────────────────────────────────
   *  Dense nebula at the heart of the galaxy. The calm anchor.        */
  menu: {
    center: [0, 0, 0],
    framing: { position: [0, 0, 18], lookAt: [0, 0, 0], fov: 55 },
    deform: { scale: [1, 1, 1] },
    spin: { axis: "z", speed: 0.05, wobble: 0.06 },
    pointSize: 0.042,
    pointOpacity: 0.72,
    glowScale: 7.5,
    colorScheme: {
      inner: [0, 0.83, 1],       // cyan
      outer: [0.55, 0.3, 0.92],  // purple
    },
    transition: CALM,
  },

  /** ── PROJETOS ───────────────────────────────────────────────────────
   *  Amber/orange impact disk — its own region far to the left. The camera
   *  flies ~40 units across the void to reach it, but frames it as tightly
   *  as home frames the nebula so the cloud keeps its density.          */
  projetos: {
    center: [-45, 5, 10],
    framing: { position: [-48, 6.6, 25.5], lookAt: [-45, 5, 10], fov: 58 },
    deform: { scale: [1.75, 0.48, 1.15] },
    spin: { axis: "z", speed: 0.07, wobble: 0.03 },
    pointSize: 0.042,
    pointOpacity: 0.74,
    glowScale: 8,
    colorScheme: {
      inner: [1, 0.85, 0.1],    // bright amber
      outer: [0.9, 0.35, 0.0],  // deep orange
    },
    transition: {
      camera: { duration: 3200, ease: "power2.inOut" },
      morph: { duration: 2800, ease: "power2.inOut" },
      flourish: "fling",
    },
  },

  /** ── STACK ─────────────────────────────────────────────────────────
   *  Green column — its region is high above and deep in negative Z.    */
  stack: {
    center: [0, 40, -20],
    framing: { position: [0, 40.5, -11], lookAt: [0, 40, -20], fov: 40 },
    deform: { scale: [0.5, 1.95, 0.5], tilt: [0.12, 0, 0] },
    spin: { axis: "y", speed: 0.12, wobble: 0.02 },
    pointSize: 0.046,
    pointOpacity: 0.82,
    glowScale: 6.5,
    colorScheme: {
      inner: [0.4, 1, 0.55],    // bright mint-green
      outer: [0.0, 0.55, 0.45], // deep teal
    },
    transition: {
      camera: { duration: 3200, ease: "power2.inOut" },
      morph: { duration: 2800, ease: "power2.inOut" },
      flourish: "rise",
    },
  },

  /** ── SOBRE ─────────────────────────────────────────────────────────
   *  Violet/pink swirl — lower-right region, forward in Z.              */
  sobre: {
    center: [30, -35, 25],
    framing: { position: [32.5, -42, 37.5], lookAt: [30, -33, 25], fov: 56 },
    deform: { scale: [1.15, 1.5, 1.15], tilt: [0.3, 0, 0] },
    spin: { axis: "y", speed: 0.04, wobble: 0.08 },
    pointSize: 0.044,
    pointOpacity: 0.76,
    glowScale: 7.5,
    colorScheme: {
      inner: [0.85, 0.3, 1.0],  // vivid violet
      outer: [1.0, 0.25, 0.6],  // hot pink
    },
    transition: {
      camera: { duration: 3200, ease: "power2.inOut" },
      morph: { duration: 2800, ease: "power2.inOut" },
      flourish: "gather",
    },
  },

  /** ── CONTATO ────────────────────────────────────────────────────────
   *  Golden comet — far-right region, elevated, deep negative Z.        */
  contato: {
    center: [40, 15, -40],
    framing: { position: [49.5, 16.5, -26], lookAt: [37.5, 15, -40], fov: 60 },
    deform: { scale: [1.25, 0.72, 1.2], shearXY: 0.55, tilt: [0, 0, 0.4] },
    spin: { axis: "z", speed: 0.1, wobble: 0.04 },
    pointSize: 0.042,
    pointOpacity: 0.76,
    glowScale: 8,
    colorScheme: {
      inner: [1.0, 0.95, 0.55],  // warm gold / near-white
      outer: [0.85, 0.6, 0.0],   // deep amber-gold
    },
    transition: {
      camera: { duration: 3200, ease: "power2.inOut" },
      morph: { duration: 2800, ease: "power2.inOut" },
      flourish: "sweep",
    },
  },
};

export const SCENE_ORDER: SceneKey[] = [
  "menu",
  "projetos",
  "stack",
  "sobre",
  "contato",
];


