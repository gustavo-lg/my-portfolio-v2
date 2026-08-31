import { Link } from "react-router-dom";
import { categories } from "@/content/categories";
import { Wordmark } from "./Wordmark";

/**
 * The `/` route. The interactive category labels orbit inside the WebGL canvas
 * (see OrbitalLabels); this DOM layer carries the centred wordmark plus a
 * screen-reader / no-WebGL fallback navigation.
 */
export function OrbitalMenu() {
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
      <Wordmark />

      <nav aria-label="Categorias" className="sr-only">
        {categories.map((c) => (
          <Link key={c.key} to={c.path}>
            {c.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
