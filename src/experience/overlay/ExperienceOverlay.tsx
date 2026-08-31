import type { ExperienceState } from "@/experience/machine/types";

/**
 * Dark vignette that sits between the galaxy and the menu. It fades out as the
 * first beat of the navigate choreography and fades back in on return.
 */
export function ExperienceOverlay({ state }: { state: ExperienceState }) {
  const dim =
    state === "menu-reveal" ||
    state === "idle" ||
    state === "traveling" ||
    state === "returning";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] transition-opacity duration-500"
      style={{
        opacity: dim ? 1 : 0,
        background:
          "radial-gradient(circle at 50% 45%, transparent 30%, hsl(var(--galaxy-bg) / 0.55) 75%, hsl(var(--galaxy-bg) / 0.85) 100%)",
      }}
    />
  );
}
