import { profile } from "@/content/profile";
import { useExperience } from "@/experience/machine/useExperienceMachine";

/** Centred identity mark over the nebula. Fades and glides in smoothly once the galaxy settles. */
export function Wordmark() {
  const { ctx } = useExperience();
  const visible = ctx.state !== "intro-forming";

  return (
    <div
      className="pointer-events-none select-none text-center"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.96)",
        filter: visible ? "blur(0px)" : "blur(8px)",
        transition:
          "opacity 1.6s cubic-bezier(0.16, 1, 0.3, 1), " +
          "transform 1.6s cubic-bezier(0.16, 1, 0.3, 1), " +
          "filter 1.6s cubic-bezier(0.16, 1, 0.3, 1)",
        willChange: "transform, opacity, filter",
      }}
    >
      <h1 className="max-w-full break-words font-display text-2xl font-light tracking-[0.1em] text-foreground drop-shadow-[0_2px_32px_hsl(var(--galaxy-bg))] sm:text-3xl sm:tracking-[0.18em] md:text-4xl">
        {profile.name}
      </h1>
      <p
        className="mt-3 text-[0.65rem] uppercase tracking-[0.42em] text-foreground/75 md:text-xs"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(10px)",
          transition:
            "opacity 1.6s cubic-bezier(0.16, 1, 0.3, 1) 180ms, " +
            "transform 1.6s cubic-bezier(0.16, 1, 0.3, 1) 180ms",
        }}
      >
        {profile.title}
      </p>
    </div>
  );
}

