import { describe, it, expect } from "vitest";
import {
  lerpPositions,
  idleOffset,
  applyGalaxyDeformation,
} from "./particleMath";

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

describe("applyGalaxyDeformation", () => {
  const frame = {
    cx: -7.8,
    cy: 4.3,
    cz: 0.8,
    nx: 0,
    ny: 1,
    nz: 0,
  };

  it("does not mutate when intensity is 0 or scene is menu", () => {
    const orig = new Float32Array([-7.8, 4.3, 0.8, -6.8, 4.3, 1.8]);
    const pos = Float32Array.from(orig);

    // intensity 0
    applyGalaxyDeformation(pos, 0, 2, "projetos", 0, 1.0, frame);
    expect(Array.from(pos)).toEqual(Array.from(orig));

    // scene menu
    applyGalaxyDeformation(pos, 0, 2, "menu", 1.0, 1.0, frame);
    expect(Array.from(pos)).toEqual(Array.from(orig));
  });

  it("applies unique distinct deformations for each category scene", () => {
    const categories = ["projetos", "stack", "sobre", "contato"] as const;
    const deformedResults: Record<string, Float32Array> = {};

    for (const cat of categories) {
      const pos = new Float32Array([
        frame.cx + 1.0,
        frame.cy,
        frame.cz + 1.0,
        frame.cx - 1.5,
        frame.cy + 0.2,
        frame.cz - 0.5,
      ]);
      const initial = Float32Array.from(pos);

      applyGalaxyDeformation(pos, 0, 2, cat, 1.0, 2.0, frame);

      // Verify it modified the positions without producing NaN or Inf
      expect(Array.from(pos)).not.toEqual(Array.from(initial));
      for (let i = 0; i < pos.length; i++) {
        expect(Number.isFinite(pos[i])).toBe(true);
      }
      deformedResults[cat] = pos;
    }

    // Verify all 4 deformations produce distinct outputs from each other
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const catA = categories[i];
        const catB = categories[j];
        expect(Array.from(deformedResults[catA])).not.toEqual(
          Array.from(deformedResults[catB]),
        );
      }
    }
  });

  it("smoothly scales deformation magnitude with intensity", () => {
    const base = new Float32Array([frame.cx + 2.0, frame.cy, frame.cz + 1.5]);

    const posLow = Float32Array.from(base);
    applyGalaxyDeformation(posLow, 0, 1, "projetos", 0.3, 1.0, frame);

    const posHigh = Float32Array.from(base);
    applyGalaxyDeformation(posHigh, 0, 1, "projetos", 1.0, 1.0, frame);

    const distLow = Math.hypot(
      posLow[0] - base[0],
      posLow[1] - base[1],
      posLow[2] - base[2],
    );
    const distHigh = Math.hypot(
      posHigh[0] - base[0],
      posHigh[1] - base[1],
      posHigh[2] - base[2],
    );

    expect(distHigh).toBeGreaterThan(distLow);
  });
});
