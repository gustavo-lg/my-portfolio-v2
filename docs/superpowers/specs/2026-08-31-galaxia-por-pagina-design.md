# Galáxia por página — cada categoria tem sua própria animação (Design Doc)

Data: 2026-08-31
Branch: `redesign/sistema-orbital`
Depende de: `docs/superpowers/specs/2026-08-30-sistema-orbital-design.md` (sistema já implementado)

## Context

Hoje a experiência tem **uma** animação de troca de página: a câmera faz um
dolly para um único enquadramento lateral (`CAMERA_FRAMINGS.side`) e o
conteúdo DOM faz um swing. A galáxia de partículas é sempre a mesma forma,
vista sempre do mesmo ângulo, em qualquer página interna.

São só 4 categorias (PROJETOS, STACK, SOBRE, CONTATO). Dar a cada uma um
**ponto de vista da câmera próprio** e uma **deformação própria da nebulosa**,
com uma **transição de personalidade própria**, transforma a navegação em algo
memorável: o usuário passa a reconhecer onde está pela forma e pelo ângulo da
galáxia, não só pelo texto.

Decisões do brainstorming:
- **A + C**: enquadramento de câmera distinto por página **e** a nebulosa se
  redesenha por página.
- **C = "clima" (weather)**: a nebulosa continua sendo a mesma (mesma
  contagem de partículas, deformada) — esticada / comprimida / inclinada +
  variação de densidade. Não muda de cor (hue permanece ciano→roxo).
- **Transição com personalidade por destino**: cada troca tem seu próprio
  caminho de câmera, duração, easing e um "floreio" (flourish).
- **Tudo de uma vez** — um spec, um plano.
- **Home (`/`) é a âncora**: mantém a nebulosa e o enquadramento de hoje; cada
  página parte dela; VER TUDO volta para ela.

**Resultado esperado:** ao entrar em cada página a câmera voa para um ângulo
único e as partículas se remodelam para a forma daquela página, com um
movimento que tem caráter próprio; ao trocar entre páginas, idem; ao voltar
para a home, tudo assenta de volta na nebulosa original.

## Não-objetivos

- Não muda a cor / hue das partículas por página.
- Não muda o swing do conteúdo DOM (`page-in` / `page-out`) — a personalidade
  vem da galáxia + câmera, não de re-tunar o swing.
- Não implementa shader GLSL (a morfagem roda em JS; a estrutura fica pronta
  para um port a shader depois, se o mobile sofrer).
- Não cria variações do fallback estático (`GalaxyBackdrop`) por página.

## Abordagem

**Config de cenas + engine de morph em JS.** Um módulo de dados descreve cada
cena; `ParticleField` deixa de ser específico de "formação" e passa a
**morfar para qualquer forma que receber**; a câmera ganha um `flyTo`
genérico; `ExperienceShell` resolve a cena ativa a partir da rota + estado da
máquina e dispara câmera + morph juntos com a personalidade daquela cena.

Rejeitado: um componente de galáxia por página (4× de boilerplate, morfagem
entre componentes independentes é ambígua). Adiado: mover posições/morph/spin
para vertex shader (melhor performance, mas GLSL é lento de iterar e o esforço
aqui é 80% tuning visual de 4 personalidades).

## Modelo de dados — `src/experience/galaxy/categoryScenes.ts` (novo)

```ts
export type SceneKey = CategoryKey | "menu";

export interface CameraFraming {
  position: Vec3;
  lookAt: Vec3;
  fov: number;
}

export interface Deformation {
  scale: Vec3;        // multiplicador por eixo aplicado às posições base
  shearXY?: number;   // x += shearXY * y
  shearZX?: number;   // z += shearZX * x
  tilt?: Vec3;        // rotação da nuvem inteira (rad), após scale/shear
}

export interface Spin {
  axis: "x" | "y" | "z";
  speed: number;      // rad/s
  wobble?: number;    // amplitude da oscilação no eixo secundário
}

export interface SceneTransition {
  camera: { duration: number; ease: string };
  morph:  { duration: number; ease: string };
  flourish?: "none" | "fling" | "gather" | "rise" | "sweep";
}

export interface Scene {
  framing: CameraFraming;
  deform: Deformation;
  spin: Spin;
  pointSize: number;
  pointOpacity: number;
  transition: SceneTransition;
}

export const SCENES: Record<SceneKey, Scene>;
```

`SCENES.menu` = valores de hoje exatos (âncora):
`framing { position [0,0,13], lookAt [0,0,0], fov 55 }`, `deform.scale [1,1,1]`,
`spin { axis "z", speed 0.05, wobble 0.06 }`, `pointSize 0.042`,
`pointOpacity 0.72`, `transition` calmo ("settle back": camera ~2.2s
`power2.inOut`, morph ~2.2s `power2.inOut`, `flourish "none"`).

Pontos de partida das 4 páginas (o spec assume que os números serão tunados
no build; a *direção* de cada uma é o que está fechado):

| Página | Deform (clima) | Enquadramento | Spin | Flourish |
|---|---|---|---|---|
| PROJETOS | esticada e achatada — `scale ≈ [1.5, 0.55, 1.1]` | recuado + deslocado à direita | plano no Z (disco) | `fling` — estouram pra fora e assentam |
| STACK | coluna vertical comprimida — `scale ≈ [0.6, 1.7, 0.6]` | de frente, perto, fov menor | lento no Y (coluna girando) | `rise` — sobem e se empilham |
| SOBRE | bloom mais redondo — `scale ≈ [1.05, 1.6, 1.05]` (desfaz o Y-squash da base) | levemente por baixo, olhando pra cima | suave, eixo inclinado | `gather` — recolhem pro centro |
| CONTATO | varrida na diagonal — `scale ≈ [1.2, 0.8, 1.2]`, `shearXY 0.4`, `tilt z 0.3` | passando de lado, em ângulo | mais rápido no Z | `sweep` — varrem e assentam |

## Deformação — `deformPositions` em `particleGeometry.ts`

Pura, sem three.js. Assinatura:
`deformPositions(base: Float32Array, d: Deformation, out: Float32Array): void`

Por partícula `i`:
1. `x = base.x * d.scale.x + (d.shearXY ?? 0) * base.y`
2. `y = base.y * d.scale.y`
3. `z = base.z * d.scale.z + (d.shearZX ?? 0) * base.x`
4. se `d.tilt`: rotaciona `(x,y,z)` em torno da origem por `tilt.x/y/z` (matrizes
   de rotação simples encadeadas)
5. `out[i*3..i*3+2] = (x,y,z)`

A geometria base continua `generateTargetPositions(count)` (inalterada).
Comprimento preservado → morph entre quaisquer duas cenas é `lerpPositions`.

As 5 formas (menu base + 4 deformadas) são computadas uma vez num `useMemo`
sobre `count` — ~2,1 MB a 36k, custo único.

## Runtime — `ParticleField`

Vira **shape-driven**. Props novas: `shape: Float32Array`, `spin: Spin`,
`pointSize: number`, `pointOpacity: number`, `morphDuration: number`,
`morphEase: string`, `flourish: SceneTransition["flourish"]`, mantém
`reducedMotion`, `idle`, `onFormed`.

Estado interno: `fromRef: Float32Array` (snapshot do buffer live), `morph:
{ t: number }`.

Quando a prop `shape` muda de referência:
1. copia as posições live atuais para `fromRef`
2. `gsap.to(morph, { t: 1, duration: morphDuration, ease: morphEase,
   overwrite: true, onComplete })`
3. cada frame no `useFrame`:
   - `lerpPositions(fromRef, effectiveTarget, morph.t, arr)`
   - drift idle (como hoje, quando `idle && !reducedMotion && morph.t >= 1`)
   - aplica `spin`: `points.rotation[axis] += delta * currentSpeed`; `wobble`
     via `sin` no eixo secundário
   - `attr.needsUpdate = true`

**Formação = o primeiro morph:** monta com `fromRef = dispersed`,
`shape = menuShape`, `morphDuration = FORMATION_MS`, `flourish "none"`.
`onFormed` dispara no `onComplete` desse primeiro morph. O código antigo de
`progress.t` / formação é removido — um caminho só.

**Flourish** = alvo intermediário exagerado. Segundo buffer `overshootRef`
derivado de `shape`:
- `fling`: posições × ~1.35 a partir da origem
- `gather`: × ~0.6
- `rise`: `+Y` deslocado, depois assenta
- `sweep`: shear extra
O morph roda `from → overshoot` nos primeiros ~55% (ease-out) e
`overshoot → shape` no resto (ease-in-out). `flourish "none"` → morph reto
`from → shape`. Implementado como uma pequena timeline GSAP de 2 tweens sobre
`morph.t` com um `overshootMix` auxiliar, ou como função de `t` que escolhe a
base de interpolação. (Detalhe de implementação fica pro plano.)

**Spin ao trocar de cena:** os parâmetros de spin mudam, mas
`points.rotation` **não é resetado**. A velocidade efetiva faz lerp da antiga
para a nova ao longo de `morphDuration` (guardar `currentSpeed` num ref e
aproximar de `spin.speed`) — sem tranco.

## Runtime — câmera (`GalaxyCamera` / `useGalaxyCamera`)

Substitui `focusCenter()` / `focusSide()` por:

`flyTo(framing: CameraFraming, opts: { duration: number; ease: string }):
Promise<void>`

GSAP-tween de `camera.position`, de um proxy `lookAt` (com
`camera.lookAt(proxy)` no `onUpdate`), **e de `camera.fov`** (com
`camera.updateProjectionMatrix()` no `onUpdate`). Resolve no `onComplete`.
`overwrite: true` para trocas rápidas.

`CAMERA_FRAMINGS` sai de `cameraTargets.ts`; os enquadramentos passam a viver
em `categoryScenes.ts`. `cameraTargets.ts` mantém só as durações
(`FORMATION_MS`, e o que mais for genérico).

## Runtime — `GalaxyCanvas`

Nova prop `activeScene: SceneKey`. Resolve `const scene = SCENES[activeScene]`,
passa `scene.deform`-derived shape + `scene.spin` + `scene.pointSize` +
`scene.pointOpacity` + `scene.transition.morph` + `scene.transition.flourish`
para `ParticleField`, e `scene.framing` + `scene.transition.camera` para o
disparo de `flyTo`.

Substitui a prop atual `initialFraming: "center" | "side"` por
`initialScene: SceneKey` (deep-link).

## Orquestração — `ExperienceShell`

Calcula `activeScene: SceneKey`:
- `/` (qualquer estado de menu) → `"menu"`
- `/projetos` etc. → a `CategoryKey`
- durante uma transição, `activeScene` vira o destino **no início da
  coreografia**, para câmera + morph rodarem a duração inteira junto com o
  swing do conteúdo.

Uma única entrada `galaxy.goToScene(key: SceneKey): Promise<void>` no contexto
da câmera/experiência: lê `SCENES[key].transition`, dispara `flyTo(framing,
transition.camera)` e sinaliza `ParticleField` (via a prop `shape` mudando +
`morphDuration`/`morphEase`/`flourish`) — retorna quando o `flyTo` resolve.

| Fluxo | Hoje | Com cenas |
|---|---|---|
| menu → página (clique no label) | `navigating`: wait 520 + wait 620 → `camera.focusSide()` → `navigate` | `navigating`: beats de overlay/labels inalterados → `goToScene(target)` (câmera + morph com a personalidade **daquela página**) → ao resolver, `navigate` + `TRANSITION_COMPLETE` |
| página → página (bottom nav) | `SWITCH_CATEGORY` + `navigate` imediato; só o conteúdo faz swing | `SWITCH_CATEGORY` + `navigate`; `activeScene` segue a nova rota → `goToScene(new)` com a personalidade **da nova página**, na mesma janela do swing |
| página → menu (VER TUDO) | `returning`: `camera.focusCenter()` ‖ wait(SWAP_MS) → `navigate("/")` | `returning`: `goToScene("menu")` usando **`menu.transition`** (personalidade calma "settle back") ‖ wait → `navigate("/")` |
| deep-link `/stack` | `initialFraming="side"` | `GalaxyCanvas` monta com `initialScene="stack"`; partículas formam direto na forma stack (dispersed → stack, um morph); câmera começa no enquadramento stack |

`ContentArea` (swing `page-in`/`page-out`) **não muda**. `SWAP_MS` continua
sendo a duração do swing do conteúdo; `transition.camera.duration` /
`transition.morph.duration` são independentes por página.

## Fallbacks e casos de borda

- **Reduced motion / sem WebGL:** `GalaxyBackdrop` continua um backdrop único.
  Sob `reducedMotion`: `morphDuration → 0`, `flyTo` instantâneo, sem flourish
  — guardado pelo flag `reducedMotion` já propagado.
- **Mobile (LOW, 8k):** o morph roda o mesmo lerp que a formação já roda — sem
  custo novo em repouso. Densidade excessiva de alguma cena em viewport
  pequena = tuning daquela cena, não arquitetura.
- **Troca rápida (spam na bottom nav):** `goToScene` mata os tweens em voo
  (`overwrite: true`), snapshota as posições live como novo `from`, começa o
  próximo morph. O guard `busy` (lockout de `SWAP_MS`) em `BottomNav` /
  `BackButton` cobre o caso comum.
- **Morph interrompido → idle:** buffer live fica onde parou; o próximo
  `goToScene` parte dali. Nunca há estado "preso entre formas" porque sempre
  há um alvo.

## Testes

- **Puros/unidade:** `deformPositions` (scale/shear/tilt corretos, comprimento
  preservado, determinismo); config `categoryScenes` (todo `SceneKey`
  presente, framings distintos, `spin.speed` finito, `scale` positivo);
  matemática do alvo de flourish.
- **Componente:** `flyTo` do `GalaxyCamera` resolve e tween-a fov + position
  (GSAP mockado, assert nas chamadas); `ParticleField` troca `from` e começa
  um morph quando a prop `shape` muda.
- **Integração:** `activeScene` resolve certo por rota + estado da máquina em
  `ExperienceShell` (jsdom, `GalaxyCanvas` mockado) — `/` → menu, `/stack` →
  stack, deep-link → stack.
- **Manual (Playwright headless):** capturar frames no meio da transição de
  cada uma das 4 páginas, verificar que a câmera chega a posições distintas e
  a silhueta da nebulosa difere por página; verificar que VER TUDO assenta de
  volta na forma do menu.

## Arquivos

- **Novo:** `src/experience/galaxy/categoryScenes.ts`; `deformPositions` em
  `src/experience/galaxy/particleGeometry.ts`; testes ao lado.
- **Reescrito:** `src/experience/galaxy/ParticleField.tsx`,
  `src/experience/galaxy/GalaxyCamera.tsx`,
  `src/experience/galaxy/cameraTargets.ts` (framings saem, durações ficam).
- **Modificado:** `src/experience/galaxy/GalaxyCanvas.tsx`,
  `src/experience/OrbitalExperience.tsx`.
- **Sem mudança:** `ContentArea.tsx`, `BottomNav.tsx`, `BackButton.tsx`,
  `ExperienceOverlay.tsx`, `smoothScrollToTop.ts`, máquina de estados.
