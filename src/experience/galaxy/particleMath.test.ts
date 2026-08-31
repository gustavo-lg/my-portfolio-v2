import { describe, it, expect } from "vitest";
import { lerpPositions, idleOffset } from "./particleMath";

describe("lerpPositions", () => {
  const from = new Float32Array([0, 0, 0, 10, 10, 10]);
  const to = new Float32Array([2, 4, 6, 20, 20, 20]);

  it("t=0 yields `from`", () => {
    const out = new Float32Array(6);
    lerpPositions(from, to, 0, out);
    expect(Array.from(out)).toEqual(Array.from(from));
  });

  it("t=1 yields `to`", () => {
    const out = new Float32Array(6);
    lerpPositions(from, to, 1, out);
    expect(Array.from(out)).toEqual(Array.from(to));
  });

  it("t=0.5 yields the midpoint", () => {
    const out = new Float32Array(6);
    lerpPositions(from, to, 0.5, out);
    expect(Array.from(out)).toEqual([1, 2, 3, 15, 15, 15]);
  });

  it("clamps t outside [0,1] and does not mutate inputs", () => {
    const out = new Float32Array(6);
    lerpPositions(from, to, 2, out);
    expect(Array.from(out)).toEqual(Array.from(to));
    expect(Array.from(from)).toEqual([0, 0, 0, 10, 10, 10]);
  });
});

describe("idleOffset", () => {
  it("stays within bounds", () => {
    for (let i = 0; i < 200; i++) {
      const [x, y, z] = idleOffset(i, i * 0.13, 3);
      expect(Math.abs(x)).toBeLessThan(0.12);
      expect(Math.abs(y)).toBeLessThan(0.12);
      expect(Math.abs(z)).toBeLessThan(0.12);
    }
  });

  it("is deterministic", () => {
    expect(idleOffset(5, 1.5, 2)).toEqual(idleOffset(5, 1.5, 2));
  });
});
