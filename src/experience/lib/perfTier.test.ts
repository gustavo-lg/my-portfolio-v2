import { describe, it, expect } from "vitest";
import { getStartIndex, tierFromRung } from "./perfTier";
import { LADDER, REDUCED_RUNG, indexOfId, rungAt } from "./qualityLadder";

const idFor = (opts: Parameters<typeof getStartIndex>[0]) =>
  rungAt(getStartIndex(opts)).id;

describe("getStartIndex", () => {
  it("coarse pointer enters at the base regardless of the GPU", () => {
    expect(
      idFor({ pointerFine: false, hardwareConcurrency: 8, gpuClass: "high" }),
    ).toBe("floor");
  });

  it("a weak GPU outranks a strong CPU (the original bug)", () => {
    expect(
      idFor({ pointerFine: true, hardwareConcurrency: 8, gpuClass: "low" }),
    ).toBe("low");
  });

  it("a strong GPU with plenty of cores starts high, not ultra", () => {
    expect(
      idFor({ pointerFine: true, hardwareConcurrency: 16, gpuClass: "high" }),
    ).toBe("high");
  });

  it("a strong GPU behind a weak CPU starts mid", () => {
    expect(
      idFor({ pointerFine: true, hardwareConcurrency: 4, gpuClass: "high" }),
    ).toBe("mid");
  });

  it("a mid GPU starts mid", () => {
    expect(
      idFor({ pointerFine: true, hardwareConcurrency: 8, gpuClass: "mid" }),
    ).toBe("mid");
  });

  it("an unknown GPU (Safari) starts conservatively", () => {
    expect(
      idFor({ pointerFine: true, hardwareConcurrency: 8, gpuClass: "unknown" }),
    ).toBe("mid-");
  });

  it("low reported memory drops to low even with a strong GPU", () => {
    expect(
      idFor({
        pointerFine: true,
        hardwareConcurrency: 16,
        gpuClass: "high",
        deviceMemory: 4,
      }),
    ).toBe("low");
  });

  it("two cores or fewer drops to low", () => {
    expect(
      idFor({ pointerFine: true, hardwareConcurrency: 2, gpuClass: "high" }),
    ).toBe("low");
  });

  it("defaults to the base rung with no information", () => {
    expect(getStartIndex()).toBe(indexOfId("floor"));
  });

  it("never starts on the top rung — ultra is earned by measurement", () => {
    const combos = [true, false].flatMap((pointerFine) =>
      [1, 2, 4, 8, 16, 32].flatMap((hardwareConcurrency) =>
        (["low", "mid", "high", "unknown"] as const).flatMap((gpuClass) =>
          [undefined, 2, 4, 8, 16].map((deviceMemory) => ({
            pointerFine,
            hardwareConcurrency,
            gpuClass,
            deviceMemory,
          })),
        ),
      ),
    );
    for (const c of combos) expect(getStartIndex(c)).toBeGreaterThan(0);
  });

  it("always returns a valid ladder index", () => {
    expect(getStartIndex({ pointerFine: true, gpuClass: "mid" })).toBeLessThan(
      LADDER.length,
    );
  });
});

describe("tierFromRung", () => {
  it("carries the rung through and pins bloom off", () => {
    const t = tierFromRung(rungAt(indexOfId("mid")), 1.25, {
      pointerFine: true,
    });
    expect(t.id).toBe("mid");
    expect(t.particleCount).toBe(150000);
    expect(t.maxDpr).toBe(1.25);
    expect(t.customCursor).toBe(true);
    expect(t.bloom).toBe(false);
  });

  it("builds the reduced-motion tier", () => {
    const t = tierFromRung(REDUCED_RUNG, 1, { reducedMotion: true });
    expect(t.particleCount).toBe(6000);
    expect(t.maxDpr).toBe(1);
    expect(t.customCursor).toBe(false);
    expect(t.bloom).toBe(false);
  });

  it("the DPR argument overrides the rung ceiling", () => {
    expect(tierFromRung(rungAt(0), 1.1).maxDpr).toBe(1.1);
  });

  it("customCursor follows the pointer, never the rung", () => {
    // The old model put customCursor on the rung, so a touch device promoted
    // from "floor" to "low+" would switch it on behind the user's back.
    for (let i = 0; i < LADDER.length; i++) {
      expect(tierFromRung(rungAt(i), 1, { pointerFine: false }).customCursor).toBe(
        false,
      );
      expect(tierFromRung(rungAt(i), 1, { pointerFine: true }).customCursor).toBe(
        true,
      );
    }
  });

  it("reduced motion suppresses the custom cursor even with a fine pointer", () => {
    const t = tierFromRung(rungAt(0), 1, {
      pointerFine: true,
      reducedMotion: true,
    });
    expect(t.customCursor).toBe(false);
  });

  it("defaults to no custom cursor when nothing is known", () => {
    expect(tierFromRung(rungAt(0), 1).customCursor).toBe(false);
  });
});
