/**
 * The vertex shader is a hand port of particleMath.ts / particleMorph.ts.
 * jsdom cannot compile GLSL, so these tests do the next best thing: they
 * transcribe the GLSL back into TypeScript and assert it produces the same
 * numbers as the original JS reference on random inputs.
 *
 * A transcription slip (a swapped cross-product term, a dropped `* intensity`,
 * a wrong constant) is the realistic failure mode of that port, and it is
 * exactly what this catches. What it cannot catch is a GLSL *compile* error —
 * only a real GPU proves that.
 */

import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  FRAGMENT_SHADER,
  MAX_GALAXIES,
  SCENE_CODE,
  VERTEX_SHADER,
  axisCode,
  createParticleMaterial,
  sceneCode,
  usesFlourish,
} from "./particleShader";
import { applyGalaxyDeformation, applyWave } from "./particleMath";
import { morphInto, FLOURISH_SPLIT } from "./particleMorph";
import { ORBITAL_ORDER } from "./orbitalAnchors";
import type { SceneKey, Wave } from "./categoryScenes";

type V3 = [number, number, number];

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// ---- Transcriptions of the GLSL, read straight off the shader source ----

/** Mirror of `spinAbout` in VERTEX_SHADER. */
function glslSpinAbout(p: V3, c: V3, n: V3, ang: number): V3 {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const one = 1.0 - ca;
  const d = sub(p, c);
  const dt = dot(n, d);
  return add(add(add(c, scale(d, ca)), scale(cross(n, d), sa)), scale(n, dt * one));
}

/** Mirror of `deform` in VERTEX_SHADER. */
function glslDeform(
  p: V3,
  c: V3,
  n: V3,
  scene: number,
  intensity: number,
  time: number,
): V3 {
  const a: V3 = Math.abs(n[1]) > 0.92 ? [1.0, 0.0, 0.0] : [0.0, 1.0, 0.0];
  const u = norm(cross(a, n));
  const v = cross(n, u);

  const w = sub(p, c);
  const lu = dot(w, u);
  const lv = dot(w, v);
  const ln = dot(w, n);

  const r = Math.sqrt(lu * lu + lv * lv);
  const angle = Math.atan2(lv, lu);

  let dLu = 0.0;
  let dLv = 0.0;
  let dLn = 0.0;

  if (scene < 1.5) {
    const vortexTwist = intensity * (2.8 / (r * 0.7 + 0.6));
    const newAngle =
      angle + vortexTwist + Math.sin(r * 2.2 - time * 2.5) * 0.3 * intensity;
    const targetLu = Math.cos(newAngle) * r;
    const targetLv = Math.sin(newAngle) * r;
    dLu = (targetLu - lu) * intensity;
    dLv = (targetLv - lv) * intensity;
    dLn =
      -intensity * (1.6 / (r * 0.9 + 0.5)) +
      Math.sin(r * 3.0 - time * 3.2) * 0.35 * intensity;
  } else if (scene < 2.5) {
    const waveX = Math.sin(lu * 2.6 + time * 0.9) * Math.cos(lv * 2.0 - time * 0.6);
    const waveY = Math.cos(lu * 2.0 - time * 0.6) * Math.sin(lv * 2.6 + time * 0.8);
    const latticeH = Math.sin(r * 3.6 - time * 1.1) * Math.cos(angle * 4.0);
    dLu = waveX * 0.38 * intensity;
    dLv = waveY * 0.38 * intensity;
    dLn = (latticeH * 0.6 + waveX * 0.25) * intensity;
  } else if (scene < 3.5) {
    const saddle =
      ((lu * lu - lv * lv) * 0.18 + Math.sin(angle * 2.0 + time * 1.2) * 0.6) *
      intensity;
    const breath = 1.0 + 0.22 * intensity * Math.sin(time * 1.6 + r * 0.7);
    dLu = lu * (breath - 1.0);
    dLv = lv * (breath - 1.0);
    dLn = saddle;
  } else {
    const stretch = 1.0 + 0.38 * intensity;
    const squash = 1.0 / (1.0 + 0.32 * intensity);
    const coreDist = Math.max(0.1, r);
    const jetSign =
      (ln >= 0.0 ? 1.0 : -1.0) * (1.0 + 0.25 * Math.sin(time * 2.2 + coreDist * 2.5));
    const jet = coreDist < 2.0 ? jetSign * (2.2 - coreDist) * 0.75 * intensity : 0.0;
    const pulseWave = Math.sin(coreDist * 3.8 - time * 1.6) * 0.2 * intensity;
    dLu = (lu * squash - lu) * intensity;
    dLv = (lv * stretch - lv) * intensity;
    dLn = jet + pulseWave;
  }

  return add(p, add(add(scale(u, dLu), scale(v, dLv)), scale(n, dLn)));
}

/** Mirror of the wave block in VERTEX_SHADER's main(). */
function glslWave(
  p: V3,
  wave: [number, number, number],
  drive: number,
  displace: number,
  time: number,
  strength: number,
): V3 {
  const out: V3 = [p[0], p[1], p[2]];
  if (wave[0] === 0.0) return out;
  if (!(strength > 0.0)) return out;
  const amp = wave[0] * Math.min(strength, 1.0);
  const driveVal = drive === 0 ? out[0] : drive === 1 ? out[1] : out[2];
  const d = amp * Math.sin(driveVal * wave[1] + time * wave[2]);
  out[displace] += d;
  return out;
}

/** Mirror of the morph block in VERTEX_SHADER's main(). */
function glslMorph(
  from: V3,
  overshoot: V3,
  target: V3,
  t: number,
  flourish: boolean,
): V3 {
  const clamp = (x: number) => Math.min(1, Math.max(0, x));
  const mix = (a: V3, b: V3, k: number): V3 => [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
  if (!flourish) return mix(from, target, clamp(t));
  if (t <= 0.55) return mix(from, overshoot, clamp(t / 0.55));
  return mix(overshoot, target, clamp((t - 0.55) / (1.0 - 0.55)));
}

// ---- Deterministic pseudo-random inputs ----

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const TOL = 1e-5;

function expectClose(got: V3, want: ArrayLike<number>) {
  for (let i = 0; i < 3; i++) expect(got[i]).toBeCloseTo(want[i], 5);
}

describe("spinAbout matches an independent Rodrigues implementation", () => {
  it("agrees with THREE.Vector3.applyAxisAngle on random inputs", () => {
    const r = rng(7);
    for (let i = 0; i < 200; i++) {
      const p: V3 = [r() * 20 - 10, r() * 20 - 10, r() * 20 - 10];
      const c: V3 = [r() * 6 - 3, r() * 6 - 3, r() * 6 - 3];
      const n = norm([r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]);
      const ang = r() * Math.PI * 4 - Math.PI * 2;

      const mine = glslSpinAbout(p, c, n, ang);

      const ref = new THREE.Vector3(...p)
        .sub(new THREE.Vector3(...c))
        .applyAxisAngle(new THREE.Vector3(...n), ang)
        .add(new THREE.Vector3(...c));

      expectClose(mine, [ref.x, ref.y, ref.z]);
    }
  });

  it("a full turn is the identity", () => {
    const p: V3 = [3, -2, 5];
    const c: V3 = [1, 1, 1];
    const n = norm([0.3, 0.8, -0.2]);
    expectClose(glslSpinAbout(p, c, n, Math.PI * 2), p);
  });
});

describe("deform matches applyGalaxyDeformation", () => {
  const scenes: SceneKey[] = ["projetos", "stack", "sobre", "contato"];

  for (const key of scenes) {
    it(`agrees for scene "${key}"`, () => {
      const r = rng(SCENE_CODE[key] * 977 + 13);
      for (let i = 0; i < 150; i++) {
        const p: V3 = [r() * 16 - 8, r() * 16 - 8, r() * 16 - 8];
        const c: V3 = [r() * 8 - 4, r() * 8 - 4, r() * 8 - 4];
        const n = norm([r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]);
        const intensity = 0.01 + r() * 0.99;
        const time = r() * 50;

        const buf = new Float32Array([p[0], p[1], p[2]]);
        applyGalaxyDeformation(buf, 0, 1, key, intensity, time, {
          cx: c[0],
          cy: c[1],
          cz: c[2],
          nx: n[0],
          ny: n[1],
          nz: n[2],
        });

        const mine = glslDeform(p, c, n, SCENE_CODE[key], intensity, time);
        expectClose(mine, buf);
      }
    });
  }

  it("covers the |n.y| > 0.92 basis switch on both sides", () => {
    for (const n of [norm([0, 1, 0.05]) as V3, norm([1, 0.1, 0]) as V3]) {
      const p: V3 = [2.5, 1.5, -3];
      const c: V3 = [0.5, -0.5, 0.25];
      const buf = new Float32Array([p[0], p[1], p[2]]);
      applyGalaxyDeformation(buf, 0, 1, "sobre", 0.7, 12.5, {
        cx: c[0],
        cy: c[1],
        cz: c[2],
        nx: n[0],
        ny: n[1],
        nz: n[2],
      });
      expectClose(glslDeform(p, c, n, SCENE_CODE.sobre, 0.7, 12.5), buf);
    }
  });
});

describe("wave matches applyWave", () => {
  const waves: Wave[] = [
    { drive: "x", displace: "y", amplitude: 0.4, frequency: 1.3, speed: 0.8 },
    { drive: "y", displace: "z", amplitude: 0.25, frequency: 2.1, speed: 1.4 },
    { drive: "z", displace: "x", amplitude: 0.6, frequency: 0.7, speed: 0.3 },
  ];

  for (const w of waves) {
    it(`agrees for drive=${w.drive} displace=${w.displace}`, () => {
      const r = rng(w.frequency * 1000);
      for (let i = 0; i < 100; i++) {
        const p: V3 = [r() * 12 - 6, r() * 12 - 6, r() * 12 - 6];
        const time = r() * 40;
        const strength = r() * 1.6 - 0.3;

        const buf = new Float32Array([p[0], p[1], p[2]]);
        applyWave(buf, w, time, strength);

        const mine = glslWave(
          p,
          [w.amplitude, w.frequency, w.speed],
          axisCode(w.drive),
          axisCode(w.displace),
          time,
          strength,
        );
        expectClose(mine, buf);
      }
    });
  }

  it("a zero-amplitude wave is a no-op, as in the JS guard", () => {
    const w: Wave = {
      drive: "x",
      displace: "y",
      amplitude: 0,
      frequency: 2,
      speed: 1,
    };
    const p: V3 = [1, 2, 3];
    expectClose(glslWave(p, [0, 2, 1], 0, 1, 9, 1), p);
  });

  it("strength above 1 is clamped, as in the JS guard", () => {
    const w: Wave = {
      drive: "x",
      displace: "y",
      amplitude: 0.5,
      frequency: 1,
      speed: 1,
    };
    const buf = new Float32Array([1, 2, 3]);
    applyWave(buf, w, 4, 3);
    expectClose(glslWave([1, 2, 3], [0.5, 1, 1], 0, 1, 4, 3), buf);
  });
});

describe("morph matches morphInto", () => {
  it("agrees across t for every flourish kind", () => {
    const from: V3 = [-4, 2, 1];
    const overshoot: V3 = [6, -3, 2.5];
    const target: V3 = [1, 1, -1];

    for (const kind of ["none", "fling", "gather", "rise", "sweep"] as const) {
      for (const t of [0, 0.2, 0.54, 0.55, 0.56, 0.9, 1]) {
        const out = new Float32Array(3);
        morphInto(
          Float32Array.from(from),
          Float32Array.from(overshoot),
          Float32Array.from(target),
          t,
          kind,
          out,
        );
        expectClose(
          glslMorph(from, overshoot, target, t, usesFlourish(kind)),
          out,
        );
      }
    }
  });

  it("the shader constant SPLIT equals FLOURISH_SPLIT", () => {
    expect(VERTEX_SHADER).toContain(`const float SPLIT = ${FLOURISH_SPLIT};`);
  });
});

describe("shader / material contract", () => {
  const declared = (src: string) => {
    const out = new Set<string>();
    const re = /uniform\s+\w+\s+(\w+)\s*(\[[^\]]*\])?\s*;/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) out.add(m[1]);
    return out;
  };

  it("every uniform declared in the shaders is supplied by the material", () => {
    const { uniforms } = createParticleMaterial(1, 1);
    const supplied = new Set(Object.keys(uniforms));
    const used = new Set([
      ...declared(VERTEX_SHADER),
      ...declared(FRAGMENT_SHADER),
    ]);
    for (const name of used) expect(supplied.has(name)).toBe(true);
  });

  it("supplies no uniform the shaders do not declare", () => {
    const { uniforms } = createParticleMaterial(1, 1);
    const used = new Set([
      ...declared(VERTEX_SHADER),
      ...declared(FRAGMENT_SHADER),
    ]);
    for (const name of Object.keys(uniforms)) expect(used.has(name)).toBe(true);
  });

  it("declares exactly the attributes ParticleField binds", () => {
    const re = /attribute\s+\w+\s+(\w+)\s*;/g;
    const found = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(VERTEX_SHADER)) !== null) found.add(m[1]);
    expect([...found].sort()).toEqual([
      "aFrom",
      "aFromColor",
      "aGalaxy",
      "aOvershoot",
      "aTargetColor",
    ]);
  });

  it("sizes the uniform arrays for every galaxy GalaxyCanvas builds", () => {
    // One main galaxy plus one per orbital category.
    expect(MAX_GALAXIES).toBeGreaterThanOrEqual(1 + ORBITAL_ORDER.length);
    const { uniforms } = createParticleMaterial(1, 1);
    expect(uniforms.uCenter.value).toHaveLength(MAX_GALAXIES);
    expect(uniforms.uNormal.value).toHaveLength(MAX_GALAXIES);
    expect(uniforms.uSpeed.value).toHaveLength(MAX_GALAXIES);
    expect(uniforms.uIntensity.value).toHaveLength(MAX_GALAXIES);
    expect(uniforms.uSceneOf.value).toHaveLength(MAX_GALAXIES);
    expect(VERTEX_SHADER).toContain(`#define MAX_GALAXIES ${MAX_GALAXIES}`);
  });

  it("maps every scene key to a distinct code, with menu reserved as 0", () => {
    expect(SCENE_CODE.menu).toBe(0);
    expect(sceneCode(undefined)).toBe(0);
    const codes = Object.values(SCENE_CODE);
    expect(new Set(codes).size).toBe(codes.length);
    for (const key of ORBITAL_ORDER) expect(SCENE_CODE[key]).toBeGreaterThan(0);
  });

  it("keeps the additive, non-depth-writing blend the old material used", () => {
    const { material } = createParticleMaterial(1, 1);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.blending).toBe(THREE.AdditiveBlending);
  });

  /**
   * The equivalence tests above compare the TypeScript mirror against the JS
   * reference. On their own they prove nothing about the GLSL, because nothing
   * reads it — editing the shader would not fail them.
   *
   * This closes that gap: it lifts the four deformation branches out of the
   * shader SOURCE and out of the mirror's own source, normalises both to the
   * same token stream, and compares. So the chain is complete:
   * shader text == mirror == particleMath reference.
   */
  it("the shader's deformation branches are token-identical to the tested mirror", () => {
    const branches = (src: string) => {
      const start = src.indexOf("if (scene < 1.5)");
      expect(start).toBeGreaterThan(-1);
      const end = src.indexOf("return", start);
      expect(end).toBeGreaterThan(start);
      return src.slice(start, end);
    };

    const canonical = (src: string) =>
      src
        // Comments carry no maths, and the JS transform strips them anyway.
        .replace(/\/\/[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        // Type keywords carry no maths.
        .replace(/\b(?:float|vec3|bool|int|const|let)\s+/g, "")
        .replace(/Math\./g, "")
        // GLSL spells two-argument arctangent `atan`.
        .replace(/\batan2\b/g, "atan")
        // 1.0 and 1 are the same number; normalise every literal.
        .replace(/\b\d+\.\d+\b|\b\d+\b/g, (m) => String(parseFloat(m)))
        .replace(/\s+/g, "");

    const fromShader = canonical(branches(VERTEX_SHADER));
    const fromMirror = canonical(branches(glslDeform.toString()));

    expect(fromMirror).toBe(fromShader);
    // Guard against both sides normalising to something trivially empty.
    expect(fromShader.length).toBeGreaterThan(500);
  });

  it("the shader's wave block is token-identical to the tested mirror", () => {
    const canonical = (src: string) =>
      src
        .replace(/\b(?:float|vec3|bool|int|const|let)\s+/g, "")
        .replace(/Math\./g, "")
        .replace(/\b\d+\.\d+\b|\b\d+\b/g, (m) => String(parseFloat(m)))
        .replace(/\s+/g, "");

    // The displacement expression is the whole of the wave maths.
    expect(canonical(VERTEX_SHADER)).toContain(
      canonical("amp * sin(drive * uWave.y + uTime * uWave.z)"),
    );
    expect(canonical(glslWave.toString())).toContain(
      canonical("amp * Math.sin(driveVal * wave[1] + time * wave[2])"),
    );
    // Both clamp strength the same way before scaling the amplitude.
    expect(canonical(VERTEX_SHADER)).toContain(canonical("uWave.x * min(strength, 1.0)"));
    expect(canonical(glslWave.toString())).toContain(
      canonical("wave[0] * Math.min(strength, 1.0)"),
    );
  });

  it("the shader's morph split matches the tested mirror", () => {
    expect(VERTEX_SHADER).toContain("uMorphT <= SPLIT");
    expect(VERTEX_SHADER).toContain("mix(aFrom, aOvershoot, clamp(uMorphT / SPLIT");
    expect(VERTEX_SHADER).toContain("mix(aOvershoot, position, clamp((uMorphT - SPLIT) / (1.0 - SPLIT)");
    expect(VERTEX_SHADER).toContain("mix(aFrom, position, clamp(uMorphT");
  });

  it("the shader's spin is the same Rodrigues form the mirror was checked against", () => {
    const canonical = (src: string) =>
      src.replace(/\s+/g, "").replace(/\b(?:float|vec3|const)\s*/g, "");
    expect(canonical(VERTEX_SHADER)).toContain(
      canonical("return c + d * ca + cross(n, d) * sa + n * dt * one;"),
    );
    expect(canonical(VERTEX_SHADER)).toContain(canonical("float one = 1.0 - ca;"));
  });

  it("the shader builds the deformation basis the way the mirror does", () => {
    const canonical = (src: string) => src.replace(/\s+/g, "");
    expect(canonical(VERTEX_SHADER)).toContain(
      canonical("abs(n.y) > 0.92 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)"),
    );
    expect(canonical(VERTEX_SHADER)).toContain(canonical("vec3 u = normalize(cross(a, n));"));
    expect(canonical(VERTEX_SHADER)).toContain(canonical("vec3 v = cross(n, u);"));
    expect(canonical(VERTEX_SHADER)).toContain(canonical("float r = sqrt(lu * lu + lv * lv);"));
    expect(canonical(VERTEX_SHADER)).toContain(canonical("float angle = atan(lv, lu);"));
  });

  it("the shader applies spin and deformation only at rest, and never under reduced motion", () => {
    const v = VERTEX_SHADER.replace(/\s+/g, " ");
    // Rest branch guards both effects behind the reduced-motion check.
    expect(v).toContain("if (!uReducedMotion) { if (gSpeed != 0.0)");
    expect(v).toContain("if (gScene > 0.5 && gIntensity > 0.001)");
    // Wave is guarded too, and ramps in over the tail of a morph.
    expect(v).toContain("if (!uReducedMotion && uWave.x != 0.0)");
    expect(v).toContain("atRest ? 1.0 : (uMorphT - 0.6) / 0.4");
  });

  /**
   * WebGLProgram injects some ShaderChunks straight into the prefix it builds
   * for every non-raw material, because the functions it generates below them
   * depend on those chunks. Including one of them again in our own source
   * redeclares its globals and functions, which GLSL rejects — the program
   * fails to link and the points silently render nothing.
   *
   * That is exactly the bug that shipped: `#include <colorspace_pars_fragment>`
   * duplicated two mat3 constants and six functions. No other test caught it,
   * because the rest of this file checks the maths, not the program assembly.
   *
   * Source: node_modules/three/src/renderers/webgl/WebGLProgram.js, where the
   * fragment prefix appends tonemapping_pars_fragment (when tone mapping is on)
   * and colorspace_pars_fragment (always).
   */
  it("includes no ShaderChunk that WebGLProgram already puts in the prefix", () => {
    const PREFIX_INJECTED = [
      "colorspace_pars_fragment",
      "tonemapping_pars_fragment",
    ];
    for (const chunk of PREFIX_INJECTED) {
      expect(FRAGMENT_SHADER).not.toContain(`#include <${chunk}>`);
      expect(VERTEX_SHADER).not.toContain(`#include <${chunk}>`);
    }
  });

  it("still applies the output colour space exactly once", () => {
    const occurrences = (FRAGMENT_SHADER.match(/#include <colorspace_fragment>/g) ?? [])
      .length;
    expect(occurrences).toBe(1);
  });

  it("declares no precision qualifier of its own", () => {
    // generatePrecision() emits these in the prefix. Redeclaring is legal but
    // diverges from every three shader and hides which precision is in force.
    expect(FRAGMENT_SHADER).not.toMatch(/\bprecision\s+(?:low|medium|high)p\b/);
    expect(VERTEX_SHADER).not.toMatch(/\bprecision\s+(?:low|medium|high)p\b/);
  });

  it("has balanced braces and parentheses in both shaders", () => {
    for (const src of [VERTEX_SHADER, FRAGMENT_SHADER]) {
      const count = (ch: string) => (src.match(new RegExp(`\\${ch}`, "g")) ?? []).length;
      expect(count("{")).toBe(count("}"));
      expect(count("(")).toBe(count(")"));
    }
  });
});
