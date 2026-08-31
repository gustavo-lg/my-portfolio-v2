import { useRef } from "react";
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

  const onBack = async () => {
    if (busy.current) return;
    busy.current = true;
    await smoothScrollToTop({ instant: reducedMotion });
    send({ type: "REQUEST_RETURN" });
  };

  return (
    <div className="fixed inset-x-0 top-6 z-30">
      <ExperienceContainer>
        <button
          type="button"
          onClick={onBack}
          className="group relative flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-foreground/90 backdrop-blur-md transition-all duration-300 ease-out hover:scale-105 hover:border-primary hover:bg-background/85 hover:text-primary hover:shadow-[0_0_24px_hsl(var(--primary)/0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
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
