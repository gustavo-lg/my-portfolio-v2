import { describe, it, expect } from "vitest";
import {
  generateTargetPositions,
  generateDispersedPositions,
  generateColors,
  CORE_FRACTION,
  CORE_RADIUS,
  DISPERSED_RADIUS,
  deformPositions,
  type Deformation,
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

describe("deformPositions", () => {
  const base = new Float32Array([1, 2, 3, -4, 0, 5]);

  it("scales each axis independently", () => {
    const out = new Float32Array(6);
    deformPositions(base, { scale: [2, 0.5, 3] }, out);
    expect(Array.from(out)).toEqual([2, 1, 9, -8, 0, 15]);
  });

  it("applies shearXY using the original y before scaling of x", () => {
    const out = new Float32Array(6);
    deformPositions(base, { scale: [1, 2, 1], shearXY: 0.5 }, out);
    // particle 0 uses the ORIGINAL y (2), not the scaled y (4):
    //   x = 1*1 + 0.5*2 = 2  (scaled y would give 1 + 0.5*4 = 3)
    // particle 1: x = -4 + 0.5*0 = -4
    expect(out[0]).toBeCloseTo(2);
    expect(out[3]).toBeCloseTo(-4);
  });

  it("preserves array length and is deterministic", () => {
    const a = new Float32Array(6);
    const b = new Float32Array(6);
    const d: Deformation = { scale: [1.3, 0.7, 1.1], tilt: [0, 0, 0.4] };
    deformPositions(base, d, a);
    deformPositions(base, d, b);
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(a.length).toBe(base.length);
  });

  it("identity deform (scale 1,1,1, no shear/tilt) is a copy", () => {
    const out = new Float32Array(6);
    deformPositions(base, { scale: [1, 1, 1] }, out);
    expect(Array.from(out)).toEqual(Array.from(base));
  });

  it("tilt around Z by PI/2 maps (1,0,0) -> (0,1,0)", () => {
    const p = new Float32Array([1, 0, 0]);
    const out = new Float32Array(3);
    deformPositions(p, { scale: [1, 1, 1], tilt: [0, 0, Math.PI / 2] }, out);
    expect(out[0]).toBeCloseTo(0);
    expect(out[1]).toBeCloseTo(1);
    expect(out[2]).toBeCloseTo(0);
  });
});
