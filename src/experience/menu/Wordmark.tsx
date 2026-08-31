import { profile } from "@/content/profile";
import { useExperience } from "@/experience/machine/useExperienceMachine";

/** Centred identity mark over the nebula. Fades in once the galaxy settles. */
export function Wordmark() {
  const { ctx } = useExperience();
  const visible = ctx.state !== "intro-forming";

  return (
    <div
      className="pointer-events-none select-none text-center transition-opacity duration-1000"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <h1 className="font-display text-4xl font-light tracking-[0.22em] text-foreground drop-shadow-[0_2px_24px_hsl(var(--galaxy-bg))] md:text-6xl">
        {profile.name}
      </h1>
      <p className="mt-3 text-[0.7rem] uppercase tracking-[0.4em] text-foreground/70 md:text-xs">
        {profile.title}
      </p>
    </div>
  );
}
