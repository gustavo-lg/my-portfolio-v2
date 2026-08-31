import { Link } from "react-router-dom";
import { categories } from "@/content/categories";
import { categoryIcons } from "@/experience/lib/icons";
import { isWebGLAvailable } from "@/experience/lib/webgl";
import { usePrefersReducedMotion } from "@/experience/lib/useReducedMotion";
import { useDocumentMeta } from "@/experience/lib/useDocumentMeta";
import { Wordmark } from "./Wordmark";

/**
 * The `/` route. When WebGL + motion are available the interactive category
 * labels orbit inside the canvas (see OrbitalLabels) and this nav stays as a
 * screen-reader affordance. Otherwise the nav is shown as the real menu.
 */
export function OrbitalMenu() {
  useDocumentMeta();
  const reducedMotion = usePrefersReducedMotion();
  const staticGalaxy = !isWebGLAvailable() || reducedMotion;

  return (
    <main
      id="content"
      className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-12 px-6"
    >
      <Wordmark />

      <nav
        aria-label="Categorias"
        className={
          staticGalaxy
            ? "flex flex-wrap justify-center gap-4"
            : "sr-only"
        }
      >
        {categories.map((c) => {
          const Icon = categoryIcons[c.icon];
          return (
            <Link
              key={c.key}
              to={c.path}
              className={
                staticGalaxy
                  ? "flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm uppercase tracking-[0.2em] text-foreground transition-colors hover:border-primary hover:text-primary"
                  : ""
              }
            >
              {staticGalaxy && <Icon className="h-4 w-4" aria-hidden />}
              {c.label}
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
