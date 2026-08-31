import type { CategoryMeta } from "@/content/types";
import { categoryIcons } from "@/experience/lib/icons";

interface Props {
  meta: CategoryMeta;
  index: number;
  phase: "hidden" | "in" | "out";
  onSelect: (meta: CategoryMeta) => void;
}

const HIDDEN = "translateY(14px) scale(0.85)";
const OUT = "translateY(20px) scale(0.8)";
const IN = "translateY(0) scale(1)";

/** A single orbiting category label. Positioned by a drei <Html> wrapper. */
export function OrbitalLabel({ meta, index, phase, onSelect }: Props) {
  const Icon = categoryIcons[meta.icon];
  const visible = phase === "in";

  return (
    <button
      type="button"
      data-orbital-label={meta.key}
      onClick={() => onSelect(meta)}
      style={{
        opacity: visible ? 1 : 0,
        transform: phase === "out" ? OUT : visible ? IN : HIDDEN,
        transition:
          "opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)",
        transitionDelay: phase === "in" ? `${index * 90}ms` : "0ms",
      }}
      className="group flex items-center gap-2 whitespace-nowrap rounded-full border border-border/70 bg-background/40 px-4 py-2 text-xs uppercase tracking-[0.22em] text-foreground backdrop-blur-sm hover:border-primary hover:text-primary hover:shadow-[0_0_24px_hsl(var(--primary)/0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Icon className="h-4 w-4" aria-hidden />
      {meta.label}
    </button>
  );
}
