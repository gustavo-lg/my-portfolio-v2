/**
 * Performance diagnostics that survive a production build.
 *
 * `import.meta.env.DEV` is false in `npm run build`, which is the only build
 * worth measuring — the dev server is unminified and not representative. But
 * the machines that need measuring most (a weak desktop, a phone) are reached
 * through a deploy, where there is no dev server and often no usable DevTools.
 *
 * So the diagnostics are gated on a flag that a URL parameter can turn on:
 *
 *   https://site/?perf=1   enable, and remember it
 *   https://site/?perf=0   disable and forget
 *
 * The choice is stored, because this is a single-page app: react-router drops
 * the query string on the first in-app navigation, and a flag that died on the
 * way to /projetos would be useless.
 */

const FLAG_KEY = "portfolio-perf-debug";

function resolve(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  try {
    const query = new URLSearchParams(window.location.search);
    if (query.get("perf") === "0") {
      localStorage.removeItem(FLAG_KEY);
      return false;
    }
    if (query.has("perf")) {
      localStorage.setItem(FLAG_KEY, "1");
      return true;
    }
    return localStorage.getItem(FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export const PERF_DEBUG = resolve();

export interface PerfStats {
  /** Frames per second over the last sampling window. */
  fps: number;
  /** Milliseconds spent inside ParticleField's useFrame body. */
  bodyMs: number;
  particles: number;
  detail: number;
  /** Pixel ratio actually in use, after clampDpr and the display ceiling. */
  dpr: number;
  devicePixelRatio: number;
  /** Current quality ladder rung id, or "—" before the first resolution. */
  rung: string;
  /** Average FPS of the last adaptive probe round, null if none has finished. */
  probeFps: number | null;
  probeRounds: number;
  /** Set when a shader fails to compile, so the failure is visible on screen. */
  shaderError: string | null;
  /** True once the entrance formation has finished and the scene is settled. */
  sceneSettled: boolean;
}

/**
 * Single mutable record the frame loop writes into. Deliberately not React
 * state: the frame loop must not trigger a render, and the HUD polls instead.
 */
export const perfStats: PerfStats = {
  fps: 0,
  bodyMs: 0,
  particles: 0,
  detail: 0,
  dpr: 0,
  devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
  rung: "—",
  probeFps: null,
  probeRounds: 0,
  shaderError: null,
  sceneSettled: false,
};

/**
 * Exported as functions, not by mutating `perfStats` directly at the call
 * site: `perfStats` is a module-level singleton that survives remounts and
 * SPA navigations, so resetting it on unmount needs an explicit call.
 */
export function markSceneSettled(): void {
  perfStats.sceneSettled = true;
}

export function resetSceneSettled(): void {
  perfStats.sceneSettled = false;
}
