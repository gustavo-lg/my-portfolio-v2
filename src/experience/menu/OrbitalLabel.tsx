import { forwardRef } from "react";
import type { CategoryMeta } from "@/content/types";
import { categoryIcons } from "@/experience/lib/icons";

interface Props {
  meta: CategoryMeta;
  onSelect: (meta: CategoryMeta) => void;
}

/** A single orbiting category label. Positioned by a drei <Html> wrapper. */
export const OrbitalLabel = forwardRef<HTMLButtonElement, Props>(
  ({ meta, onSelect }, ref) => {
    const Icon = categoryIcons[meta.icon];
    return (
      <button
        ref={ref}
        type="button"
        data-orbital-label={meta.key}
        onClick={() => onSelect(meta)}
        style={{ opacity: 0 }}
        className="group flex items-center gap-2 whitespace-nowrap rounded-full border border-border/70 bg-background/40 px-4 py-2 text-xs uppercase tracking-[0.22em] text-foreground backdrop-blur-sm transition-colors duration-300 hover:border-primary hover:text-primary hover:shadow-[0_0_24px_hsl(var(--primary)/0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Icon className="h-4 w-4" aria-hidden />
        {meta.label}
      </button>
    );
  },
);

OrbitalLabel.displayName = "OrbitalLabel";
