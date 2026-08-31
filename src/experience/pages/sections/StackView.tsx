import { skillCategories, learningTools, strengths } from "@/content/stack";

export function StackView() {
  return (
    <div className="space-y-12">
      <section className="grid gap-4 sm:grid-cols-2">
        {skillCategories.map((c) => (
          <div key={c.title} className="rounded-lg border border-border p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className={`h-2 w-2 rounded-full ${c.color}`} aria-hidden />
              {c.title}
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.skills.map((s) => (
                <span
                  key={s}
                  className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Como eu trabalho
        </h2>
        <div className="flex flex-wrap gap-2">
          {strengths.map((s) => (
            <span
              key={s}
              className="rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Estudando / interesse
        </h2>
        <div className="flex flex-wrap gap-2">
          {learningTools.map((s) => (
            <span
              key={s}
              className="rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
