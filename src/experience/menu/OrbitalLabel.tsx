import { useEffect, useState } from "react";
import type { CategoryMeta } from "@/content/types";
import { categoryIcons } from "@/experience/lib/icons";

interface Props {
  meta: CategoryMeta;
  index: number;
  phase: "hidden" | "in" | "out";
  onSelect: (meta: CategoryMeta) => void;
}

// Matches the Wordmark's entrance: same 1.6s expo-out curve, same lift.
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const DUR = "1.6s";
const BASE_DELAY = 140;
const STAGGER = 150;

/** A single orbiting category label. Positioned by its DOM wrapper. */
export function OrbitalLabel({ meta, index, phase, onSelect }: Props) {
  const Icon = categoryIcons[meta.icon];

  // Always paint one hidden frame before animating in — otherwise a label that
  // mounts after the machine already reached `menu-reveal` (positions arriving
  // late) would snap straight to its final state with no transition.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const shown = armed && phase === "in";
  const leaving = phase === "out";

  return (
    <button
      type="button"
      data-orbital-label={meta.key}
      onClick={() => onSelect(meta)}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown
          ? "translateY(0) scale(1)"
          : leaving
            ? "translateY(-14px) scale(0.9)"
            : "translateY(20px) scale(0.96)",
        transition:
          `opacity ${DUR} ${EASE}, transform ${DUR} ${EASE}, ` +
          "color 0.35s ease, border-color 0.35s ease, background-color 0.35s ease, box-shadow 0.35s ease",
        transitionDelay: shown ? `${BASE_DELAY + index * STAGGER}ms` : "0ms",
        willChange: "transform, opacity",
      }}
      className="group relative flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/12 bg-background/40 px-3.5 py-2 text-[0.7rem] font-medium uppercase tracking-[0.24em] text-foreground/85 shadow-[0_1px_20px_-4px_hsl(var(--galaxy-bg))] backdrop-blur-md transition-all duration-300 ease-out hover:border-primary/90 hover:bg-background/70 hover:text-primary hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 active:scale-95 touch-manipulation sm:gap-2.5 sm:px-5 sm:py-2.5"
    >
      <Icon
        className="h-3.5 w-3.5 text-foreground/55 transition-all duration-300 group-hover:scale-110 group-hover:text-primary group-hover:drop-shadow-[0_0_8px_hsl(var(--primary)/0.85)]"
        aria-hidden
      />
      <span>{meta.label}</span>
    </button>
  );
}
