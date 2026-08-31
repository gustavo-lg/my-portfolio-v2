import { useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
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

/** Below this (in viewport %) a change isn't worth a re-render. */
const EPSILON = 0.05;

function changed(
  a: AnchorScreenPositions | null,
  b: AnchorScreenPositions,
): boolean {
  if (!a) return true;
  return ORBITAL_ORDER.some(
    (k) =>
      Math.abs(a[k].xPct - b[k].xPct) > EPSILON ||
      Math.abs(a[k].yPct - b[k].yPct) > EPSILON,
  );
}

/**
 * Rendered INSIDE the Canvas. Projects each orbital anchor to screen space every
 * frame and pushes the result to the DOM only when it actually moves — the
 * camera is static except during the GSAP dolly, so this is a no-op at idle but
 * keeps the labels glued to the nebula while the camera animates.
 */
export function AnchorProjector({
  onChange,
}: {
  onChange: (positions: AnchorScreenPositions) => void;
}) {
  const camera = useThree((s) => s.camera);
  const last = useRef<AnchorScreenPositions | null>(null);

  useFrame(() => {
    const next = {} as AnchorScreenPositions;
    for (const key of ORBITAL_ORDER) {
      next[key] = projectPoint(ORBITAL_ANCHORS[key], camera);
    }
    if (changed(last.current, next)) {
      last.current = next;
      onChange(next);
    }
  });

  return null;
}
