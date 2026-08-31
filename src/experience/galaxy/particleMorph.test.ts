import { describe, it, expect } from "vitest";
import { flourishTarget, morphInto, FLOURISH_SPLIT } from "./particleMorph";

describe("flourishTarget", () => {
  const shape = new Float32Array([1, 2, 3]);

  it("none is a copy", () => {
    const out = new Float32Array(3);
    flourishTarget(shape, "none", out);
    expect(Array.from(out)).toEqual([1, 2, 3]);
  });
  it("fling pushes outward", () => {
    const out = new Float32Array(3);
    flourishTarget(shape, "fling", out);
    expect(out[0]).toBeCloseTo(1.35);
    expect(out[2]).toBeCloseTo(4.05);
  });
  it("gather pulls inward", () => {
    const out = new Float32Array(3);
    flourishTarget(shape, "gather", out);
    expect(out[1]).toBeCloseTo(1.2);
  });
  it("rise lifts Y only", () => {
    const out = new Float32Array(3);
    flourishTarget(shape, "rise", out);
    expect(Array.from(out)).toEqual([1, 5.5, 3]);
  });
});

describe("morphInto", () => {
  const from = new Float32Array([0, 0, 0]);
  const shape = new Float32Array([10, 10, 10]);

  it("none: t=0 -> from, t=1 -> shape, t=0.5 -> midpoint", () => {
    const over = new Float32Array(3);
    flourishTarget(shape, "none", over);
    const out = new Float32Array(3);
    morphInto(from, over, shape, 0, "none", out);
    expect(Array.from(out)).toEqual([0, 0, 0]);
    morphInto(from, over, shape, 1, "none", out);
    expect(Array.from(out)).toEqual([10, 10, 10]);
    morphInto(from, over, shape, 0.5, "none", out);
    expect(Array.from(out)).toEqual([5, 5, 5]);
  });

  it("fling: reaches the overshoot at the split, then settles on shape", () => {
    const over = new Float32Array(3);
    flourishTarget(shape, "fling", over); // [13.5,13.5,13.5]
    const out = new Float32Array(3);
    morphInto(from, over, shape, FLOURISH_SPLIT, "fling", out);
    expect(out[0]).toBeCloseTo(13.5);
    morphInto(from, over, shape, 1, "fling", out);
    expect(out[0]).toBeCloseTo(10);
  });

  it("fling: continuous across the split", () => {
    const over = new Float32Array(3);
    flourishTarget(shape, "fling", over);
    const a = new Float32Array(3);
    const b = new Float32Array(3);
    morphInto(from, over, shape, FLOURISH_SPLIT - 1e-4, "fling", a);
    morphInto(from, over, shape, FLOURISH_SPLIT + 1e-4, "fling", b);
    for (let i = 0; i < 3; i++) expect(a[i]).toBeCloseTo(b[i], 2);
  });
});
