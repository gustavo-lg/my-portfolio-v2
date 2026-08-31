import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { CategoryKey } from "@/content/types";
import { categories, categoryByPath } from "@/content/categories";
import { categoryIcons } from "@/experience/lib/icons";
import { ProjectsView } from "./sections/ProjectsView";
import { StackView } from "./sections/StackView";
import { AboutView } from "./sections/AboutView";
import { ContactView } from "./sections/ContactView";

const views: Record<CategoryKey, () => JSX.Element> = {
  projetos: ProjectsView,
  stack: StackView,
  sobre: AboutView,
  contato: ContactView,
};

export function ContentPage({ category }: { category: CategoryKey }) {
  const meta = categories.find((c) => c.key === category)!;
  const others = categories.filter((c) => c.key !== category);
  const View = views[category];

  return (
    <div className="relative z-10 min-h-screen">
      <Link
        to="/"
        className="fixed left-4 top-4 z-30 flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground backdrop-blur transition-colors hover:border-primary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Ver tudo
      </Link>

      <main id="content" className="mx-auto max-w-5xl px-6 pb-28 pt-24">
        <h1 className="mb-2 font-display text-3xl font-light uppercase tracking-[0.2em] text-foreground md:text-5xl">
          {meta.label}
        </h1>
        <p className="mb-10 text-sm text-muted-foreground">{meta.blurb}</p>
        <View />
      </main>

      <nav
        aria-label="Outras categorias"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-center gap-4 border-t border-border bg-background/80 px-4 py-3 backdrop-blur"
      >
        {others.map((c) => {
          const Icon = categoryIcons[c.icon];
          return (
            <Link
              key={c.key}
              to={c.path}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {c.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export { categoryByPath };
