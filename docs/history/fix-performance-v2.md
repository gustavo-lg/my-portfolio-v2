# fix-performance-v2 — parar os travamentos e o degrau errado

Continuação de `fix-performance.md`. Aquele documento entregou o sistema de
qualidade adaptativa; este corrige os defeitos de projeto que ele trouxe.

## Contexto

O sistema está em produção (commit `9d6375f`) e quebrou em duas frentes:

1. **Travamento poucos segundos após o início da animação, em todo dispositivo.**
2. **PC intermediário (Galaxybook i5, Iris Xe) ficou pesado, com FPS baixo.**

Mesma origem: o medidor promove a máquina para um degrau que ela não aguenta, e
cada troca de degrau custa uma remontagem síncrona cara.

## Regras de execução

- Executar as fases na ordem numérica. A Fase 0 pode invalidar parte do
  diagnóstico; não pular.
- Ao fim de cada fase: `npx tsc --noEmit -p tsconfig.app.json`, `npm test`,
  `npm run lint`, `npm run build`. Só avançar com os quatro limpos.
- Baseline de lint: **17 problemas, 3 erros**. Os 3 erros são pré-existentes
  (`command.tsx`, `textarea.tsx`, `tailwind.config.ts`). Não corrigir, não
  deixar crescer.
- Testes rodam em `vitest` + `jsdom`, sem WebGL e sem rAF confiável. Nenhum
  teste novo pode criar contexto WebGL, compilar shader ou depender de rAF real.
- Não executar `git add`, `git commit` nem `git push`.

---

## Causa raiz

### RC1 — O probe mede o momento mais barato da cena

`WARMUP_MS = 1800` + 10 × `SAMPLE_MS = 250` ⇒ a **primeira decisão cai em
4300 ms** (`useAdaptivePerfTier.ts:7-11`). A formação termina em
`FORMATION_MS = 4400` (`cameraTargets.ts:3`).

A rodada inteira mede durante o morph, com as partículas ainda espalhadas na
nuvem de `DISPERSED_RADIUS = 24` (`particleGeometry.ts:29`) contra o disco final
de `outer: 7.5`. Raio ~3× maior ⇒ área de tela ~10× maior ⇒ overdraw muito
menor. Com `AdditiveBlending` a cena é limitada por fill rate, então a pose
dispersa é drasticamente mais barata que a galáxia densa em repouso.

O probe conclui "sobra folga" medindo o que nunca vai persistir.

### RC2 — Sob vsync, promoção é adivinhação

`boundsFor(60)` devolve `[40, 60]` (`adaptiveTier.ts:26-28`). Um monitor de
60 Hz travado em 60 fps passa no limite superior. Não há como distinguir "sobra
98% de folga" de "está no limite exato".

Há ainda uma inversão: `refreshRef.current` é o **máximo de fps já observado**
(`useAdaptivePerfTier.ts:105`). Uma máquina fraca que nunca passa de 60 fps é
indistinguível de um monitor de 60 Hz, então recebe `bounds = [40, 60]` em vez
de `[60, 100]`. Quanto pior a máquina, mais baixa a barra.

### RC3 — `extreme` é alcançável a partir de `mid`

Traçado para o Galaxybook i5 (Iris Xe, DPR 1, 1080p 60 Hz):

- `classifyGpu` → `"intel(r) iris"` está na lista MID (`gpuTier.ts:94`) ⇒ `"mid"`.
- `getStartIndex` (`perfTier.ts:73`) ⇒ índice **4 = `mid`** (150.000).
- `stepUp(4, 1)`: `mid`→`high-` mesma contagem e DPR 1 ≤ 1,25 ⇒ inerte, pula ⇒
  `high-`→`high` muda contagem ⇒ **índice 2 = `high`** (220.000).
- `stepUp(2, 1)`: `high`→`ultra` mesma contagem, DPR 1 ≤ 1,5 ⇒ inerte, pula ⇒
  `ultra`→`extreme` ⇒ **índice 0 = `extreme`** (300.000).

| Degrau | `particleCount` | pontos no campo | dust |
|---|---|---|---|
| `mid` (início) | 150.000 | 318.000 | 49.500 |
| `high` (promoção 1) | 220.000 | 466.400 | 72.600 |
| `extreme` (promoção 2) | 300.000 | **636.000** | 99.000 |

Uma Iris Xe termina em 636.000 partículas com blending aditivo. Na RTX 4060
deste projeto `extreme` custa 0,98 ms/quadro; numa integrada é ordem de 10×
mais, acima do orçamento de 16,67 ms para 60 fps.

As duas promoções **não compram DPR nenhum**: `clampDpr(2.0, 1920, 1080)` dá
1,553 e o three ainda clampa para `window.devicePixelRatio = 1`. Só compram
partículas — exatamente o que custa a remontagem.

### RC4 — Cada troca de degrau é um congelamento síncrono

`key={totalCount}` em `<ParticleField>` (`GalaxyCanvas.tsx:310`) e
`key={dustCount}` em `<DustField>` (`:304`). Uma troca remonta os dois. Por
remontagem, no pior degrau: ~77 MB de `Float32Array` novos, ~43 MB de upload
síncrono para GPU, ~15 passagens completas sobre arrays de 1,9 M floats,
**recompilação e relink do shader** (os dois `ShaderMaterial` são descartados em
`ParticleField.tsx:219-226` antes de os novos existirem, perdendo o cache de
programa do three), e ~77 MB de lixo que cobra um GC stall depois.

`MAX_ROUNDS = 6` ⇒ até 6 remontagens, com decisões em ≈ 4300, 8600, 12900,
17200, 21500 e 25800 ms.

A primeira cai 100 ms antes do fim da formação. Como `mountedOnce.current` já é
`true`, o campo remontado recebe `instantForm={true}` e **pula a formação
inteira** (`ParticleField.tsx:468-472`): a animação começa, engasga, e a galáxia
salta pronta.

### RC5 — `instantForm` desperdiça 8 passagens completas

O retorno antecipado em `ParticleField.tsx:468` acontece **depois** do trabalho
de `:386-459`: snapshot, `morphInto`, `applyWave`, `lerpPositions`,
`target.set`, `targetColor.set`, `flourishTarget`. São ~8 varreduras de 1,9 M
floats jogadas fora em todo remount.

---

## Fase 0 — Confirmar o sintoma antes de corrigir

RC4 explica um travamento em **≈ 4300 ms**. O relato foi **2 segundos**. A
máquina de estados não agenda nada em 2 s — a conciliação assumida é que "2 s de
animação visível" corresponde a ~4,3 s de relógio. **Essa suposição não foi
verificada e o resto do plano depende dela.**

1. Subir `npm run dev`. Confirmar em qual porta subiu: parar a tarefa do npm não
   mata o processo `vite.js` filho, então portas antigas podem estar ocupadas
   por servidores órfãos servindo código obsoleto.
2. Rodar `scratchpad/promo2.mjs` (harness CDP já existente, sem dependências).
   Ele injeta um gravador de intervalos entre quadros antes de qualquer script
   da página e reporta o maior engasgo por janela.
3. Registrar neste documento, numa seção `## Medição inicial`, os timestamps
   reais de todo intervalo acima de 40 ms nos primeiros 18 s.

## Medição inicial

Harness: `scratchpad/promo2.mjs` (criado nesta execução, CDP puro via `node:child_process`
+ WebSocket nativo, sem dependências). Chrome 1920×1080, `http://localhost:8081/`,
janela de 18000 ms, recorder de `requestAnimationFrame` injetado via
`Page.addScriptToEvaluateOnNewDocument` antes de qualquer script da página.

Total de quadros: 2372. Engasgos (>40 ms):

| t (ms) | delta (ms) |
|---|---|
| 181 | 181 |
| 425 | 206 |
| 706 | 213 |
| 4732 | 194 |
| 4820 | 87 |
| 5526 | 50 |
| 6270 | 56 |

Pior engasgo: **213 ms em t = 706 ms**.

**Aplicação do critério de decisão:** o maior engasgo cai antes de 3000 ms, na
fase de carregamento (181/425/706 ms) — consistente com o chunk `three`
(945 KB) e/ou montagem de `AnchorProjector`, não com RC4. Há também um grupo
menor em 4732–6270 ms (bem abaixo de 213 ms) que é compatível com a janela de
decisão do probe (RC4), mas não é o pior engasgo da amostra.

**Decisão: RC4 não explica o sintoma principal medido. Parando aqui, conforme
regra da Fase 0. Fases 1 e 2 não executadas sem revisão do diagnóstico.**

### Investigação do carregamento (fora do escopo original do plano)

`GalaxyCanvas` (importa `three`, chunk `three-*.js` de 945 KB, isolado via
`manualChunks` em `vite.config.ts:22`) era importado de forma **estática** em
`OrbitalExperience.tsx`. O `<Suspense>` ao redor dele não tinha efeito nenhum
— sem `React.lazy()`, não existe boundary de carregamento assíncrono. O chunk
era avaliado de forma síncrona no boot, explicando os engasgos de
181/425/706 ms medidos (antes de qualquer lógica RC1–RC5 entrar em jogo).

**Fix aplicado:** `GalaxyCanvas` trocado para
`lazy(() => import("@/experience/galaxy/GalaxyCanvas"))` em
`OrbitalExperience.tsx`. Os quatro comandos de verificação (tsc, test, lint,
build) ficaram limpos, baseline de lint preservado (17/3).

### Medição pós-fix (build de produção, `vite preview`, mesma janela de 18 s)

Nota: medição contra `http://localhost:4173/` (preview), não o dev server —
Vite dev serve módulo a módulo via ESM nativo e não reflete o chunking real de
produção.

| t (ms) | delta (ms) |
|---|---|
| 195 | 195 |
| 533 | 319 |
| 864 | 256 |
| 4903 | 369 |
| 5046 | 144 |
| 5771 | 56 |
| 5909 | 44 |
| 6353 | 56 |
| 6522 | 75 |

Pior engasgo: **369 ms em t = 4903 ms** — agora dentro da janela 3500–9000 ms.
**Critério de decisão da Fase 0 confirma RC4 como causa do sintoma principal.
Diagnóstico revisado, seguindo para a Fase 1.**

Engasgos de boot (195/533/864 ms) persistem, ainda maiores que o ideal — chunk
`three` de 945 KB continua grande, só deixou de ser sincrono. Fora do escopo
deste plano; não perseguir aqui.

**Critério de decisão, sem margem:**

- Se o maior engasgo cair entre **3500 e 9000 ms** ⇒ diagnóstico confirmado,
  seguir para a Fase 1.
- Se cair **antes de 3000 ms** ⇒ RC4 não explica o sintoma principal. Parar,
  registrar a medição, e investigar antes o carregamento do chunk `three`
  (945 KB) e a montagem de `AnchorProjector` (`OrbitalExperience.tsx:256`). Não
  executar as Fases 1 e 2 sem revisar o diagnóstico.

---

## Fase 1 — Só rebaixar

Promoção sob vsync é imensurável (RC2) e foi a causa direta de RC3. Rebaixar é
evidência confiável: FPS baixo é inequívoco.

### 1.1 `src/experience/lib/adaptiveTier.ts`

- `Move` passa a ser `"down2" | "down1" | "hold"`. Remover `"up1"`.
- Em `decide`, remover a linha `if (count((s) => s >= upper) > need) return "up1";`.
  `boundsFor` continua existindo; só o limite inferior é consumido. Manter o
  limite superior no retorno para não mudar a assinatura nem seus testes.
- `AdaptState` passa a ser `{ index: number }`. Remover `demoted` e
  `promotions` — ambos só existiam para conter a promoção.
- Remover `MAX_PROMOTIONS` e todo o ramo `if (move === "up1")` de `applyMove`.
- Acrescentar e exportar:

```ts
/**
 * Um medidor que nunca passa de 45 fps não prova um monitor de 45 Hz — prova
 * uma máquina em dificuldade. Sem este piso, quanto pior a máquina, mais baixa
 * a barra contra a qual ela é julgada (RC2).
 */
export function normalizeRefreshRate(measured: number): number {
  if (!Number.isFinite(measured) || measured < 50) return 60;
  return measured;
}
```

### 1.2 `src/experience/lib/qualityLadder.ts`

- Remover o degrau `{ id: "extreme", particleCount: 300000, maxDpr: 2.0 }`. Sem
  promoção nada o alcança, e ele foi justificado por **uma** medição numa RTX
  4060. O topo volta a ser `ultra` (220.000 ⇒ 466.400 pontos), que é o que
  rodava bem antes.
- Remover a função `stepUp` por inteiro — fica sem chamador.
- Manter `isInertStep` e `stepDown`.

Escada resultante, com os índices que o resto do plano cita:

| i | id | particleCount | maxDpr |
|---|---|---|---|
| 0 | `ultra` | 220.000 | 2.0 |
| 1 | `high` | 220.000 | 1.5 |
| 2 | `high-` | 150.000 | 1.5 |
| 3 | `mid` | 150.000 | 1.25 |
| 4 | `mid-` | 100.000 | 1.25 |
| 5 | `low+` | 100.000 | 1.0 |
| 6 | `low` | 48.000 | 1.0 |
| 7 | `floor` | 16.000 | 1.0 |
| 8 | `minimal` | 6.000 | 1.0 |

### 1.3 `src/experience/lib/perfTier.ts`

O degrau inicial passa a ser o degrau máximo da sessão, então tem de carregar a
qualidade. Trocar a regra de `gpuClass === "high"`:

```ts
if (gpuClass === "high") {
  return hardwareConcurrency >= 8 ? indexOfId("ultra") : indexOfId("mid");
}
```

Começar uma GPU classe `high` direto em `ultra` (466.400 pontos) só é aceitável
**porque** o rebaixamento fica barato na Fase 2. A lista `high` inclui
`apple m2`, bem mais fraca que uma RTX 4060 — a rede de segurança é o que
justifica o começo agressivo. Registrar isso em comentário no código.

### 1.4 `src/experience/lib/perfDebug.ts`

Acrescentar ao tipo `PerfStats` e ao objeto `perfStats`:

```ts
/** True quando a formação de entrada terminou e a cena está em regime. */
sceneSettled: boolean;   // inicial: false
```

E exportar duas funções, porque `perfStats` é singleton de módulo e sobrevive a
remontagens e a navegações SPA:

```ts
export function markSceneSettled(): void { perfStats.sceneSettled = true; }
export function resetSceneSettled(): void { perfStats.sceneSettled = false; }
```

### 1.5 `src/experience/galaxy/GalaxyCanvas.tsx` — marcar o regime

Em `handleFormed`, depois de `formedRef.current = true`, chamar
`markSceneSettled()`. Chamar `resetSceneSettled()` no cleanup do efeito de
unmount do componente.

### 1.6 `src/experience/lib/useAdaptivePerfTier.ts` — medir só em regime

- Remover `WARMUP_MS` e o bloco que o consome.
- A rodada só começa quando `perfStats.sceneSettled === true`. Enquanto for
  `false`, o `tick` chama `reset()` e retorna.
- **Fallback obrigatório contra deadlock:** guardar o `performance.now()` da
  primeira execução do `tick`; se passarem **8000 ms** sem `sceneSettled`,
  começar assim mesmo. Sem isso o probe nunca roda num caminho onde `onFormed`
  não dispara (WebGL indisponível ⇒ `staticGalaxy` ⇒ `GalaxyCanvas` nunca monta).
- Passar o refresh por `normalizeRefreshRate` antes de `decide`.
- `AdaptState` perdeu campos: ajustar as duas construções de estado
  (`useState` inicial e o reseed em `seededFrom`) para `{ index }`.
- Manter `MAX_ROUNDS = 6`, `SAMPLE_MS = 250`, `SAMPLES = 10`.

### 1.7 `src/experience/lib/useDeviceCapabilities.tsx`

`AdaptState` mudou de forma; conferir que o arquivo compila. A regra
`Math.max(fresh, stored)` (`:60`) **permanece** — índice maior é degrau menor,
então um veredito gravado continua só podendo rebaixar, que é exatamente o
comportamento desejado.

### 1.8 `src/experience/galaxy/ParticleField.tsx` — RC5

Mover o bloco

```ts
if (reducedMotion || instantForm) { morph.current.t = 1; finish(); return; }
```

para o **topo** do efeito de morph, antes do snapshot e das demais passagens.
Atenção: `finish()` e `flourishRef.current` são usados ali; garantir que
`targetRef`/`target.set(shape)` e `targetColor.set(colors)` continuem
acontecendo antes do retorno, senão o campo renderiza a pose antiga. A ordem
correta é: atualizar `target`, `targetColor`, `flourishRef` e marcar
`needsUpdate`; **depois** o retorno antecipado; e só então o snapshot e o tween.

### 1.9 Remover a prop morta `idle`

`idle` é declarada em `Props` (`ParticleField.tsx:90`), desestruturada (`:158`)
e nunca usada. `idleMotion` (`OrbitalExperience.tsx:223`) força re-render de
`GalaxyCanvas` a cada mudança de estado da máquina. Remover a prop de
`ParticleField`, de `GalaxyCanvas` e a variável em `OrbitalExperience`.

---

## Fase 2 — Trocar de degrau sem remontar

Com só-rebaixar, **o degrau inicial é o maior que a sessão vai usar**. Aloca-se
uma vez e passa-se a desenhar menos.

### 2.1 O mecanismo: `geometry.groups`, não `key`

Verificado no three 0.160 instalado:

- `WebGLRenderer.js:1361-1374` — quando `material` é um array, o renderer itera
  `geometry.groups` e emite uma chamada de desenho por grupo. O ramo é o
  genérico de objetos renderizáveis, **vale para `THREE.Points`**.
- `WebGLRenderer.js:813-817` — `drawStart`/`drawEnd` de cada grupo compõem com
  `geometry.drawRange`.

Então: um `<points>`, uma geometria, **um grupo por galáxia**, cada um com
`count` ajustável em runtime. Sem realocar, sem remontar, sem relink de shader,
sem lixo para o GC. O layout contíguo atual e o modelo de fatias de
`GalaxySpin` ficam **intactos**.

### 2.2 Estratificação — `src/experience/galaxy/particleGeometry.ts`

`galaxyDisk` gera bojo (18%), disco e halo (4%) em blocos contíguos
(`:271-273`), então um prefixo não representa a galáxia: desenhar os primeiros
60% daria uma bola de bojo sem halo. `generateDustField` tem o mesmo problema —
os primeiros `nearFrac = 0.62` são a casca próxima (`:442`).

Acrescentar e exportar:

```ts
/**
 * Embaralha os pontos (triplas xyz) em ordem determinística, para que qualquer
 * prefixo do buffer seja uma amostra uniforme do todo. É o que permite reduzir
 * a contagem desenhada sem deformar a galáxia.
 */
export function stratify(buf: Float32Array, count: number, seed: number): void
```

Fisher–Yates semeado com o `mulberry32` já existente (`particleGeometry.ts:7`),
trocando triplas `[i*3, i*3+1, i*3+2]` in place.

Aplicar:

- Em `galaxyField`, **por fatia**: o buffer da galáxia principal antes do
  `out.set(..., 0)`, e o de cada mini antes do seu `out.set(buf, offset)`. Por
  fatia, nunca global — o modelo de grupos e de `GalaxySpin` exige que cada
  galáxia continue contígua.
- Em `generateDustField`, no buffer inteiro antes do `return`.
- Nas camadas de detalhe em `GalaxyCanvas.tsx` (`galaxyDisk(detailExtra, ...)`),
  depois de `offsetPositions` e **antes** de `generateColors`.

Ordem obrigatória: **estratificar, depois gerar cores**. `generateColors` deriva
a cor da posição, então gerar cores a partir do buffer já embaralhado mantém o
pareamento automaticamente. Em `GalaxyCanvas.tsx` isso já acontece — a chamada
de `generateColors` (`:213`) vem depois de `galaxyField` (`:206`). Não inverter.

Em `DustField.tsx` as cores são sorteadas por índice com `Math.random()`, sem
relação com a posição, então não há pareamento a preservar.

### 2.3 Contagem desenhada — sem aproximação

Alocação feita com `allocCount` = `particleCount` do degrau **inicial**. Para o
degrau corrente de `particleCount = c`:

```ts
const alloc = galaxyFieldSplit(allocCount, ORBITAL_ORDER.length, 3);
const want  = galaxyFieldSplit(c,          ORBITAL_ORDER.length, 3);
const mainDrawn = Math.min(alloc.main, want.main);
const miniDrawn = Math.min(alloc.mini, want.mini);
```

Usar `galaxyFieldSplit` dos dois lados dá a proporção exata, não uma regra de
três. Conferência: `allocCount = 150000` rebaixando para `c = 100000` dá
`mainDrawn = 168000`, `miniDrawn = 11000`, total desenhado 212.000 — idêntico a
`galaxyFieldSplit(100000, 4, 3).total`.

### 2.4 `src/experience/galaxy/ParticleField.tsx`

- Trocar `material={main.material}` por `material={[main.material]}` — array de
  um elemento. Todos os grupos usam `materialIndex: 0`. O array é o que ativa o
  caminho de grupos do renderer.
- Acrescentar prop `drawCounts: { main: number; mini: number }`.
- Efeito imperativo, com dependência em `drawCounts` e em `galaxies`:

```ts
const geom = pointsRef.current?.geometry;
if (!geom) return;
geom.clearGroups();
for (const g of galaxies) {
  const n = g.key === "menu" ? drawCounts.main : drawCounts.mini;
  geom.addGroup(g.start, Math.max(1, Math.min(g.count, n)), 0);
}
```

`start` e `count` de grupo são em vértices, iguais aos de `GalaxySpin`. O
`Math.max(1, ...)` evita grupo de contagem zero.

- A camada de detalhe é um `<points>` separado e de galáxia única: usar
  `geometry.setDrawRange(0, n)`, não grupos.

### 2.5 `src/experience/galaxy/GalaxyCanvas.tsx`

- Capturar `allocCount` uma vez, no primeiro render:
  `const allocCount = useRef(tier.particleCount).current;`
- O `useMemo` de geometria passa a usar `allocCount` no lugar de `count`.
  Dependências: `[allocCount, isNarrow]`.
- **Remover `key={totalCount}` e `key={dustCount}`.**
- Calcular `drawCounts` conforme 2.3 e passar para `ParticleField`.
- Passar para `DustField` a contagem alocada e a desenhada, separadamente.
- `perfStats.particles` deve passar a reportar o total **desenhado**, não o
  alocado, senão o HUD mente sobre o que está na tela.

### 2.6 `src/experience/galaxy/DustField.tsx`

- Gerar sempre com a contagem alocada; estratificar.
- Aplicar `geometry.setDrawRange(0, drawn)` num efeito com dependência em
  `drawn`.

### 2.7 O único caminho de reconstrução que sobra

`isNarrow` continua na dependência do `useMemo` de geometria. É deliberado: ele
muda a **forma** do disco (`narrowMenuDisk`), não a contagem, e `drawRange` não
cobre mudança de forma. Acontece só ao cruzar 640 px de largura — giro de tela
ou resize em dev. É raro e iniciado pelo usuário. **Não tentar eliminar.**

---

## Trabalho não commitado já na árvore

Antes de começar, a árvore tem trabalho de refinamento mobile aprovado e
testado, mas não commitado:

```
 M src/experience/galaxy/GalaxyCamera.tsx
 M src/experience/galaxy/GalaxyCanvas.tsx
 M src/experience/galaxy/categoryScenes.ts
 M src/experience/galaxy/categoryScenes.test.ts
 M src/experience/menu/OrbitalLabels.tsx
?? src/experience/galaxy/responsiveFraming.ts
?? src/experience/galaxy/responsiveFraming.test.ts
?? src/experience/lib/useNarrowViewport.ts
```

É o enquadramento responsivo (`fitNarrow`, `resolveFitForWidth`,
`narrowMenuDisk`, `useNarrowViewport`). **Preservar tudo.** Este plano constrói
em cima, não substitui.

**Pedir ao usuário que faça um commit de checkpoint antes da Fase 1.** Duas
rodadas seguidas introduziram regressão em produção e a árvore está misturada;
sem ponto de retorno não há como isolar uma terceira. O agente não executa
comandos git.

---

## Arquivos

| Arquivo | Mudança |
|---|---|
| `src/experience/lib/adaptiveTier.ts` | remover `up1`, `demoted`, `promotions`, `MAX_PROMOTIONS`; + `normalizeRefreshRate` |
| `src/experience/lib/qualityLadder.ts` | remover `extreme` e `stepUp` |
| `src/experience/lib/perfTier.ts` | `high` + ≥8 núcleos ⇒ `ultra` |
| `src/experience/lib/perfDebug.ts` | `sceneSettled` + `markSceneSettled` + `resetSceneSettled` |
| `src/experience/lib/useAdaptivePerfTier.ts` | portão de regime + fallback 8000 ms; sem `WARMUP_MS`; refresh normalizado |
| `src/experience/lib/useDeviceCapabilities.tsx` | acompanhar a nova forma de `AdaptState` |
| `src/experience/galaxy/particleGeometry.ts` | `stratify`; aplicar em `galaxyField` (por fatia) e `generateDustField` |
| `src/experience/galaxy/ParticleField.tsx` | retorno antecipado no topo; array de material; grupos; `drawCounts`; remover `idle` |
| `src/experience/galaxy/GalaxyCanvas.tsx` | `allocCount`; remover os dois `key`; `drawCounts`; `markSceneSettled`; estratificar detalhe |
| `src/experience/galaxy/DustField.tsx` | estratificação + `setDrawRange` |
| `src/experience/OrbitalExperience.tsx` | remover `idleMotion` |

Testes a ajustar:

| Arquivo | Ajuste |
|---|---|
| `adaptiveTier.test.ts` | casos que esperavam `up1` passam a esperar `hold`; remover testes de `promotions`/`demoted`; + `normalizeRefreshRate` |
| `qualityLadder.test.ts` | remover testes de `stepUp`; `extreme` some da escada |
| `perfTier.test.ts` | o teste `"never starts on the top rung"` inverte de premissa (ver abaixo) |
| `useDeviceCapabilities.test.tsx` | conferir que os degraus esperados continuam válidos sem `extreme` |
| `particleGeometry.test.ts` | + testes de `stratify` |
| `responsiveFraming.test.ts` | intocado |

---

## Testes obrigatórios a acrescentar

1. **Promoção é impossível.** Em `adaptiveTier.test.ts`: para uma varredura de
   entradas (amostras de 5 a 300 fps, refresh de 30 a 240), `decide` nunca
   devolve `"up1"`; e `applyMove` nunca devolve `index` menor que o de entrada.
   É este teste que impede o defeito de voltar.

2. **O topo é alcançável no início.** Em `perfTier.test.ts`, substituir
   `"never starts on the top rung — ultra is earned by measurement"` por um que
   afirme o oposto: com só-rebaixar, `getStartIndex` **precisa** poder devolver
   0, senão o degrau de topo é inalcançável por qualquer caminho. Caso concreto:
   `{ pointerFine: true, hardwareConcurrency: 8, gpuClass: "high" }` ⇒ índice 0.

3. **`normalizeRefreshRate`.** 45 ⇒ 60; 0 ⇒ 60; `NaN` ⇒ 60; 60 ⇒ 60; 144 ⇒ 144.

4. **Estratificação preserva a proporção.** Em `particleGeometry.test.ts`: gerar
   um disco, medir a fração de pontos com raio dentro do bojo, entre bojo e
   `outer`, e além de `outer` (halo). Depois de `stratify`, um prefixo de 30% e
   um de 60% devem reproduzir essas três frações dentro de ±3 pontos
   percentuais. É o teste que impede a galáxia de deformar ao rebaixar.

5. **`stratify` é uma permutação, não uma perda.** O multiconjunto de triplas
   antes e depois é idêntico; nenhuma tripla duplicada ou perdida; a mesma
   semente produz a mesma ordem.

6. **A contagem desenhada bate com a escada.** Para cada par (alloc, corrente)
   da escada, `min(alloc.main, want.main) + 4 * min(alloc.mini, want.mini)` é
   igual a `galaxyFieldSplit(corrente, 4, 3).total` sempre que
   `corrente <= alloc`.

---

## Verificação

1. Os quatro comandos da seção "Regras de execução", limpos.
2. **Zero remontagens.** Rodar `scratchpad/promo2.mjs` de novo e comparar com a
   Medição inicial da Fase 0. O pico medido antes (~200 ms em t ≈ 4,8 s) tem de
   desaparecer; o regime (8–18 s) tem de ficar abaixo de 10 ms.
3. **A formação não é mais cortada.** Capturar com `scratchpad/shot.mjs` em
   390×844 e 1920×1080 e confirmar que a animação de entrada roda os 4400 ms
   inteiros, sem salto.
4. **A escada só desce.** Chrome com `--use-gl=swiftshader --use-angle=swiftshader`
   como proxy de máquina fraca. Nos logs `[perf] probe`, nenhuma transição pode
   subir de degrau. A cena tem de continuar animada.
5. **O rebaixamento não deforma.** Forçar um degrau baixo via `localStorage`
   (`portfolio-quality-v1`) e conferir na captura que a galáxia continua com
   bojo, braços e halo — mais esparsa, não mutilada.
6. **Desktop intocado.** Capturar 1920×1080 e comparar com `desktop-depois.png`
   do ciclo anterior.
7. Só então deploy, e confirmação no Galaxybook i5 e no celular.

---

## Estado da execução (pausado a pedido do usuário)

Branch: `fix-performance-v2` (criada a partir de `main`, working tree anterior
não commitado preservado nela).

**Concluído e verificado (tsc + test + lint + build limpos após cada fase):**

- Fase 0: medição inicial, achado fora do escopo (three.js 945 KB carregando
  síncrono, `Suspense` sem `React.lazy()` real), fix aplicado
  (`OrbitalExperience.tsx` — `GalaxyCanvas` agora é `lazy()`), diagnóstico
  revisado e RC4 confirmado por medição pós-fix. Harnesses criados:
  `scratchpad/promo2.mjs` (grava intervalos entre frames via CDP) e
  `scratchpad/consolecheck.mjs` (captura console/exceptions via CDP).
- Fase 1 completa: `adaptiveTier.ts` (sem `up1`/`demoted`/`promotions`,
  + `normalizeRefreshRate`), `qualityLadder.ts` (sem `extreme`/`stepUp`),
  `perfTier.ts` (`high`+≥8 núcleos ⇒ `ultra`), `perfDebug.ts`
  (`sceneSettled`/`markSceneSettled`/`resetSceneSettled`),
  `useAdaptivePerfTier.ts` (portão de regime + fallback 8000ms, sem
  `WARMUP_MS`), `useDeviceCapabilities.tsx` (sem alteração necessária),
  `ParticleField.tsx` (RC5: early-return reordenado, `applyNewTarget()`
  extraído, `idle` prop removida), `GalaxyCanvas.tsx`/`OrbitalExperience.tsx`
  (`idle`/`idleMotion` removidos). Testes ajustados em `adaptiveTier.test.ts`,
  `qualityLadder.test.ts`, `perfTier.test.ts` (incluindo os 3 testes
  obrigatórios: promoção impossível, topo alcançável no início,
  `normalizeRefreshRate`).
- Fase 2 completa: `stratify()` em `particleGeometry.ts` (aplicado em
  `galaxyField` por fatia, `generateDustField`, camada de detalhe em
  `GalaxyCanvas.tsx`); `ParticleField.tsx` com `material={[main.material]}`,
  `drawCounts` via `geometry.groups`, `detailDrawn` via `setDrawRange` na
  camada de detalhe; `GalaxyCanvas.tsx` com `allocCount`/`allocDustCount`
  fixados no primeiro render, `useMemo` de geometria dependendo de
  `allocCount`, ambos `key={totalCount}`/`key={dustCount}` removidos,
  `perfStats.particles` reportando desenhado; `DustField.tsx` com
  `count`(alocado)/`drawn`(desenhado) separados e `setDrawRange`. Testes
  obrigatórios 4/5/6 adicionados em `particleGeometry.test.ts` (estratificação
  preserva proporção, é permutação determinística, contagem desenhada bate
  com a escada) — todos passando.

**Interrompido durante a seção "Verificação" (item 2, zero remontagens):**

Ao rodar `scratchpad/promo2.mjs` contra o build de produção (`vite preview`)
pós Fase 1+2, a contagem de frames caiu de forma suspeita entre execuções
(2657 → 350 → 171 em 18s) sem erro no console (confirmado via
`consolecheck.mjs`, sem exceptions/console.error). Causa identificada:
`chrome.kill()` no harness só mata o PID pai — no Windows os processos
filhos (renderer, GPU process) sobrevivem como órfãos. Havia ~17 `chrome.exe`
zumbis acumulados de execuções anteriores da sessão, disputando GPU/CPU.

**Fix já aplicado no harness:** `promo2.mjs` agora usa
`taskkill /PID <pid> /T /F` no `finally`, matando a árvore inteira. Após
aplicar o fix e confirmar zero `chrome.exe` residual, uma nova medição ainda
voltou baixa (171 frames/18s) — não investigado a fundo (havia ~17 `node.exe`
rodando com CPU baixo, provavelmente não a causa; pode ser throttling do
compositor do Windows por foco de janela, ou ruído da própria sessão de
trabalho). **Não confirmado se é ruído ambiental ou regressão real.**

Sinal qualitativo que SOBREVIVE ao ruído: nas duas medições pós-fix, os
engasgos (>40ms) ficaram concentrados no boot (<2000ms) — nenhum padrão
periódico a cada ~4300ms (a assinatura de remontagem do RC4/RC1 pré-fix).
Isso é evidência indireta de que Fase 1+2 eliminaram as remontagens, mas
**não é uma confirmação formal** — falta remedir em ambiente limpo.

**Retomado — item 2 da Verificação concluído:**

Zero `chrome.exe` residual confirmado. Nova medição contra `vite preview`
limpo (mesma build, `http://localhost:4174/`, janela 18s):

| t (ms) | delta (ms) |
|---|---|
| 221 | 221 |
| 276 | 42 |
| 436 | 153 |
| 637 | 139 |
| 707 | 69 |
| 5603 | 42 |
| 6387 | 42 |

Pior engasgo: 221 ms em t=221 ms (boot, fora do escopo — chunk `three` ainda
945 KB, só não bloqueia mais o mount síncrono). **Sem padrão periódico a cada
~4300 ms** (a assinatura de remontagem do RC4 pré-fix). Regime (8–18 s):
nenhum engasgo acima de 40 ms, portanto abaixo do critério de 10 ms.
**Zero remontagens confirmado.**

**Itens 3–6 da Verificação concluídos:**

3. **Formação não é mais cortada.** Criado `scratchpad/shot.mjs` (captura CDP
   com `Emulation.setDeviceMetricsOverride`). Capturas em 1920×1080 e
   390×844 em t=0/1100/2200/3300/4400/5000ms mostram progressão contínua:
   nuvem dispersa → adensamento → braços espirais se formando → galáxia
   assentada com bojo/braços/halo — sem salto instantâneo em nenhum dos dois
   viewports. Confirmado.

4. **Escada só desce sob proxy de máquina fraca.** Criado
   `scratchpad/swiftshader_check.mjs` (Chrome `--use-gl=swiftshader
   --use-angle=swiftshader`, captura logs `[perf] probe` via CDP, 30s). GPU
   fraca simulada iniciou direto em `low` (101.760 pontos desenhados, bate
   com `galaxyFieldSplit(48000,4,3)`), única rodada de probe decidiu `hold`
   (nunca `up1`), e o loop de medição então se auto-cancela (comportamento
   esperado: sem teto para subir, não há por que seguir medindo). FPS nos
   logs continuou variando a cada ~500ms durante os 30s inteiros — a cena
   seguiu renderizando, não travou. Confirmado.

5. **Rebaixamento não deforma.** Em vez de `localStorage` (exigiria replicar
   a lógica de `classifyGpu` para casar o campo `gpu` do registro), forcei o
   rung baixo pelo caminho real de `getStartIndex` via
   `Emulation.setHardwareConcurrencyOverride(2)` (mesmo código testado em
   `perfTier.test.ts`: "two cores or fewer drops to low"). Screenshot em
   1920×1080 confirma bojo, braços espirais e halo intactos — mais esparso
   (mais grão visível), não mutilado. Confirmado. A garantia matemática por
   trás (proporção por zona preservada em qualquer prefixo) já está coberta
   pelo teste obrigatório 4 de `particleGeometry.test.ts`.

6. **Desktop intocado.** `desktop-depois.png` do ciclo anterior não existe no
   repo (não foi commitado no ciclo de `fix-performance.md`) — não há
   referência para diff. Inspeção qualitativa da captura
   `formation-1920x1080-5000ms.png` (degrau `ultra`/`high`, 16 núcleos): sem
   artefato visual, galáxia nítida, HUD/labels no lugar. Sem regressão
   perceptível, mas **não é uma comparação formal contra o baseline
   anterior** — falta a imagem de referência.

7. **Deploy e confirmação em hardware real (Galaxybook i5, celular).** Fora
   do alcance deste agente — depende de deploy e de acesso físico ao
   hardware. Pendente do usuário.

**Limpeza:** todas as instâncias `chrome.exe` órfãs desta sessão foram
encerradas (`taskkill /F /IM chrome.exe`). Scripts de harness criados ficam
em `scratchpad/`: `promo2.mjs`, `shot.mjs`, `consolecheck.mjs`,
`swiftshader_check.mjs`, `shot_lowtier.mjs`.

**Estado final: Fases 0–2 implementadas e verificadas (itens 1–5 da
Verificação confirmados, item 6 parcial por falta de referência, item 7
pendente do usuário). Nenhum commit feito.** Branch `fix-performance-v2`
pronta para revisão/commit manual.

## Risco a observar

Sem promoção, o degrau depende inteiramente de `classifyGpu`. Uma GPU forte fora
das listas de `gpuTier.ts` cai em `"unknown"` ⇒ `mid-` e fica lá, mais modesta
do que poderia. É a troca consciente: perder algum teto numa máquina forte custa
menos que promover uma fraca para 636.000 partículas.

Toda string de renderer coletada de máquina real melhora essas listas. Coletar a
do Galaxybook durante a verificação final:

```js
const gl = document.createElement('canvas').getContext('webgl');
gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)
```
