/**
 * Dark vignette between the galaxy and the foreground UI. Kept on while the
 * menu or a settled content page is showing so the labels and text read
 * clearly over the nebula; faded out (by the caller) while a transition or the
 * navigate choreography is playing so the motion stays visible.
 */
export function ExperienceOverlay({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] transition-opacity duration-[1200ms] ease-out"
      style={{
        opacity: visible ? 1 : 0,
        background:
          "radial-gradient(ellipse 135% 105% at 50% 42%," +
          " hsl(var(--galaxy-bg) / 0.34) 0%," +
          " hsl(var(--galaxy-bg) / 0.62) 52%," +
          " hsl(var(--galaxy-bg) / 0.93) 100%)",
      }}
    />
  );
}
