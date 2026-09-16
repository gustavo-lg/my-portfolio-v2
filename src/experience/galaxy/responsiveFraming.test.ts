import { describe, it, expect } from "vitest";
import {
  NARROW_VIEWPORT_MAX_WIDTH,
  fitDistance,
  framingForAspect,
  resolveFitForWidth,
} from "./responsiveFraming";
import { SCENES } from "./categoryScenes";
import { ORBITAL_ANCHORS, ORBITAL_ORDER } from "./orbitalAnchors";
import type { CameraFraming } from "./categoryScenes";

const DESKTOP = 1920 / 1080; // 1.778
const PHONE = 390 / 844; // 0.462
const TABLET = 820 / 1180; // 0.695

/** What the camera actually sees at the plane it is looking at. */
function visibleHalfExtents(f: CameraFraming, aspect: number) {
  const d = Math.hypot(
    f.position[0] - f.lookAt[0],
    f.position[1] - f.lookAt[1],
    f.position[2] - f.lookAt[2],
  );
  const halfHeight = d * Math.tan((f.fov * Math.PI) / 360);
  return { x: halfHeight * aspect, y: halfHeight };
}

describe("fitDistance", () => {
  it("is driven by height on a wide viewport", () => {
    const fit = { x: 9.6, y: 6.2 };
    const d = fitDistance(fit, 64, DESKTOP);
    expect(d).toBeCloseTo(6.2 / Math.tan((64 * Math.PI) / 360), 5);
  });

  it("is driven by width on a tall viewport", () => {
    const fit = { x: 9.6, y: 6.2 };
    const t = Math.tan((64 * Math.PI) / 360);
    expect(fitDistance(fit, 64, PHONE)).toBeCloseTo(9.6 / (t * PHONE), 5);
  });

  it("grows as the viewport narrows", () => {
    const fit = { x: 9.6, y: 6.2 };
    const wide = fitDistance(fit, 64, DESKTOP);
    const tall = fitDistance(fit, 64, PHONE);
    expect(tall).toBeGreaterThan(wide);
  });

  it("falls back to the height requirement for a nonsense aspect", () => {
    const fit = { x: 9.6, y: 6.2 };
    const byHeight = 6.2 / Math.tan((64 * Math.PI) / 360);
    expect(fitDistance(fit, 64, 0)).toBeCloseTo(byHeight, 5);
    expect(fitDistance(fit, 64, Number.NaN)).toBeCloseTo(byHeight, 5);
  });
});

describe("framingForAspect", () => {
  const withFit: CameraFraming = {
    position: [0, 1, 16],
    lookAt: [0, 0, 0],
    fov: 64,
    fit: { x: 9.6, y: 6.2 },
  };

  it("returns a framing without a fit untouched", () => {
    const plain: CameraFraming = {
      position: [1, 2, 3],
      lookAt: [0, 0, 0],
      fov: 50,
    };
    expect(framingForAspect(plain, PHONE)).toBe(plain);
  });

  it("leaves a landscape viewport exactly as authored", () => {
    expect(framingForAspect(withFit, DESKTOP)).toBe(withFit);
    expect(framingForAspect(withFit, 1.0)).toBe(withFit);
  });

  it("pulls the camera back on a portrait viewport", () => {
    const out = framingForAspect(withFit, PHONE);
    expect(out.position[2]).toBeGreaterThan(withFit.position[2]);
  });

  it("keeps the shot's angle, changing only the distance", () => {
    const out = framingForAspect(withFit, PHONE);
    const dir = (f: CameraFraming) => {
      const v = [
        f.position[0] - f.lookAt[0],
        f.position[1] - f.lookAt[1],
        f.position[2] - f.lookAt[2],
      ];
      const len = Math.hypot(...v);
      return v.map((c) => c / len);
    };
    const a = dir(withFit);
    const b = dir(out);
    for (let i = 0; i < 3; i++) expect(b[i]).toBeCloseTo(a[i], 10);
  });

  it("carries lookAt, fov and fit through unchanged", () => {
    const out = framingForAspect(withFit, PHONE);
    expect(out.lookAt).toEqual(withFit.lookAt);
    expect(out.fov).toBe(withFit.fov);
    expect(out.fit).toEqual(withFit.fit);
  });

  it("actually covers the requested extent at every aspect tried", () => {
    for (const aspect of [PHONE, TABLET, 1.0, DESKTOP, 21 / 9]) {
      const seen = visibleHalfExtents(framingForAspect(withFit, aspect), aspect);
      expect(seen.x).toBeGreaterThanOrEqual(withFit.fit!.x - 1e-6);
      expect(seen.y).toBeGreaterThanOrEqual(withFit.fit!.y - 1e-6);
    }
  });

  it("survives a degenerate framing", () => {
    const degenerate: CameraFraming = {
      position: [0, 0, 0],
      lookAt: [0, 0, 0],
      fov: 64,
      fit: { x: 9.6, y: 6.2 },
    };
    expect(framingForAspect(degenerate, PHONE)).toBe(degenerate);
  });
});

describe("the home scene fits its own layout", () => {
  const menu = SCENES.menu.framing;

  it("declares a fit", () => {
    expect(menu.fit).toBeDefined();
  });

  it("covers every mini galaxy's centre", () => {
    // If a galaxy is moved further out, this fails and the fit must grow with
    // it — otherwise the mini silently falls off the side of a phone again.
    for (const key of ORBITAL_ORDER) {
      const [x, y] = SCENES[key].center;
      expect(Math.abs(x)).toBeLessThanOrEqual(menu.fit!.x);
      expect(Math.abs(y)).toBeLessThanOrEqual(menu.fit!.y);
    }
  });

  it("covers every label anchor", () => {
    for (const key of ORBITAL_ORDER) {
      const [x, y] = ORBITAL_ANCHORS[key];
      expect(Math.abs(x)).toBeLessThanOrEqual(menu.fit!.x);
      expect(Math.abs(y)).toBeLessThanOrEqual(menu.fit!.y);
    }
  });

  it("keeps every mini on screen on a phone in portrait", () => {
    const seen = visibleHalfExtents(framingForAspect(menu, PHONE), PHONE);
    for (const key of ORBITAL_ORDER) {
      const [x, y] = SCENES[key].center;
      expect(Math.abs(x)).toBeLessThanOrEqual(seen.x);
      expect(Math.abs(y)).toBeLessThanOrEqual(seen.y);
    }
  });

  it("does not change the desktop composition", () => {
    expect(framingForAspect(menu, DESKTOP)).toBe(menu);
  });

  it("fitNarrow also covers every mini centre and label anchor, with room to spare", () => {
    const withNarrow = { ...menu, fit: menu.fitNarrow! };
    for (const key of ORBITAL_ORDER) {
      const [cx, cy] = SCENES[key].center;
      const [ax, ay] = ORBITAL_ANCHORS[key];
      expect(Math.abs(cx)).toBeLessThanOrEqual(withNarrow.fit.x);
      expect(Math.abs(cy)).toBeLessThanOrEqual(withNarrow.fit.y);
      expect(Math.abs(ax)).toBeLessThanOrEqual(withNarrow.fit.x);
      expect(Math.abs(ay)).toBeLessThanOrEqual(withNarrow.fit.y);
    }
  });

  it("keeps every mini on screen on a phone once fitNarrow is applied", () => {
    const resolved = resolveFitForWidth(menu, 390);
    const seen = visibleHalfExtents(framingForAspect(resolved, PHONE), PHONE);
    for (const key of ORBITAL_ORDER) {
      const [x, y] = SCENES[key].center;
      expect(Math.abs(x)).toBeLessThanOrEqual(seen.x);
      expect(Math.abs(y)).toBeLessThanOrEqual(seen.y);
    }
  });
});

describe("resolveFitForWidth", () => {
  const withFitNarrow: CameraFraming = {
    position: [0, 1, 16],
    lookAt: [0, 0, 0],
    fov: 64,
    fit: { x: 9.6, y: 6.2 },
    fitNarrow: { x: 11.5, y: 7.4 },
  };

  it("swaps in fitNarrow below the breakpoint", () => {
    const out = resolveFitForWidth(withFitNarrow, 390);
    expect(out.fit).toEqual(withFitNarrow.fitNarrow);
  });

  it("leaves fit alone at or above the breakpoint", () => {
    expect(resolveFitForWidth(withFitNarrow, NARROW_VIEWPORT_MAX_WIDTH)).toBe(
      withFitNarrow,
    );
    expect(resolveFitForWidth(withFitNarrow, 1920)).toBe(withFitNarrow);
  });

  it("is a no-op for a scene with no fitNarrow, even on a phone", () => {
    const noNarrow: CameraFraming = {
      position: [1, 2, 3],
      lookAt: [0, 0, 0],
      fov: 60,
      fit: { x: 5, y: 3 },
    };
    expect(resolveFitForWidth(noNarrow, 390)).toBe(noNarrow);
  });

  it("is a no-op for a scene with neither fit nor fitNarrow", () => {
    const plain: CameraFraming = { position: [1, 2, 3], lookAt: [0, 0, 0], fov: 60 };
    expect(resolveFitForWidth(plain, 390)).toBe(plain);
  });

  it("composes with framingForAspect exactly like GalaxyCamera.tsx does", () => {
    const resolved = resolveFitForWidth(withFitNarrow, 390);
    const out = framingForAspect(resolved, PHONE);
    expect(out.position[2]).toBeGreaterThan(withFitNarrow.position[2]);
    // Pulled back further than the plain (non-narrow) fit would require.
    const plainOut = framingForAspect(withFitNarrow, PHONE);
    expect(out.position[2]).toBeGreaterThan(plainOut.position[2]);
  });
});
