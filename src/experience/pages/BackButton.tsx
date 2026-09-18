import { useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useExperience } from "@/experience/machine/useExperienceMachine";
import { usePrefersReducedMotion } from "@/experience/lib/useReducedMotion";
import { smoothScrollToTop } from "@/experience/lib/smoothScrollToTop";
import { ExperienceContainer } from "@/experience/layout/ExperienceContainer";

/** Fixed "VER TUDO" control, aligned to the content container's left edge. */
export function BackButton() {
  const { send } = useExperience();
  const reducedMotion = usePrefersReducedMotion();
  const busy = useRef(false);

  // Reset the guard every time the component mounts so a previous
  // stale `true` never blocks future clicks.
  useEffect(() => {
    busy.current = false;
  }, []);

  const onBack = async () => {
    if (busy.current) return;
    busy.current = true;
    await smoothScrollToTop({ instant: reducedMotion });
    send({ type: "REQUEST_RETURN" });
    // Allow future clicks once the event has been dispatched.
    busy.current = false;
  };

  return (
    <div className="fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-30 sm:top-6">
      <ExperienceContainer>
        <button
          type="button"
          onClick={onBack}
          className="group relative flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3.5 py-2 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-foreground/90 backdrop-blur-md transition-all duration-300 ease-out hover:scale-105 hover:border-primary hover:bg-background/85 hover:text-primary hover:shadow-[0_0_24px_hsl(var(--primary)/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 sm:px-4 sm:text-xs"
        >
          <ArrowLeft
            className="h-4 w-4 transition-transform duration-300 ease-out group-hover:-translate-x-1"
            aria-hidden
          />
          <span>Ver tudo</span>
        </button>
      </ExperienceContainer>
    </div>
  );

}
