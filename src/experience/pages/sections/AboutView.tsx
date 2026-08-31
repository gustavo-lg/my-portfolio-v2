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
      <p className="text-lg text-muted-foreground">{aboutIntro}</p>

      <div className="space-y-4">
        {aboutParagraphs.map((p) => (
          <p key={p.slice(0, 24)} className="text-muted-foreground">
            {p}
          </p>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {pillars.map((pillar) => {
          const Icon = pillarIcons[pillar.icon] ?? Code;
          return (
            <div
              key={pillar.title}
              className="rounded-lg border border-border p-4"
            >
              <Icon className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="mt-3 text-base font-semibold text-foreground">
                {pillar.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {pillar.description}
              </p>
            </div>
          );
        })}
      </div>

      <p className="border-l-2 border-primary pl-4 text-foreground">
        {aboutGoal}
      </p>
    </div>
  );
}
