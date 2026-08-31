import { technicalSkills, skillCategories, softSkills } from "@/content/stack";

export function StackView() {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Habilidades Técnicas
        </h2>
        <ul className="space-y-3">
          {technicalSkills.map((s) => (
            <li key={s.name}>
              <div className="flex justify-between text-sm text-foreground">
                <span>{s.name}</span>
                <span className="text-muted-foreground">{s.level}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded bg-secondary">
                <div
                  className="h-full rounded bg-primary"
                  style={{ width: `${s.level}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {skillCategories.map((c) => (
          <div key={c.title} className="rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
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
          Comportamentais
        </h2>
        <div className="flex flex-wrap gap-2">
          {softSkills.map((s) => (
            <span
              key={s}
              className="rounded-lg bg-secondary/40 px-3 py-1.5 text-sm text-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
