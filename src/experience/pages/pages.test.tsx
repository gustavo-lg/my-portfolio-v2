import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ExperienceProvider } from "@/experience/machine/useExperienceMachine";
import { buildWhatsappUrl } from "./sections/ContactView";
import { BottomNav } from "./BottomNav";

describe("buildWhatsappUrl", () => {
  it("builds an encoded wa.me link with the form fields", () => {
    const url = buildWhatsappUrl("5548998155981", {
      name: "Ana",
      email: "a@b.com",
      subject: "Site",
      message: "Oi",
    });
    expect(url.startsWith("https://wa.me/5548998155981?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("meu nome é Ana");
    expect(decodeURIComponent(url)).toContain("Assunto: Site");
  });
});

describe("BottomNav", () => {
  it("shows the other three categories, not the current one", () => {
    render(
      <ExperienceProvider>
        <MemoryRouter>
          <BottomNav current="stack" />
        </MemoryRouter>
      </ExperienceProvider>,
    );
    expect(screen.queryByRole("button", { name: /stack/i })).toBeNull();
    expect(screen.getByRole("button", { name: /projetos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sobre/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /contato/i })).toBeInTheDocument();
  });
});
