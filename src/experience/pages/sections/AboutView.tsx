import {
  Search,
  Layers,
  Zap,
  MessageSquare,
  Code,
  type LucideIcon,
} from "lucide-react";
import {
  aboutIntro,
  aboutParagraphs,
  aboutGoal,
  pillars,
} from "@/content/about";

const pillarIcons: Record<string, LucideIcon> = {
  Search,
  Layers,
  Zap,
  MessageSquare,
  Code,
};

export function AboutView() {
  return (
    <div className="space-y-10">
      {/* Intro lead */}
      <p className="text-base sm:text-lg leading-relaxed text-foreground/90">
        {aboutIntro}
      </p>

      {/* Narrative paragraphs */}
      <div className="space-y-4">
        {aboutParagraphs.map((p) => (
          <p key={p.slice(0, 24)} className="text-sm sm:text-base leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </div>

      {/* 4 Pillars in the clean modern StackView card pattern */}
      <section>
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Como eu atuo
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {pillars.map((pillar) => {
            const Icon = pillarIcons[pillar.icon] ?? Code;
            return (
              <div
                key={pillar.title}
                className="group flex flex-col justify-start rounded-xl border border-border/80 bg-card/30 p-5 backdrop-blur-sm transition-all duration-300 ease-out hover:border-primary/40 hover:bg-card/60 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
              >
                <h3 className="flex items-center gap-2.5 text-sm font-semibold text-foreground transition-colors duration-200 group-hover:text-primary">
                  <Icon className="h-4 w-4 shrink-0 text-primary transition-transform duration-300 group-hover:scale-110" aria-hidden />
                  <span>{pillar.title}</span>
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Goal section */}
      <section>
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Objetivo
        </h2>
        <div className="rounded-xl border border-border/80 bg-card/30 p-5 backdrop-blur-sm">
          <p className="text-sm leading-relaxed text-foreground/90">
            {aboutGoal}
          </p>
        </div>
      </section>
    </div>
  );
}


