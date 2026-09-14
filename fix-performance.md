# Plano: escalabilidade de performance da cena WebGL (my-portfolio-v2)

> **Estado: Fases 0 a 7 implementadas e verificadas na classe A.
> Fase 8 parcial — classes B, C, D, Safari e 4K ainda não testadas.**
>
> Resultado medido na classe A, depois da correção do fragment shader:
>
> ```
> [perf] fps=161.3 body=0.00ms particles=466400 detail=24200 dpr=1.25 devicePixelRatio=1.25
> ```
>
> | Métrica | Antes (Fase 0) | Agora |
> |---|---|---|
> | `body` (JS por frame) | 6,48 ms | 0,00–0,01 ms |
> | partículas renderizadas | 296.800 | 466.400 |
> | fps | 141–145 | 161 (teto do monitor) |
>
> Custo de CPU por partícula: de 21,8 ns para abaixo do limite de medição.
> Verificado visualmente: galáxia forma, as quatro deformações de categoria
> funcionam, transição entre páginas fluida.
>
> **O fps não mede folga de GPU.** 161 é o limite de vsync do monitor; o número
> só prova que a GPU fecha o frame dentro de 6,2 ms, não por quanto. Por isso
> `decide()` devolve `"up1"` em toda rodada e quem segura a escada é o
> `isInertStep` da Fase 2.5: subir de `high` para `ultra` mexeria apenas em
> `maxDpr`, e com `devicePixelRatio = 1.25` esse passo não muda nada na tela.
>
> Consequência para a Fase 8.4: **não subir o topo da escada com base nesta
> medição.** Um degrau acima de 220.000 só se justifica depois de medir tempo
> de GPU por frame no painel Performance, sem depender do fps limitado.
>
> Desvios deliberados em relação ao texto das fases, com o motivo:
>
> 1. **`DustField` não foi migrado para shader (Fase 1.7).** A leitura do
>    código mostrou que seu `useFrame` só incrementa `groupRef.rotation.y`.
>    Não há trabalho por partícula em JavaScript, logo não há o que migrar.
>    Ele já era GPU-only. A migração teria sido churn sem ganho.
> 2. **`stepUp` e `stepDown` devolvem o índice de origem** quando todo passo
>    restante naquela direção é inerte, em vez de ir até a ponta da escada.
>    Detectado por teste: `stepUp` ia parar no índice 0 e gastar uma das duas
>    promoções sem que nada mudasse na tela.
> 3. **`getStartIndex` não recebe mais `reducedMotion` na decisão.** O degrau
>    reduzido é aplicado em `useDeviceCapabilities`, que troca a rung por
>    `REDUCED_RUNG` antes de montar o tier.
> 4. **Defeitos corrigidos na revisão crítica pós-implementação:**
>    - `onCreated` do R3F dispara depois do efeito de mount do pai. A versão
>      inicial lia o canvas num `useEffect` e achava `null`, então os listeners
>      de `webglcontextlost` nunca eram registrados. Agora registram dentro do
>      próprio `onCreated`.
>    - Desmontar o `<Canvas>` na perda de contexto destruía o elemento que o
>      navegador precisa para emitir `webglcontextrestored`. Agora o `<Canvas>`
>      permanece montado e o `GalaxyBackdrop` é renderizado junto.
>    - `useAdaptivePerfTier` não ressincronizava quando `initialIndex` mudava
>      depois da montagem (`pointerFine` resolve de media query).
>    - `createParticleMaterial` deixava `uMorphT` em 0 para a camada de detalhe,
>      que nunca faz morph.
> 5. **Verificação pendente:** o shader da Fase 1 nunca foi compilado por uma
>    GPU. 179 testes provam que a matemática do GLSL é token-idêntica ao
>    espelho testado, e que o espelho produz os mesmos números que
>    `particleMath.ts`. Nenhum deles compila GLSL. A Fase 8.3 é o primeiro
>    teste real.

## Objetivo

A cena deve rodar fluida e visualmente rica em quatro classes de hardware, sem
configuração manual do visitante:

| Classe | Exemplo | Resultado esperado |
|---|---|---|
| A — desktop forte | GPU dedicada recente, CPU de alto clock | máxima densidade de partículas, DPR alto |
| B — desktop intermediário | GPU dedicada de entrada ou APU recente | densidade alta, DPR médio |
| C — desktop leve | GPU integrada, CPU de clock baixo | densidade reduzida, DPR 1, ainda animado |
| D — mobile | qualquer | densidade mínima, DPR 1, ainda animado |

Nenhuma classe pode ficar sem partículas animadas. A classe A não pode ficar
limitada pelo mesmo teto da classe C.

---

## Diagnóstico

### D1 — O gargalo atual é a CPU, não a GPU

Em `src/experience/galaxy/ParticleField.tsx`, o `useFrame` (linhas 316 a 370)
executa, **todo frame**, sobre o buffer inteiro:

1. `posArr.set(targetRef.current)` — cópia completa.
2. `rotateGalaxy` para cada uma das 5 galáxias, sobre a fatia correspondente.
3. `applyGalaxyDeformation` para a galáxia ativa.
4. `applyWave` — uma chamada `Math.sin` por partícula.
5. `posAttr.needsUpdate = true` — reenvio do buffer inteiro para a GPU.

Tudo isso roda na thread principal em JavaScript.

### D2 — `particleCount` não é o número de partículas na tela

`galaxyFieldSplit` (`particleGeometry.ts` linhas 217 a 226) usa
`MINI_SHARE = 0.11` e `mainMultiplier = 3`. Números reais por tier atual:

| tier | `count` | `totalCount` | dust | detail | total na tela | floats/frame | upload/frame |
|---|---|---|---|---|---|---|---|
| HIGH | 140.000 | 296.800 | 46.200 | 15.400 | 358.400 | 890.400 | 3,56 MB |
| MID | 88.000 | 186.560 | 29.040 | 9.680 | 225.280 | 559.680 | 2,24 MB |
| LOW | 16.000 | 33.920 | 5.280 | 1.760 | 40.960 | 101.760 | 0,41 MB |

A 60 fps, o tier HIGH exige 214 MB/s de upload de VBO e ~297.000 chamadas
`Math.sin` por frame, só em `applyWave`. Esse custo não diminui com uma GPU
melhor.

**Consequência direta:** aumentar partículas na classe A é impossível enquanto
a animação for calculada em JavaScript. O trabalho precisa migrar para o vertex
shader. Essa é a Fase 1 e é o que destrava o resto do plano.

### D3 — Os sinais de detecção atuais medem o eixo errado

`perfTier.ts` usa `navigator.hardwareConcurrency` (contagem de núcleos) e
`navigator.deviceMemory`. O custo dominante é single-thread; contagem de
núcleos não prevê clock de núcleo único. `deviceMemory` não existe em Firefox
nem em Safari. Nenhum dos dois mede a GPU.

Depois da Fase 1 o gargalo passa a ser fill rate de GPU (358.000 sprites com
`AdditiveBlending`, `transparent`, `depthWrite={false}`, `sizeAttenuation`).
Aí a string do renderer passa a ser um sinal útil — mas continua sendo um
palpite.

**A medição de FPS em runtime é o único sinal que mede o gargalo real.
Ela é a autoridade. Os sinais estáticos apenas escolhem um ponto de partida
seguro.**

### D4 — Trocar de tier em runtime hoje replica a animação de formação

`ParticleField` guarda `formed` em `useRef(false)` e `morph` em
`useRef({ t: reducedMotion ? 1 : 0 })`. Uma remontagem reinicia os dois. Em
`ParticleField.tsx:301`, `first === true` dispara um tween de `FORMATION_MS`
partindo de `generateDispersedPositions`. A galáxia explodiria e se reformaria
no meio da sessão. Qualquer degrau adaptativo precisa resolver isso antes.

### D5 — DPR e contagem têm custos assimétricos

Baixar `maxDpr` de 1,5 para 1,0 corta o custo de fill rate em 2,25× com custo
de transição zero: nenhum buffer é reconstruído, nenhuma partícula some.
Baixar a contagem reconstrói megabytes de `Float32Array` e remonta a cena.

Os dois não podem ocupar o mesmo degrau. O degrau barato vem sempre primeiro.

### D6 — `maxDpr` é 1.5 em todos os tiers

Inclusive em `REDUCED`. Bug direto.

---

## Arquivos envolvidos

| Arquivo | Ação |
|---|---|
| `src/experience/galaxy/particleShader.ts` | criar |
| `src/experience/galaxy/ParticleField.tsx` | alterar (Fases 1 e 7) |
| `src/experience/galaxy/DustField.tsx` | alterar (Fase 1) |
| `src/experience/lib/qualityLadder.ts` | criar |
| `src/experience/lib/qualityLadder.test.ts` | criar |
| `src/experience/lib/gpuTier.ts` | criar |
| `src/experience/lib/gpuTier.test.ts` | criar |
| `src/experience/lib/adaptiveTier.ts` | criar |
| `src/experience/lib/adaptiveTier.test.ts` | criar |
| `src/experience/lib/useAdaptivePerfTier.ts` | criar |
| `src/experience/lib/perfTier.ts` | reescrever |
| `src/experience/lib/perfTier.test.ts` | reescrever |
| `src/experience/lib/useDeviceCapabilities.ts` | alterar |
| `src/experience/galaxy/GalaxyCanvas.tsx` | alterar |
| `src/experience/galaxy/GalaxyBackdrop.tsx` | alterar |

## Regras gerais de execução

- Testes rodam em `vitest` com `jsdom`. O jsdom não tem WebGL nem
  `requestAnimationFrame` confiável. **Nenhum teste pode criar contexto WebGL,
  compilar shader ou depender de rAF.** Só funções puras são testadas.
- `useDeviceCapabilities()` continua devolvendo
  `{ tier, reducedMotion, pointerFine }`. `OrbitalExperience.tsx` consome
  apenas `reducedMotion` e não é alterado em nenhuma fase.
- Não executar `git add`, `git commit` nem `git push` em nenhuma fase.
- Ao fim de cada fase, rodar `npm test`, `npm run lint` e `npm run build`.
  Só avançar se os três passarem.
- Executar as fases na ordem numérica. A Fase 1 muda o modelo de custo; as
  faixas numéricas das fases seguintes dependem dela.

---

## Fase 0 — Instrumentação e linha de base

Sem esta fase não há como calibrar os degraus da Fase 2.

### 0.1 Medidor de frame

Criar, dentro de `ParticleField.tsx`, um bloco sob `if (import.meta.env.DEV)`
que acumule e imprima a cada 120 frames:

- FPS médio da janela.
- `totalCount` atual.
- `window.devicePixelRatio` e o `maxDpr` em vigor.
- Tempo médio gasto dentro do corpo do `useFrame`, medido com
  `performance.now()` no início e no fim.

O log identifica se o frame está preso na CPU (tempo de `useFrame` alto) ou na
GPU (tempo de `useFrame` baixo mas FPS baixo). Este log permanece no código.

### 0.2 Correções de custo sem mudança de arquitetura

Aplicar em `ParticleField.tsx`:

- No lerp do glow (perto da linha 390), `new THREE.Vector3(...)` é alocado duas
  vezes por frame. Substituir por dois `useRef<THREE.Vector3>` reaproveitados,
  usando `.set(...)` antes do `.lerp(...)`.
- Idem para o `THREE.Vector3` do `coreRef`.

### 0.3 Linha de base medida — CONCLUÍDA

Medição real na máquina de desenvolvimento (classe A, monitor de 144 Hz):

```
[perf] fps=141.9 body=6.48ms particles=296800 detail=15400 dpr=1.25 devicePixelRatio=1.25
[perf] fps=144.3 body=6.50ms particles=296800 detail=15400 dpr=1.25 devicePixelRatio=1.25
[perf] fps=143.3 body=6.49ms particles=296800 detail=15400 dpr=1.25 devicePixelRatio=1.25
```

`particles=296800` confirma a aritmética de D2: `count = 140000` produz
`totalCount = 296800`.

**Conclusão 1 — o gargalo é CPU.** O orçamento de frame a 144 Hz é 6,94 ms.
O corpo do `useFrame` consome 6,48 ms, ou 93% do orçamento, antes de a GPU
desenhar qualquer coisa. Custo unitário: 21,8 ns por partícula por frame.
A Fase 1 está justificada.

Extrapolação por classe, mantendo `totalCount = 296800`:

| Classe | Single-core relativo | `body` estimado | Teto de fps só por CPU |
|---|---|---|---|
| A | 1,0× | 6,5 ms | 154 |
| B | ~1,8× | 11,7 ms | 85 |
| C | ~2,8× | 18,1 ms | 55, e abaixo de 30 somando fill rate |

**Conclusão 2 — degraus de DPR podem ser inertes.** O log mostra `dpr=1.25`
com `maxDpr = 1.5`. R3F aplica `clamp(window.devicePixelRatio, min, max)`, logo
o DPR efetivo nunca ultrapassa `window.devicePixelRatio`. Num monitor 1080p a
100% de escala (`devicePixelRatio = 1.0`), **todo degrau de DPR da escada é um
no-op**: a cena não muda e a rodada de medição seguinte repete o mesmo FPS.
A Fase 2.5 trata esse caso.

**Conclusão 3 — há variação fora do `useFrame`.** O FPS oscila entre 91 e 145
enquanto `body` fica estável entre 6,48 e 6,76 ms. A causa está fora do corpo
medido: GC, o `useFrame` separado de `DustField`, ou escalonamento do
navegador. Reavaliar depois da Fase 1; se persistir, instrumentar `DustField`
do mesmo modo.

**Aceite:** atingido. O log imprime as métricas e nenhuma alocação de
`Vector3` permanece dentro do `useFrame`.

---

## Fase 1 — Migrar a animação para o vertex shader

Esta é a fase que remove o teto de CPU. É a mais extensa e a de maior risco.
Não há caminho duplo: a implementação em JavaScript do `useFrame` é substituída,
não mantida em paralelo.

### 1.1 Princípio

Hoje, cada frame recalcula posições em JavaScript e reenvia o buffer inteiro.
Depois desta fase, os buffers são enviados à GPU **uma vez por morph** e o
vertex shader calcula a posição final a cada frame a partir de uniforms
escalares. O upload por frame cai de megabytes para algumas dezenas de bytes.

### 1.2 Atributos por partícula

Criar `src/experience/galaxy/particleShader.ts`, exportando o código GLSL e uma
fábrica de `THREE.ShaderMaterial`.

Atributos (todos `Float32Array`, enviados apenas quando o morph muda):

| Atributo | Tamanho | Conteúdo |
|---|---|---|
| `position` | 3 | igual a `aTarget`; existe só para o cálculo de bounding sphere |
| `aFrom` | 3 | pose de origem do morph, já des-rotacionada |
| `aOvershoot` | 3 | pose intermediária do flourish |
| `aTarget` | 3 | pose de destino, estática e sem spin |
| `aFromColor` | 3 | cor de origem |
| `aTargetColor` | 3 | cor de destino |
| `aGalaxy` | 1 | índice da galáxia a que a partícula pertence, 0 a 4 |

Total 19 floats por partícula, 76 bytes. Em 550.000 partículas, cerca de 42 MB
de VRAM, carregados uma vez por morph.

### 1.3 Uniforms

| Uniform | Tipo | Origem |
|---|---|---|
| `uMorphT` | `float` | `morph.current.t`, escrito pelo mesmo tween GSAP de hoje |
| `uFlourish` | `int` | mapeamento de `Flourish` para 0..4 |
| `uSpinTime` | `float` | `spinTime.current` |
| `uTime` | `float` | `state.clock.elapsedTime` |
| `uCenter[5]` | `vec3` | `GalaxySpin.cx/cy/cz` |
| `uNormal[5]` | `vec3` | `GalaxySpin.nx/ny/nz` |
| `uSpeed[5]` | `float` | `GalaxySpin.speed` |
| `uIntensity[5]` | `float` | `intensities.current` por galáxia |
| `uActiveGalaxy` | `int` | índice da galáxia com `intensity > 0.001`, ou -1 |
| `uWave` | `vec4` | `amplitude`, `frequency`, `speed`, `strength` |
| `uWaveAxis` | `ivec2` | `drive` e `displace` de `Wave` |
| `uPointSize` | `float` | lerp já existente |
| `uOpacity` | `float` | lerp já existente |

Escrever uniform é uma operação escalar por frame. É isso que substitui os
890.400 floats de upload.

### 1.4 Portar as funções para GLSL

Portar, mantendo a matemática idêntica, sem alterar constantes:

- `morphInto` mais `flourishTarget` (`particleMorph.ts`) — interpolação
  `aFrom → aOvershoot → aTarget` com o corte em `FLOURISH_SPLIT = 0.55`.
- `rotateGalaxy` (`particleMath.ts`) — rotação de Rodrigues em torno de
  `uNormal[aGalaxy]` passando por `uCenter[aGalaxy]`, ângulo
  `mod(uSpinTime * uSpeed[aGalaxy], TAU)`.
- `applyWave` (`particleMath.ts` linhas 20 a 33).
- `applyGalaxyDeformation` (`particleMath.ts` linhas 140 a 245) — os quatro
  casos `projetos`, `stack`, `sobre`, `contato`. No GLSL, ramificar com
  `if (int(aGalaxy) == uActiveGalaxy)` e depois um `if/else` por cena. Só uma
  galáxia tem intensidade acima de zero por vez, então o custo é local.
- Interpolação de cor: `mix(aFromColor, aTargetColor, uMorphT)` no vertex
  shader, saída em `varying vec3 vColor`.

Todas essas funções são puramente por partícula, sem acesso a vizinhos.
A portabilidade é direta.

### 1.5 Fragment shader

Reproduzir o resultado visual do `pointsMaterial` atual: amostrar a textura de
`particleTexture.ts` em `gl_PointCoord`, multiplicar por `vColor` e por
`uOpacity`, descartar fragmentos com alpha abaixo de `0.01`.

Manter no material: `transparent: true`, `depthWrite: false`,
`blending: THREE.AdditiveBlending`.

Replicar `sizeAttenuation` no vertex shader:
`gl_PointSize = uPointSize * (uScale / -mvPosition.z)`, com `uScale` derivado
da altura do canvas.

### 1.6 Manter as funções JavaScript

**Não apagar** `particleMath.ts` nem `particleMorph.ts`. Os testes
`particleMath.test.ts` e `particleMorph.test.ts` continuam sendo a
especificação executável do comportamento portado para GLSL, e o jsdom não
compila shader. Os arquivos permanecem e os testes continuam passando.

### 1.7 Ajustes no componente

Em `ParticleField.tsx`:

- O `useFrame` passa a escrever apenas uniforms. Nenhuma escrita em
  `posAttr.array`. Remover `posAttr.needsUpdate = true`.
- Definir `frustumCulled={false}` no `<points>`, porque o vertex shader desloca
  os vértices e o bounding volume calculado pela CPU deixa de ser válido.
- O efeito de morph (linhas 255 a 313) continua igual, mas escreve em
  `aFrom`, `aOvershoot`, `aFromColor` e `aTargetColor` e marca `needsUpdate`
  nesses atributos. Isso acontece uma vez por morph, não por frame.
- `overshootRef`, `livePositions`, `liveColors`, `fromRef` e `fromColorsRef`
  deixam de ser buffers de trabalho por frame e passam a alimentar os
  atributos.

Aplicar a mesma migração em `DustField.tsx`, que é mais simples: o campo é
estático, só precisa do spin e do `sizeAttenuation` no shader.

### 1.8 Verificação

Rodar `npm run dev` e comparar com a linha de base da Fase 0.3, no mesmo tier:

- O tempo médio de `useFrame` deve cair para abaixo de 1 ms.
- O FPS deve subir.
- A cena deve ser visualmente indistinguível da anterior: mesma formação,
  mesmo spin, mesmas deformações por categoria, mesmas cores.

**Aceite:** `npm test` passa sem alteração em `particleMath.test.ts` nem em
`particleMorph.test.ts`. `npm run build` compila. O tempo de `useFrame` medido
fica abaixo de 1 ms. A cena não mudou de aparência.

---

## Fase 2 — Escada de qualidade

Criar `src/experience/lib/qualityLadder.ts`.

### 2.1 Modelo

Substituir os quatro tiers nomeados por uma escada ordenada única. Um degrau é
identificado por um índice inteiro. Descer é `index + 1`, subir é `index - 1`.
Isso elimina a ambiguidade de "qual tier vem depois" e permite intercalar
degraus que mexem só no DPR.

```ts
export interface Rung {
  id: string;
  particleCount: number;
  maxDpr: number;
  customCursor: boolean;
}
```

### 2.2 A escada

```ts
export const LADDER: readonly Rung[] = [
  { id: "ultra",   particleCount: 220000, maxDpr: 2.0,  customCursor: true  },
  { id: "high",    particleCount: 220000, maxDpr: 1.5,  customCursor: true  },
  { id: "high-",   particleCount: 150000, maxDpr: 1.5,  customCursor: true  },
  { id: "mid",     particleCount: 150000, maxDpr: 1.25, customCursor: true  },
  { id: "mid-",    particleCount: 100000, maxDpr: 1.25, customCursor: true  },
  { id: "low+",    particleCount: 100000, maxDpr: 1.0,  customCursor: true  },
  { id: "low",     particleCount: 48000,  maxDpr: 1.0,  customCursor: false },
  { id: "floor",   particleCount: 16000,  maxDpr: 1.0,  customCursor: false },
  { id: "minimal", particleCount: 6000,   maxDpr: 1.0,  customCursor: false },
];
```

Regra de construção, que deve valer para qualquer ajuste futuro: **entre dois
degraus consecutivos, exatamente um dos dois campos muda.** Nunca os dois.
Assim, o passo barato (DPR) é sempre tentado antes do passo caro (contagem, que
obriga reconstrução de buffer).

Lembrar de D2: `particleCount` multiplica por cerca de 2,12 até virar
`totalCount`. O degrau `ultra` renderiza cerca de 466.000 partículas na cena
principal.

Estes valores são a calibração inicial. Ajustá-los é a tarefa da Fase 8.4.

### 2.3 Degrau de movimento reduzido

`REDUCED` fica fora da escada, em constante própria:

```ts
export const REDUCED_RUNG: Rung = {
  id: "reduced", particleCount: 6000, maxDpr: 1.0, customCursor: false,
};
```

`prefers-reduced-motion` não é uma questão de performance e nunca participa de
subida ou descida de degrau.

### 2.4 Orçamento de pixels

Um monitor 4K com `maxDpr: 2.0` renderiza 33 milhões de pixels por frame. Com
`AdditiveBlending` e overdraw, isso derruba qualquer GPU. Clampar:

```ts
export const PIXEL_BUDGET = 5_000_000;

export function clampDpr(
  maxDpr: number, widthCss: number, heightCss: number,
): number
```

- Calcular `allowed = Math.sqrt(PIXEL_BUDGET / (widthCss * heightCss))`.
- Devolver `Math.min(maxDpr, allowed)`, com piso em `1`.
- Se `widthCss` ou `heightCss` for zero ou não finito, devolver `maxDpr`.

### 2.5 Navegação na escada

```ts
export function rungAt(index: number): Rung
export function indexOfId(id: string): number  // -1 se não existir
export function stepDown(index: number, devicePixelRatio: number): number
export function stepUp(index: number, devicePixelRatio: number): number
```

- `rungAt` clampa o índice ao intervalo válido antes de indexar.

**Degraus inertes.** A Conclusão 2 da Fase 0.3 mostrou que o DPR efetivo é
`clamp(window.devicePixelRatio, 1, rung.maxDpr)`. Quando
`devicePixelRatio <= rung.maxDpr`, o campo `maxDpr` não tem efeito nenhum.
Num monitor a `devicePixelRatio = 1.0`, isso vale para toda a escada: os
degraus que só mudam DPR não alteram nada, a cena fica idêntica e a rodada de
medição seguinte repete o mesmo FPS, queimando uma das `MAX_ROUNDS`.

```ts
export function isInertStep(from: number, to: number, devicePixelRatio: number): boolean
```

Devolve `true` quando `LADDER[from].particleCount === LADDER[to].particleCount`
**e** `devicePixelRatio <= Math.min(LADDER[from].maxDpr, LADDER[to].maxDpr)`.
Ou seja: o passo só mexeria no DPR, e o DPR já está abaixo dos dois tetos.

- `stepDown` avança o índice em 1 e, enquanto o passo for inerte e houver
  degrau abaixo, continua avançando. Nunca ultrapassa `LADDER.length - 1`.
- `stepUp` recua o índice em 1 e, enquanto o passo for inerte e houver degrau
  acima, continua recuando. Nunca passa de `0`.

Assim, num monitor de DPR baixo a escada colapsa para os degraus que mudam
`particleCount`, que é o único lever com efeito naquela tela. Num monitor
Retina ou 4K, a escada usa todos os degraus.

### 2.6 Testes — `qualityLadder.test.ts`

- `LADDER` tem `particleCount` não crescente e `maxDpr` não crescente ao longo
  do índice.
- Para todo `i`, `LADDER[i]` e `LADDER[i+1]` diferem em exatamente um dos
  campos `particleCount` e `maxDpr`.
- `stepDown(último, 2)` devolve o último índice.
- `stepUp(0, 2)` devolve 0.
- `rungAt(-5)` devolve `LADDER[0]`; `rungAt(999)` devolve o último degrau.
- Com `devicePixelRatio = 2`, `stepDown(indexOfId("ultra"), 2)` devolve
  `indexOfId("high")` — o passo de DPR não é inerte e vale.
- Com `devicePixelRatio = 1`, `stepDown(indexOfId("ultra"), 1)` **pula**
  `"high"` e devolve `indexOfId("high-")` — o passo de DPR seria no-op.
- Com `devicePixelRatio = 1`, todo resultado de `stepDown` cai num degrau cujo
  `particleCount` difere do degrau de origem.
- Com `devicePixelRatio = 1.25`, `stepDown(indexOfId("mid"), 1.25)` devolve
  `indexOfId("mid-")` — muda `particleCount`, não é inerte.
- `isInertStep` devolve `false` sempre que os dois degraus têm
  `particleCount` diferente, qualquer que seja o `devicePixelRatio`.
- `clampDpr(2.0, 3840, 2160)` devolve valor menor que `2.0` e maior ou igual
  a `1`.
- `clampDpr(2.0, 1280, 720)` devolve `2.0`.
- `clampDpr(1.5, 0, 0)` devolve `1.5`.

**Aceite:** `npm test` passa com os 8 grupos acima.

---

## Fase 3 — Classificação da GPU

Criar `src/experience/lib/gpuTier.ts`. Serve apenas para escolher o degrau
inicial. Não decide o degrau final.

### 3.1 Tipo

```ts
export type GpuClass = "low" | "mid" | "high" | "unknown";
```

### 3.2 `getGpuRendererString(): string | null`

- Cachear em variável de módulo (`let cached: string | null | undefined`).
  Chamadas seguintes devolvem o cache sem criar canvas novo.
- Se `typeof window === "undefined"`, devolver `null`.
- Criar `document.createElement("canvas")`; obter contexto via
  `canvas.getContext("webgl")` e, se falhar, `canvas.getContext("experimental-webgl")`.
- Sem contexto, devolver `null`.
- `gl.getExtension("WEBGL_debug_renderer_info")`; se `null`, devolver `null`.
- `gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)`; se não for `string`,
  devolver `null`.
- Antes de devolver, liberar o contexto:
  `gl.getExtension("WEBGL_lose_context")?.loseContext()`.
- Todo o corpo dentro de `try/catch`. No `catch`, devolver `null`.

### 3.3 `classifyGpu(renderer: string | null): GpuClass`

- `null` ou string vazia devolve `"unknown"`.
- Comparar sempre em minúsculas.
- Avaliar nesta ordem; a primeira lista que casar vence.

`"low"` — lista fechada:
`swiftshader`, `llvmpipe`, `software rasterizer`, `microsoft basic render`,
`intel(r) hd graphics`, `intel(r) uhd graphics`, `intel(r) g45`,
`intel(r) q45`, `mali-4`, `mali-t`, `mali-g3`, `mali-g5`,
`adreno (tm) 3`, `adreno (tm) 4`, `adreno (tm) 5`, `videocore`.

`"high"` — lista fechada:
`rtx 30`, `rtx 40`, `rtx 50`, `radeon rx 6`, `radeon rx 7`, `radeon rx 9`,
`radeon pro`, `arc(tm) a7`, `apple m2`, `apple m3`, `apple m4`.

`"mid"` — lista fechada:
`nvidia`, `geforce`, `gtx`, `radeon`, `vega`, `apple m1`, `arc(tm) a`,
`intel(r) iris`, `adreno (tm) 7`, `adreno (tm) 8`, `mali-g7`, `mali-g6`.

Qualquer outro caso devolve `"unknown"`.

A lista `"high"` reconhece a classe A do objetivo. A lista `"mid"` reconhece a
classe B e é avaliada depois de `"high"`, de modo que `rtx 4070` case como
`"high"` e não como `"mid"` por causa do trecho `nvidia`.

### 3.4 Testes — `gpuTier.test.ts`

- `"ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0)"` devolve `"high"`.
- `"ANGLE (AMD, AMD Radeon RX 7800 XT Direct3D11 vs_5_0 ps_5_0)"` devolve `"high"`.
- `"Apple M3 Max"` devolve `"high"`.
- `"ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0)"` devolve `"mid"`.
- `"ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0)"` devolve `"mid"`.
- `"Apple M1"` devolve `"mid"`.
- `"ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)"` devolve `"low"`.
- `"ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))"` devolve `"low"`.
- `"Mesa/X.org, llvmpipe (LLVM 15.0.7, 256 bits)"` devolve `"low"`.
- `null` devolve `"unknown"`.
- `"Adreno (TM) 750"` devolve `"mid"`.
- String contendo `nvidia` e `llvmpipe` devolve `"low"` (prioridade da lista
  `"low"`).

**Aceite:** `npm test` passa com os 12 casos.

---

## Fase 4 — Lógica pura de adaptação

Criar `src/experience/lib/adaptiveTier.ts`. Sem DOM, sem React, sem
`requestAnimationFrame`. Só funções puras, para ser testável em jsdom.

### 4.1 Decisão por FPS

```ts
export type Move = "down2" | "down1" | "hold" | "up1";

export function decide(avgFps: number): Move
```

- `avgFps` não finito ou `<= 0` devolve `"hold"` (amostra inválida).
- `avgFps < 30` devolve `"down2"`.
- `avgFps < 48` devolve `"down1"`.
- `avgFps < 57` devolve `"hold"`.
- Caso contrário devolve `"up1"`.

A faixa morta entre 48 e 57 impede oscilação em máquinas que ficam perto do
limiar.

### 4.2 Aplicação do movimento

```ts
export interface AdaptState {
  index: number;
  demoted: boolean;
  promotions: number;
}

export const MAX_PROMOTIONS = 2;

export function applyMove(
  state: AdaptState, move: Move, devicePixelRatio: number,
): AdaptState
```

`devicePixelRatio` é repassado direto para `stepUp` e `stepDown`, que usam o
valor para pular degraus inertes (Fase 2.5).

Regras, nesta ordem:

1. `"hold"` devolve `state` inalterado.
2. `"up1"`:
   - Se `state.demoted === true`, devolver `state` inalterado. **Depois de
     qualquer descida, a subida fica travada para sempre naquela sessão.**
     Uma máquina que já falhou não é promovida de volta.
   - Se `state.promotions >= MAX_PROMOTIONS`, devolver `state` inalterado.
   - Se `state.index === 0`, devolver `state` inalterado.
   - Senão, devolver
     `{ index: stepUp(index, dpr), demoted: false, promotions: promotions + 1 }`.
3. `"down1"` devolve `{ index: stepDown(index, dpr), demoted: true, promotions }`.
4. `"down2"` devolve
   `{ index: stepDown(stepDown(index, dpr), dpr), demoted: true, promotions }`.

Descida não tem limite de contagem além do fim da escada. Uma máquina fraca
precisa poder chegar ao último degrau.

### 4.3 Persistência

```ts
export const STORAGE_KEY = "portfolio-quality-v1";
export const STORAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export interface StoredQuality { id: string; gpu: GpuClass; at: number; }

export function loadStored(gpu: GpuClass): number | null
export function storeIndex(index: number, gpu: GpuClass): void
```

`loadStored`:

- Todo o acesso a `localStorage` dentro de `try/catch`.
- Fazer `JSON.parse`. Se falhar, devolver `null`.
- Devolver `null` se: `at` não for número; `Date.now() - at > STORAGE_TTL_MS`;
  `gpu` gravado for diferente do `gpu` recebido; `indexOfId(id)` devolver `-1`.
- Senão devolver `indexOfId(id)`.

A expiração de 30 dias e a checagem de `gpu` impedem que uma medição ruim
isolada, ou uma troca de placa de vídeo, prendam a máquina num degrau baixo
para sempre.

`storeIndex` grava `{ id: rungAt(index).id, gpu, at: Date.now() }` dentro de
`try/catch`, falhando em silêncio.

### 4.4 Testes — `adaptiveTier.test.ts`

- `decide` devolve `"down2"`, `"down1"`, `"hold"`, `"up1"` para
  `20`, `40`, `52`, `60`.
- `decide(NaN)` e `decide(0)` devolvem `"hold"`.
Passar `devicePixelRatio = 2` em todos os casos abaixo, para que nenhum passo
seja inerte e a aritmética de índice seja direta.

- `applyMove` com `"down1"` incrementa o índice e marca `demoted: true`.
- `applyMove` com `"down2"` a partir do índice 0 devolve índice 2.
- `applyMove` com `"down2"` no penúltimo índice devolve o último índice, sem
  estourar.
- `applyMove` com `"up1"` e `demoted: true` devolve o estado inalterado.
- `applyMove` com `"up1"` e `promotions: 2` devolve o estado inalterado.
- `applyMove` com `"up1"` no índice 0 devolve o estado inalterado.
- `applyMove` com `"up1"` no índice 3, limpo, devolve índice 2 e
  `promotions: 1`.
- `applyMove` com `"down1"` e `devicePixelRatio = 1`, a partir de
  `indexOfId("ultra")`, devolve `indexOfId("high-")` — o degrau `"high"`, que
  só mudaria DPR, é pulado.
- `loadStored` devolve `null` para JSON inválido.
- `loadStored` devolve `null` quando `at` é mais antigo que `STORAGE_TTL_MS`.
- `loadStored` devolve `null` quando a `gpu` gravada difere da recebida.
- `storeIndex` seguido de `loadStored` com a mesma `gpu` devolve o mesmo índice.

**Aceite:** `npm test` passa com os 13 casos.

---

## Fase 5 — Hook de medição

Criar `src/experience/lib/useAdaptivePerfTier.ts`.

```ts
export function useAdaptivePerfTier(
  initialIndex: number,
  gpu: GpuClass,
  enabled: boolean,
): number
```

Devolve o índice de degrau vigente.

Comportamento, exato:

- Se `enabled === false`, devolver `initialIndex` sem agendar nada. `enabled`
  é `false` quando `prefers-reduced-motion` está ativo.
- Estado: `const [state, setState] = useState<AdaptState>({ index: initialIndex, demoted: false, promotions: 0 })`.
- A medição usa `requestAnimationFrame` próprio, dentro de `useEffect`. **Não
  usar `useFrame` do R3F** — o hook roda fora do `<Canvas>`.
- Constantes: `const WARMUP_MS = 1800`, `const SAMPLE_MS = 2000`,
  `const MAX_ROUNDS = 6`.
- Uma rodada:
  1. Durante `WARMUP_MS`, contar frames e descartá-los. Isso ignora o custo de
     montagem, a compilação de shader e a animação de formação.
  2. Durante os `SAMPLE_MS` seguintes, contar frames e acumular tempo real.
  3. `avgFps = frames / (elapsedMs / 1000)`.
  4. `move = decide(avgFps)`;
     `next = applyMove(state, move, window.devicePixelRatio)`.
  5. Se `next.index !== state.index`, chamar `setState(next)`,
     `storeIndex(next.index, gpu)` e iniciar nova rodada.
  6. Se `next.index === state.index`, encerrar. Nenhuma rodada nova.
- Parar após `MAX_ROUNDS` rodadas, em qualquer caso. Isso impede laço infinito
  se a medição ficar instável.
- Se `document.hidden === true` em qualquer momento da rodada, descartar a
  rodada inteira e reiniciá-la quando a aba voltar a ficar visível. Aba oculta
  não recebe `requestAnimationFrame` e produziria FPS falso baixo.
- Ouvir `resize`. Em mudança de tamanho de janela, descartar a rodada em curso
  e reiniciá-la — o orçamento de pixels mudou.
- O `useEffect` devolve cleanup que chama `cancelAnimationFrame`, limpa timers
  e remove os listeners de `visibilitychange` e `resize`.
- Sob `if (import.meta.env.DEV)`, logar por rodada: `avgFps`, `move`,
  `LADDER[index].id` antes e depois. Este log permanece no código.

Não escrever teste unitário para este hook. A lógica testável está em
`adaptiveTier.ts` e em `qualityLadder.ts`. Não simular rAF em jsdom.

**Aceite:** `npm run build` compila sem erro de tipo. `npm test` continua
passando.

---

## Fase 6 — Reescrever `perfTier.ts` e ligar tudo

### 6.1 `perfTier.ts`

```ts
export interface PerfTier {
  id: string;
  particleCount: number;
  maxDpr: number;
  customCursor: boolean;
  bloom: boolean;   // sempre false; mantido para não quebrar consumidores
}

export interface PerfTierOptions {
  reducedMotion?: boolean;
  pointerFine?: boolean;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  gpuClass?: GpuClass;
}

export function getStartIndex(opts: PerfTierOptions = {}): number
```

`getStartIndex` devolve o índice inicial na escada. Ordem de decisão, a
primeira condição verdadeira vence:

1. `pointerFine === false` devolve `indexOfId("floor")`. Mobile e touch entram
   pela base. Corresponde à classe D.
2. `gpuClass === "low"` devolve `indexOfId("low")`. Esta regra ignora
   `hardwareConcurrency` e `deviceMemory` — é a correção do bug original de CPU
   forte com GPU integrada fraca. Classe C.
3. `deviceMemory` é `number` e `<= 4` devolve `indexOfId("low")`.
4. `hardwareConcurrency <= 2` devolve `indexOfId("low")`.
5. `gpuClass === "high"` e `hardwareConcurrency >= 8` devolve `indexOfId("high")`.
   Classe A. **Começa em `high`, não em `ultra`.** A subida até `ultra` é
   concedida pela medição de FPS da Fase 5, nunca por palpite.
6. `gpuClass === "high"` devolve `indexOfId("mid")`.
7. `gpuClass === "mid"` devolve `indexOfId("mid")`. Classe B.
8. `gpuClass === "unknown"` devolve `indexOfId("mid-")`. Safari bloqueia
   `WEBGL_debug_renderer_info` e cai sempre aqui. A promoção da Fase 5 é o que
   leva um Mac potente de volta para cima — por isso a promoção existe.
9. Qualquer outro caso devolve `indexOfId("low+")`.

Defaults: `reducedMotion = false`, `pointerFine = false`,
`hardwareConcurrency = 4`, `deviceMemory` indefinido, `gpuClass = "unknown"`.

`reducedMotion` **não** aparece nesta função. É tratado em 6.2.

Exportar também:

```ts
export function tierFromRung(rung: Rung, dpr: number): PerfTier
```

Devolve `{ ...rung, maxDpr: dpr, bloom: false }`.

### 6.2 `useDeviceCapabilities.ts`

Sequência, exata:

1. `reducedMotion` e `pointerFine` como hoje.
2. `gpuClass` em `useMemo` com deps `[]`: `classifyGpu(getGpuRendererString())`.
3. Se `reducedMotion === true`, devolver
   `tierFromRung(REDUCED_RUNG, REDUCED_RUNG.maxDpr)` e **não** chamar
   `useAdaptivePerfTier` com `enabled: true`. Chamar com `enabled: false` para
   não violar a regra dos hooks.
4. `startIndex` em `useMemo`: o **maior** entre `getStartIndex({...})` e
   `loadStored(gpuClass)`. Índice maior significa degrau mais baixo. Uma sessão
   anterior só pode rebaixar o ponto de partida, nunca elevá-lo.
5. `index = useAdaptivePerfTier(startIndex, gpuClass, !reducedMotion)`.
6. Ler a largura e a altura CSS da janela com um `useState` mais listener de
   `resize`, com debounce de 200 ms.
7. `dpr = clampDpr(rungAt(index).maxDpr, larguraCss, alturaCss)`.
8. `tier = useMemo(() => tierFromRung(rungAt(index), dpr), [index, dpr])`.

A assinatura de retorno do hook não muda:
`{ tier, reducedMotion, pointerFine }`.

### 6.3 `perfTier.test.ts`

Reescrever. Casos obrigatórios, todos comparando `LADDER[getStartIndex(...)].id`:

- `{ pointerFine: false, hardwareConcurrency: 8, gpuClass: "high" }` devolve `"floor"`.
- `{ pointerFine: true, hardwareConcurrency: 8, gpuClass: "low" }` devolve `"low"`
  (bug original relatado).
- `{ pointerFine: true, hardwareConcurrency: 16, gpuClass: "high" }` devolve `"high"`.
- `{ pointerFine: true, hardwareConcurrency: 4, gpuClass: "high" }` devolve `"mid"`.
- `{ pointerFine: true, hardwareConcurrency: 8, gpuClass: "mid" }` devolve `"mid"`.
- `{ pointerFine: true, hardwareConcurrency: 8, gpuClass: "unknown" }` devolve `"mid-"`.
- `{ pointerFine: true, hardwareConcurrency: 16, gpuClass: "high", deviceMemory: 4 }`
  devolve `"low"`.
- `getStartIndex()` sem argumentos devolve `indexOfId("floor")`.
- `getStartIndex` nunca devolve `0`. O degrau `ultra` só é alcançável por
  promoção.
- `tierFromRung(REDUCED_RUNG, 1).particleCount === 6000` e `maxDpr === 1`.

**Aceite:** `npm test` passa. `npm run build` compila.

---

## Fase 7 — `GalaxyCanvas` e transições de degrau

### 7.1 Formação instantânea em remontagem

Resolve D4. **Exige alterar `ParticleField.tsx`.**

Em `ParticleField.tsx`:

- Adicionar a prop `instantForm?: boolean`, default `false`.
- No efeito de morph, na decisão de `first` (linha 301), tratar
  `instantForm === true` do mesmo modo que `reducedMotion` já é tratado:
  atribuir `morph.current.t = 1`, escrever as cores de destino direto no
  atributo, chamar `finish()` e retornar antes de criar o tween.

Em `GalaxyCanvas.tsx`:

- `const mountedOnce = useRef(false)`.
- Em `useEffect` com deps `[]`, marcar `mountedOnce.current = true`.
- Passar `instantForm={mountedOnce.current}` para `ParticleField`.

Assim, a primeira montagem faz a formação completa e toda remontagem por
mudança de degrau aparece pronta, sem replay da animação de entrada.

### 7.2 Remontagem quando a contagem muda

`ParticleField` cria `useRef<Float32Array>(new Float32Array(count * 3))` na
linha 143. `useRef` só usa o valor inicial na montagem: mudar `count` em
runtime deixaria o buffer com o tamanho antigo. Forçar remontagem:

- `<ParticleField key={totalCount} instantForm={mountedOnce.current} ... />`
- `<DustField key={dustCount} ... />`

Degraus que mudam apenas `maxDpr` não alteram `totalCount`, logo **não**
remontam nada. É exatamente por isso que a escada da Fase 2 intercala degraus
de DPR: o passo barato não paga o custo de reconstrução.

### 7.3 Blindar `onFormed`

A remontagem de 7.2 dispara `onFormed` de novo, o que reenviaria eventos à
máquina de estado.

- `const formedRef = useRef(false)`.
- `handleFormed` com `useCallback`: se `formedRef.current` for `true`, retornar.
  Senão marcar `true` e chamar `onFormed?.()`.
- Passar `handleFormed` para `ParticleField` no lugar de `onFormed`.

### 7.4 Configuração do contexto

```ts
const GL_CONFIG = {
  antialias: false,
  alpha: true,
  powerPreference: "high-performance" as const,
  failIfMajorPerformanceCaveat: false,
};
```

`powerPreference: "high-performance"` faz notebooks híbridos usarem a GPU
dedicada. É o que a classe A precisa.

### 7.5 Perda de contexto

Sintoma de "site sem partículas" em máquina muito fraca.

- `const [contextLost, setContextLost] = useState(false)`.
- Prop `onCreated` no `<Canvas>`; dentro dela, em `state.gl.domElement`:
  - `webglcontextlost`: o handler chama `event.preventDefault()`,
    `setContextLost(true)` e `storeIndex(LADDER.length - 1, gpuClass)`.
    Gravar o último degrau garante que o próximo carregamento comece em
    `minimal`.
  - `webglcontextrestored`: o handler chama `setContextLost(false)`.
- Enquanto `contextLost === true`, renderizar `<GalaxyBackdrop />` no lugar do
  `<Canvas>`.
- O `onCreated` deve remover os dois listeners no unmount.

### 7.6 Limpar `GalaxyBackdrop`

`GalaxyBackdrop.tsx` declara a prop `pulse` e nunca a usa. Remover a prop e sua
tipagem. Rodar `grep -rn "GalaxyBackdrop" src` e remover o atributo em qualquer
chamador que o passe.

**Aceite:** `npm test` passa, `npm run build` compila. Forçar manualmente um
degrau abaixo no DevTools e confirmar que a cena não replica a animação de
formação.

---

## Fase 8 — Validação e calibração

### 8.1 Comandos

1. `npm test` — suíte completa verde.
2. `npm run lint` — sem erro novo.
3. `npm run build` — build sem erro.

### 8.2 Matriz de hardware

Rodar `npm run preview` e validar cada linha. Usar o log da Fase 0.1 e o log da
Fase 5 para ler o degrau e o FPS.

| # | Cenário | Como simular | Esperado |
|---|---|---|---|
| 1 | Classe A | máquina real com GPU dedicada | inicia em `high`, sobe para `ultra`, FPS ≥ 57 |
| 2 | Classe B | DevTools, CPU throttling 4x | estabiliza entre `mid` e `low+`, FPS ≥ 48 |
| 3 | Classe C | Chrome com `--use-gl=swiftshader` | inicia em `low` sem esperar medição, cai até no máximo `minimal`, ainda animado |
| 4 | Classe D | DevTools, emulação de dispositivo móvel | inicia em `floor` |
| 5 | Movimento reduzido | DevTools, aba Rendering, `prefers-reduced-motion` | degrau `reduced`, nenhuma rodada de medição no log |
| 6 | Safari | navegador real | `gpuClass` é `"unknown"`, inicia em `mid-`, promove se o FPS permitir |
| 7 | Monitor 4K | resolução real ou emulada | `clampDpr` reduz o DPR efetivo; sem queda de FPS ao maximizar a janela |
| 8 | Persistência | rodar cenário 2, recarregar | inicia já no degrau rebaixado; `localStorage` tem `portfolio-quality-v1` |
| 9 | Troca de GPU | editar o campo `gpu` gravado no `localStorage` | valor persistido é ignorado; recalcula do zero |
| 10 | Expiração | editar `at` para 31 dias atrás | valor persistido é ignorado |

### 8.3 Regressão visual

Nos cenários 1 e 2, percorrer as quatro categorias (`projetos`, `stack`,
`sobre`, `contato`) e confirmar, contra o estado anterior à Fase 1:

- A deformação de cada categoria é idêntica.
- O spin não dá salto nem retrocede ao entrar e sair de uma categoria.
- As cores transicionam suavemente no morph.
- A animação de formação inicial acontece uma vez, e só uma.

### 8.4 Calibração final da escada

Depois que os cenários 1 a 4 rodarem:

- Se a classe A estabilizar em `ultra` com FPS acima de 57 **e** o tempo de
  `useFrame` ficar abaixo de 1 ms, acrescentar um degrau novo no topo de
  `LADDER` com `particleCount: 300000` e `maxDpr: 2.0`, respeitando a regra de
  "um campo por degrau" da Fase 2.2. Repetir o cenário 1.
- Se a classe C não alcançar 30 fps nem no último degrau, baixar
  `minimal.particleCount` para `3000` e repetir o cenário 3.
- Registrar os valores finais na tabela da Fase 2.2 antes de encerrar.

**Aceite:** os três comandos passam, os 10 cenários se comportam como descrito,
e a regressão visual de 8.3 não encontra diferença.
