import { describe, it, expect } from "vitest";
import { getPerfTier } from "./perfTier";

describe("getPerfTier", () => {
  it("desktop: 8-core, fine pointer -> high tier", () => {
    const t = getPerfTier({ pointerFine: true, hardwareConcurrency: 8 });
    expect(t.particleCount).toBeGreaterThanOrEqual(20000);
    expect(t.customCursor).toBe(true);
  });

  it("mobile: coarse pointer, 4-core -> low tier, no cursor, no bloom", () => {
    const t = getPerfTier({ pointerFine: false, hardwareConcurrency: 4 });
    expect(t.particleCount).toBeLessThanOrEqual(16000);
    expect(t.particleCount).toBeLessThan(
      getPerfTier({ pointerFine: true, hardwareConcurrency: 8 }).particleCount,
    );
    expect(t.customCursor).toBe(false);
    expect(t.bloom).toBe(false);
  });

  it("reduced motion -> fewer particles, no cursor", () => {
    const t = getPerfTier({
      reducedMotion: true,
      pointerFine: true,
      hardwareConcurrency: 16,
    });
    expect(t.customCursor).toBe(false);
    expect(t.particleCount).toBeLessThanOrEqual(6000);
  });

  it("bloom is always false in the MVP", () => {
    expect(getPerfTier({ pointerFine: true, hardwareConcurrency: 32 }).bloom).toBe(
      false,
    );
  });
});
