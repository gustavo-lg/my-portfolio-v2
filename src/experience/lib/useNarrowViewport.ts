import { useEffect, useState } from "react";
import { NARROW_VIEWPORT_MAX_WIDTH } from "@/experience/galaxy/responsiveFraming";

const QUERY = `(max-width: ${NARROW_VIEWPORT_MAX_WIDTH - 1}px)`;

/**
 * True below NARROW_VIEWPORT_MAX_WIDTH (phones, not tablets — same
 * breakpoint as Tailwind's `sm`). Used outside the R3F <Canvas> tree, where
 * `useThree`'s reactive size isn't reachable: GalaxyCanvas.tsx's geometry
 * `useMemo` runs in the parent component, not inside <Canvas>. Inside the
 * canvas (GalaxyCamera.tsx), the same threshold is read directly off
 * `useThree((s) => s.size).width` instead of duplicating this hook.
 *
 * Was `useMobile()` in OrbitalLabels.tsx, deleted when the label pull-to-
 * centre hack it fed became unnecessary. Revived here, generalized, because
 * the narrow-viewport signal is needed again for a different, unrelated
 * purpose: shrinking the home galaxy's disk and widening its camera fit.
 */
export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const onChange = () => setNarrow(mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  return narrow;
}
