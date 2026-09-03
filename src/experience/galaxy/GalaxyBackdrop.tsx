/**
 * Static CSS stand-in for the particle galaxy — used as the Suspense fallback
 * while the WebGL chunk loads and as the permanent backdrop when WebGL is
 * unavailable.
 */
export function GalaxyBackdrop({ pulse = false }: { pulse?: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 bg-galaxy-bg"
    />
  );
}

