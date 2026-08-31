import { useNavigate } from "react-router-dom";
import type { CategoryKey } from "@/content/types";
import { categories } from "@/content/categories";
import { categoryIcons } from "@/experience/lib/icons";
import { useExperience } from "@/experience/machine/useExperienceMachine";
import { ExperienceContainer } from "@/experience/layout/ExperienceContainer";

/**
 * Floating pills for the other three categories. No bar or backdrop — the
 * galaxy shows straight through, so the strip itself ignores the pointer and
 * only the pills are clickable.
 */
export function BottomNav({ current }: { current: CategoryKey }) {
  const navigate = useNavigate();
  const { send } = useExperience();
  const others = categories.filter((c) => c.key !== current);

  return (
    <nav
      aria-label="Outras categorias"
      className="pointer-events-none fixed inset-x-0 bottom-8 z-30"
    >
      <ExperienceContainer className="flex justify-center gap-3">
        {others.map((c) => {
          const Icon = categoryIcons[c.icon];
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                send({ type: "SWITCH_CATEGORY", key: c.key });
                navigate(c.path);
              }}
              style={{
                transition:
                  "color 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease",
              }}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-border/70 bg-background/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-sm hover:border-primary hover:text-primary hover:shadow-[0_0_24px_hsl(var(--primary)/0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {c.label}
            </button>
          );
        })}
      </ExperienceContainer>
    </nav>
  );
}
