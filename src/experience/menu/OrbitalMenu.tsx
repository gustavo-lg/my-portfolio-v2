import { Link } from "react-router-dom";
import { categories } from "@/content/categories";
import { categoryIcons } from "@/experience/lib/icons";
import { isWebGLAvailable } from "@/experience/lib/webgl";
import { usePrefersReducedMotion } from "@/experience/lib/useReducedMotion";
import { useDocumentMeta } from "@/experience/lib/useDocumentMeta";
import { ExperienceContainer } from "@/experience/layout/ExperienceContainer";
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
      className="relative z-10 flex min-h-screen flex-col items-center justify-end pb-[11vh]"
    >
      <ExperienceContainer className="flex flex-col items-center gap-12">
        <Wordmark />

        <nav
          aria-label="Categorias"
          className={
            staticGalaxy ? "flex flex-wrap justify-center gap-4" : "sr-only"
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
                  ? "group flex items-center gap-2.5 rounded-full border border-border/80 bg-background/50 px-5 py-2.5 text-sm font-medium uppercase tracking-[0.2em] text-foreground/90 backdrop-blur-md transition-all duration-300 ease-out hover:scale-105 hover:border-primary hover:bg-background/80 hover:text-primary hover:shadow-[0_0_24px_hsl(var(--primary)/0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                  : ""
              }
            >
              {staticGalaxy && (
                <Icon
                  className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:scale-110 group-hover:text-primary"
                  aria-hidden
                />
              )}
              <span>{c.label}</span>
            </Link>
          );
        })}

        </nav>
      </ExperienceContainer>
    </main>
  );
}
