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
      className="relative z-10 flex min-h-[100svh] flex-col items-center justify-end pb-[max(11vh,calc(env(safe-area-inset-bottom)+2rem))]"
    >
      <ExperienceContainer className="flex flex-col items-center gap-8 sm:gap-12">
        <Wordmark />

        <nav
          aria-label="Categorias"
          className={
            staticGalaxy
              ? "flex flex-wrap justify-center gap-3 sm:gap-4"
              : "sr-only"
          }
        >
          {categories.map((c) => {
            const Icon = categoryIcons[c.icon];
            return (
              <Link
                key={c.key}
                to={c.path}
                className="group flex min-h-11 items-center gap-2 rounded-full border border-border/80 bg-background/50 px-3.5 py-2 text-xs font-medium uppercase tracking-[0.12em] text-foreground/90 backdrop-blur-md transition-all duration-300 ease-out hover:scale-105 hover:border-primary hover:bg-background/80 hover:text-primary hover:shadow-[0_0_24px_hsl(var(--primary)/0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 sm:gap-2.5 sm:px-5 sm:py-2.5 sm:text-sm sm:tracking-[0.2em]"
              >
                <Icon
                  className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 group-hover:scale-110 group-hover:text-primary sm:h-4 sm:w-4"
                  aria-hidden
                />
                <span>{c.label}</span>
              </Link>
            );
          })}
        </nav>
      </ExperienceContainer>
    </main>
  );
}
