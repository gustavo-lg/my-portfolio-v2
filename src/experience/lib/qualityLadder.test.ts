import { describe, it, expect } from "vitest";
import {
  LADDER,
  REDUCED_RUNG,
  clampDpr,
  indexOfId,
  isInertStep,
  rungAt,
  stepDown,
} from "./qualityLadder";

describe("LADDER shape", () => {
  it("particleCount never increases as the index grows", () => {
    for (let i = 1; i < LADDER.length; i++) {
      expect(LADDER[i].particleCount).toBeLessThanOrEqual(
        LADDER[i - 1].particleCount,
      );
    }
  });

  it("maxDpr never increases as the index grows", () => {
    for (let i = 1; i < LADDER.length; i++) {
      expect(LADDER[i].maxDpr).toBeLessThanOrEqual(LADDER[i - 1].maxDpr);
    }
  });

  it("neighbouring rungs differ in exactly one of particleCount and maxDpr", () => {
    for (let i = 1; i < LADDER.length; i++) {
      const a = LADDER[i - 1];
      const b = LADDER[i];
      const countChanged = a.particleCount !== b.particleCount;
      const dprChanged = a.maxDpr !== b.maxDpr;
      expect(countChanged !== dprChanged).toBe(true);
    }
  });

  it("every id is unique", () => {
    const ids = new Set(LADDER.map((r) => r.id));
    expect(ids.size).toBe(LADDER.length);
  });
});

describe("rungAt / indexOfId", () => {
  it("clamps out-of-range indices", () => {
    expect(rungAt(-5)).toBe(LADDER[0]);
    expect(rungAt(999)).toBe(LADDER[LADDER.length - 1]);
  });

  it("indexOfId returns -1 for an unknown id", () => {
    expect(indexOfId("nope")).toBe(-1);
    expect(indexOfId(LADDER[0].id)).toBe(0);
  });
});

describe("stepping with DPR headroom", () => {
  it("stepDown at the last index stays put", () => {
    expect(stepDown(LADDER.length - 1, 2)).toBe(LADDER.length - 1);
  });

  it("takes a DPR step when the display has the headroom", () => {
    expect(stepDown(indexOfId("ultra"), 2)).toBe(indexOfId("high"));
  });

  it("skips a DPR step that the display makes inert", () => {
    expect(stepDown(indexOfId("ultra"), 1)).toBe(indexOfId("high-"));
  });

  it("at devicePixelRatio 1 every step down changes particleCount", () => {
    for (let i = 0; i < LADDER.length - 1; i++) {
      const next = stepDown(i, 1);
      if (next === i) continue;
      expect(LADDER[next].particleCount).not.toBe(LADDER[i].particleCount);
    }
  });

  it("a count-changing step is never inert, whatever the DPR", () => {
    expect(isInertStep(indexOfId("mid"), indexOfId("mid-"), 1)).toBe(false);
    expect(isInertStep(indexOfId("mid"), indexOfId("mid-"), 3)).toBe(false);
    expect(stepDown(indexOfId("mid"), 1.25)).toBe(indexOfId("mid-"));
  });

});

describe("clampDpr", () => {
  it("reduces DPR on a 4K panel but never below 1", () => {
    const d = clampDpr(2.0, 3840, 2160);
    expect(d).toBeLessThan(2.0);
    expect(d).toBeGreaterThanOrEqual(1);
  });

  it("leaves a small viewport alone", () => {
    expect(clampDpr(2.0, 1280, 720)).toBe(2.0);
  });

  it("passes the ceiling through for a degenerate viewport", () => {
    expect(clampDpr(1.5, 0, 0)).toBe(1.5);
    expect(clampDpr(1.5, Number.NaN, 100)).toBe(1.5);
  });
});

describe("REDUCED_RUNG", () => {
  it("sits outside the ladder", () => {
    expect(indexOfId(REDUCED_RUNG.id)).toBe(-1);
    expect(REDUCED_RUNG.maxDpr).toBe(1);
  });

  it("a rung describes rendering load only, never the input device", () => {
    // customCursor used to live here, which meant promoting a touch device
    // from "floor" to "low+" silently switched it on. It is derived from
    // pointerFine in tierFromRung instead.
    for (const rung of [...LADDER, REDUCED_RUNG]) {
      expect(Object.keys(rung).sort()).toEqual([
        "id",
        "maxDpr",
        "particleCount",
      ]);
    }
  });
});
