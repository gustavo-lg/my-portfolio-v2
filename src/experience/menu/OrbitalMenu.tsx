import { Link } from "react-router-dom";
import { categories } from "@/content/categories";
import { categoryIcons } from "@/experience/lib/icons";
import { Wordmark } from "./Wordmark";

/**
 * Phase 2 placeholder: centred wordmark + category links.
 * The projected orbital layout replaces the link row in Phase 3.
 */
export function OrbitalMenu() {
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-12 px-6">
      <Wordmark />

      <nav
        aria-label="Categorias"
        className="flex flex-wrap justify-center gap-4"
      >
        {categories.map((c) => {
          const Icon = categoryIcons[c.icon];
          return (
            <Link
              key={c.key}
              to={c.path}
              className="flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm uppercase tracking-[0.2em] text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {c.label}
            </Link>
          );
        })}
      </nav>
    </main>
  );
}
