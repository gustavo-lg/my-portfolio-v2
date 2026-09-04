import { projects } from "@/content/projects";

export function ProjectsView() {
  return (
    <ul className="grid gap-4 sm:gap-6 md:grid-cols-2">
      {projects.map((p) => (
        <li
          key={p.title}
          className="group rounded-xl border border-border/80 bg-card/40 p-4 backdrop-blur-sm transition-all duration-300 ease-out hover:border-primary/50 hover:bg-card/70 hover:shadow-[0_0_24px_hsl(var(--primary)/0.12)] sm:p-5"
        >
          <h2 className="text-base font-semibold text-card-foreground transition-colors duration-200 group-hover:text-primary sm:text-lg">
            {p.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.features.map((f) => (
              <span
                key={f}
                className="rounded-md border border-border/80 bg-secondary/30 px-2 py-0.5 text-xs text-muted-foreground transition-colors"
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
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-all duration-200 hover:text-primary/80 hover:translate-x-1"
            >
              <span>Ver projeto</span>
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">&rarr;</span>
            </a>
          )}
        </li>
      ))}

    </ul>
  );
}
