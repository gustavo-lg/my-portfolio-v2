import { useEffect, useState } from "react";
import type { CategoryKey } from "@/content/types";
import { categories } from "@/content/categories";
import { useDocumentMeta } from "@/experience/lib/useDocumentMeta";
import { ExperienceContainer } from "@/experience/layout/ExperienceContainer";
import { BackButton } from "./BackButton";
import { BottomNav } from "./BottomNav";
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
  const View = views[category];
  const [showNav, setShowNav] = useState(false);
  useDocumentMeta(category);

  useEffect(() => {
    const t = setTimeout(() => setShowNav(true), 450);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative z-10 min-h-screen">
      <BackButton />

      <main
        id="content"
        key={category}
        className="animate-page-in pb-28 pt-24"
      >
        <ExperienceContainer>
          <h1 className="mb-2 font-display text-3xl font-light uppercase tracking-[0.2em] text-foreground md:text-5xl">
            {meta.label}
          </h1>
          <p className="mb-10 text-sm text-muted-foreground">{meta.blurb}</p>
          <View />
        </ExperienceContainer>
      </main>

      <div
        className="transition-opacity duration-500"
        style={{ opacity: showNav ? 1 : 0 }}
      >
        <BottomNav current={category} />
      </div>
    </div>
  );
}
