/**
 * Static CSS stand-in for the particle galaxy — used as the Suspense fallback
 * while the WebGL chunk loads and as the permanent backdrop when WebGL is
 * unavailable.
 */
export function GalaxyBackdrop({ pulse = false }: { pulse?: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          "radial-gradient(circle at 50% 46%, hsl(195 100% 50% / 0.35) 0%, hsl(265 80% 62% / 0.16) 26%, hsl(0 0% 8%) 62%)",
      }}
    >
      <div
        className={pulse ? "animate-glow" : undefined}
        style={{
          position: "absolute",
          left: "50%",
          top: "46%",
          width: 12,
          height: 12,
          marginLeft: -6,
          marginTop: -6,
          borderRadius: "9999px",
          background: "hsl(195 100% 70%)",
          boxShadow: "0 0 40px 10px hsl(195 100% 50% / 0.6)",
        }}
      />
    </div>
  );
}
