/**
 * Dark vignette between the galaxy and the foreground UI. Kept on only when
 * something is meant to be read over the nebula (the settled menu, or a
 * content page that has finished animating in) and faded off through every
 * transition and the navigate / return choreography so the particle motion
 * stays visible. The fade is long and eased both ways so darken <-> lighten
 * never snaps.
 *
 * The transition lives in the inline style, not a Tailwind class: the
 * arbitrary `duration-[...]` / `ease-[cubic-bezier(...)]` candidates were not
 * being emitted by the JIT extractor (the parens in the easing break it).
 */
const FADE = "opacity 2100ms cubic-bezier(0.37, 0, 0.16, 1)";

export function ExperienceOverlay({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{
        opacity: visible ? 1 : 0,
        transition: FADE,
        willChange: "opacity",
        background:
          "radial-gradient(ellipse 135% 105% at 50% 42%," +
          " hsl(var(--galaxy-bg) / 0.12) 0%," +
          " hsl(var(--galaxy-bg) / 0.32) 55%," +
          " hsl(var(--galaxy-bg) / 0.6) 100%)",
      }}
    />
  );
}
