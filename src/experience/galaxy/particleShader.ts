/**
 * GPU-side port of the per-particle animation that used to run in JavaScript
 * inside ParticleField's useFrame.
 *
 * The JS implementations in `particleMath.ts` and `particleMorph.ts` are the
 * reference: this shader must stay numerically identical to them. Those files
 * keep their unit tests, which double as the executable spec for the GLSL
 * below — jsdom cannot compile a shader, so the tests guard the maths and this
 * file mirrors it by hand.
 *
 * Why: every frame the JS path rebuilt the whole position buffer and re-uploaded
 * it (3.56 MB/frame at the top tier, 93% of a 144 Hz frame budget). Here the
 * buffers are uploaded once per morph and the vertex shader derives the pose
 * from a handful of scalar uniforms.
 */

import * as THREE from "three";
import { getParticleTexture } from "./particleTexture";
import type { SceneKey, Wave } from "./categoryScenes";
import type { Flourish } from "./categoryScenes";

/** Hard cap on galaxies a single field can hold — main galaxy plus 4 minis. */
export const MAX_GALAXIES = 5;

/** Scene codes used by the deformation branch. Must match `sceneCode`. */
export const SCENE_CODE: Record<SceneKey, number> = {
  menu: 0,
  projetos: 1,
  stack: 2,
  sobre: 3,
  contato: 4,
};

export function sceneCode(key: SceneKey | undefined): number {
  return key ? SCENE_CODE[key] : 0;
}

const AXIS_CODE = { x: 0, y: 1, z: 2 } as const;

export function axisCode(axis: Wave["drive"]): number {
  return AXIS_CODE[axis];
}

export const VERTEX_SHADER = /* glsl */ `
// Precision is set by WebGLProgram's prefix; no three shader declares its own.
#define MAX_GALAXIES ${MAX_GALAXIES}

// Mirrors FLOURISH_SPLIT in particleMorph.ts.
const float SPLIT = 0.55;
const float TAU = 6.283185307179586;

attribute vec3 aFrom;
attribute vec3 aOvershoot;
attribute vec3 aFromColor;
attribute vec3 aTargetColor;
attribute float aGalaxy;

uniform float uMorphT;
uniform bool uFlourish;
uniform bool uReducedMotion;
uniform float uSpinTime;
uniform float uTime;

uniform vec3 uCenter[MAX_GALAXIES];
uniform vec3 uNormal[MAX_GALAXIES];
uniform float uSpeed[MAX_GALAXIES];
uniform float uIntensity[MAX_GALAXIES];
uniform float uSceneOf[MAX_GALAXIES];

// amplitude, frequency, speed
uniform vec3 uWave;
uniform int uWaveDrive;
uniform int uWaveDisplace;

uniform float uPointSize;
uniform float uScale;

varying vec3 vColor;

// Port of rotateGalaxy() in ParticleField.tsx: rigid Rodrigues rotation of the
// point about the unit axis n through centre c.
vec3 spinAbout(vec3 p, vec3 c, vec3 n, float ang) {
  float ca = cos(ang);
  float sa = sin(ang);
  float one = 1.0 - ca;
  vec3 d = p - c;
  float dt = dot(n, d);
  return c + d * ca + cross(n, d) * sa + n * dt * one;
}

// Port of applyGalaxyDeformation() in particleMath.ts.
vec3 deform(vec3 p, vec3 c, vec3 n, float scene, float intensity, float time) {
  vec3 a = abs(n.y) > 0.92 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 u = normalize(cross(a, n));
  vec3 v = cross(n, u);

  vec3 w = p - c;
  float lu = dot(w, u);
  float lv = dot(w, v);
  float ln = dot(w, n);

  float r = sqrt(lu * lu + lv * lv);
  float angle = atan(lv, lu);

  float dLu = 0.0;
  float dLv = 0.0;
  float dLn = 0.0;

  if (scene < 1.5) {
    // projetos — gravitational vortex and spiral funnel.
    float vortexTwist = intensity * (2.8 / (r * 0.7 + 0.6));
    float newAngle = angle + vortexTwist + sin(r * 2.2 - time * 2.5) * 0.3 * intensity;
    float targetLu = cos(newAngle) * r;
    float targetLv = sin(newAngle) * r;
    dLu = (targetLu - lu) * intensity;
    dLv = (targetLv - lv) * intensity;
    dLn = -intensity * (1.6 / (r * 0.9 + 0.5)) + sin(r * 3.0 - time * 3.2) * 0.35 * intensity;
  } else if (scene < 2.5) {
    // stack — quantum harmonic ripple and lattice sheets.
    float waveX = sin(lu * 2.6 + time * 0.9) * cos(lv * 2.0 - time * 0.6);
    float waveY = cos(lu * 2.0 - time * 0.6) * sin(lv * 2.6 + time * 0.8);
    float latticeH = sin(r * 3.6 - time * 1.1) * cos(angle * 4.0);
    dLu = waveX * 0.38 * intensity;
    dLv = waveY * 0.38 * intensity;
    dLn = (latticeH * 0.6 + waveX * 0.25) * intensity;
  } else if (scene < 3.5) {
    // sobre — saddle warp and breathing swell.
    float saddle = ((lu * lu - lv * lv) * 0.18 + sin(angle * 2.0 + time * 1.2) * 0.6) * intensity;
    float breath = 1.0 + 0.22 * intensity * sin(time * 1.6 + r * 0.7);
    dLu = lu * (breath - 1.0);
    dLv = lv * (breath - 1.0);
    dLn = saddle;
  } else {
    // contato — elliptical compression and polar flare jets.
    float stretch = 1.0 + 0.38 * intensity;
    float squash = 1.0 / (1.0 + 0.32 * intensity);
    float coreDist = max(0.1, r);
    float jetSign = (ln >= 0.0 ? 1.0 : -1.0) * (1.0 + 0.25 * sin(time * 2.2 + coreDist * 2.5));
    float jet = coreDist < 2.0 ? jetSign * (2.2 - coreDist) * 0.75 * intensity : 0.0;
    float pulseWave = sin(coreDist * 3.8 - time * 1.6) * 0.2 * intensity;
    dLu = (lu * squash - lu) * intensity;
    dLv = (lv * stretch - lv) * intensity;
    dLn = jet + pulseWave;
  }

  return p + dLu * u + dLv * v + dLn * n;
}

void main() {
  // Gather this particle's galaxy parameters. The loop index is a
  // constant-index-expression, which GLSL ES 1.00 requires for uniform arrays;
  // indexing directly by a value read from an attribute is not portable.
  int gi = int(aGalaxy + 0.5);
  vec3 gCenter = vec3(0.0);
  vec3 gNormal = vec3(0.0, 1.0, 0.0);
  float gSpeed = 0.0;
  float gIntensity = 0.0;
  float gScene = 0.0;
  for (int k = 0; k < MAX_GALAXIES; k++) {
    if (k == gi) {
      gCenter = uCenter[k];
      gNormal = uNormal[k];
      gSpeed = uSpeed[k];
      gIntensity = uIntensity[k];
      gScene = uSceneOf[k];
    }
  }

  vec3 pos;
  bool atRest = uMorphT >= 1.0;

  if (!atRest) {
    // Port of morphInto() in particleMorph.ts.
    if (!uFlourish) {
      pos = mix(aFrom, position, clamp(uMorphT, 0.0, 1.0));
    } else if (uMorphT <= SPLIT) {
      pos = mix(aFrom, aOvershoot, clamp(uMorphT / SPLIT, 0.0, 1.0));
    } else {
      pos = mix(aOvershoot, position, clamp((uMorphT - SPLIT) / (1.0 - SPLIT), 0.0, 1.0));
    }
  } else {
    // At rest the pose is rebuilt from the static target every frame: spin,
    // then the active category's deformation. Same order as the JS path.
    pos = position;
    if (!uReducedMotion) {
      if (gSpeed != 0.0) {
        float ang = mod(uSpinTime * gSpeed, TAU);
        if (ang < 0.0) ang += TAU;
        pos = spinAbout(pos, gCenter, gNormal, ang);
      }
      if (gScene > 0.5 && gIntensity > 0.001) {
        pos = deform(pos, gCenter, gNormal, gScene, gIntensity, uTime);
      }
    }
  }

  // Port of applyWave() in particleMath.ts. Full strength at rest, ramping in
  // over the last 40% of a morph.
  if (!uReducedMotion && uWave.x != 0.0) {
    float strength = atRest ? 1.0 : (uMorphT - 0.6) / 0.4;
    if (strength > 0.0) {
      float amp = uWave.x * min(strength, 1.0);
      float drive = uWaveDrive == 0 ? pos.x : (uWaveDrive == 1 ? pos.y : pos.z);
      float d = amp * sin(drive * uWave.y + uTime * uWave.z);
      if (uWaveDisplace == 0) {
        pos.x += d;
      } else if (uWaveDisplace == 1) {
        pos.y += d;
      } else {
        pos.z += d;
      }
    }
  }

  vColor = mix(aFromColor, aTargetColor, clamp(uMorphT, 0.0, 1.0));

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  // Matches three's sizeAttenuation for a perspective camera.
  gl_PointSize = uPointSize * (uScale / -mvPosition.z);
}
`;

export const FRAGMENT_SHADER = /* glsl */ `
// Do NOT include <colorspace_pars_fragment> here: WebGLProgram already injects
// that chunk into the fragment prefix for every non-raw material, because the
// linearToOutputTexel it generates depends on it. Including it again redeclares
// two global mat3 constants and six functions, which is a GLSL compile error.
// three's own points fragment shader includes <common> and <colorspace_fragment>
// and nothing else; match it.
#include <common>

uniform sampler2D uMap;
uniform float uOpacity;

varying vec3 vColor;

void main() {
  // three's map_particle_fragment flips Y on gl_PointCoord; kept for parity.
  vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
  vec4 texel = texture2D(uMap, uv);
  vec4 diffuseColor = vec4(vColor, uOpacity) * texel;
  if (diffuseColor.a < 0.01) discard;
  gl_FragColor = diffuseColor;
  #include <colorspace_fragment>
}
`;

export interface ParticleUniforms {
  uMorphT: { value: number };
  uFlourish: { value: boolean };
  uReducedMotion: { value: boolean };
  uSpinTime: { value: number };
  uTime: { value: number };
  uCenter: { value: THREE.Vector3[] };
  uNormal: { value: THREE.Vector3[] };
  uSpeed: { value: number[] };
  uIntensity: { value: number[] };
  uSceneOf: { value: number[] };
  uWave: { value: THREE.Vector3 };
  uWaveDrive: { value: number };
  uWaveDisplace: { value: number };
  uPointSize: { value: number };
  uScale: { value: number };
  uMap: { value: THREE.Texture };
  uOpacity: { value: number };
}

function zeroed(n: number): number[] {
  return new Array<number>(n).fill(0);
}

function vectors(n: number): THREE.Vector3[] {
  return Array.from({ length: n }, () => new THREE.Vector3());
}

/** Build the material plus the uniform object the frame loop writes into. */
export function createParticleMaterial(pointSize: number, opacity: number): {
  material: THREE.ShaderMaterial;
  uniforms: ParticleUniforms;
} {
  const uniforms: ParticleUniforms = {
    uMorphT: { value: 0 },
    uFlourish: { value: false },
    uReducedMotion: { value: false },
    uSpinTime: { value: 0 },
    uTime: { value: 0 },
    uCenter: { value: vectors(MAX_GALAXIES) },
    uNormal: { value: vectors(MAX_GALAXIES).map((v) => v.set(0, 1, 0)) },
    uSpeed: { value: zeroed(MAX_GALAXIES) },
    uIntensity: { value: zeroed(MAX_GALAXIES) },
    uSceneOf: { value: zeroed(MAX_GALAXIES) },
    uWave: { value: new THREE.Vector3() },
    uWaveDrive: { value: 0 },
    uWaveDisplace: { value: 1 },
    // Layers with no morph of their own (the detail field) leave this at 1.
    uPointSize: { value: pointSize },
    uScale: { value: 300 },
    uMap: { value: getParticleTexture() },
    uOpacity: { value: opacity },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return { material, uniforms };
}

/** `true` when the morph should pass through the exaggerated overshoot pose. */
export function usesFlourish(kind: Flourish): boolean {
  return kind !== "none";
}
