import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { CategoryKey } from "@/content/types";
import { categories } from "@/content/categories";
import { categoryIcons } from "@/experience/lib/icons";
import { useExperience } from "@/experience/machine/useExperienceMachine";
import { usePrefersReducedMotion } from "@/experience/lib/useReducedMotion";
import { smoothScrollToTop } from "@/experience/lib/smoothScrollToTop";
import { ExperienceContainer } from "@/experience/layout/ExperienceContainer";
import { SWAP_MS } from "./pageTransition";

/**
 * Floating pills for the other three categories. No bar or backdrop — the
 * galaxy shows straight through, so the strip itself ignores the pointer and
 * only the pills are clickable.
 */
export function BottomNav({ current }: { current: CategoryKey }) {
  const navigate = useNavigate();
  const { send } = useExperience();
  const reducedMotion = usePrefersReducedMotion();
  const busy = useRef(false);
  const others = categories.filter((c) => c.key !== current);

  const goTo = async (key: CategoryKey, path: string) => {
    if (busy.current) return;
    busy.current = true;
    // Take the reader back to the top before the section swaps.
    await smoothScrollToTop({ instant: reducedMotion });
    send({ type: "SWITCH_CATEGORY", key });
    navigate(path);
    window.setTimeout(() => {
      busy.current = false;
    }, SWAP_MS);
  };

  return (
    <nav
      aria-label="Outras categorias"
      className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 sm:bottom-8"
    >
      <ExperienceContainer className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {others.map((c) => {
          const Icon = categoryIcons[c.icon];
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => goTo(c.key, c.path)}
              className="group pointer-events-auto relative flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-border/70 bg-background/50 px-3 py-2 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-md transition-all duration-300 ease-out hover:scale-105 hover:border-primary hover:bg-background/80 hover:text-primary hover:shadow-[0_0_24px_hsl(var(--primary)/0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 sm:gap-2 sm:px-4 sm:text-xs"
            >
              <Icon
                className="h-4 w-4 text-muted-foreground transition-transform duration-300 ease-out group-hover:scale-110 group-hover:text-primary"
                aria-hidden
              />
              <span>{c.label}</span>
            </button>
          );
        })}
      </ExperienceContainer>

    </nav>
  );
}
