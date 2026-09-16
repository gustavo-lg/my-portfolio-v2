import { describe, it, expect } from "vitest";
import {
  generateTargetPositions,
  generateDispersedPositions,
  generateColors,
  galaxyDisk,
  galaxyField,
  galaxyFieldSplit,
  stratify,
  CORE_FRACTION,
  CORE_RADIUS,
  DISPERSED_RADIUS,
  deformPositions,
  type Deformation,
  type DiskParams,
} from "./particleGeometry";
import { LADDER } from "@/experience/lib/qualityLadder";

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

describe("galaxyDisk", () => {
  const P: DiskParams = {
    bulge: 1.5,
    outer: 9,
    thickness: 0.4,
    arms: 2,
    twist: 3,
    armStrength: 0.6,
    warp: 0.5,
    tilt: [0.9, 0.1, 0.2],
  };

  it("returns count*3 floats and is deterministic per seed", () => {
    expect(galaxyDisk(N, P, 4).length).toBe(N * 3);
    expect(Array.from(galaxyDisk(500, P, 4))).toEqual(
      Array.from(galaxyDisk(500, P, 4)),
    );
  });

  it("packs a dense bulge near the centre", () => {
    const p = galaxyDisk(N, P, 4);
    let inBulge = 0;
    for (let i = 0; i < N; i++) {
      const d = Math.hypot(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      if (d < P.bulge) inBulge++;
    }
    // The bulge slice alone is ~20% of the points.
    expect(inBulge / N).toBeGreaterThan(0.12);
  });

  it("halo stars reach past the disk but stay bounded", () => {
    const p = galaxyDisk(N, P, 4);
    let maxD = 0;
    for (let i = 0; i < N; i++) {
      const d = Math.hypot(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
      maxD = Math.max(maxD, d);
      expect(d).toBeLessThan(P.outer * 2);
    }
    expect(maxD).toBeGreaterThan(P.outer);
  });
});

describe("galaxyField", () => {
  const P: DiskParams = {
    bulge: 1.2,
    outer: 8,
    thickness: 0.4,
    arms: 2,
    twist: 3,
    armStrength: 0.5,
    warp: 0.6,
    tilt: [0.9, 0, 0.1],
  };

  it("returns count*3 floats and places minis around their centres", () => {
    const minis = [
      { params: P, center: [20, 0, 0] as [number, number, number] },
      { params: P, center: [-20, 0, 0] as [number, number, number] },
    ];
    const buf = galaxyField(3000, P, minis);
    expect(buf.length).toBe(3000 * 3);
    // Some particles must have landed near each mini centre.
    let nearRight = 0;
    let nearLeft = 0;
    for (let i = 0; i < 3000; i++) {
      if (buf[i * 3] > 12) nearRight++;
      if (buf[i * 3] < -12) nearLeft++;
    }
    expect(nearRight).toBeGreaterThan(0);
    expect(nearLeft).toBeGreaterThan(0);
  });
});

describe("stratify", () => {
  const P: DiskParams = {
    bulge: 1.5,
    outer: 9,
    thickness: 0.4,
    arms: 2,
    twist: 3,
    armStrength: 0.6,
    warp: 0.5,
    tilt: [0.9, 0.1, 0.2],
  };

  function zoneFractions(buf: Float32Array, count: number, bulge: number, outer: number) {
    let inBulge = 0;
    let inDisk = 0;
    let inHalo = 0;
    for (let i = 0; i < count; i++) {
      const d = Math.hypot(buf[i * 3], buf[i * 3 + 1], buf[i * 3 + 2]);
      if (d < bulge) inBulge++;
      else if (d <= outer) inDisk++;
      else inHalo++;
    }
    return { bulge: inBulge / count, disk: inDisk / count, halo: inHalo / count };
  }

  it("is a permutation: same multiset of triples, nothing duplicated or lost", () => {
    const buf = galaxyDisk(N, P, 4);
    const before = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const key = `${buf[i * 3]},${buf[i * 3 + 1]},${buf[i * 3 + 2]}`;
      before.set(key, (before.get(key) ?? 0) + 1);
    }
    stratify(buf, N, 42);
    const after = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const key = `${buf[i * 3]},${buf[i * 3 + 1]},${buf[i * 3 + 2]}`;
      after.set(key, (after.get(key) ?? 0) + 1);
    }
    expect(after.size).toBe(before.size);
    for (const [key, count] of before) {
      expect(after.get(key)).toBe(count);
    }
  });

  it("is deterministic for a given seed", () => {
    const a = galaxyDisk(N, P, 4);
    const b = galaxyDisk(N, P, 4);
    stratify(a, N, 42);
    stratify(b, N, 42);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("preserves zone proportions in any prefix of the shuffled buffer", () => {
    const buf = galaxyDisk(N, P, 4);
    const full = zoneFractions(buf, N, P.bulge, P.outer);
    stratify(buf, N, 7);

    for (const frac of [0.3, 0.6]) {
      const prefixCount = Math.floor(N * frac);
      const sample = zoneFractions(buf, prefixCount, P.bulge, P.outer);
      expect(Math.abs(sample.bulge - full.bulge)).toBeLessThanOrEqual(0.03);
      expect(Math.abs(sample.disk - full.disk)).toBeLessThanOrEqual(0.03);
      expect(Math.abs(sample.halo - full.halo)).toBeLessThanOrEqual(0.03);
    }
  });
});

describe("galaxyFieldSplit drawn count matches the ladder", () => {
  it("min(alloc.main, want.main) + minis * min(alloc.mini, want.mini) equals the live split total", () => {
    const minis = 4;
    for (const allocRung of LADDER) {
      const alloc = galaxyFieldSplit(allocRung.particleCount, minis, 3);
      for (const currentRung of LADDER) {
        if (currentRung.particleCount > allocRung.particleCount) continue;
        const want = galaxyFieldSplit(currentRung.particleCount, minis, 3);
        const mainDrawn = Math.min(alloc.main, want.main);
        const miniDrawn = Math.min(alloc.mini, want.mini);
        const drawnTotal = mainDrawn + minis * miniDrawn;
        expect(drawnTotal).toBe(want.total);
      }
    }
  });
});
