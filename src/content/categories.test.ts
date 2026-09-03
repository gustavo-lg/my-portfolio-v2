import { describe, it, expect } from "vitest";
import { categories, categoryByPath } from "./categories";

describe("categories", () => {
  it("has exactly the 4 spec categories in order", () => {
    expect(categories.map((c) => c.key)).toEqual([
      "projetos",
      "stack",
      "sobre",
      "contato",
    ]);
  });

  it("each has a leading-slash path and non-empty label/blurb", () => {
    for (const c of categories) {
      expect(c.path.startsWith("/")).toBe(true);
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.blurb.length).toBeGreaterThan(0);
    }
  });

  it("categoryByPath maps every path back to its meta", () => {
    for (const c of categories) expect(categoryByPath[c.path]).toBe(c);
  });
});
