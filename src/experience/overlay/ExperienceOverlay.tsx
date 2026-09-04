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
const MENU_FADE = "opacity 2100ms cubic-bezier(0.37, 0, 0.16, 1)";
const PAGE_FADE =
  "opacity 1000ms cubic-bezier(0.25, 1, 0.5, 1), backdrop-filter 1000ms cubic-bezier(0.25, 1, 0.5, 1), -webkit-backdrop-filter 1000ms cubic-bezier(0.25, 1, 0.5, 1)";

export interface ExperienceOverlayProps {
  visible: boolean;
  isPage?: boolean;
}

export function ExperienceOverlay({ visible, isPage }: ExperienceOverlayProps) {
  const showMenuOverlay = visible && !isPage;
  const showPageOverlay = visible && Boolean(isPage);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[1]">
      {/* Home / Menu subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          opacity: showMenuOverlay ? 1 : 0,
          transition: MENU_FADE,
          willChange: "opacity",
          background:
            "radial-gradient(ellipse 135% 105% at 50% 42%," +
            " hsl(var(--galaxy-bg) / 0.12) 0%," +
            " hsl(var(--galaxy-bg) / 0.32) 55%," +
            " hsl(var(--galaxy-bg) / 0.6) 100%)",
        }}
      />

      {/* Internal pages deep dark veil with subtle cosmic blur */}
      <div
        className="absolute inset-0"
        style={{
          opacity: showPageOverlay ? 1 : 0,
          transition: PAGE_FADE,
          willChange: "opacity, backdrop-filter",
          backdropFilter: showPageOverlay ? "blur(4px)" : "blur(0px)",
          WebkitBackdropFilter: showPageOverlay ? "blur(4px)" : "blur(0px)",
          background:
            "radial-gradient(ellipse 140% 110% at 50% 45%," +
            " hsl(var(--galaxy-bg) / 0.42) 0%," +
            " hsl(var(--galaxy-bg) / 0.58) 60%," +
            " hsl(var(--galaxy-bg) / 0.75) 100%)",
        }}
      />
    </div>
  );
}
