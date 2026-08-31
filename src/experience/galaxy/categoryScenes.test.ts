import { describe, it, expect } from "vitest";
import { SCENES, SCENE_ORDER, type SceneKey } from "./categoryScenes";

const KEYS: SceneKey[] = ["menu", "projetos", "stack", "sobre", "contato"];

describe("SCENES", () => {
  it("has an entry for every scene key", () => {
    expect(SCENE_ORDER).toEqual(KEYS);
    for (const k of KEYS) expect(SCENES[k]).toBeDefined();
  });

  it("menu is the anchor: identity deform, today's framing", () => {
    expect(SCENES.menu.deform.scale).toEqual([1, 1, 1]);
    expect(SCENES.menu.framing.position).toEqual([0, 0, 13]);
    expect(SCENES.menu.transition.flourish).toBe("none");
  });

  it("every scene has a positive fov, finite spin speed, positive point size", () => {
    for (const k of KEYS) {
      const s = SCENES[k];
      expect(s.framing.fov).toBeGreaterThan(0);
      expect(Number.isFinite(s.spin.speed)).toBe(true);
      expect(s.pointSize).toBeGreaterThan(0);
      expect(s.pointOpacity).toBeGreaterThan(0);
      expect(s.transition.camera.duration).toBeGreaterThan(0);
      expect(s.transition.morph.duration).toBeGreaterThan(0);
      expect(s.deform.scale.every((v) => v > 0)).toBe(true);
    }
  });

  it("the 4 pages each have a distinct framing position", () => {
    const pages: SceneKey[] = ["projetos", "stack", "sobre", "contato"];
    const seen = new Set(pages.map((k) => SCENES[k].framing.position.join(",")));
    expect(seen.size).toBe(4);
  });

  it("each page uses a non-'none' flourish", () => {
    for (const k of ["projetos", "stack", "sobre", "contato"] as SceneKey[]) {
      expect(SCENES[k].transition.flourish).not.toBe("none");
    }
  });
});
