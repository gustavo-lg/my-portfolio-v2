let cached: boolean | null = null;

/** Cheap one-time check for a usable WebGL context. */
export function isWebGLAvailable(): boolean {
  if (cached !== null) return cached;
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    cached = Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    cached = false;
  }
  return cached;
}
