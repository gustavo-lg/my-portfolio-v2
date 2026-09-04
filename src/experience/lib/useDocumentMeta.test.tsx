import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDocumentMeta } from "./useDocumentMeta";

describe("useDocumentMeta", () => {
  it("sets a base title with no category", () => {
    renderHook(() => useDocumentMeta());
    expect(document.title).toContain("Gustavo Gonçalves");
  });

  it("prefixes the category label and sets rich descriptions and twitter tags", () => {
    renderHook(() => useDocumentMeta("stack"));
    expect(document.title.startsWith("STACK ·")).toBe(true);

    const descMeta = document.querySelector('meta[name="description"]')?.getAttribute("content");
    expect(descMeta).toContain("STACK");
    expect(descMeta).toContain("React");

    const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute("content");
    expect(twitterTitle).toContain("STACK");

    const twitterDesc = document.querySelector('meta[name="twitter:description"]')?.getAttribute("content");
    expect(twitterDesc).toContain("React");

    const twitterUrl = document.querySelector('meta[name="twitter:url"]')?.getAttribute("content");
    expect(twitterUrl).toBe("https://gustavogoncalves.dev.br/stack");

    const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute("content");
    expect(ogUrl).toBe("https://gustavogoncalves.dev.br/stack");
  });
});
