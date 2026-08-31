import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CategoryKey } from "@/content/types";
import { ORBITAL_ANCHORS, ORBITAL_ORDER } from "./orbitalAnchors";

export type AnchorScreenPositions = Record<
  CategoryKey,
  { xPct: number; yPct: number }
>;

/** Projects a world point to viewport percentages using the given camera. */
export function projectPoint(
  point: [number, number, number],
  camera: THREE.Camera,
): { xPct: number; yPct: number } {
  const v = new THREE.Vector3(point[0], point[1], point[2]).project(camera);
  return {
    xPct: (v.x * 0.5 + 0.5) * 100,
    yPct: (1 - (v.y * 0.5 + 0.5)) * 100,
  };
}

/**
 * Rendered INSIDE the Canvas. Recomputes the 2D screen position of each orbital
 * anchor whenever the camera or viewport changes, and hands them to the DOM.
 * The menu camera is static, so this does not need a per-frame update.
 */
export function AnchorProjector({
  onChange,
}: {
  onChange: (positions: AnchorScreenPositions) => void;
}) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  useEffect(() => {
    camera.updateMatrixWorld();
    const next = {} as AnchorScreenPositions;
    for (const key of ORBITAL_ORDER) {
      next[key] = projectPoint(ORBITAL_ANCHORS[key], camera);
    }
    onChange(next);
  }, [camera, size.width, size.height, onChange]);

  return null;
}
