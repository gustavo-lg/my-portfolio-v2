import { describe, it, expect } from "vitest";
import { lerp2d, distance } from "./cursorMath";

describe("lerp2d", () => {
  it("ease=0 keeps current", () => {
    expect(lerp2d({ x: 0, y: 0 }, { x: 10, y: 10 }, 0)).toEqual({ x: 0, y: 0 });
  });
  it("ease=1 snaps to target", () => {
    expect(lerp2d({ x: 0, y: 0 }, { x: 10, y: 10 }, 1)).toEqual({
      x: 10,
      y: 10,
    });
  });
  it("ease=0.5 goes halfway", () => {
    expect(lerp2d({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5)).toEqual({
      x: 5,
      y: 10,
    });
  });
  it("clamps ease outside [0,1]", () => {
    expect(lerp2d({ x: 0, y: 0 }, { x: 4, y: 4 }, 5)).toEqual({ x: 4, y: 4 });
  });
});

describe("distance", () => {
  it("computes euclidean distance", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
