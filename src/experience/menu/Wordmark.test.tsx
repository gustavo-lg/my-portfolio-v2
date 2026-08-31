import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExperienceProvider } from "@/experience/machine/useExperienceMachine";
import { Wordmark } from "./Wordmark";

describe("Wordmark", () => {
  it("renders the name and title", () => {
    render(
      <ExperienceProvider>
        <Wordmark />
      </ExperienceProvider>,
    );
    expect(screen.getByRole("heading", { name: "Gustavo Gonçalves" })).toBeInTheDocument();
    expect(screen.getByText("Desenvolvedor Web")).toBeInTheDocument();
  });

  it("is hidden while the galaxy is still forming", () => {
    render(
      <ExperienceProvider initial={{ state: "intro-forming" }}>
        <Wordmark />
      </ExperienceProvider>,
    );
    expect(screen.getByRole("heading").parentElement).toHaveStyle({ opacity: "0" });
  });

  it("is visible once settling", () => {
    render(
      <ExperienceProvider initial={{ state: "intro-settling" }}>
        <Wordmark />
      </ExperienceProvider>,
    );
    expect(screen.getByRole("heading").parentElement).toHaveStyle({ opacity: "1" });
  });
});
