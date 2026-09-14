import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  DeviceCapabilitiesProvider,
  useDeviceCapabilities,
} from "./useDeviceCapabilities";
import { LADDER, REDUCED_RUNG, indexOfId, rungAt } from "./qualityLadder";
import { STORAGE_KEY } from "./adaptiveTier";

/**
 * jsdom has no WebGL, so getGpuRendererString() returns null and the GPU class
 * is always "unknown" here. That is exactly the Safari path, which is the case
 * worth pinning down: it must start conservatively and never be left stranded.
 */

function mockMedia(matches: Record<string, boolean>) {
  window.matchMedia = ((query: string) =>
    ({
      matches: matches[query] ?? false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DeviceCapabilitiesProvider>{children}</DeviceCapabilitiesProvider>
);

describe("useDeviceCapabilities", () => {
  it("refuses to resolve without a provider, so no caller starts a second probe", () => {
    mockMedia({});
    expect(() => renderHook(() => useDeviceCapabilities())).toThrow(
      /DeviceCapabilitiesProvider/,
    );
  });

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the documented return shape", () => {
    mockMedia({});
    const { result } = renderHook(() => useDeviceCapabilities(), { wrapper });
    expect(result.current).toHaveProperty("tier");
    expect(result.current).toHaveProperty("reducedMotion");
    expect(result.current).toHaveProperty("pointerFine");
  });

  it("resolves the reduced-motion rung when the user asks for it", () => {
    mockMedia({ "(prefers-reduced-motion: reduce)": true });
    const { result } = renderHook(() => useDeviceCapabilities(), { wrapper });
    expect(result.current.reducedMotion).toBe(true);
    expect(result.current.tier.id).toBe(REDUCED_RUNG.id);
    expect(result.current.tier.particleCount).toBe(REDUCED_RUNG.particleCount);
    expect(result.current.tier.maxDpr).toBe(1);
    expect(result.current.tier.customCursor).toBe(false);
  });

  it("a coarse pointer starts at the base rung", () => {
    mockMedia({ "(pointer: fine)": false });
    const { result } = renderHook(() => useDeviceCapabilities(), { wrapper });
    expect(result.current.tier.id).toBe("floor");
    expect(result.current.tier.customCursor).toBe(false);
  });

  it("a fine pointer with an unreadable GPU starts conservatively, not at the top", () => {
    mockMedia({ "(pointer: fine)": true });
    const { result } = renderHook(() => useDeviceCapabilities(), { wrapper });
    expect(result.current.tier.id).toBe("mid-");
    expect(indexOfId(result.current.tier.id)).toBeGreaterThan(0);
  });

  it("a stored verdict may lower the starting rung", () => {
    mockMedia({ "(pointer: fine)": true });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: "minimal", gpu: "unknown", at: Date.now() }),
    );
    const { result } = renderHook(() => useDeviceCapabilities(), { wrapper });
    expect(result.current.tier.id).toBe("minimal");
  });

  it("a stored verdict may never raise the starting rung", () => {
    mockMedia({ "(pointer: fine)": true });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: "ultra", gpu: "unknown", at: Date.now() }),
    );
    const { result } = renderHook(() => useDeviceCapabilities(), { wrapper });
    expect(result.current.tier.id).toBe("mid-");
  });

  it("a stored verdict for another GPU class is ignored", () => {
    mockMedia({ "(pointer: fine)": true });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: "minimal", gpu: "high", at: Date.now() }),
    );
    const { result } = renderHook(() => useDeviceCapabilities(), { wrapper });
    expect(result.current.tier.id).toBe("mid-");
  });

  it("never reports a DPR below 1 or above the rung ceiling", () => {
    mockMedia({ "(pointer: fine)": true });
    const { result } = renderHook(() => useDeviceCapabilities(), { wrapper });
    const ceiling = rungAt(indexOfId(result.current.tier.id)).maxDpr;
    expect(result.current.tier.maxDpr).toBeGreaterThanOrEqual(1);
    expect(result.current.tier.maxDpr).toBeLessThanOrEqual(ceiling);
  });

  it("always resolves to a real rung with a positive particle count", () => {
    mockMedia({ "(pointer: fine)": true });
    const { result } = renderHook(() => useDeviceCapabilities(), { wrapper });
    const ids = [...LADDER.map((r) => r.id), REDUCED_RUNG.id];
    expect(ids).toContain(result.current.tier.id);
    expect(result.current.tier.particleCount).toBeGreaterThan(0);
    expect(result.current.tier.bloom).toBe(false);
  });
});
