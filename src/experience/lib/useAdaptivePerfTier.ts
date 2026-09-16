import { useEffect, useRef, useState } from "react";
import {
  applyMove,
  decide,
  normalizeRefreshRate,
  storeIndex,
  type AdaptState,
} from "./adaptiveTier";
import { rungAt } from "./qualityLadder";
import { PERF_DEBUG, perfStats } from "./perfDebug";
import type { GpuClass } from "./gpuTier";

/** One sample window. Ten of these make a round, as drei's monitor does. */
const SAMPLE_MS = 250;
const SAMPLES = 10;
const MAX_ROUNDS = 6;
/**
 * Deadlock guard: if the scene never reports settled (WebGL unavailable so
 * GalaxyCanvas never mounts, onFormed never fires), the probe must still run
 * eventually instead of measuring nothing forever.
 */
const SETTLE_FALLBACK_MS = 8000;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Measures real frame rate and walks the quality ladder to match it.
 *
 * The static signals (GPU string, core count) only pick a starting rung; they
 * describe the hardware, not the workload. This is the only thing that measures
 * the actual bottleneck, so it has the final say.
 *
 * Uses its own requestAnimationFrame rather than R3F's useFrame because the
 * hook lives outside <Canvas>.
 */
export function useAdaptivePerfTier(
  initialIndex: number,
  gpu: GpuClass,
  enabled: boolean,
): number {
  const [state, setState] = useState<AdaptState>({ index: initialIndex });

  // Read inside the rAF loop without making it a dependency.
  const stateRef = useRef(state);
  stateRef.current = state;
  const roundsRef = useRef(0);
  // Highest frame rate ever observed, which stands in for the display's
  // refresh rate. Kept across rounds: it can only be learned upward.
  const refreshRef = useRef(0);

  // The starting rung can change after mount — pointerFine resolves from a
  // media query, and a stored verdict may load late. Without this the hook
  // would keep measuring against the rung it happened to mount with.
  const seededFrom = useRef(initialIndex);
  if (seededFrom.current !== initialIndex) {
    seededFrom.current = initialIndex;
    stateRef.current = { index: initialIndex };
    roundsRef.current = 0;
    setState(stateRef.current);
  }

  useEffect(() => {
    if (!enabled) return;
    if (roundsRef.current >= MAX_ROUNDS) return;

    let raf = 0;
    let roundStart = 0;
    let windowStart = 0;
    let windowFrames = 0;
    let samples: number[] = [];
    let aborted = false;
    let bootAt: number | null = null;

    const reset = () => {
      roundStart = 0;
      windowStart = 0;
      windowFrames = 0;
      samples = [];
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);

      // A hidden tab gets no animation frames, which would read as a crawl.
      if (aborted || document.hidden) {
        reset();
        return;
      }

      if (bootAt === null) bootAt = now;
      const settled =
        perfStats.sceneSettled || now - bootAt >= SETTLE_FALLBACK_MS;
      // Measuring before the scene settles means measuring the entry
      // formation, not the steady state (RC1) — throw away every frame until
      // then, or until the fallback fires.
      if (!settled) {
        reset();
        return;
      }

      if (roundStart === 0) {
        roundStart = now;
        return;
      }

      if (windowStart === 0) {
        windowStart = now;
        windowFrames = 0;
        return;
      }

      windowFrames += 1;
      const elapsed = now - windowStart;
      if (elapsed < SAMPLE_MS) return;

      const fps = (windowFrames * 1000) / elapsed;
      samples.push(fps);
      if (fps > refreshRef.current) refreshRef.current = fps;
      windowStart = now;
      windowFrames = 0;

      if (samples.length < SAMPLES) return;

      const current = stateRef.current;
      const refresh = normalizeRefreshRate(refreshRef.current);
      const move = decide(samples, refresh);
      const next = applyMove(
        current,
        move,
        typeof window !== "undefined" ? window.devicePixelRatio : 1,
      );
      roundsRef.current += 1;

      const mid = median(samples);
      perfStats.probeFps = mid;
      perfStats.probeRounds = roundsRef.current;
      perfStats.rung = rungAt(next.index).id;

      if (PERF_DEBUG) {
        console.info(
          `[perf] probe mediana=${mid.toFixed(1)} refresh=${refresh.toFixed(0)} ` +
            `move=${move} rung=${rungAt(current.index).id} -> ${rungAt(next.index).id} ` +
            `round=${roundsRef.current} amostras=[${samples.map((s) => s.toFixed(0)).join(",")}]`,
        );
      }

      if (next.index === current.index) {
        cancelAnimationFrame(raf);
        return;
      }

      setState(next);
      storeIndex(next.index, gpu);
      reset();
    };

    const onVisibility = () => reset();
    // A resize changes the pixel budget, so the samples in flight are stale.
    const onResize = () => reset();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(tick);

    return () => {
      aborted = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, [enabled, gpu, state.index]);

  return enabled ? state.index : initialIndex;
}
