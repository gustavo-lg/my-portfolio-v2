import { describe, it, expect } from "vitest";
import { FORMATION_MS, CAMERA_MS } from "./cameraTargets";

describe("camera timing", () => {
  it("has positive animation durations", () => {
    expect(FORMATION_MS).toBeGreaterThan(0);
    expect(CAMERA_MS).toBeGreaterThan(0);
  });
});
