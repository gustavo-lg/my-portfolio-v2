import type { CategoryKey } from "@/content/types";
import type { Deformation } from "./particleGeometry";
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

export interface SceneTransition {
  camera: { duration: number; ease: string };
  morph: { duration: number; ease: string };
  flourish: Flourish;
}

export interface Scene {
  framing: CameraFraming;
  deform: Deformation;
  spin: Spin;
  pointSize: number;
  pointOpacity: number;
  transition: SceneTransition;
}

const CALM: SceneTransition = {
  camera: { duration: CAMERA_MS, ease: "power2.inOut" },
  morph: { duration: 2200, ease: "power2.inOut" },
  flourish: "none",
};

export const SCENES: Record<SceneKey, Scene> = {
  menu: {
    framing: { position: [0, 0, 13], lookAt: [0, 0, 0], fov: 55 },
    deform: { scale: [1, 1, 1] },
    spin: { axis: "z", speed: 0.05, wobble: 0.06 },
    pointSize: 0.042,
    pointOpacity: 0.72,
    transition: CALM,
  },

  projetos: {
    framing: { position: [-5.5, 1.6, 15.5], lookAt: [-2.5, 0, 0], fov: 58 },
    deform: { scale: [1.75, 0.48, 1.15] },
    spin: { axis: "z", speed: 0.07, wobble: 0.03 },
    pointSize: 0.041,
    pointOpacity: 0.72,
    transition: {
      camera: { duration: 2400, ease: "power3.out" },
      morph: { duration: 2400, ease: "power2.out" },
      flourish: "fling",
    },
  },

  stack: {
    framing: { position: [0, 0.5, 9], lookAt: [0, 0.5, 0], fov: 40 },
    deform: { scale: [0.5, 1.95, 0.5] },
    spin: { axis: "y", speed: 0.12, wobble: 0.02 },
    pointSize: 0.046,
    pointOpacity: 0.8,
    transition: {
      camera: { duration: 2600, ease: "power2.inOut" },
      morph: { duration: 2600, ease: "power2.inOut" },
      flourish: "rise",
    },
  },

  sobre: {
    framing: { position: [2.5, -5, 12.5], lookAt: [0, 2, 0], fov: 56 },
    deform: { scale: [1.15, 1.5, 1.15], tilt: [0.3, 0, 0] },
    spin: { axis: "y", speed: 0.04, wobble: 0.08 },
    pointSize: 0.044,
    pointOpacity: 0.74,
    transition: {
      camera: { duration: 2300, ease: "power2.inOut" },
      morph: { duration: 2300, ease: "power2.inOut" },
      flourish: "gather",
    },
  },

  contato: {
    framing: { position: [7, 1.5, 14], lookAt: [-2.5, 0, 0], fov: 60 },
    deform: { scale: [1.25, 0.72, 1.2], shearXY: 0.55, tilt: [0, 0, 0.4] },
    spin: { axis: "z", speed: 0.1, wobble: 0.04 },
    pointSize: 0.041,
    pointOpacity: 0.74,
    transition: {
      camera: { duration: 2200, ease: "power2.out" },
      morph: { duration: 2200, ease: "power2.out" },
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
