import type { CategoryKey } from "@/content/types";
import type { Vec3 } from "./cameraTargets";

/**
 * Fixed 3D positions for the category labels, arranged around the core in a
 * slightly tilted ring. Order matches `categories`.
 */
export const ORBITAL_ANCHORS: Record<CategoryKey, Vec3> = {
  projetos: [-3.1, 1.7, 0.4],
  stack: [3.1, 1.7, -0.4],
  sobre: [-3.1, -1.7, 0.4],
  contato: [3.1, -1.7, -0.4],
};

export const ORBITAL_ORDER: CategoryKey[] = [
  "projetos",
  "stack",
  "sobre",
  "contato",
];
