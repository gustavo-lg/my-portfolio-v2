import { Suspense, lazy, useCallback, useEffect, useRef } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { categories, categoryByPath } from "@/content/categories";
import { useExperience } from "@/experience/machine/useExperienceMachine";
import { useDeviceCapabilities } from "@/experience/lib/useDeviceCapabilities";
import { GalaxyCameraProvider } from "@/experience/galaxy/GalaxyCamera";
import { OrbitalMenu } from "@/experience/menu/OrbitalMenu";
import { ContentPage } from "@/experience/pages/ContentPage";
import NotFound from "@/pages/NotFound";

const GalaxyCanvas = lazy(() => import("@/experience/galaxy/GalaxyCanvas"));

const SETTLE_MS = 700;

/**
 * Persistent shell. The WebGL canvas lives here, above <Routes>, so it never
 * unmounts on navigation. The experience state machine drives the intro
 * sequence and (from Phase 4) the navigation choreography.
 */
export function OrbitalExperience() {
  const { ctx, send } = useExperience();
  const { reducedMotion } = useDeviceCapabilities();
  const location = useLocation();
  const bootstrapped = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();

  const entryMeta = categoryByPath[location.pathname];
  const startAtInternal = Boolean(entryMeta);

  // Bootstrap the machine once from the entry URL.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    if (entryMeta) {
      send({ type: "DEEP_LINK", key: entryMeta.key });
    } else if (reducedMotion && location.pathname === "/") {
      send({ type: "SKIP_INTRO" });
      send({ type: "MENU_REVEALED" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Plain <Link> navigation between pages (choreography arrives in Phase 4).
  useEffect(() => {
    const meta = categoryByPath[location.pathname];
    if (meta && ctx.state === "internal-page" && ctx.target !== meta.key) {
      send({ type: "SWITCH_CATEGORY", key: meta.key });
    }
    if (!meta && location.pathname === "/" && ctx.state === "internal-page") {
      send({ type: "REQUEST_RETURN" });
      send({ type: "RETURN_COMPLETE" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleFormed = useCallback(() => {
    send({ type: "FORM_COMPLETE" });
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      send({ type: "SETTLE_COMPLETE" });
      send({ type: "MENU_REVEALED" });
    }, SETTLE_MS);
  }, [send]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const idleMotion = ctx.state !== "intro-forming";

  return (
    <GalaxyCameraProvider>
      <div className="relative min-h-screen bg-galaxy-bg text-foreground">
        <Suspense fallback={null}>
          <GalaxyCanvas
            idle={idleMotion}
            initialFraming={startAtInternal ? "side" : "center"}
            onFormed={handleFormed}
          />
        </Suspense>

        <Routes>
          <Route path="/" element={<OrbitalMenu />} />
          {categories.map((c) => (
            <Route
              key={c.key}
              path={c.path}
              element={<ContentPage category={c.key} />}
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </GalaxyCameraProvider>
  );
}
