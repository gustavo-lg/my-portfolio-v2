import { projects } from "@/content/projects";

export function ProjectsView() {
  return (
    <ul className="grid gap-6 md:grid-cols-2">
      {projects.map((p) => (
        <li
          key={p.title}
          className="rounded-lg border border-border bg-card/40 p-5"
        >
          <h2 className="text-lg font-semibold text-card-foreground">
            {p.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.features.map((f) => (
              <span
                key={f}
                className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground"
              >
                {f}
              </span>
            ))}
          </div>
          {p.liveUrl && p.liveUrl !== "#" && (
            <a
              href={p.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              Ver projeto
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
