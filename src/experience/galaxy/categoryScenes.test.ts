import { describe, it, expect } from "vitest";
import { SCENES, SCENE_ORDER, type SceneKey } from "./categoryScenes";

const KEYS: SceneKey[] = ["menu", "projetos", "stack", "sobre", "contato"];

describe("SCENES", () => {
  it("has an entry for every scene key", () => {
    expect(SCENE_ORDER).toEqual(KEYS);
    for (const k of KEYS) expect(SCENES[k]).toBeDefined();
  });

  it("menu is the anchor: centred at the origin, framed head-on", () => {
    expect(SCENES.menu.center).toEqual([0, 0, 0]);
    expect(SCENES.menu.framing.lookAt).toEqual([0, 0, 0]);
    expect(SCENES.menu.transition.flourish).toBe("none");
  });

  it("every scene has a valid galaxy disk, positive fov, finite swirl, point size and wave", () => {
    for (const k of KEYS) {
      const s = SCENES[k];
      expect(s.framing.fov).toBeGreaterThan(0);
      expect(Number.isFinite(s.swirl.speed)).toBe(true);
      expect(s.pointSize).toBeGreaterThan(0);
      expect(s.pointOpacity).toBeGreaterThan(0);
      expect(s.transition.camera.duration).toBeGreaterThan(0);
      expect(s.transition.morph.duration).toBeGreaterThan(0);
      expect(s.disk.bulge).toBeGreaterThan(0);
      expect(s.disk.outer).toBeGreaterThan(s.disk.bulge);
      expect(s.disk.arms).toBeGreaterThanOrEqual(1);
      expect(s.disk.tilt.length).toBe(3);
      expect(["x", "y", "z"]).toContain(s.wave.drive);
      expect(["x", "y", "z"]).toContain(s.wave.displace);
      expect(Number.isFinite(s.wave.amplitude)).toBe(true);
      expect(s.wave.frequency).toBeGreaterThan(0);
    }
  });

  it("the 4 pages each dive in from a distinct camera position to a distinct pocket", () => {
    const pages: SceneKey[] = ["projetos", "stack", "sobre", "contato"];
    expect(new Set(pages.map((k) => SCENES[k].framing.position.join(","))).size).toBe(4);
    expect(new Set(pages.map((k) => SCENES[k].center.join(","))).size).toBe(4);
    for (const k of pages) {
      // The camera looks at that page's pocket, not the world origin.
      expect(SCENES[k].center.some((v) => v !== 0)).toBe(true);
    }
  });

  it("every scene shares the same accretion colour scheme", () => {
    for (const k of KEYS) {
      expect(SCENES[k].colorScheme).toEqual(SCENES.menu.colorScheme);
    }
  });

  // A flourish scales/shears the WHOLE particle buffer, which would drag the
  // home galaxies that are meant to stay put while only the focused one
  // deforms. Pages must therefore morph straight through.
  it("no page uses a flourish, so the continuous scene stays put", () => {
    for (const k of ["projetos", "stack", "sobre", "contato"] as SceneKey[]) {
      expect(SCENES[k].transition.flourish).toBe("none");
    }
  });
});
