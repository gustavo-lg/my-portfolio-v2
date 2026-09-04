import type { CategoryKey } from "@/content/types";
import { categories } from "@/content/categories";
import { ExperienceContainer } from "@/experience/layout/ExperienceContainer";
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

/** The heading + body for one category. Wrapped by ContentArea's transition. */
export function CategorySection({ category }: { category: CategoryKey }) {
  const meta = categories.find((c) => c.key === category)!;
  const View = views[category];

  return (
    <ExperienceContainer>
      <h1 className="mb-2 font-display text-3xl font-light uppercase tracking-[0.2em] text-foreground drop-shadow-[0_2px_24px_hsl(var(--galaxy-bg))] md:text-5xl">
        {meta.label}
      </h1>
      <p className="mb-10 text-sm text-muted-foreground drop-shadow-[0_1px_12px_hsl(var(--galaxy-bg))]">{meta.blurb}</p>
      <View />
    </ExperienceContainer>
  );
}
