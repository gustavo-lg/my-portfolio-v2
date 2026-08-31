import { useEffect, useRef } from "react";
import { Html } from "@react-three/drei";
import gsap from "gsap";
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

/**
 * Rendered INSIDE the Canvas. Each label is a drei <Html> anchored to a fixed
 * 3D point; drei handles the 3D->2D projection every frame. Labels stagger in
 * once the machine reaches `menu-reveal`, then MENU_REVEALED is dispatched.
 */
export function OrbitalLabels({ reducedMotion }: { reducedMotion: boolean }) {
  const { ctx, send } = useExperience();
  const navigate = useNavigate();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const revealed = useRef(false);

  const onSelect = (meta: CategoryMeta) => {
    send({ type: "SELECT_CATEGORY", key: meta.key });
    // Phase 3: direct navigation. Cursor-travel choreography arrives in Phase 4.
    navigate(meta.path);
  };

  // Collapse (scale/translate/fade down) as the second beat of the navigate
  // choreography.
  useEffect(() => {
    if (ctx.state !== "navigating") return;
    const els = buttons.current.filter(Boolean) as HTMLButtonElement[];
    if (!els.length) return;
    if (reducedMotion) {
      els.forEach((el) => (el.style.opacity = "0"));
      return;
    }
    const tween = gsap.to(els, {
      opacity: 0,
      y: 18,
      scale: 0.8,
      duration: 0.32,
      stagger: 0.05,
      ease: "power2.in",
    });
    return () => {
      tween.kill();
    };
  }, [ctx.state, reducedMotion]);

  useEffect(() => {
    const ready = ctx.state === "menu-reveal" || ctx.state === "idle";
    if (revealed.current || !ready) return;
    revealed.current = true;

    const els = buttons.current.filter(Boolean) as HTMLButtonElement[];
    const finish = () => {
      if (ctx.state === "menu-reveal") send({ type: "MENU_REVEALED" });
    };

    if (reducedMotion) {
      els.forEach((el) => {
        el.style.opacity = "1";
      });
      finish();
      return;
    }

    const tween = gsap.fromTo(
      els,
      { opacity: 0, y: 14, scale: 0.85 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.5,
        stagger: 0.09,
        ease: "back.out(1.6)",
        onComplete: finish,
      },
    );
    return () => {
      tween.kill();
    };
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
            onSelect={onSelect}
            ref={(el) => {
              buttons.current[i] = el;
            }}
          />
        </Html>
      ))}
    </>
  );
}
