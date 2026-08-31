import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { CategoryKey } from "@/content/types";
import { categoryByPath } from "@/content/categories";
import { useDocumentMeta } from "@/experience/lib/useDocumentMeta";
import { SWAP_MS } from "./pageTransition";
import { useExperience } from "@/experience/machine/useExperienceMachine";
import { CategorySection } from "./CategorySection";
import { BackButton } from "./BackButton";
import { BottomNav } from "./BottomNav";

type Layer = { key: CategoryKey; anim: "in" | "out" };

/**
 * Persistent internal-page shell. Derives the active category from the URL and
 * runs a mirrored lateral transition when it changes: the outgoing section
 * recedes to the left, shrinking and fading, while the incoming one arrives
 * from the left. Both stay mounted for the duration of the swap.
 *
 * On `returning` (the VER TUDO button) the whole area plays the same exit
 * animation before the shell unmounts it.
 */
export function ContentArea() {
  const location = useLocation();
  const { ctx } = useExperience();
  const routeKey = categoryByPath[location.pathname]?.key;

  // The route is gone the moment we navigate back to "/", so remember the last
  // category to keep rendering it while the exit animation plays.
  const lastKey = useRef<CategoryKey | undefined>(routeKey);
  if (routeKey) lastKey.current = routeKey;

  const exiting = ctx.state === "returning";
  const current = routeKey ?? (exiting ? lastKey.current : undefined);

  const [layers, setLayers] = useState<Layer[]>(
    current ? [{ key: current, anim: "in" }] : [],
  );
  const prev = useRef<CategoryKey | undefined>(current);
  const [showNav, setShowNav] = useState(false);

  useDocumentMeta(routeKey);

  useEffect(() => {
    if (!routeKey || routeKey === prev.current) return;
    const from = prev.current;
    prev.current = routeKey;

    // Keep the old section mounted (animating out) alongside the new one.
    setLayers(
      from
        ? [
            { key: from, anim: "out" },
            { key: routeKey, anim: "in" },
          ]
        : [{ key: routeKey, anim: "in" }],
    );

    const t = setTimeout(
      () => setLayers([{ key: routeKey, anim: "in" }]),
      SWAP_MS,
    );
    return () => clearTimeout(t);
  }, [routeKey]);

  useEffect(() => {
    const t = setTimeout(() => setShowNav(true), 850);
    return () => clearTimeout(t);
  }, []);

  if (!current) return null;

  // Returning to the map: everything currently on screen animates out.
  const rendered: Layer[] = exiting
    ? [{ key: current, anim: "out" }]
    : layers;

  return (
    <div className="relative z-10 min-h-screen">
      <div
        className="transition-opacity duration-700"
        style={{ opacity: exiting ? 0 : 1 }}
      >
        <BackButton />
      </div>

      {/* `perspective` makes the layers' rotateY read as a page swinging on
          its vertical axis rather than a flat horizontal squash. */}
      <div
        className="relative overflow-x-clip pb-36 pt-24"
        style={{ perspective: "1800px" }}
      >
        {rendered.map((layer) => (
          <div
            // Key by category so the outgoing node is reused (its class flips
            // from page-in to page-out, restarting the animation) rather than
            // being torn down and vanishing.
            key={layer.key}
            id={layer.anim === "in" ? "content" : undefined}
            aria-hidden={layer.anim === "out"}
            className={
              // Mirrored pivots: the incoming page swings in from the right,
              // the outgoing one swings away to the left.
              layer.anim === "in"
                ? "relative z-10 origin-[35%_30%] animate-page-in motion-reduce:animate-none"
                : "pointer-events-none absolute inset-x-0 top-24 z-20 origin-[65%_30%] animate-page-out motion-reduce:hidden"
            }
          >
            <CategorySection category={layer.key} />
          </div>
        ))}
      </div>

      <div
        className="transition-opacity duration-700"
        style={{ opacity: showNav && !exiting ? 1 : 0 }}
      >
        <BottomNav current={current} />
      </div>
    </div>
  );
}
