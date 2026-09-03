import type { CategoryKey } from "@/content/types";
import type { Vec3 } from "./cameraTargets";

/**
 * Fixed 3D positions for the category labels, arranged around the core in a
 * slightly tilted ring. Order matches `categories`.
 */
export const ORBITAL_ANCHORS: Record<CategoryKey, Vec3> = {
  projetos: [-4.7, 2.6, 0.5],
  stack: [4.7, 2.6, -0.5],
  sobre: [-4.7, -2.6, 0.5],
  contato: [4.7, -2.6, -0.5],
};

export const ORBITAL_ORDER: CategoryKey[] = [
  "projetos",
  "stack",
  "sobre",
  "contato",
];
