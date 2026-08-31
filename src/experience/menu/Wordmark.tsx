import { profile } from "@/content/profile";
import { useExperience } from "@/experience/machine/useExperienceMachine";

/** Centred identity mark over the nebula. Fades in once the galaxy settles. */
export function Wordmark() {
  const { ctx } = useExperience();
  const visible = ctx.state !== "intro-forming";

  return (
    <div
      className="pointer-events-none select-none text-center"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 1900ms cubic-bezier(0.37, 0, 0.16, 1)",
      }}
    >
      <h1 className="whitespace-nowrap font-display text-2xl font-light tracking-[0.16em] text-foreground drop-shadow-[0_2px_24px_hsl(var(--galaxy-bg))] sm:text-3xl md:text-4xl">
        {profile.name}
      </h1>
      <p className="mt-3 text-[0.65rem] uppercase tracking-[0.4em] text-foreground/70 md:text-xs">
        {profile.title}
      </p>
    </div>
  );
}
