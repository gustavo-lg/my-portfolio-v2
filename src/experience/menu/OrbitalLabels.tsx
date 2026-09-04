import { useEffect, useRef, useState } from "react";
import type { CategoryMeta } from "@/content/types";
import { categories } from "@/content/categories";
import { ORBITAL_ORDER } from "@/experience/galaxy/orbitalAnchors";
import type { AnchorScreenPositions } from "@/experience/galaxy/useAnchorProjection";
import { useExperience } from "@/experience/machine/useExperienceMachine";
import { OrbitalLabel } from "./OrbitalLabel";

const metaByKey = Object.fromEntries(categories.map((c) => [c.key, c])) as Record<
  CategoryMeta["key"],
  CategoryMeta
>;

// Matches OrbitalLabel: 140ms base + 150ms stagger + 1600ms transition.
const REVEAL_TOTAL_MS = 140 + ORBITAL_ORDER.length * 150 + 1600;

/**
 * Plain DOM, rendered as a sibling of <Routes> (above the page `<main>`).
 * Positions come from the in-canvas AnchorProjector; reveal/collapse is a
 * staggered CSS transition driven by the machine state.
 */
export function OrbitalLabels({
  positions,
  onSelect,
}: {
  positions: AnchorScreenPositions | null;
  onSelect: (meta: CategoryMeta) => void;
}) {
  const { ctx, send } = useExperience();
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");
  const revealed = useRef(false);

  useEffect(() => {
    if (ctx.state === "navigating") {
      setPhase("out");
      return;
    }
    const ready = ctx.state === "menu-reveal" || ctx.state === "idle";
    if (!ready || revealed.current) return;
    revealed.current = true;
    setPhase("in");
    if (ctx.state === "menu-reveal") {
      const t = setTimeout(
        () => send({ type: "MENU_REVEALED" }),
        REVEAL_TOTAL_MS,
      );
      return () => clearTimeout(t);
    }
  }, [ctx.state, send]);

  if (!positions) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 [--label-clamp-x:16%] [--label-clamp-y:12%] sm:[--label-clamp-x:6%] sm:[--label-clamp-y:5%]">
      {ORBITAL_ORDER.map((key, i) => {
        const pos = positions[key];
        return (
          <div
            key={key}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `clamp(var(--label-clamp-x), ${pos.xPct}%, calc(100% - var(--label-clamp-x)))`,
              top: `clamp(var(--label-clamp-y), ${pos.yPct}%, calc(100% - var(--label-clamp-y)))`,
            }}
          >
            <OrbitalLabel
              meta={metaByKey[key]}
              index={i}
              phase={phase}
              onSelect={onSelect}
            />
          </div>
        );
      })}
    </div>
  );
}
