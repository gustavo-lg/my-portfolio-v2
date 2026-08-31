import { describe, it, expect } from "vitest";
import {
  generateTargetPositions,
  generateDispersedPositions,
  generateColors,
  CORE_FRACTION,
  CORE_RADIUS,
  DISPERSED_RADIUS,
} from "./particleGeometry";

const N = 3000;

describe("generateTargetPositions", () => {
  it("returns count*3 floats", () => {
    expect(generateTargetPositions(N).length).toBe(N * 3);
  });

  it("is deterministic for a given seed", () => {
    expect(Array.from(generateTargetPositions(500, 7))).toEqual(
      Array.from(generateTargetPositions(500, 7)),
    );
  });

  it("differs across seeds", () => {
    expect(Array.from(generateTargetPositions(500, 1))).not.toEqual(
      Array.from(generateTargetPositions(500, 2)),
    );
  });

  it("keeps core particles within the core radius", () => {
    const p = generateTargetPositions(N);
    const coreCount = Math.floor(N * CORE_FRACTION);
    for (let i = 0; i < coreCount; i++) {
      const d = Math.hypot(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      expect(d).toBeLessThanOrEqual(CORE_RADIUS + 1e-6);
    }
  });

  it("halo is flatter on Y than on X", () => {
    const p = generateTargetPositions(N);
    const coreCount = Math.floor(N * CORE_FRACTION);
    let sx = 0;
    let sy = 0;
    for (let i = coreCount; i < N; i++) {
      sx += Math.abs(p[i * 3]);
      sy += Math.abs(p[i * 3 + 1]);
    }
    expect(sy).toBeLessThan(sx);
  });
});

describe("generateDispersedPositions", () => {
  it("returns count*3 floats within the dispersed radius", () => {
    const p = generateDispersedPositions(N);
    expect(p.length).toBe(N * 3);
    for (let i = 0; i < N; i++) {
      const d = Math.hypot(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      expect(d).toBeLessThanOrEqual(DISPERSED_RADIUS + 1e-6);
    }
  });

  it("is deterministic", () => {
    expect(Array.from(generateDispersedPositions(400, 3))).toEqual(
      Array.from(generateDispersedPositions(400, 3)),
    );
  });
});

describe("generateColors", () => {
  it("returns count*3 channels all within [0,1]", () => {
    const targets = generateTargetPositions(N);
    const c = generateColors(N, targets);
    expect(c.length).toBe(N * 3);
    for (const v of c) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
