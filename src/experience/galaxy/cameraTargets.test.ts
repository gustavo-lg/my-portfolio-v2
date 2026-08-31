import { describe, it, expect } from "vitest";
import { CAMERA_FRAMINGS, FORMATION_MS, CAMERA_MS } from "./cameraTargets";

describe("CAMERA_FRAMINGS", () => {
  it("defines distinct center and side framings", () => {
    expect(CAMERA_FRAMINGS.center.position).not.toEqual(
      CAMERA_FRAMINGS.side.position,
    );
    expect(CAMERA_FRAMINGS.center.lookAt).not.toEqual(
      CAMERA_FRAMINGS.side.lookAt,
    );
  });

  it("side view is pulled further back than center", () => {
    expect(CAMERA_FRAMINGS.side.position[2]).toBeGreaterThan(
      CAMERA_FRAMINGS.center.position[2],
    );
  });

  it("has positive animation durations", () => {
    expect(FORMATION_MS).toBeGreaterThan(0);
    expect(CAMERA_MS).toBeGreaterThan(0);
  });
});
