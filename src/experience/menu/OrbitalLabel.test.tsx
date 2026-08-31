import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { categories } from "@/content/categories";
import { OrbitalLabel } from "./OrbitalLabel";

describe("OrbitalLabel", () => {
  it("renders the category label and fires onSelect on click", async () => {
    const meta = categories[1]; // stack
    const onSelect = vi.fn();
    render(
      <OrbitalLabel meta={meta} index={1} phase="in" onSelect={onSelect} />,
    );

    const btn = screen.getByRole("button", { name: /stack/i });
    expect(btn).toHaveAttribute("data-orbital-label", "stack");

    await userEvent.click(btn);
    expect(onSelect).toHaveBeenCalledWith(meta);
  });

  it("is reachable and activatable by keyboard", async () => {
    const meta = categories[0];
    const onSelect = vi.fn();
    render(
      <OrbitalLabel meta={meta} index={0} phase="in" onSelect={onSelect} />,
    );

    await userEvent.tab();
    expect(screen.getByRole("button", { name: /projetos/i })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(meta);
  });

  it("is transparent while hidden", () => {
    render(
      <OrbitalLabel
        meta={categories[0]}
        index={0}
        phase="hidden"
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("button")).toHaveStyle({ opacity: "0" });
  });
});
