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
          className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground backdrop-blur transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Ver tudo
        </button>
      </ExperienceContainer>
    </div>
  );
}
