import { describe, it, expect } from "vitest";
import { ORBITAL_ANCHORS, ORBITAL_ORDER } from "./orbitalAnchors";
import { categories } from "@/content/categories";
import { CORE_RADIUS } from "./particleGeometry";

describe("ORBITAL_ANCHORS", () => {
  it("has one anchor per category, in category order", () => {
    expect(ORBITAL_ORDER).toEqual(categories.map((c) => c.key));
    for (const c of categories) {
      expect(ORBITAL_ANCHORS[c.key]).toHaveLength(3);
    }
  });

  it("places every anchor outside the core", () => {
    for (const key of ORBITAL_ORDER) {
      const [x, y, z] = ORBITAL_ANCHORS[key];
      expect(Math.hypot(x, y, z)).toBeGreaterThan(CORE_RADIUS + 1);
    }
  });

  it("keeps anchors distinct and spread across quadrants", () => {
    const seen = new Set(
      ORBITAL_ORDER.map((k) => {
        const [x, y] = ORBITAL_ANCHORS[k];
        return `${Math.sign(x)},${Math.sign(y)}`;
      }),
    );
    expect(seen.size).toBe(4);
  });
});
