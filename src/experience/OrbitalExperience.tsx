import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { categories, categoryByPath } from "@/content/categories";
import { useExperience } from "@/experience/machine/useExperienceMachine";
import { OrbitalMenu } from "@/experience/menu/OrbitalMenu";
import { ContentPage } from "@/experience/pages/ContentPage";
import NotFound from "@/pages/NotFound";

/**
 * Persistent shell for the orbital experience. The (future) WebGL canvas will
 * live here, above <Routes>, so it never unmounts on navigation.
 *
 * Phase 0: no canvas yet. On `/` we shortcut the intro so the DOM menu shows;
 * on an internal route we bootstrap straight to `internal-page` via DEEP_LINK.
 */
export function OrbitalExperience() {
  const { ctx, send } = useExperience();
  const location = useLocation();

  // Bootstrap the machine once from the entry URL.
  useEffect(() => {
    const meta = categoryByPath[location.pathname];
    if (meta) {
      send({ type: "DEEP_LINK", key: meta.key });
    } else if (location.pathname === "/") {
      send({ type: "SKIP_INTRO" });
      send({ type: "MENU_REVEALED" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the machine target in sync when navigating between internal pages
  // via plain <Link> (choreography arrives in Phase 4).
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

  return (
    <div className="relative min-h-screen bg-galaxy-bg text-foreground">
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
