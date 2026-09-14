/**
 * Reads the GPU renderer string and buckets it.
 *
 * This only picks the *starting* rung of the quality ladder. It is a heuristic
 * over vendor strings and is never the final word — the FPS probe in
 * `useAdaptivePerfTier` measures the real bottleneck and overrides it.
 */

export type GpuClass = "low" | "mid" | "high" | "unknown";

let cached: string | null | undefined;

/**
 * The unmasked WEBGL renderer string, or null when unavailable.
 * Safari blocks WEBGL_debug_renderer_info, which reads as "unknown", never as
 * "fast".
 */
export function getGpuRendererString(): string | null {
  if (cached !== undefined) return cached;
  cached = null;

  if (typeof window === "undefined") return cached;

  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return cached;

    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (ext) {
      const value = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      if (typeof value === "string") cached = value;
    }

    // Release the probe context immediately; contexts are a scarce resource and
    // the real scene needs one.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = null;
  }

  return cached;
}

// Software rasterisers and the weak integrated parts. Checked first, so a
// string that mentions both a vendor and a software fallback reads as "low".
const LOW = [
  "swiftshader",
  "llvmpipe",
  "software rasterizer",
  "microsoft basic render",
  "intel(r) hd graphics",
  "intel(r) uhd graphics",
  "intel(r) g45",
  "intel(r) q45",
  "mali-4",
  "mali-t",
  "mali-g3",
  "mali-g5",
  "adreno (tm) 3",
  "adreno (tm) 4",
  "adreno (tm) 5",
  "videocore",
];

// Current dedicated parts. Checked before MID so "rtx 4070" does not match on
// the bare "nvidia" substring.
const HIGH = [
  "rtx 30",
  "rtx 40",
  "rtx 50",
  "radeon rx 6",
  "radeon rx 7",
  "radeon rx 9",
  "radeon pro",
  "arc(tm) a7",
  "apple m2",
  "apple m3",
  "apple m4",
];

const MID = [
  "nvidia",
  "geforce",
  "gtx",
  "radeon",
  "vega",
  "apple m1",
  "arc(tm) a",
  "intel(r) iris",
  "adreno (tm) 7",
  "adreno (tm) 8",
  "mali-g7",
  "mali-g6",
];

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

export function classifyGpu(renderer: string | null): GpuClass {
  if (!renderer) return "unknown";
  const s = renderer.toLowerCase();
  if (hasAny(s, LOW)) return "low";
  if (hasAny(s, HIGH)) return "high";
  if (hasAny(s, MID)) return "mid";
  return "unknown";
}

/** Test seam: clears the memoised renderer string. */
export function resetGpuRendererCache(): void {
  cached = undefined;
}
