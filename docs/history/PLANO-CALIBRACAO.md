# Plano: calibrar a escada de qualidade

> **Revertido em `fix-performance-v2.md`.** O degrau `extreme` e a lógica de
> promoção (`up1`/`demoted`/`MAX_PROMOTIONS`/`stepUp`) que a Fase B deste
> documento introduziu se mostraram a causa raiz de um travamento em produção
> (RC1–RC3 de `fix-performance-v2.md`): sob vsync o medidor não distingue
> "sobra folga" de "está no limite exato", promovia qualquer máquina que
> sustentasse o refresh, e cada troca de degrau remontava a geometria de
> forma síncrona e cara. `extreme` foi removido da escada e a promoção foi
> eliminada por completo — a partir daí a escada só desce. Documento mantido
> como registro do raciocínio da época, não como recomendação vigente.

## Contexto

As Fases 0 a 7 do `fix-performance.md` estão prontas. A Parte A da validação
passou nos oito casos. Resta decidir o que fazer com a folga de GPU que a
medição revelou, e essa decisão depende de um problema que a própria medição
expôs no medidor.

Este documento é só o plano. Nada aqui foi executado.

---

## 1. O que foi medido, de verdade

Todos os números abaixo vêm de execução automatizada em Chrome headless via
CDP, na máquina de desenvolvimento (RTX 4060 Laptop, renderer confirmado como
`ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU (0x000028E0) Direct3D11 vs_5_0 ps_5_0, D3D11)`).
Headless usa a GPU real, não rasterizador por software.

### 1.1 Tempo de GPU por quadro

Vsync desligado (`--disable-gpu-vsync --disable-frame-rate-limit`), 24 amostras
por execução ao longo de 17 s, três execuções:

| Execução | mín | mediana | máx |
|---|---|---|---|
| 1 | 260 | 2878 | 3333 |
| 2 | 251 | 2913 | 3183 |
| 3 | 2691 | 2934 | 3324 |

**Mediana das medianas: 2913 fps, ou 0,34 ms por quadro**, com 466.400
partículas a 1920×1080 e `devicePixelRatio` 1.

Para sustentar 165 Hz o orçamento é 6,06 ms. A cena usa 5,6% dele. Sobra
aproximadamente 17× de folga de GPU nesta máquina.

### 1.2 Memória por degrau

Seis degraus forçados via `localStorage`, medidos 3,4 s após o carregamento —
depois da formação, antes de o probe promover:

| degrau | count | pontos | memória |
|---|---|---|---|
| minimal | 6.000 | 13.380 | 28,3 MB |
| floor | 16.000 | 35.680 | 30,7 MB |
| low | 48.000 | 107.040 | 39,2 MB |
| low+ | 100.000 | 223.000 | 51,1 MB |
| mid | 150.000 | 334.500 | 63,2 MB |
| high | 220.000 | 490.600 | 83,3 MB |

Regressão linear: **121 bytes por ponto**, mais um custo fixo de **26,8 MB**.

O valor de 121 bytes bate com o esperado do código: seis `Float32Array` de
`count*3` em `ParticleField` (`target`, `from`, `overshoot`, `fromColor`,
`targetColor`, `scratch`) somam 72 bytes por partícula, mais `dispersed`, mais
os buffers que `GalaxyCanvas` gera. O modelo é confiável para extrapolar.

### 1.3 Engasgo de carregamento, separado em duas parcelas

O maior intervalo entre quadros foi medido antes e depois de o canvas existir:

| degrau | pontos | engasgo antes do canvas | engasgo depois |
|---|---|---|---|
| minimal | 13.380 | 274 ms | 119 ms |
| floor | 35.680 | 261 ms | 125 ms |
| low | 107.040 | 261 ms | 137 ms |
| low+ | 223.000 | 264 ms | 163 ms |
| mid | 334.500 | 259 ms | 169 ms |
| high | 490.600 | 268 ms | 213 ms |

Dois achados aqui, e o primeiro é o mais importante de todo o documento.

**O maior engasgo não tem relação nenhuma com a quantidade de partículas.**
Os ~265 ms anteriores ao canvas são constantes ao longo de uma variação de
36,7× no número de pontos. Isso é carregamento de módulo, montagem do React e o
chunk `three` de 945 KB. Numa máquina classe C esse custo fixo provavelmente
triplica, e é ele que define a primeira impressão do site — não a contagem de
partículas, que é o que passamos o projeto inteiro ajustando.

**A parcela que escala é menor do que a fixa.** Depois do canvas: 0,197 ms por
mil pontos, mais 116 ms fixos de compilação de shader e inicialização de GL.

### 1.4 O medidor decide com uma amostra só

Durante a validação, duas execuções idênticas do A8 deram **2631 fps** e
**322 fps**. A causa é o tamanho da janela: o medidor calcula sobre 120 quadros,
que a 2900 fps são 41 ms. Qualquer engasgo dentro dessa janela destrói a
amostra.

`decide()` em `src/experience/lib/adaptiveTier.ts` tem o mesmo defeito por
outro caminho: ele decide sobre **uma** média de 2 s. Uma coleta de lixo, uma
troca de aba, um pico do sistema operacional e o degrau muda sem motivo.

### 1.5 O medidor é cego sob vsync

`decide()` usa limiares fixos: abaixo de 30 desce dois, abaixo de 48 desce um,
57 ou mais sobe. Com vsync, toda máquina que sustenta o refresh reporta o
refresh. Um monitor de 60 Hz reporta 60; um de 165 Hz reporta 161. A RTX 4060
com 17× de folga e um PC que mal segura 60 Hz produzem a mesma decisão: subir.

---

## 2. O que a pesquisa diz

### 2.1 Medir tempo de GPU direto não é viável

`EXT_disjoint_timer_query_webgl2` é a forma correta de medir tempo de GPU sem
travar o pipeline, e resolveria a cegueira do vsync. Mas os resultados são
consistentes apenas em Apple Silicon, inconsistentes em laptops Windows e Macs
com Intel, e algumas GPUs móveis, Mali entre elas, não produzem medida útil.

Laptop Windows e Mali são exatamente as classes A e D deste projeto. **Esta
alternativa está descartada por dados, não por preferência.**

### 2.2 O padrão consolidado já está instalado

`@react-three/drei` já é dependência do projeto, e traz `PerformanceMonitor`.
Lendo a fonte instalada em
`node_modules/@react-three/drei/core/PerformanceMonitor.js`, três decisões de
projeto se destacam, e as três atacam defeitos que temos:

| Mecanismo do drei | Defeito nosso que ele corrige |
|---|---|
| `iterations = 10`, `ms = 250` — dez amostras de 250 ms | decidimos com uma amostra de 2 s (1.4) |
| `threshold = 0.75` — exige 75% das amostras além do limite | uma média isolada nos move (1.4) |
| `bounds = refreshrate => refreshrate > 100 ? [60,100] : [40,60]` | nossos limiares são fixos e ignoram o refresh (1.5) |
| `flipflops` → `onFallback` | temos a trava `demoted`, versão mais grosseira |

A documentação do react-three-fiber é explícita sobre a histerese: define-se um
intervalo entre limite inferior e superior, e enquanto o valor ficar dentro dele
nada dispara. É o que impede o vai-e-vem.

Nota honesta: os limiares relativos ao refresh **não** eliminam a cegueira do
vsync. Numa tela de 60 Hz, `bounds` vira `[40, 60]` e uma máquina fixada em 60
continua passando no limite superior. O que muda é a robustez: exigir 75% de
dez amostras elimina o promover-por-acidente que uma amostra isolada permite.

### 2.3 `detect-gpu` está instalado, mas não compensa agora

`detect-gpu` vem junto com o drei e traz base de benchmarks real de GPUs, com
713 KB em 16 arquivos JSON, devolvendo `{ tier, fps, gpu, isMobile }`. É
tecnicamente superior às listas de substring escritas à mão em `gpuTier.ts`.

Três motivos para não adotar agora:

1. Por padrão busca os benchmarks no CDN da UNPKG, em tempo de execução. Ou se
   aceita uma dependência de rede no caminho crítico, ou se serve 713 KB a
   partir de `public/`.
2. A API é assíncrona. O degrau inicial deixaria de ser conhecido na primeira
   renderização.
3. É dependência **transitiva**. Importá-la sem declará-la em `package.json` é
   frágil: o drei pode trocá-la e o npm pode organizar a árvore de outro jeito.

E o retorno é pequeno: a classificação estática só governa os primeiros
segundos, até o probe assumir. Nossas listas já acertaram a RTX 4060 como
`high` e o SwiftShader como `low` nos testes. GPUs desconhecidas caem em
`mid-`, que é um padrão conservador seguro.

**Registrado como opção futura, não como recomendação.**

---

## 3. Recomendação

**Corrigir o medidor primeiro. Depois subir o topo, e com moderação.**

A ordem não é detalhe. Um degrau novo no topo aumenta o custo de uma promoção
errada, e hoje o medidor promove qualquer máquina que sustente o refresh. Subir
o topo antes de corrigir a amostragem é ampliar um defeito conhecido.

### Fase A — Robustez da amostragem

Alterar `decide()` e o laço de `useAdaptivePerfTier.ts` para o método do drei,
**sem** adicionar dependência e **sem** trocar a escada discreta por um fator
contínuo.

Por que não adotar `PerformanceMonitor` inteiro: ele produz um fator contínuo de
0 a 1 em passos de 0,1. Nossa escada é discreta e cada mudança de
`particleCount` custa uma remontagem de geometria. O passo de 0,1 do drei
provocaria várias remontagens até estabilizar. A lógica de degraus, a regra de
passo inerte e a trava `demoted` codificam restrições deste projeto que o
componente genérico não conhece. **Pega-se o método de amostragem, não a
arquitetura.**

Mudanças concretas:

1. `useAdaptivePerfTier.ts`: trocar a rodada única de 2 s por `SAMPLES = 10`
   janelas de `SAMPLE_MS = 250`. Manter `WARMUP_MS = 1800`.
2. Registrar `refreshRate = max(fps observado)` ao longo das amostras.
3. `adaptiveTier.ts`: `decide()` passa a receber o vetor de amostras e a taxa de
   atualização, não uma média:

   ```ts
   export function decide(samples: number[], refreshRate: number): Move
   ```

   - `bounds = refreshRate > 100 ? [60, 100] : [40, 60]`
   - subir apenas se mais de 75% das amostras ficarem no limite superior ou acima
   - descer um degrau se mais de 75% ficarem abaixo do limite inferior
   - descer dois se mais de 75% ficarem abaixo de metade do limite inferior
   - qualquer outro caso: segurar
4. Manter `MAX_PROMOTIONS = 2`, a trava `demoted` e `MAX_ROUNDS = 6`.
5. O medidor do HUD em `ParticleField.tsx` passa de 120 quadros para uma janela
   por tempo, de 500 ms. Foi a janela curta que produziu a leitura de 322 fps.

Testes a acrescentar em `adaptiveTier.test.ts`:

- dez amostras de 161 fps com refresh 165 devolvem `up1`
- nove amostras de 161 e uma de 20, mesmo refresh, devolvem `up1` — um engasgo
  isolado não pode mover a escada, que é exatamente o caso que nos enganou
- seis amostras de 161 e quatro de 20 devolvem `hold` — 75% não foi atingido
- dez amostras de 35 com refresh 60 devolvem `down1`
- dez amostras de 15 com refresh 60 devolvem `down2`
- dez amostras de 60 com refresh 60 devolvem `up1`
- dez amostras de 60 com refresh 165 devolvem `down1` — 60 está abaixo do limite
  inferior de 100 numa tela de alta taxa
- vetor vazio ou com valores não finitos devolve `hold`

### Fase B — Novo degrau no topo

Acrescentar em `LADDER`, acima de `ultra`:

```ts
{ id: "extreme", particleCount: 300000, maxDpr: 2.0 },
```

Só `particleCount` muda em relação a `ultra`, respeitando a regra da Fase 2.2.
O teste `qualityLadder.test.ts` já falha se essa regra for violada.

Custo extrapolado dos modelos de 1.2 e 1.3:

| count | pontos | memória | engasgo após canvas |
|---|---|---|---|
| 220.000 (`ultra` hoje) | 490.600 | 83 MB | 213 ms |
| **300.000 (`extreme`)** | **669.000** | **104 MB** | **248 ms** |
| 440.000 (descartado) | 981.200 | 140 MB | 310 ms |

300.000 custa +21 MB e +35 ms de engasgo, por +36% de partículas.

Por que não 440.000: 140 MB de memória e 310 ms de engasgo em troca de um ganho
visual que a mistura aditiva em boa parte dilui. A folga medida é de GPU; a
restrição real é memória e tempo de montagem, e esses eu medi.

Risco e mitigação: um monitor de 60 Hz fixado em 60 fps continua passando no
limite superior e pode promover até `extreme`. Se a máquina não aguentar, a
rodada seguinte devolve `down1`, a trava `demoted` impede nova subida, e o custo
total é um engasgo de ~250 ms seguido da remontagem. Aceitável — e é por isso
que o degrau é de 300.000 e não de 440.000.

### Fase C — Verificação

1. `npx tsc --noEmit -p tsconfig.app.json`
2. `npm test`
3. `npm run lint` — a baseline atual é 17 problemas, 3 erros
4. `npm run build`
5. Reexecutar a bateria CDP da Parte A. Casos A2, A4, A5, A6 e A7 devem manter o
   resultado. O A3 muda de propósito: hoje promove até `low+` porque 161 fps
   passa no limiar fixo de 57; com limiares relativos a 165 Hz, o limite
   superior vira 100 e ele ainda promove, então o resultado esperado continua
   sendo promoção — o que se verifica é que ela ocorre por 75% das amostras.
6. Confirmar com o A8 que `extreme` é alcançado nesta máquina e que o tempo de
   GPU por quadro continua abaixo de 1 ms.

---

## 3.1 Resultado da execução

Fases A, B e C executadas. 195 testes verdes, `tsc` limpo, build ok, lint em 17
problemas e 3 erros — a baseline.

### O medidor novo, observado em execução real

```
mediana=159.9 refresh=160 move=up1 rung=high -> extreme round=1 amostras=[160,160,160,160,160,160,160,160,160,160]
mediana=159.9 refresh=160 move=up1 rung=extreme -> extreme round=2 amostras=[160,160,160,160,160,160,160,160,160,160]
```

Três comportamentos confirmados de uma vez:

1. `refresh=160` é detectado sozinho, e `bounds` viram `[60, 100]` em vez dos
   limiares fixos antigos.
2. A subida pulou `ultra` e foi direto a `extreme`. `ultra` só difere de `high`
   no `maxDpr`, e com `devicePixelRatio` 1 esse passo não muda nada na tela.
3. Na rodada 2 encerrou sozinho: já no topo, `stepUp` devolve o mesmo índice.

Numa execução anterior uma amostra de 152 apareceu no meio de nove de 160 e o
limiar de 75% a absorveu sem mover a escada. É exatamente o caso que a versão
de uma amostra só não sabia tratar.

### Custo real do degrau `extreme`

Vsync desligado, 24 amostras por execução, três execuções:

| | pontos | mediana | ms por quadro |
|---|---|---|---|
| `high` | 490.600 | 2913 fps | 0,34 |
| `extreme` | 669.000 | 1025 fps | 0,98 |

**O custo de GPU não é linear.** 1,36× mais pontos custaram 2,88× mais tempo de
quadro. Duas consequências:

- A folga de "17×" afirmada antes estava superestimada. A 0,34 ms a cena
  provavelmente não estava limitada pela GPU, e sim por um piso fixo de
  submissão. Só em `extreme` a medida entra em território realmente limitado
  pela GPU.
- **A extrapolação linear que rejeitou 440.000 era otimista.** A rejeição estava
  certa, mas por um motivo mais forte do que o registrado: além dos 140 MB, o
  tempo de quadro cresceria mais rápido que a contagem.

Mesmo assim `extreme` usa 0,98 ms de um orçamento de 6,06 ms a 165 Hz, ou 16%.
Folga confortável.

### Custo da promoção, que é novo

`extreme` não pode ser forçado por `localStorage`: um veredito gravado só pode
rebaixar o degrau inicial, nunca elevá-lo. Ele precisa ser conquistado pelo
probe — o que torna essa a medida certa do que o visitante sente.

Três execuções, engasgo máximo por janela:

| janela | run 1 | run 2 | run 3 |
|---|---|---|---|
| montagem, 0 a 3,5 s | 275 ms | 284 ms | 271 ms |
| promoção, 3,5 a 8 s | 206 ms | 194 ms | 200 ms |
| regime, 8 a 18 s | 7 ms | 7 ms | 7 ms |

A remontagem acontece em t ≈ 4,84 s, com picos de 200 ms, 88 ms e 50 ms
concentrados em cerca de 750 ms. Depois disso o pior quadro é de 7 ms.

**Este custo é novo.** Antes de `extreme`, a máquina classe A partia de `high` e
não tinha para onde subir, porque o único passo acima era o `ultra`, inerte.
Agora ela paga um engasgo de ~200 ms aos cinco segundos em troca de 36% mais
partículas.

Avaliação: aceitável. O engasgo cai durante o voo da câmera, acontece uma vez
por sessão, e o regime permanente fica em 7 ms. Mas é uma troca real, não um
ganho grátis, e quem decidir o contrário só precisa remover uma linha de
`LADDER`.

---

## 4. Fora do escopo, mas registrado

**O custo fixo de 265 ms de carregamento vale mais que o topo da escada.**
É constante em todos os degraus, independe das partículas, e numa máquina
classe C provavelmente passa de 700 ms. É o que o visitante sente antes de
qualquer coisa aparecer. O chunk `three` tem 945 KB e o build já avisa sobre
isso a cada execução.

Atacar esse custo beneficia todas as quatro classes de hardware. Subir o topo da
escada beneficia uma. Se houver escolha entre os dois, o custo fixo tem retorno
maior — mas é outro trabalho, com outro diagnóstico, e não deve ser misturado a
este.

---

## Fontes

- [EXT_disjoint_timer_query — MDN](https://developer.mozilla.org/en-US/docs/Web/API/EXT_disjoint_timer_query)
- [EXT_disjoint_timer_query_webgl2 — especificação Khronos](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/)
- [Inconsistência dos timer queries entre plataformas — webgl-dev-list](https://groups.google.com/g/webgl-dev-list/c/rWXtjit_Lsg)
- [webgl-profiler da Figma](https://github.com/figma/webgl-profiler)
- [Scaling performance — React Three Fiber](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [RFC: Adaptive performance — react-three-fiber #1070](https://github.com/pmndrs/react-three-fiber/issues/1070)
- [detect-gpu](https://github.com/pmndrs/detect-gpu)
