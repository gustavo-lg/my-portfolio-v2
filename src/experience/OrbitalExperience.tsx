import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  useState,
} from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import type { CategoryMeta } from "@/content/types";
import { categories, categoryByPath } from "@/content/categories";
import { useExperience } from "@/experience/machine/useExperienceMachine";
import { useDeviceCapabilities } from "@/experience/lib/useDeviceCapabilities";
import { GalaxyCameraProvider, useGalaxyCamera } from "@/experience/galaxy/GalaxyCamera";
import { SCENES, type SceneKey } from "@/experience/galaxy/categoryScenes";
import type { AnchorScreenPositions } from "@/experience/galaxy/useAnchorProjection";
import { CursorProvider, useCursor } from "@/experience/cursor/CustomCursor";
import { ExperienceOverlay } from "@/experience/overlay/ExperienceOverlay";
import { GalaxyBackdrop } from "@/experience/galaxy/GalaxyBackdrop";
import { isWebGLAvailable } from "@/experience/lib/webgl";
import { OrbitalMenu } from "@/experience/menu/OrbitalMenu";
import { OrbitalLabels } from "@/experience/menu/OrbitalLabels";
import { ContentArea } from "@/experience/pages/ContentArea";
import { SWAP_MS } from "@/experience/pages/pageTransition";
import NotFound from "@/pages/NotFound";

const GalaxyCanvas = lazy(() => import("@/experience/galaxy/GalaxyCanvas"));

const SETTLE_MS = 1200;
/** Phase-1 camera flight from home up to the target galaxy, before it deforms. */
const APPROACH_MS = 1650;
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
  const [anchors, setAnchors] = useState<AnchorScreenPositions | null>(null);
  const [pageOverlay, setPageOverlay] = useState(false);
  const handleAnchors = useCallback(
    (p: AnchorScreenPositions) => setAnchors(p),
    [],
  );
  const handleSelectLabel = useCallback(
    (meta: CategoryMeta) => send({ type: "SELECT_CATEGORY", key: meta.key }),
    [send],
  );
  const webgl = useMemo(() => isWebGLAvailable(), []);
  const staticGalaxy = !webgl || reducedMotion;

  const entryMeta = categoryByPath[location.pathname];

  const initialScene: SceneKey = entryMeta ? entryMeta.key : "menu";
  const [activeScene, setActiveScene] = useState<SceneKey>(initialScene);
  const activeSceneRef = useRef<SceneKey>(initialScene);

  const goToScene = useCallback(
    (key: SceneKey) => {
      activeSceneRef.current = key;
      setActiveScene(key);
      return camera.flyTo(SCENES[key].framing, {
        duration: reducedMotion ? 0 : SCENES[key].transition.camera.duration,
        ease: SCENES[key].transition.camera.ease,
        instant: reducedMotion,
      });
    },
    [camera, reducedMotion],
  );

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
      const target = ctx.target;
      const meta = categories.find((c) => c.key === target)!;
      const scene = SCENES[target];
      (async () => {
        if (!reducedMotion) {
          await wait(400); // overlay fade + labels collapse (both CSS)
          if (cancelled) return;
        }
        // Phase 1 — fly the camera up to the target galaxy while the particles
        // stay in the home layout, so the clicked galaxy reads as something we
        // approach rather than something that rushes to the centre.
        await camera.flyTo(scene.approach ?? scene.framing, {
          duration: reducedMotion ? 0 : APPROACH_MS,
          // inOut, not out: phase 1 must NOT decelerate to a stop before the
          // hand-off — phase 2 (power2.out) picks the motion straight up.
          ease: "power2.inOut",
          instant: reducedMotion,
        });
        if (cancelled) return;
        // Phase 2 — swap the active scene: only the focused mini galaxy's slice
        // of the buffer changes, so just that galaxy deforms in place while the
        // camera finishes its push-in. Both use power2.out so nothing stalls at
        // the phase-1 -> phase-2 hand-off.
        activeSceneRef.current = target;
        setActiveScene(target);
        await camera.flyTo(scene.framing, {
          duration: reducedMotion ? 0 : scene.transition.camera.duration,
          ease: scene.transition.camera.ease,
          instant: reducedMotion,
        });
        if (cancelled) return;
        // Small beat so the deform is well underway before the page content
        // swings in over it.
        if (!reducedMotion) await wait(450);
        if (cancelled) return;
        navigate(meta.path);
        send({ type: "TRANSITION_COMPLETE" });
      })();
    }

    if (ctx.state === "returning") {
      (async () => {
        // Start the camera pull-out + shape morph, then navigate WHILE they
        // run. Unmounting ContentArea (nine cards + subviews) is a heavy React
        // commit; dispatching RETURN_COMPLETE after the page-out finishes
        // (t≈1150ms) lets it land mid-flight while the camera moves at high
        // speed, leaving the 2200ms settling frame completely clean.
        goToScene("menu");
        if (!reducedMotion) await wait(600);
        if (cancelled) return;
        navigate("/");
        if (!reducedMotion) await wait(SWAP_MS - 600);
        if (cancelled) return;
        send({ type: "RETURN_COMPLETE" });
      })();
    }

    if (
      ctx.state === "internal-page" &&
      ctx.target &&
      ctx.target !== activeSceneRef.current
    ) {
      goToScene(ctx.target);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.state, ctx.target, goToScene]);

  // The dimming overlay comes back only once the incoming page has finished
  // its swing-in, and drops again the moment another swap starts.
  useEffect(() => {
    if (ctx.state !== "internal-page") {
      setPageOverlay(false);
      return;
    }
    setPageOverlay(false);
    const t = window.setTimeout(
      () => setPageOverlay(true),
      reducedMotion ? 0 : SWAP_MS + 300,
    );
    return () => window.clearTimeout(t);
  }, [ctx.state, ctx.target, reducedMotion]);

  const handleFormed = useCallback(() => {
    send({ type: "FORM_COMPLETE" });
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      send({ type: "SETTLE_COMPLETE" });
    }, SETTLE_MS);
  }, [send]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const idleMotion = ctx.state !== "intro-forming";
  // Overlay is on only when something is meant to be read over the galaxy:
  // the settled menu, or a content page that has finished swinging in. It
  // stays off through every transition AND the return-to-home choreography so
  // the particle motion is never hidden.
  const overlayVisible =
    ctx.state === "menu-reveal" || ctx.state === "idle" || pageOverlay;
  const onCategoryPath = Boolean(entryMeta);
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
            activeScene={activeScene}
            onFormed={handleFormed}
            onAnchors={menuActive && !staticGalaxy ? handleAnchors : undefined}
          />
        </Suspense>
      )}

      <ExperienceOverlay visible={overlayVisible} />

      {menuActive && !staticGalaxy && (
        <OrbitalLabels positions={anchors} onSelect={handleSelectLabel} />
      )}

      {/* Persistent across category switches so the lateral transition can keep
          the outgoing section mounted while the new one enters. Also kept alive
          through `returning` so VER TUDO gets the same exit animation. */}
      {(onCategoryPath || ctx.state === "returning") && <ContentArea />}

      <Routes>
        <Route path="/" element={<OrbitalMenu />} />
        {categories.map((c) => (
          <Route key={c.key} path={c.path} element={null} />
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
