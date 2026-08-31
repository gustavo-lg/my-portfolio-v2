import { Link } from "react-router-dom";
import { categories } from "@/content/categories";
import { profile } from "@/content/profile";
import { categoryIcons } from "@/experience/lib/icons";

/**
 * Phase 0 placeholder: plain DOM wordmark + category links.
 * Replaced by the projected orbital layout in Phase 3.
 */
export function OrbitalMenu() {
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-12 px-6 text-center">
      <div>
        <h1 className="font-display text-4xl font-light tracking-[0.2em] text-foreground md:text-6xl">
          {profile.name}
        </h1>
        <p className="mt-3 text-xs uppercase tracking-[0.35em] text-muted-foreground">
          {profile.title}
        </p>
      </div>

      <nav aria-label="Categorias" className="flex flex-wrap justify-center gap-6">
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
