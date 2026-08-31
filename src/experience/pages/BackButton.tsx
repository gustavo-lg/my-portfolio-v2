import { ArrowLeft } from "lucide-react";
import { useExperience } from "@/experience/machine/useExperienceMachine";

/** Fixed "VER TUDO" control on every internal page. */
export function BackButton() {
  const { send } = useExperience();
  return (
    <button
      type="button"
      onClick={() => send({ type: "REQUEST_RETURN" })}
      className="fixed left-4 top-4 z-30 flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground backdrop-blur transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Ver tudo
    </button>
  );
}
