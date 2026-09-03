import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDocumentMeta } from "./useDocumentMeta";

describe("useDocumentMeta", () => {
  it("sets a base title with no category", () => {
    renderHook(() => useDocumentMeta());
    expect(document.title).toContain("Gustavo Gonçalves");
  });

  it("prefixes the category label", () => {
    renderHook(() => useDocumentMeta("stack"));
    expect(document.title.startsWith("STACK ·")).toBe(true);
    expect(
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
    ).toContain("STACK");
  });
});
