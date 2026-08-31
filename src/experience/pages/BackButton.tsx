import { ArrowLeft } from "lucide-react";
import { useExperience } from "@/experience/machine/useExperienceMachine";
import { ExperienceContainer } from "@/experience/layout/ExperienceContainer";

/** Fixed "VER TUDO" control, aligned to the content container's left edge. */
export function BackButton() {
  const { send } = useExperience();
  return (
    <div className="fixed inset-x-0 top-6 z-30">
      <ExperienceContainer>
        <button
          type="button"
          onClick={() => send({ type: "REQUEST_RETURN" })}
          className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground backdrop-blur transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Ver tudo
        </button>
      </ExperienceContainer>
    </div>
  );
}
