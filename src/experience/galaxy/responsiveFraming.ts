import type { CameraFraming } from "./categoryScenes";
import type { Vec3 } from "./cameraTargets";

/**
 * Keeps an authored camera framing usable on narrow viewports.
 *
 * A PerspectiveCamera's `fov` is VERTICAL, so the visible width follows the
 * aspect ratio. The home framing was authored on a landscape screen: at
 * `position: [0, 1, 16]` with `fov: 64` the visible half-width is about 17.8
 * at 16:9, which comfortably holds the four mini galaxies sitting at x = ±7.8.
 * On a 390×844 phone the same framing gives a half-width of roughly 4.6, so the
 * minis fall far outside the frame and only the central galaxy is visible.
 *
 * The fix pulls the camera back along its own view direction until the
 * requested extent fits. It never moves the camera closer than the author
 * placed it, so landscape framings are returned untouched.
 */

/**
 * Below this CSS-pixel width, a scene may swap its `fit` for a wider
 * `fitNarrow` (phones, not tablets — same breakpoint as Tailwind's `sm`).
 * Single source of truth: GalaxyCamera.tsx reads it via `useThree` size
 * inside the Canvas; useNarrowViewport.ts reads it via matchMedia outside the
 * Canvas, where GalaxyCanvas.tsx's geometry useMemo actually runs.
 */
export const NARROW_VIEWPORT_MAX_WIDTH = 640;

/** Half-extents, in world units, that must stay inside the frame. */
export interface FitExtent {
  x: number;
  y: number;
}

/**
 * Distance at which a perspective camera of `fovDeg` sees at least `fit` in
 * both axes.
 *
 * visible half-height = d * tan(fov / 2)
 * visible half-width  = d * tan(fov / 2) * aspect
 */
export function fitDistance(
  fit: FitExtent,
  fovDeg: number,
  aspect: number,
): number {
  const t = Math.tan((fovDeg * Math.PI) / 360);
  if (!Number.isFinite(t) || t <= 0) return 0;
  const forY = fit.y / t;
  const forX =
    Number.isFinite(aspect) && aspect > 0 ? fit.x / (t * aspect) : forY;
  return Math.max(forX, forY);
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/**
 * Returns the framing to actually use for this aspect ratio.
 *
 * Without a `fit`, or when the authored distance already covers it, the
 * framing is returned unchanged — landscape keeps exactly the composition that
 * was designed.
 */
export function framingForAspect(
  framing: CameraFraming,
  aspect: number,
): CameraFraming {
  const fit = framing.fit;
  if (!fit) return framing;

  const authored = distance(framing.position, framing.lookAt);
  if (authored <= 0) return framing;

  const required = fitDistance(fit, framing.fov, aspect);
  if (!Number.isFinite(required) || required <= authored) return framing;

  // Slide along the existing view direction so the angle of the shot, and so
  // the tilt of the disc, are preserved. Only the distance changes.
  const k = required / authored;
  const [lx, ly, lz] = framing.lookAt;
  const [px, py, pz] = framing.position;
  return {
    ...framing,
    position: [
      lx + (px - lx) * k,
      ly + (py - ly) * k,
      lz + (pz - lz) * k,
    ],
  };
}

/**
 * Swaps in a scene's `fitNarrow` below NARROW_VIEWPORT_MAX_WIDTH.
 *
 * Deliberately separate from `framingForAspect`: that function only ever
 * reasons about aspect ratio (a shape), so its tests can stay pure geometry.
 * This is the one place that reads viewport WIDTH (a device-class signal) —
 * the policy decision of *which* fit to aim for, not the math of hitting it.
 * A viewport with no `fitNarrow` on the framing falls through unchanged.
 */
export function resolveFitForWidth(
  framing: CameraFraming,
  width: number,
): CameraFraming {
  if (width < NARROW_VIEWPORT_MAX_WIDTH && framing.fitNarrow) {
    return { ...framing, fit: framing.fitNarrow };
  }
  return framing;
}
