import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// The WebGL canvas needs a real GPU context; stub it in jsdom.
vi.mock("@/experience/galaxy/GalaxyCanvas", () => ({
  default: () => null,
}));
import { ExperienceProvider } from "@/experience/machine/useExperienceMachine";
import { OrbitalExperience } from "@/experience/OrbitalExperience";

function renderAt(path: string) {
  return render(
    <ExperienceProvider>
      <MemoryRouter initialEntries={[path]}>
        <OrbitalExperience />
      </MemoryRouter>
    </ExperienceProvider>,
  );
}

describe("OrbitalExperience routing", () => {
  it("renders the orbital menu with wordmark and 4 category links at /", () => {
    renderAt("/");
    expect(screen.getByText("Gustavo Gonçalves")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /projetos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /stack/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sobre/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contato/i })).toBeInTheDocument();
  });

  it("renders a content page with VER TUDO at an internal route", () => {
    renderAt("/stack");
    expect(
      screen.getByRole("heading", { name: /stack/i, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver tudo/i })).toBeInTheDocument();
  });

  it("renders real project content at /projetos", () => {
    renderAt("/projetos");
    expect(screen.getByText("Projeto Imob")).toBeInTheDocument();
  });

  it("renders about pillars at /sobre", () => {
    renderAt("/sobre");
    expect(screen.getByText("Código Limpo")).toBeInTheDocument();
  });

  it("renders the contact form at /contato", () => {
    renderAt("/contato");
    expect(screen.getByRole("textbox", { name: /nome/i })).toBeInTheDocument();
  });

  it("unknown route shows NotFound", () => {
    renderAt("/nope");
    expect(
      screen.getByRole("heading", { name: /404/i }),
    ).toBeInTheDocument();
  });
});
