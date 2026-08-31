import { useNavigate } from "react-router-dom";
import type { CategoryKey } from "@/content/types";
import { categories } from "@/content/categories";
import { categoryIcons } from "@/experience/lib/icons";
import { useExperience } from "@/experience/machine/useExperienceMachine";

/** Fixed bottom bar linking to the other three categories. */
export function BottomNav({ current }: { current: CategoryKey }) {
  const navigate = useNavigate();
  const { send } = useExperience();
  const others = categories.filter((c) => c.key !== current);

  return (
    <nav
      aria-label="Outras categorias"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center gap-2 border-t border-border bg-background/80 px-4 py-3 backdrop-blur"
    >
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
            className="flex items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Icon className="h-4 w-4" aria-hidden />
            {c.label}
          </button>
        );
      })}
    </nav>
  );
}
