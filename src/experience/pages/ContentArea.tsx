import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { CategoryKey } from "@/content/types";
import { categoryByPath } from "@/content/categories";
import { useDocumentMeta } from "@/experience/lib/useDocumentMeta";
import { CategorySection } from "./CategorySection";
import { BackButton } from "./BackButton";
import { BottomNav } from "./BottomNav";

type Layer = { key: CategoryKey; anim: "in" | "out" };

const SWAP_MS = 740;

/**
 * Persistent internal-page shell. Derives the active category from the URL and
 * runs a simultaneous lateral zoom transition when it changes: the outgoing
 * section zooms out and slides right while the incoming one zooms in from the
 * left. Both stay mounted for the duration of the swap.
 */
export function ContentArea() {
  const location = useLocation();
  const current = categoryByPath[location.pathname]?.key;

  const [layers, setLayers] = useState<Layer[]>(
    current ? [{ key: current, anim: "in" }] : [],
  );
  const prev = useRef<CategoryKey | undefined>(current);
  const [showNav, setShowNav] = useState(false);

  useDocumentMeta(current);

  useEffect(() => {
    if (!current || current === prev.current) return;
    const from = prev.current;
    prev.current = current;

    // Keep the old section mounted (animating out) alongside the new one.
    setLayers(
      from
        ? [
            { key: from, anim: "out" },
            { key: current, anim: "in" },
          ]
        : [{ key: current, anim: "in" }],
    );

    const t = setTimeout(
      () => setLayers([{ key: current, anim: "in" }]),
      SWAP_MS,
    );
    return () => clearTimeout(t);
  }, [current]);

  useEffect(() => {
    const t = setTimeout(() => setShowNav(true), 500);
    return () => clearTimeout(t);
  }, []);

  if (!current) return null;

  return (
    <div className="relative z-10 min-h-screen">
      <BackButton />

      <div className="relative overflow-x-clip pb-28 pt-24">
        {layers.map((layer) => (
          <div
            // Key by category so the outgoing node is reused (its class flips
            // from page-in to page-out, restarting the animation) rather than
            // being torn down and vanishing.
            key={layer.key}
            id={layer.anim === "in" ? "content" : undefined}
            aria-hidden={layer.anim === "out"}
            className={
              layer.anim === "in"
                ? "relative origin-[50%_18%] animate-page-in motion-reduce:animate-none"
                : "pointer-events-none absolute inset-x-0 top-24 origin-[50%_18%] animate-page-out motion-reduce:hidden"
            }
          >
            <CategorySection category={layer.key} />
          </div>
        ))}
      </div>

      <div
        className="transition-opacity duration-500"
        style={{ opacity: showNav ? 1 : 0 }}
      >
        <BottomNav current={current} />
      </div>
    </div>
  );
}
