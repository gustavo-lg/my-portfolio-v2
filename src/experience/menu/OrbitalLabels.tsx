import { useEffect, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import type { CategoryMeta } from "@/content/types";
import { categories } from "@/content/categories";
import { ORBITAL_ANCHORS, ORBITAL_ORDER } from "@/experience/galaxy/orbitalAnchors";
import { useExperience } from "@/experience/machine/useExperienceMachine";
import { OrbitalLabel } from "./OrbitalLabel";

const metaByKey = Object.fromEntries(categories.map((c) => [c.key, c])) as Record<
  CategoryMeta["key"],
  CategoryMeta
>;

const REVEAL_TOTAL_MS = 500 + ORBITAL_ORDER.length * 90;

/**
 * Rendered INSIDE the Canvas. Each label is a drei <Html> anchored to a fixed
 * 3D point; drei handles the 3D->2D projection every frame. Reveal/collapse is
 * pure CSS (staggered transition-delay) so it survives drei's portal.
 */
export function OrbitalLabels({ reducedMotion }: { reducedMotion: boolean }) {
  const { ctx, send } = useExperience();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"hidden" | "in" | "out">("hidden");
  const revealed = useRef(false);

  const onSelect = (meta: CategoryMeta) => {
    send({ type: "SELECT_CATEGORY", key: meta.key });
    // Phase 3: direct navigation. Cursor-travel choreography arrives in Phase 4.
    navigate(meta.path);
  };

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
        reducedMotion ? 0 : REVEAL_TOTAL_MS,
      );
      return () => clearTimeout(t);
    }
  }, [ctx.state, reducedMotion, send]);

  return (
    <>
      {ORBITAL_ORDER.map((key, i) => (
        <Html
          key={key}
          position={ORBITAL_ANCHORS[key]}
          center
          zIndexRange={[20, 10]}
        >
          <OrbitalLabel
            meta={metaByKey[key]}
            index={i}
            phase={phase}
            onSelect={onSelect}
          />
        </Html>
      ))}
    </>
  );
}
