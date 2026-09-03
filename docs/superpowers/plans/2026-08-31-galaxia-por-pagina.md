# Galáxia por página — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each of the 4 category pages its own camera vantage point, its own "weather" deformation of the base nebula, and its own transition personality — plus keep the home menu as the anchor scene everything departs from and returns to.

**Architecture:** A `categoryScenes.ts` data module describes every scene (`"menu" | "projetos" | "stack" | "sobre" | "contato"`). `ParticleField` stops being formation-specific and becomes a shape-driven morph engine: hand it a target `Float32Array` + morph params and it tweens the live buffer there. `GalaxyCamera` gets a generalized `flyTo(framing, opts)`. `ExperienceShell` resolves the active scene from route + machine state and drives camera + morph together through the existing choreography orchestrator.

**Tech Stack:** React 18, TypeScript, `@react-three/fiber@8`, `three@0.160`, `gsap@3`, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-31-galaxia-por-pagina-design.md`

## Global Constraints

- Same particle count across all 5 shapes (morphs are `lerpPositions` between equal-length arrays) — hard constraint from the spec.
- No colour/hue change per page. No changes to `ContentArea` page-swing (`page-in`/`page-out`). No GLSL. No per-page variants of `GalaxyBackdrop`.
- `SceneKey = CategoryKey | "menu"`. `CategoryKey = "projetos" | "stack" | "sobre" | "contato"` (from `src/content/types.ts`, do not redefine).
- `menu` scene = today's exact values: `framing { position [0,0,13], lookAt [0,0,0], fov 55 }`, `deform.scale [1,1,1]`, `spin { axis "z", speed 0.05, wobble 0.06 }`, `pointSize 0.042`, `pointOpacity 0.72`, transition `{ camera 2200ms power2.inOut, morph 2200ms power2.inOut, flourish "none" }`.
- Under `reducedMotion`: morphs snap (`duration 0`), `flyTo` instant, no flourish. The `reducedMotion` flag is already threaded into `ParticleField` and `GalaxyCamera`.
- Deep-link to `/stack` forms the particles straight into the stack shape (dispersed → stack, one morph) with the camera starting at the stack framing.
- VER TUDO (`returning`) uses `SCENES.menu.transition` (calm), not the departing page's personality.
- Follow the existing test pattern: pure logic is extracted and unit-tested; R3F components (`ParticleField`, `GalaxyCamera`, `GalaxyCanvas`) have no unit tests and are verified manually with headless Playwright. `@react-three/test-renderer` is NOT installed and must not be added.
- Commit messages end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Run `npm test` (64 tests today) + `npm run build` + `npx tsc --noEmit` green before each commit.

---

## File Structure

### New
- `src/experience/galaxy/categoryScenes.ts` — `SceneKey`, `Scene`, `CameraFraming`, `Deformation`, `Spin`, `SceneTransition` types + `SCENES` record + `SCENE_ORDER`.
- `src/experience/galaxy/categoryScenes.test.ts` — config validity.
- `src/experience/galaxy/particleMorph.ts` — pure morph helpers: `flourishTarget`, `morphInto`.
- `src/experience/galaxy/particleMorph.test.ts`.

### Modified
- `src/experience/galaxy/particleGeometry.ts` — add `deformPositions`; keep everything else.
- `src/experience/galaxy/particleGeometry.test.ts` — add `deformPositions` cases.
- `src/experience/galaxy/cameraTargets.ts` — remove `CAMERA_FRAMINGS` and `CameraFraming` (move type to `categoryScenes.ts`); keep `Vec3`, `FORMATION_MS`, `CAMERA_MS`.
- `src/experience/galaxy/cameraTargets.test.ts` — drop the `CAMERA_FRAMINGS` cases; keep the duration cases.
- `src/experience/galaxy/GalaxyCamera.tsx` — `flyTo(framing, opts)` replaces `focusCenter`/`focusSide`; `initial` prop becomes `SceneKey`.
- `src/experience/galaxy/ParticleField.tsx` — full rewrite as a shape-driven morph engine.
- `src/experience/galaxy/GalaxyCanvas.tsx` — `activeScene: SceneKey` prop; builds the 5 shapes; wires scene → `ParticleField` + `GalaxyCamera`.
- `src/experience/OrbitalExperience.tsx` — `activeScene` state + `goToScene`; rewire the orchestrator's `navigating` / `returning` branches + a new `internal-page` branch.
- `src/experience/OrbitalExperience.test.tsx` — assert the (mocked) `GalaxyCanvas` receives the right `activeScene` per route.

### Unchanged
`ContentArea.tsx`, `BottomNav.tsx`, `BackButton.tsx`, `ExperienceOverlay.tsx`, `smoothScrollToTop.ts`, `pageTransition.ts`, `useAnchorProjection.tsx`, `GalaxyBackdrop.tsx`, the state machine, `perfTier.ts`.

---

## Task 1: `deformPositions` — base nebula → per-page shape

**Files:**
- Modify: `src/experience/galaxy/particleGeometry.ts`
- Test: `src/experience/galaxy/particleGeometry.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `interface Deformation { scale: [number, number, number]; shearXY?: number; shearZX?: number; tilt?: [number, number, number] }`
  - `function deformPositions(base: Float32Array, d: Deformation, out: Float32Array): void` — writes `base.length` floats into `out`; per particle applies scale, then shear (`x += (d.shearXY ?? 0) * y0`, `z += (d.shearZX ?? 0) * x0`, using the **original** `x0/y0`), then a rotation around the origin by `tilt` (Z then Y then X order) when `d.tilt` is set. Pure, no three.js.

- [ ] **Step 1: Write the failing test**

Add to `src/experience/galaxy/particleGeometry.test.ts`:

```ts
import { deformPositions, type Deformation } from "./particleGeometry";

describe("deformPositions", () => {
  const base = new Float32Array([1, 2, 3, -4, 0, 5]);

  it("scales each axis independently", () => {
    const out = new Float32Array(6);
    deformPositions(base, { scale: [2, 0.5, 3] }, out);
    expect(Array.from(out)).toEqual([2, 1, 9, -8, 0, 15]);
  });

  it("applies shearXY using the original y before scaling of x", () => {
    const out = new Float32Array(6);
    deformPositions(base, { scale: [1, 1, 1], shearXY: 0.5 }, out);
    // particle 0: x = 1*1 + 0.5*2 = 2 ; particle 1: x = -4 + 0.5*0 = -4
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
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run src/experience/galaxy/particleGeometry.test.ts`
Expected: FAIL, `deformPositions is not a function`.

- [ ] **Step 3: Implement**

Append to `src/experience/galaxy/particleGeometry.ts`:

```ts
export interface Deformation {
  scale: [number, number, number];
  shearXY?: number;
  shearZX?: number;
  tilt?: [number, number, number];
}

/** base nebula positions -> a per-page deformed shape. Pure, no three.js. */
export function deformPositions(
  base: Float32Array,
  d: Deformation,
  out: Float32Array,
): void {
  const [sx, sy, sz] = d.scale;
  const shearXY = d.shearXY ?? 0;
  const shearZX = d.shearZX ?? 0;
  const [tx, ty, tz] = d.tilt ?? [0, 0, 0];
  const cx = Math.cos(tx),
    sxx = Math.sin(tx);
  const cy = Math.cos(ty),
    syy = Math.sin(ty);
  const cz = Math.cos(tz),
    szz = Math.sin(tz);

  for (let i = 0; i < base.length; i += 3) {
    const x0 = base[i];
    const y0 = base[i + 1];
    const z0 = base[i + 2];

    let x = x0 * sx + shearXY * y0;
    let y = y0 * sy;
    let z = z0 * sz + shearZX * x0;

    if (tx || ty || tz) {
      // Z
      let nx = x * cz - y * szz;
      let ny = x * szz + y * cz;
      x = nx;
      y = ny;
      // Y
      nx = x * cy + z * syy;
      let nz = -x * syy + z * cy;
      x = nx;
      z = nz;
      // X
      ny = y * cx - z * sxx;
      nz = y * sxx + z * cx;
      y = ny;
      z = nz;
    }

    out[i] = x;
    out[i + 1] = y;
    out[i + 2] = z;
  }
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npx vitest run src/experience/galaxy/particleGeometry.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/experience/galaxy/particleGeometry.ts src/experience/galaxy/particleGeometry.test.ts
git commit -m "feat: deformPositions — deform the base nebula per page

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: `categoryScenes.ts` — the scene config

**Files:**
- Create: `src/experience/galaxy/categoryScenes.ts`, `src/experience/galaxy/categoryScenes.test.ts`
- Modify: `src/experience/galaxy/cameraTargets.ts`, `src/experience/galaxy/cameraTargets.test.ts`

**Interfaces:**
- Consumes: `type CategoryKey` from `@/content/types`; `type Vec3`, `FORMATION_MS`, `CAMERA_MS` from `./cameraTargets`; `type Deformation` from `./particleGeometry`.
- Produces:
  - `type SceneKey = CategoryKey | "menu"`
  - `interface CameraFraming { position: Vec3; lookAt: Vec3; fov: number }`
  - `interface Spin { axis: "x" | "y" | "z"; speed: number; wobble?: number }`
  - `type Flourish = "none" | "fling" | "gather" | "rise" | "sweep"`
  - `interface SceneTransition { camera: { duration: number; ease: string }; morph: { duration: number; ease: string }; flourish: Flourish }`
  - `interface Scene { framing: CameraFraming; deform: Deformation; spin: Spin; pointSize: number; pointOpacity: number; transition: SceneTransition }`
  - `const SCENES: Record<SceneKey, Scene>`
  - `const SCENE_ORDER: SceneKey[]` = `["menu", "projetos", "stack", "sobre", "contato"]`

- [ ] **Step 1: Write the failing test**

`src/experience/galaxy/categoryScenes.test.ts`:

```ts
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
```

- [ ] **Step 2: Run — expect FAIL** (`npx vitest run src/experience/galaxy/categoryScenes.test.ts`) — module not found.

- [ ] **Step 3: Implement `src/experience/galaxy/categoryScenes.ts`**

```ts
import type { CategoryKey } from "@/content/types";
import type { Deformation } from "./particleGeometry";
import { CAMERA_MS, type Vec3 } from "./cameraTargets";

export type SceneKey = CategoryKey | "menu";

export interface CameraFraming {
  position: Vec3;
  lookAt: Vec3;
  fov: number;
}

export interface Spin {
  axis: "x" | "y" | "z";
  speed: number;
  wobble?: number;
}

export type Flourish = "none" | "fling" | "gather" | "rise" | "sweep";

export interface SceneTransition {
  camera: { duration: number; ease: string };
  morph: { duration: number; ease: string };
  flourish: Flourish;
}

export interface Scene {
  framing: CameraFraming;
  deform: Deformation;
  spin: Spin;
  pointSize: number;
  pointOpacity: number;
  transition: SceneTransition;
}

const CALM: SceneTransition = {
  camera: { duration: CAMERA_MS, ease: "power2.inOut" },
  morph: { duration: 2200, ease: "power2.inOut" },
  flourish: "none",
};

export const SCENES: Record<SceneKey, Scene> = {
  menu: {
    framing: { position: [0, 0, 13], lookAt: [0, 0, 0], fov: 55 },
    deform: { scale: [1, 1, 1] },
    spin: { axis: "z", speed: 0.05, wobble: 0.06 },
    pointSize: 0.042,
    pointOpacity: 0.72,
    transition: CALM,
  },

  projetos: {
    framing: { position: [-7, 1.2, 19], lookAt: [-3.5, 0, 0], fov: 58 },
    deform: { scale: [1.5, 0.55, 1.1] },
    spin: { axis: "z", speed: 0.07, wobble: 0.03 },
    pointSize: 0.04,
    pointOpacity: 0.68,
    transition: {
      camera: { duration: 2400, ease: "power3.out" },
      morph: { duration: 2400, ease: "power2.out" },
      flourish: "fling",
    },
  },

  stack: {
    framing: { position: [0, 0.5, 9.5], lookAt: [0, 0.5, 0], fov: 42 },
    deform: { scale: [0.6, 1.7, 0.6] },
    spin: { axis: "y", speed: 0.12, wobble: 0.02 },
    pointSize: 0.046,
    pointOpacity: 0.78,
    transition: {
      camera: { duration: 2600, ease: "power2.inOut" },
      morph: { duration: 2600, ease: "power2.inOut" },
      flourish: "rise",
    },
  },

  sobre: {
    framing: { position: [2.5, -4, 13], lookAt: [0, 1.5, 0], fov: 55 },
    deform: { scale: [1.05, 1.6, 1.05], tilt: [0.18, 0, 0] },
    spin: { axis: "y", speed: 0.04, wobble: 0.08 },
    pointSize: 0.044,
    pointOpacity: 0.74,
    transition: {
      camera: { duration: 2300, ease: "power2.inOut" },
      morph: { duration: 2300, ease: "power2.inOut" },
      flourish: "gather",
    },
  },

  contato: {
    framing: { position: [6.5, 1.5, 15], lookAt: [-2, 0, 0], fov: 60 },
    deform: { scale: [1.2, 0.8, 1.2], shearXY: 0.4, tilt: [0, 0, 0.3] },
    spin: { axis: "z", speed: 0.1, wobble: 0.04 },
    pointSize: 0.041,
    pointOpacity: 0.7,
    transition: {
      camera: { duration: 2200, ease: "power2.out" },
      morph: { duration: 2200, ease: "power2.out" },
      flourish: "sweep",
    },
  },
};

export const SCENE_ORDER: SceneKey[] = [
  "menu",
  "projetos",
  "stack",
  "sobre",
  "contato",
];
```

- [ ] **Step 4: Trim `cameraTargets.ts`**

Rewrite `src/experience/galaxy/cameraTargets.ts` to:

```ts
export type Vec3 = [number, number, number];

export const FORMATION_MS = 4400;
export const CAMERA_MS = 2200;
```

(`CameraFraming` and `CAMERA_FRAMINGS` are gone — the type moved to `categoryScenes.ts`, the framings live in `SCENES`.)

- [ ] **Step 5: Fix `cameraTargets.test.ts`**

Replace the file with:

```ts
import { describe, it, expect } from "vitest";
import { FORMATION_MS, CAMERA_MS } from "./cameraTargets";

describe("camera timing", () => {
  it("has positive animation durations", () => {
    expect(FORMATION_MS).toBeGreaterThan(0);
    expect(CAMERA_MS).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 6: Run — expect PASS** (`npx vitest run src/experience/galaxy/`) and `npx tsc --noEmit`.

Expect tsc errors in `GalaxyCamera.tsx` / `GalaxyCanvas.tsx` (they still import `CAMERA_FRAMINGS`) — those are fixed in Tasks 3 and 5. If you are running tasks in order, `tsc` is allowed to fail here on those two files only; `npm test` must pass.

- [ ] **Step 7: Commit**

```bash
git add src/experience/galaxy/categoryScenes.ts src/experience/galaxy/categoryScenes.test.ts src/experience/galaxy/cameraTargets.ts src/experience/galaxy/cameraTargets.test.ts
git commit -m "feat: categoryScenes config + trim cameraTargets

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: `particleMorph.ts` — flourish + morph interpolation

**Files:**
- Create: `src/experience/galaxy/particleMorph.ts`, `src/experience/galaxy/particleMorph.test.ts`

**Interfaces:**
- Consumes: `type Flourish` from `./categoryScenes`; `lerpPositions` from `./particleMath`.
- Produces:
  - `function flourishTarget(shape: Float32Array, kind: Flourish, out: Float32Array): void` — writes the exaggerated mid-morph target. `none` → copy of `shape`. `fling` → each component `* 1.35`. `gather` → `* 0.6`. `rise` → `y += 3.5`. `sweep` → `x += 0.5 * y`.
  - `const FLOURISH_SPLIT = 0.55`
  - `function morphInto(from: Float32Array, overshoot: Float32Array, shape: Float32Array, t: number, kind: Flourish, out: Float32Array): void` — the per-frame position writer. `kind === "none"` → `lerpPositions(from, shape, t, out)`. Otherwise piecewise: `t <= FLOURISH_SPLIT` → `lerpPositions(from, overshoot, t / FLOURISH_SPLIT, out)`; else → `lerpPositions(overshoot, shape, (t - FLOURISH_SPLIT) / (1 - FLOURISH_SPLIT), out)`. Continuous at the split (both sides give `overshoot`).

- [ ] **Step 1: Write the failing test**

`src/experience/galaxy/particleMorph.test.ts`:

```ts
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
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement `src/experience/galaxy/particleMorph.ts`**

```ts
import { lerpPositions } from "./particleMath";
import type { Flourish } from "./categoryScenes";

export const FLOURISH_SPLIT = 0.55;

export function flourishTarget(
  shape: Float32Array,
  kind: Flourish,
  out: Float32Array,
): void {
  switch (kind) {
    case "fling":
      for (let i = 0; i < shape.length; i++) out[i] = shape[i] * 1.35;
      return;
    case "gather":
      for (let i = 0; i < shape.length; i++) out[i] = shape[i] * 0.6;
      return;
    case "rise":
      for (let i = 0; i < shape.length; i += 3) {
        out[i] = shape[i];
        out[i + 1] = shape[i + 1] + 3.5;
        out[i + 2] = shape[i + 2];
      }
      return;
    case "sweep":
      for (let i = 0; i < shape.length; i += 3) {
        out[i] = shape[i] + 0.5 * shape[i + 1];
        out[i + 1] = shape[i + 1];
        out[i + 2] = shape[i + 2];
      }
      return;
    default:
      out.set(shape);
  }
}

export function morphInto(
  from: Float32Array,
  overshoot: Float32Array,
  shape: Float32Array,
  t: number,
  kind: Flourish,
  out: Float32Array,
): void {
  if (kind === "none") {
    lerpPositions(from, shape, t, out);
    return;
  }
  if (t <= FLOURISH_SPLIT) {
    lerpPositions(from, overshoot, t / FLOURISH_SPLIT, out);
  } else {
    lerpPositions(overshoot, shape, (t - FLOURISH_SPLIT) / (1 - FLOURISH_SPLIT), out);
  }
}
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/experience/galaxy/particleMorph.ts src/experience/galaxy/particleMorph.test.ts
git commit -m "feat: particle morph + flourish helpers

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: `GalaxyCamera` — generalized `flyTo`

**Files:**
- Modify: `src/experience/galaxy/GalaxyCamera.tsx`

**Interfaces:**
- Consumes: `type CameraFraming`, `type SceneKey`, `SCENES` from `./categoryScenes`.
- Produces:
  - `interface GalaxyCameraApi { flyTo: (framing: CameraFraming, opts: { duration: number; ease: string; instant?: boolean }) => Promise<void> }`
  - `useGalaxyCamera(): GalaxyCameraApi`
  - `<GalaxyCamera initial={SceneKey} />` — applies `SCENES[initial].framing` (position + lookAt + fov) instantly on mount.

- [ ] **Step 1: Rewrite `src/experience/galaxy/GalaxyCamera.tsx`**

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { SCENES, type CameraFraming, type SceneKey } from "./categoryScenes";

export interface GalaxyCameraApi {
  flyTo: (
    framing: CameraFraming,
    opts: { duration: number; ease: string; instant?: boolean },
  ) => Promise<void>;
}

const noop: GalaxyCameraApi = { flyTo: () => Promise.resolve() };

const CameraCtx = createContext<React.MutableRefObject<GalaxyCameraApi>>({
  current: noop,
});

export function GalaxyCameraProvider({ children }: { children: ReactNode }) {
  const ref = useRef<GalaxyCameraApi>(noop);
  return <CameraCtx.Provider value={ref}>{children}</CameraCtx.Provider>;
}

export function useGalaxyCamera(): GalaxyCameraApi {
  const ref = useContext(CameraCtx);
  return useMemo(() => ({ flyTo: (f, o) => ref.current.flyTo(f, o) }), [ref]);
}

export function GalaxyCamera({ initial = "menu" }: { initial?: SceneKey }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const apiRef = useContext(CameraCtx);
  const lookAt = useRef(new THREE.Vector3());
  const initialRef = useRef(initial);

  useEffect(() => {
    const apply = (f: CameraFraming) => {
      camera.position.set(...f.position);
      lookAt.current.set(...f.lookAt);
      camera.fov = f.fov;
      camera.updateProjectionMatrix();
      camera.lookAt(lookAt.current);
    };

    apply(SCENES[initialRef.current].framing);

    const flyTo: GalaxyCameraApi["flyTo"] = (f, o) =>
      new Promise<void>((resolve) => {
        if (o.instant || o.duration <= 0) {
          apply(f);
          resolve();
          return;
        }
        const secs = o.duration / 1000;
        const sync = () => {
          camera.updateProjectionMatrix();
          camera.lookAt(lookAt.current);
        };
        gsap.to(camera.position, {
          x: f.position[0],
          y: f.position[1],
          z: f.position[2],
          duration: secs,
          ease: o.ease,
          overwrite: true,
          onUpdate: sync,
        });
        gsap.to(camera, {
          fov: f.fov,
          duration: secs,
          ease: o.ease,
          overwrite: true,
          onUpdate: sync,
        });
        gsap.to(lookAt.current, {
          x: f.lookAt[0],
          y: f.lookAt[1],
          z: f.lookAt[2],
          duration: secs,
          ease: o.ease,
          overwrite: true,
          onUpdate: sync,
          onComplete: () => resolve(),
        });
      });

    apiRef.current = { flyTo };
    return () => {
      apiRef.current = noop;
    };
  }, [camera, apiRef]);

  return null;
}
```

- [ ] **Step 2: Typecheck the file**

Run: `npx tsc --noEmit 2>&1 | grep GalaxyCamera`
Expected: no output (errors remain only in `GalaxyCanvas.tsx` and `OrbitalExperience.tsx` until Tasks 5–6).

- [ ] **Step 3: Commit**

```bash
git add src/experience/galaxy/GalaxyCamera.tsx
git commit -m "feat: GalaxyCamera.flyTo — generalized camera move with fov

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: `ParticleField` — shape-driven morph engine

**Files:**
- Modify: `src/experience/galaxy/ParticleField.tsx`

**Interfaces:**
- Consumes: `generateDispersedPositions`, `generateColors` from `./particleGeometry`; `idleOffset` from `./particleMath`; `flourishTarget`, `morphInto` from `./particleMorph`; `getParticleTexture` from `./particleTexture`; `FORMATION_MS` from `./cameraTargets`; `type Spin`, `type Flourish` from `./categoryScenes`.
- Produces: `<ParticleField>` with props:

```ts
interface Props {
  count: number;
  reducedMotion: boolean;
  idle: boolean;
  shape: Float32Array;           // resting positions for the active scene
  spin: Spin;
  pointSize: number;
  pointOpacity: number;
  morphDuration: number;         // ms; ignored for the first (formation) morph
  morphEase: string;
  flourish: Flourish;
  onFormed?: () => void;
}
```

- [ ] **Step 1: Rewrite `src/experience/galaxy/ParticleField.tsx`**

```tsx
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import {
  generateDispersedPositions,
  generateColors,
} from "./particleGeometry";
import { idleOffset } from "./particleMath";
import { flourishTarget, morphInto } from "./particleMorph";
import { getParticleTexture } from "./particleTexture";
import { FORMATION_MS } from "./cameraTargets";
import type { Spin, Flourish } from "./categoryScenes";

interface Props {
  count: number;
  reducedMotion: boolean;
  idle: boolean;
  shape: Float32Array;
  spin: Spin;
  pointSize: number;
  pointOpacity: number;
  morphDuration: number;
  morphEase: string;
  flourish: Flourish;
  onFormed?: () => void;
}

export function ParticleField({
  count,
  reducedMotion,
  idle,
  shape,
  spin,
  pointSize,
  pointOpacity,
  morphDuration,
  morphEase,
  flourish,
  onFormed,
}: Props) {
  const pointsRef = useRef<THREE.Points>(null);

  const dispersed = useMemo(() => generateDispersedPositions(count), [count]);
  const colors = useMemo(() => generateColors(count, shape), [count]); // hue by distance; stable enough
  const live = useMemo(() => Float32Array.from(dispersed), [dispersed]);

  const fromRef = useRef<Float32Array>(Float32Array.from(dispersed));
  const overshootRef = useRef<Float32Array>(new Float32Array(count * 3));
  const targetRef = useRef<Float32Array>(shape);
  const flourishRef = useRef<Flourish>("none");
  const morph = useRef({ t: reducedMotion ? 1 : 0 });
  const formed = useRef(false);
  const spinSpeed = useRef(0);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  // Start / restart a morph whenever the target shape changes.
  useEffect(() => {
    const first = !formed.current;
    targetRef.current = shape;
    flourishRef.current = first ? "none" : flourish;
    flourishTarget(shape, flourishRef.current, overshootRef.current);
    fromRef.current = Float32Array.from(live);
    morph.current.t = 0;
    tweenRef.current?.kill();

    const finish = () => {
      if (!formed.current) {
        formed.current = true;
        onFormed?.();
      }
    };

    if (reducedMotion) {
      morph.current.t = 1;
      finish();
      return;
    }

    const durMs = first ? FORMATION_MS : morphDuration;
    const ease = first ? "power1.inOut" : morphEase;
    tweenRef.current = gsap.to(morph.current, {
      t: 1,
      duration: Math.max(0.001, durMs / 1000),
      ease,
      overwrite: true,
      onComplete: finish,
    });
    return () => {
      tweenRef.current?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    if (!points) return;

    const attr = points.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;

    morphInto(
      fromRef.current,
      overshootRef.current,
      targetRef.current,
      morph.current.t,
      flourishRef.current,
      arr,
    );
    live.set(arr);

    const atRest = morph.current.t >= 1;

    if (!reducedMotion && atRest && idle) {
      const time = state.clock.elapsedTime;
      for (let i = 0; i < count; i++) {
        const [ox, oy, oz] = idleOffset(i, time, 0);
        arr[i * 3] += ox;
        arr[i * 3 + 1] += oy;
        arr[i * 3 + 2] += oz;
      }
    }

    if (!reducedMotion && formed.current) {
      // Ease the spin rate toward the active scene's, don't snap.
      spinSpeed.current += (spin.speed - spinSpeed.current) * Math.min(1, delta * 1.5);
      points.rotation[spin.axis] += delta * spinSpeed.current;
      const w = spin.wobble ?? 0;
      const other = spin.axis === "y" ? "x" : "y";
      points.rotation[other] = Math.sin(state.clock.elapsedTime * 0.12) * w;
    }

    attr.needsUpdate = true;
  });

  return (
    <group>
      <sprite scale={[7.5, 7.5, 7.5]}>
        <spriteMaterial
          map={getParticleTexture()}
          color="#0fbfe8"
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite scale={[2.8, 2.8, 2.8]}>
        <spriteMaterial
          map={getParticleTexture()}
          color="#7d54e6"
          transparent
          opacity={0.28}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      <points ref={pointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[live, 3]}
            count={count}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
            count={count}
          />
        </bufferGeometry>
        <pointsMaterial
          size={pointSize}
          sizeAttenuation
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          map={getParticleTexture()}
          opacity={pointOpacity}
        />
      </points>
    </group>
  );
}
```

Notes for the implementer:
- `colors` is generated from the **menu** shape's distance profile and kept stable across scenes — the hue is "by distance from origin" and the spec forbids per-page hue change, so recomputing per scene is both unnecessary and off-spec. Pass the menu shape's colors. `GalaxyCanvas` (Task 6) owns which array that is; here `generateColors(count, shape)` on first render is fine because the first `shape` IS the menu shape on `/`. For the deep-link case the colours are computed from the stack shape instead — acceptable (still a cyan→purple ramp), and revisited only if it looks wrong in Task 7.
- `pointsMaterial` `size` / `opacity` are props now; React-three-fiber updates them on prop change without remount.
- The morph effect deps are `[shape]` only (by design — `morphDuration`/`morphEase`/`flourish` are read at morph-start time via closure; a mid-morph prop change should not restart it). The eslint-disable is intentional.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit 2>&1 | grep ParticleField`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/experience/galaxy/ParticleField.tsx
git commit -m "feat: ParticleField becomes a shape-driven morph engine

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: `GalaxyCanvas` + `OrbitalExperience` — wire scenes end to end

**Files:**
- Modify: `src/experience/galaxy/GalaxyCanvas.tsx`, `src/experience/OrbitalExperience.tsx`
- Test: `src/experience/OrbitalExperience.test.tsx`

**Interfaces:**
- Consumes: `SCENES`, `type SceneKey` from `@/experience/galaxy/categoryScenes`; `deformPositions` + `generateTargetPositions` from `@/experience/galaxy/particleGeometry`; `useGalaxyCamera` from `@/experience/galaxy/GalaxyCamera`.
- Produces:
  - `<GalaxyCanvas activeScene={SceneKey} idle onFormed onAnchors />` (drops `initialFraming`)
  - `ExperienceShell` internal: `activeScene` state; `goToScene(key: SceneKey): Promise<void>`.

- [ ] **Step 1: Rewrite `src/experience/galaxy/GalaxyCanvas.tsx`**

```tsx
import { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ParticleField } from "./ParticleField";
import { GalaxyCamera } from "./GalaxyCamera";
import {
  AnchorProjector,
  type AnchorScreenPositions,
} from "./useAnchorProjection";
import {
  generateTargetPositions,
  deformPositions,
} from "./particleGeometry";
import { SCENES, SCENE_ORDER, type SceneKey } from "./categoryScenes";
import { useDeviceCapabilities } from "@/experience/lib/useDeviceCapabilities";

interface Props {
  idle: boolean;
  activeScene: SceneKey;
  onFormed?: () => void;
  onAnchors?: (positions: AnchorScreenPositions) => void;
}

export default function GalaxyCanvas({
  idle,
  activeScene,
  onFormed,
  onAnchors,
}: Props) {
  const { tier, reducedMotion } = useDeviceCapabilities();
  const count = tier.particleCount;
  const initialScene = useRef(activeScene).current;

  const shapes = useMemo(() => {
    const base = generateTargetPositions(count);
    const out = {} as Record<SceneKey, Float32Array>;
    for (const key of SCENE_ORDER) {
      const buf = new Float32Array(count * 3);
      deformPositions(base, SCENES[key].deform, buf);
      out[key] = buf;
    }
    return out;
  }, [count]);

  const scene = SCENES[activeScene];

  return (
    <Canvas
      dpr={[1, tier.maxDpr]}
      camera={{ fov: SCENES[initialScene].framing.fov, position: [0, 0, 13] }}
      gl={{ antialias: false, alpha: true }}
      style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
    >
      <GalaxyCamera initial={initialScene} />
      <ParticleField
        count={count}
        reducedMotion={reducedMotion}
        idle={idle}
        shape={shapes[activeScene]}
        spin={scene.spin}
        pointSize={scene.pointSize}
        pointOpacity={scene.pointOpacity}
        morphDuration={reducedMotion ? 0 : scene.transition.morph.duration}
        morphEase={scene.transition.morph.ease}
        flourish={reducedMotion ? "none" : scene.transition.flourish}
        onFormed={onFormed}
      />
      {onAnchors && <AnchorProjector onChange={onAnchors} />}
    </Canvas>
  );
}
```

- [ ] **Step 2: Update `src/experience/OrbitalExperience.tsx`**

Changes:

1. Imports — replace the `SWAP_MS` line group and add scenes:

```ts
import { GalaxyCameraProvider, useGalaxyCamera } from "@/experience/galaxy/GalaxyCamera";
import { SCENES, type SceneKey } from "@/experience/galaxy/categoryScenes";
```

2. In `ExperienceShell`, after `const startAtInternal = Boolean(entryMeta);`:

```ts
  const initialScene: SceneKey = entryMeta ? entryMeta.key : "menu";
  const [activeScene, setActiveScene] = useState<SceneKey>(initialScene);
  const activeSceneRef = useRef<SceneKey>(initialScene);

  const goToScene = useCallback(
    (key: SceneKey) => {
      activeSceneRef.current = key;
      setActiveScene(key);
      return camera.flyTo(SCENES[key].framing, {
        duration: reducedMotion ? 0 : SCENES[key].transition.camera.duration,
        ease: SCENES[key].transition.camera.ease,
        instant: reducedMotion,
      });
    },
    [camera, reducedMotion],
  );
```

3. In the choreography orchestrator effect:

- `navigating` branch — replace `await camera.focusSide({ instant: reducedMotion });` with:

```ts
        await goToScene(ctx.target);
```

- `returning` branch — replace `camera.focusCenter({ instant: reducedMotion }),` inside `Promise.all` with:

```ts
          goToScene("menu"),
```

- Add a new branch (after `returning`), still inside the same effect, before the `return () => { cancelled = true }`:

```ts
    if (
      ctx.state === "internal-page" &&
      ctx.target &&
      ctx.target !== activeSceneRef.current
    ) {
      goToScene(ctx.target);
    }
```

4. Add `goToScene` to the orchestrator effect's dep array (append `, goToScene` — it is stable via `useCallback`).

5. In the JSX, replace:

```tsx
          <GalaxyCanvas
            idle={idleMotion}
            initialFraming={startAtInternal ? "side" : "center"}
            onFormed={handleFormed}
            onAnchors={handleAnchors}
          />
```

with:

```tsx
          <GalaxyCanvas
            idle={idleMotion}
            activeScene={activeScene}
            onFormed={handleFormed}
            onAnchors={handleAnchors}
          />
```

6. `startAtInternal` may now be unused — if `tsc`/eslint flags it, delete the line.

- [ ] **Step 3: Update the integration test**

In `src/experience/OrbitalExperience.test.tsx`, change the `GalaxyCanvas` mock to record props, and add assertions:

```tsx
const galaxyProps: { activeScene?: string }[] = [];
vi.mock("@/experience/galaxy/GalaxyCanvas", () => ({
  default: (props: { activeScene?: string }) => {
    galaxyProps.push({ activeScene: props.activeScene });
    return null;
  },
}));
```

Add a test:

```tsx
it("passes the matching scene to the galaxy per route", () => {
  galaxyProps.length = 0;
  renderAt("/stack");
  expect(galaxyProps.at(-1)?.activeScene).toBe("stack");

  galaxyProps.length = 0;
  renderAt("/");
  expect(galaxyProps.at(-1)?.activeScene).toBe("menu");
});
```

(If the existing mock is a `const` module factory that can't see `galaxyProps` due to hoisting, use `vi.hoisted` to declare `galaxyProps` — Vitest hoists `vi.mock` above imports. Pattern: `const { galaxyProps } = vi.hoisted(() => ({ galaxyProps: [] as any[] }))`.)

- [ ] **Step 4: Full green gate**

Run: `npx tsc --noEmit` → clean.
Run: `npm test` → all pass (was 64; now ~72 with Tasks 1–3 + this).
Run: `npm run build` → succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/experience/galaxy/GalaxyCanvas.tsx src/experience/OrbitalExperience.tsx src/experience/OrbitalExperience.test.tsx
git commit -m "feat: wire per-page galaxy scenes through the orchestrator

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: Manual verification + tune the 4 scenes

**Files:**
- Modify: `src/experience/galaxy/categoryScenes.ts` (numbers only)

This task has no unit tests — it's the visual pass. Use the headless-Playwright pattern already used throughout this repo (`npm i --no-save playwright@1.62.1`, launch chromium with `--use-gl=angle --use-angle=swiftshader`, `reducedMotion: "no-preference"`, screenshot mid-transition, then `npm rm playwright`).

- [ ] **Step 1: Baseline** — `npm run dev`; visit `/`, confirm the menu nebula + framing are visually identical to before this feature (menu scene is the anchor, must not regress).

- [ ] **Step 2: Per-page capture** — for each of `/projetos`, `/stack`, `/sobre`, `/contato`:
  - screenshot the settled page
  - screenshot ~40% through the entering transition (label click from `/`)
  - record `document.querySelector("canvas")` is present and the page renders

- [ ] **Step 3: Assert distinctness** — the 4 settled screenshots must be visually distinct (different nebula silhouette AND different camera angle). If two look alike, widen the `deform.scale` / move the `framing.position` for one of them in `categoryScenes.ts` and re-capture.

- [ ] **Step 4: Flourish check** — mid-transition frames should show the flourish: `projetos` particles briefly wider than the settled shape (`fling`); `stack` particles higher then settling (`rise`); `sobre` particles tighter then blooming (`gather`); `contato` sheared further then settling (`sweep`). Tune `FLOURISH_SPLIT` (in `particleMorph.ts`) or the flourish multipliers if the exaggeration is imperceptible or too violent.

- [ ] **Step 5: Return check** — from each page, click VER TUDO; confirm the nebula morphs back to the menu shape and the camera returns to `[0,0,13]` looking at origin, using the calm `menu` transition (no flourish, ~2.2 s).

- [ ] **Step 6: Bottom-nav switch** — from `/projetos` click STACK; confirm the camera flies from the projetos framing to the stack framing and the particles morph disk → column with the `rise` flourish, over the same window as the content swing.

- [ ] **Step 7: Deep-link** — load `/stack` directly; particles must form dispersed → column (no menu shape in between), camera starts at the stack framing.

- [ ] **Step 8: Reduced motion** — run one capture with `reducedMotion: "reduce"`; every scene change must snap (no morph, no fly, no flourish), page still navigable.

- [ ] **Step 9: Perf spot-check** — on `/projetos` (widest deform, most on-screen particles) watch the dev-tools FPS meter for a few seconds of idle + one transition. Desktop should hold ~60. If a specific scene tanks it, reduce that scene's `pointSize` or tighten its `deform`.

- [ ] **Step 10: Commit the tuned numbers**

```bash
git add src/experience/galaxy/categoryScenes.ts src/experience/galaxy/particleMorph.ts
git commit -m "feat: tune the 4 per-page galaxy scenes

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Scene config model → Task 2. `deformPositions` → Task 1. Deformação math → Task 1. `menu` anchor values → Task 2 (verbatim from Global Constraints). 4 page directions (deform/framing/spin/flourish) → Task 2 config + Task 7 tuning.
- `ParticleField` shape-driven / formation = first morph / spin from props / spin eased not reset → Task 5.
- Flourish (fling/gather/rise/sweep + piecewise blend + split) → Task 3.
- `flyTo(framing, opts)` with fov tween, replaces focusCenter/focusSide → Task 4.
- `GalaxyCanvas` `activeScene` prop, builds 5 shapes, wires down → Task 6 step 1.
- `ExperienceShell` resolves active scene, `goToScene`, orchestrator rewire for the 4 flows (menu→page, page→page, page→menu, deep-link) → Task 6 step 2.
- `CAMERA_FRAMINGS` removed from `cameraTargets.ts` → Task 2 step 4.
- Reduced-motion / no-WebGL / mobile / rapid-switch / interrupted-morph → handled in Tasks 5 (morph guards), 6 (`goToScene` `reducedMotion`), Task 7 step 8; `GalaxyBackdrop` untouched.
- Tests: pure helpers (Tasks 1–3), integration scene-resolution (Task 6 step 3), manual Playwright (Task 7). Matches the spec's Testes section.

**Placeholder scan:** No "TBD"/"TODO". Task 7 is a tuning pass by design — every step names a concrete file and a concrete check, not "make it look good". The scene numbers in Task 2 are real starting values, explicitly flagged as tunable in Task 7.

**Type consistency:** `SceneKey`, `Scene`, `CameraFraming`, `Spin`, `Flourish`, `SceneTransition`, `Deformation` defined in Tasks 1–2 and consumed with the same names/shapes in Tasks 3–6. `flyTo(framing, { duration, ease, instant? })` defined in Task 4, called with that exact shape in Task 6. `ParticleField` props defined in Task 5 Interfaces, passed with matching names in Task 6 `GalaxyCanvas`. `goToScene(key): Promise<void>` defined and used consistently in Task 6. `morphInto` / `flourishTarget` / `FLOURISH_SPLIT` signatures match between Task 3 definition and Task 5 usage.
