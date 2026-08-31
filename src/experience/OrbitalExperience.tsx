import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { categories, categoryByPath } from "@/content/categories";
import { useExperience } from "@/experience/machine/useExperienceMachine";
import { useDeviceCapabilities } from "@/experience/lib/useDeviceCapabilities";
import { GalaxyCameraProvider, useGalaxyCamera } from "@/experience/galaxy/GalaxyCamera";
import { CursorProvider, useCursor } from "@/experience/cursor/CustomCursor";
import { ExperienceOverlay } from "@/experience/overlay/ExperienceOverlay";
import { GalaxyBackdrop } from "@/experience/galaxy/GalaxyBackdrop";
import { isWebGLAvailable } from "@/experience/lib/webgl";
import { OrbitalMenu } from "@/experience/menu/OrbitalMenu";
import { ContentPage } from "@/experience/pages/ContentPage";
import NotFound from "@/pages/NotFound";

const GalaxyCanvas = lazy(() => import("@/experience/galaxy/GalaxyCanvas"));

const SETTLE_MS = 700;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function anchorScreenPoint(key: string) {
  const el = document.querySelector(`[data-orbital-label="${key}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * Persistent shell. Hosts the WebGL canvas (above <Routes>, never unmounts),
 * the custom cursor, the overlay, and the choreography orchestrator that
 * sequences GSAP / camera / router off the state machine.
 */
function ExperienceShell() {
  const { ctx, send } = useExperience();
  const { reducedMotion } = useDeviceCapabilities();
  const camera = useGalaxyCamera();
  const cursor = useCursor();
  const location = useLocation();
  const navigate = useNavigate();

  const bootstrapped = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();
  const webgl = useMemo(() => isWebGLAvailable(), []);
  const staticGalaxy = !webgl || reducedMotion;

  const entryMeta = categoryByPath[location.pathname];
  const startAtInternal = Boolean(entryMeta);

  // Bootstrap the machine once from the entry URL.
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    if (entryMeta) {
      send({ type: "DEEP_LINK", key: entryMeta.key });
    } else if (staticGalaxy && location.pathname === "/") {
      send({ type: "SKIP_INTRO" });
      send({ type: "MENU_REVEALED" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the machine target aligned when the URL changes by means other than
  // the choreography (manual URL edit, browser back/forward).
  useEffect(() => {
    const meta = categoryByPath[location.pathname];
    if (meta && ctx.state === "internal-page" && ctx.target !== meta.key) {
      send({ type: "SWITCH_CATEGORY", key: meta.key });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Choreography orchestrator.
  useEffect(() => {
    let cancelled = false;

    if (ctx.state === "traveling" && ctx.target) {
      const point = anchorScreenPoint(ctx.target);
      if (cursor.enabled && !reducedMotion && point) {
        cursor.travelTo(point).then(() => {
          if (!cancelled) send({ type: "CURSOR_ARRIVED" });
        });
      } else {
        send({ type: "CURSOR_ARRIVED" });
      }
    }

    if (ctx.state === "navigating" && ctx.target) {
      const meta = categories.find((c) => c.key === ctx.target)!;
      (async () => {
        if (!reducedMotion) {
          await wait(260); // overlay fade-out (CSS)
          if (cancelled) return;
          await wait(340); // labels collapse (OrbitalLabels)
          if (cancelled) return;
        }
        await camera.focusSide({ instant: reducedMotion });
        if (cancelled) return;
        navigate(meta.path);
        send({ type: "TRANSITION_COMPLETE" });
      })();
    }

    if (ctx.state === "returning") {
      (async () => {
        await camera.focusCenter({ instant: reducedMotion });
        if (cancelled) return;
        navigate("/");
        send({ type: "RETURN_COMPLETE" });
      })();
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.state, ctx.target]);

  const handleFormed = useCallback(() => {
    send({ type: "FORM_COMPLETE" });
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      send({ type: "SETTLE_COMPLETE" });
    }, SETTLE_MS);
  }, [send]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const idleMotion = ctx.state !== "intro-forming";
  const menuActive =
    location.pathname === "/" &&
    (ctx.state === "menu-reveal" ||
      ctx.state === "idle" ||
      ctx.state === "traveling" ||
      ctx.state === "navigating");

  return (
    <div className="relative min-h-screen bg-galaxy-bg text-foreground">
      <a
        href="#content"
        className="sr-only z-[200] rounded bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>

      {staticGalaxy ? (
        <GalaxyBackdrop />
      ) : (
        <Suspense fallback={<GalaxyBackdrop pulse />}>
          <GalaxyCanvas
            idle={idleMotion}
            menuActive={menuActive}
            initialFraming={startAtInternal ? "side" : "center"}
            onFormed={handleFormed}
          />
        </Suspense>
      )}

      <ExperienceOverlay state={ctx.state} />

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
  );
}

export function OrbitalExperience() {
  const { tier } = useDeviceCapabilities();
  const enabledCursor = useMemo(() => tier.customCursor, [tier.customCursor]);

  return (
    <GalaxyCameraProvider>
      <CursorProvider enabled={enabledCursor}>
        <ExperienceShell />
      </CursorProvider>
    </GalaxyCameraProvider>
  );
}
