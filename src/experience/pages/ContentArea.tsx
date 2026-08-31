import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { CategoryKey } from "@/content/types";
import { categoryByPath } from "@/content/categories";
import { useDocumentMeta } from "@/experience/lib/useDocumentMeta";
import { CategorySection } from "./CategorySection";
import { BackButton } from "./BackButton";
import { BottomNav } from "./BottomNav";

type Layer = { key: CategoryKey; anim: "in" | "out"; id: number };

const SWAP_MS = 560;

/**
 * Persistent internal-page shell. Derives the active category from the URL and
 * runs a simultaneous lateral zoom transition when it changes: the outgoing
 * section zooms out and slides right while the incoming one zooms in from the
 * left.
 */
export function ContentArea() {
  const location = useLocation();
  const current = categoryByPath[location.pathname]?.key;

  const [layers, setLayers] = useState<Layer[]>(
    current ? [{ key: current, anim: "in", id: 0 }] : [],
  );
  const prev = useRef<CategoryKey | undefined>(current);
  const nextId = useRef(1);
  const [showNav, setShowNav] = useState(false);

  useDocumentMeta(current);

  useEffect(() => {
    if (!current || current === prev.current) return;
    const from = prev.current;
    prev.current = current;

    const incoming: Layer = { key: current, anim: "in", id: nextId.current++ };
    setLayers(
      from
        ? [{ key: from, anim: "out", id: nextId.current++ }, incoming]
        : [incoming],
    );

    const t = setTimeout(
      () => setLayers([{ ...incoming, anim: "in" }]),
      SWAP_MS,
    );
    return () => clearTimeout(t);
  }, [current]);

  useEffect(() => {
    const t = setTimeout(() => setShowNav(true), 450);
    return () => clearTimeout(t);
  }, []);

  if (!current) return null;

  return (
    <div className="relative z-10 min-h-screen">
      <BackButton />

      <div className="relative overflow-x-clip pb-28 pt-24">
        {layers.map((layer) => (
          <div
            key={layer.id}
            id={layer.anim === "in" ? "content" : undefined}
            aria-hidden={layer.anim === "out"}
            className={
              layer.anim === "in"
                ? "relative origin-[50%_20%] animate-page-in motion-reduce:animate-none"
                : "pointer-events-none absolute inset-x-0 top-24 origin-[50%_20%] animate-page-out motion-reduce:hidden"
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
