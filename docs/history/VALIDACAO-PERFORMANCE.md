# Validação de performance — runbook

Fase 8 do `fix-performance.md`. As Fases 0 a 7 estão implementadas e a classe A
já foi verificada. Este documento é o que falta executar.

Nada aqui exige alterar código. Se algum teste falhar, o registro do resultado é
o suficiente — a correção vem depois.

---

## 0. O que já está pronto

| Item | Estado |
|---|---|
| Animação no vertex shader (Fase 1) | feito, verificado na classe A |
| Escada de qualidade de 9 degraus (Fase 2) | feito |
| Classificação de GPU (Fase 3) | feito, sem teste em GPU real variada |
| Lógica adaptativa (Fase 4) | feito |
| Probe de FPS (Fase 5) | feito |
| Ligação em `useDeviceCapabilities` (Fase 6) | feito |
| `instantForm`, perda de contexto (Fase 7) | feito, perda de contexto sem teste |
| 182 testes automatizados | verdes |

Resultado medido na classe A (PC gamer, monitor 165 Hz):

```
[perf] fps=161.3 body=0.00ms particles=466400 detail=24200 dpr=1.25 devicePixelRatio=1.25
```

---

## 1. Ligar o diagnóstico

O build de produção remove `import.meta.env.DEV`. Sem um interruptor, as
máquinas alcançadas por deploy não mostrariam número nenhum. Por isso existe
uma flag de URL.

| Ação | URL |
|---|---|
| Ligar | `…/?perf=1` |
| Desligar | `…/?perf=0` |

A escolha fica gravada em `localStorage` sob `portfolio-perf-debug`. Isso é
necessário porque o site é SPA: o react-router descarta a query string na
primeira navegação interna, e uma flag que morresse ao entrar em `/projetos`
não serviria.

Com a flag ligada aparecem duas coisas:

**HUD no canto superior esquerdo.** Existe para as máquinas onde abrir o
DevTools é inviável — um celular, ou um PC emprestado. Dá para fotografar.

```
rung     high
fps      161.3
cpu/f    0.01 ms
points   466,400 +24,200
dpr      1.25 / 1.25
probe    161.3 fps (round 1)
```

**Logs no console**, iguais aos do HUD mais as transições do probe.

Leitura dos campos:

| Campo | Significado | O que observar |
|---|---|---|
| `rung` | degrau atual da escada | onde a máquina estabilizou |
| `fps` | quadros por segundo | limitado por vsync, ver seção 4 |
| `cpu/f` | milissegundos de JavaScript por frame | deve ficar abaixo de 1 ms sempre |
| `points` | partículas do campo principal + camada de detalhe | |
| `dpr` | pixel ratio em uso, após `clampDpr` e o teto do monitor | |
| `probe` | FPS médio da última rodada de medição e o número da rodada | |
| `SHADER` | só aparece se um shader falhar | qualquer coisa aqui é falha grave |

Erro de shader é reportado **sempre**, mesmo sem a flag. Foi o defeito que
custou um ciclo: a cena ficava vazia, o FPS subia porque nada era desenhado, e
o medidor reportava um número ótimo e falso.

---

## 2. Chaves em `localStorage`

| Chave | Conteúdo |
|---|---|
| `portfolio-quality-v1` | `{ id, gpu, at }` — degrau, classe de GPU, timestamp |
| `portfolio-perf-debug` | `"1"` quando o diagnóstico está ligado |

Limpar antes de cada teste, no console:

```js
localStorage.removeItem('portfolio-quality-v1')
```

`localStorage` é por origem. `localhost:8080` e o domínio publicado não
compartilham estado, e cada máquina tem o seu. Isso é o comportamento desejado,
não um problema.

---

## 3. Parte A — testes no PC gamer, sem deploy

Rodar com `npm run dev` em `http://localhost:8080/`.

Excepcionalmente o teste **A8** pede `npm run build` mais `npm run preview`,
porque mede desempenho e o servidor de desenvolvimento não é representativo.

### A1 — Linha de base, classe A

Já executado. Registrar na tabela da seção 6 para servir de referência.

### A2 — GPU fraca (proxy da classe C)

O caminho mais fiel a uma máquina de R$ 2.000 sem precisar dela: forçar o Chrome
a rasterizar por software.

1. Fechar **todas** as janelas do Chrome. O flag não se aplica a um processo já
   em execução.
2. Abrir o Chrome assim:

   ```
   chrome.exe --use-gl=swiftshader --use-angle=swiftshader
   ```

3. Abrir `http://localhost:8080/?perf=1`.

**Esperado:** `rung` inicia em `low` de imediato, sem esperar o probe, porque
`classifyGpu` reconhece a string `swiftshader`. Se o FPS ainda ficar baixo, o
probe desce até no máximo `minimal`. A cena continua animada.

**Falha:** cena travada, cena sem partículas, ou `rung` parando acima de `low`.

**Registrar:** `rung` inicial, `rung` final, `fps`, `cpu/f`, número de rodadas.

### A3 — Mobile (classe D)

1. DevTools, ícone de dispositivo, escolher qualquer celular.
2. Recarregar a página. A emulação de ponteiro só vale a partir do carregamento.

**Esperado:** `rung` inicia em `floor` (16.000 partículas). `dpr` respeita o
`devicePixelRatio` emulado. Sem cursor customizado.

**Falha:** `rung` acima de `floor`.

### A4 — Movimento reduzido

1. DevTools, `Ctrl+Shift+P`, digitar `Show Rendering`.
2. Em `Emulate CSS media feature prefers-reduced-motion`, escolher `reduce`.
3. Recarregar.

**Esperado:** `rung` é `reduced`, 6.000 partículas, `dpr` 1. A galáxia aparece
formada, sem animação de entrada. **Nenhuma linha `probe` no console** — a
medição não roda neste modo.

**Falha:** qualquer linha `probe`, ou animação de formação visível.

### A5 — Tela 4K e `clampDpr`

1. DevTools, ícone de dispositivo, `Responsive`, digitar `3840` × `2160`.
2. Recarregar.

**Esperado:** o campo `dpr` do HUD fica **abaixo** do teto do degrau. Com
3840×2160 o orçamento de 5.000.000 de pixels permite cerca de `0,55`, que o
piso eleva para `1`. O FPS não desaba ao maximizar.

**Falha:** `dpr` acima de 1 numa tela 4K, ou queda brusca de FPS ao maximizar.

### A6 — Perda de contexto WebGL

No console:

```js
document.querySelector('canvas')
  .getContext('webgl2')
  .getExtension('WEBGL_lose_context')
  .loseContext()
```

**Esperado:** o fundo sólido (`GalaxyBackdrop`) aparece, a página **não**
quebra, e `portfolio-quality-v1` passa a guardar `minimal`. Confirmar com:

```js
JSON.parse(localStorage.getItem('portfolio-quality-v1'))
```

Depois chamar `restoreContext()` na mesma extensão e verificar se o fundo sólido
some.

**Falha:** tela branca, erro de React, ou a chave não virar `minimal`.

> Aviso honesto: a recuperação após `restoreContext()` é o ponto menos testado
> de todo o trabalho. O `<Canvas>` permanece montado justamente para permitir a
> recuperação, mas se o three não recriar os recursos sozinho, o resultado
> aceitável é ficar no fundo sólido até um reload. Registrar o que acontecer, sem
> tratar como bloqueio.

### A7 — Persistência

Três verificações, no console, recarregando entre cada uma.

**Só rebaixa, nunca eleva:**

```js
localStorage.setItem('portfolio-quality-v1',
  JSON.stringify({ id: 'ultra', gpu: 'high', at: Date.now() }))
```

Recarregar. O `rung` **não** pode saltar para `ultra` por causa disso.

**Expira em 30 dias:**

```js
localStorage.setItem('portfolio-quality-v1',
  JSON.stringify({ id: 'minimal', gpu: 'high', at: Date.now() - 31*24*60*60*1000 }))
```

Recarregar. O valor deve ser ignorado.

**Troca de placa invalida:**

```js
localStorage.setItem('portfolio-quality-v1',
  JSON.stringify({ id: 'minimal', gpu: 'low', at: Date.now() }))
```

Recarregar numa máquina cuja GPU **não** seja `low`. O valor deve ser ignorado.

### A8 — Tempo real de GPU, para calibrar a escada

Este é o teste que decide se o topo da escada pode subir. É o único da Parte A
que exige o build de produção.

O problema: com vsync, o FPS trava no refresh do monitor. 161 fps não diz quanta
folga a GPU tem — só que ela fecha o frame dentro de 6,2 ms.

1. `npm run build`
2. `npm run preview`
3. Fechar todas as janelas do Chrome e reabrir assim:

   ```
   chrome.exe --disable-gpu-vsync --disable-frame-rate-limit
   ```

4. Abrir a URL do preview com `?perf=1`.

Com o vsync desligado o FPS sobe até o limite real da GPU.

**Como ler o resultado:**

| FPS sem vsync | Leitura | Ação |
|---|---|---|
| acima de 300 | folga grande | subir o topo da escada vale a pena |
| 160 a 300 | folga moderada | manter a escada como está |
| abaixo de 160 | sem folga | o degrau atual já é o limite |

Se o resultado pedir um degrau novo, ele entra no topo de `LADDER` em
`src/experience/lib/qualityLadder.ts`, respeitando a regra da Fase 2.2: entre
degraus vizinhos muda `particleCount` **ou** `maxDpr`, nunca os dois. O teste
`qualityLadder.test.ts` falha se essa regra for quebrada.

**Não subir o topo com base em FPS limitado por vsync.** Um número bonito não é
evidência.

---

## 4. Parte B — testes que exigem deploy

### Como publicar

O projeto está configurado para Vercel: `vercel.json` já traz o rewrite de SPA
que um roteador client-side exige. O repositório é
`github.com/gustavo-lg/my-portfolio-v2`.

Dois caminhos, escolher um:

**Se o projeto já está conectado à Vercel:** um push na branch publica sozinho.

**Se não está, ou para publicar sem mexer na branch:**

```
npm i -g vercel
vercel
```

A Vercel CLI não está instalada nesta máquina. `vercel` sozinho gera um deploy
de preview com URL própria, que serve perfeitamente para testar e não toca em
produção. `vercel --prod` publica no domínio final.

Antes de publicar, confirmar que `npm run build` passa. Ele passou na última
verificação.

### Como coletar resultado numa máquina que não é sua

Abrir a URL publicada com `?perf=1` e fotografar o HUD. Não precisa de DevTools.

Deixar a página parada na home por 15 segundos antes de fotografar: o probe tem
1,8 s de aquecimento mais 2 s de amostragem por rodada, e pode rodar mais de uma
vez.

Se for um celular Android com cabo, dá para ver o console via
`chrome://inspect` no seu PC.

### B1 — Desktop intermediário (classe B)

**Esperado:** `rung` estabiliza entre `mid` e `low+`. FPS igual ou acima de 48.
`cpu/f` abaixo de 1 ms.

### B2 — Desktop leve (classe C)

Este é o caso que originou todo o trabalho.

**Esperado:** `rung` em `low` ou abaixo. A cena **continua animada**. FPS igual
ou acima de 30.

**Falha crítica:** cena sem partículas, ou travando. Anotar o `rung`, o `fps` e,
se der, o renderer:

```js
const gl = document.createElement('canvas').getContext('webgl');
gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)
```

Essa string é o que alimenta `classifyGpu`. Se uma GPU fraca não estiver nas
listas de `src/experience/lib/gpuTier.ts`, ela cai em `unknown` e começa alto
demais. O probe corrige depois, mas o primeiro segundo fica ruim. Toda string
coletada de máquina real é material para melhorar essas listas.

### B3 — Celular real

O emulador do DevTools acerta o ponteiro e a resolução, mas não a GPU.

**Esperado:** `rung` em `floor`. Cena animada, sem travar, sem esquentar o
aparelho a ponto de o navegador reduzir o clock.

### B4 — Safari

Precisa de um Mac ou iPhone. É o único cenário sem substituto no seu PC.

Importa porque o Safari bloqueia `WEBGL_debug_renderer_info`, então `gpuClass`
sempre resulta `unknown` e o degrau inicial é `mid-`. Subir dali depende
inteiramente do probe.

**Esperado:** `rung` inicia em `mid-`. Se a máquina aguentar, o probe promove, no
máximo duas vezes.

**Falha:** ficar preso em `mid-` num Mac potente, ou travar.

---

## 5. Ordem sugerida

1. A4, A3, A5 — rápidos, só DevTools, sem reiniciar o navegador.
2. A6, A7 — console, dois minutos.
3. A2 — exige reiniciar o Chrome com flag.
4. A8 — exige build, preview e outro reinício com flag.
5. Deploy.
6. B1, B2, B3 nas máquinas reais. B4 se houver acesso a um Mac.

---

## 6. Planilha de resultados

Preencher e colar de volta. Cada linha é um teste da seção 3 ou 4.

**Parte A: executada por automação em Chrome headless via CDP.** Todos os oito
casos passaram. O headless usa a GPU real da máquina
(`ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Laptop GPU … D3D11)`), não um
rasterizador por software, então os números valem.

| Teste | rung inicial | rung final | fps | cpu/f | dpr | Passou | Observação |
|---|---|---|---|---|---|---|---|
| A1 classe A | high | high | 161.3 | 0.01 | 1.25 | sim | vsync 165 Hz |
| A2 swiftshader | low | low | 52.0 | 0.01 | 1.00 | sim | 101.760 pontos por software |
| A3 mobile emulado | floor | low+ | 161.3 | 0.00 | 1.00 | sim | promoveu 2×, correto a 161 fps |
| A4 movimento reduzido | reduced | reduced | — | — | — | sim | canvas não monta; 0 rodadas de probe |
| A5 4K | high | ultra | 161.4 | 0.00 | 1.00 | sim | `clampDpr` cortou 2,0 para 1,0 |
| A6 perda de contexto | — | — | — | — | — | sim | backdrop, página viva, gravou `minimal`, 0 erros |
| A7 persistência | — | — | — | — | — | sim | 5 sub-casos, todos corretos |
| A8 GPU sem vsync | high | high | **2631.6** | 0.00 | 1.00 | sim | folga enorme |
| B1 classe B | | | | | | | exige deploy |
| B2 classe C | | | | | | | exige deploy |
| B3 celular real | | | | | | | exige deploy |
| B4 Safari | | | | | | | exige Mac ou iPhone |

Detalhe do A7, cada linha recarregando a página:

| Valor gravado | Degrau inicial obtido | Correto |
|---|---|---|
| `{id:"ultra", gpu:"high"}` | `high` | sim — nunca eleva |
| `{id:"minimal", gpu:"high"}` | `minimal` | sim — rebaixa |
| `{id:"minimal"}` com 31 dias | `high` | sim — expirou |
| `{id:"minimal", gpu:"low"}` | `high` | sim — GPU divergente |
| texto que não é JSON | `high` | sim — ignorado |

### Achados da automação

**1. Dois probes rodando em paralelo — CORRIGIDO.**
`useDeviceCapabilities()` era chamado em dois lugares:
`OrbitalExperience.tsx`, que usa só `reducedMotion`, e `GalaxyCanvas.tsx`, que
usa o `tier`. Cada chamada criava seu próprio estado e seu próprio laço de
`requestAnimationFrame`. O log do A3 mostrava cada transição duas vezes, com o
contador de rodada travado em 1 nas duas:

```
floor -> low  round=1      floor -> low  round=1
low -> low+   round=2      low -> low+   round=1
```

Não era StrictMode: `src/main.tsx` não usa `<StrictMode>`. Eram dois medidores
independentes, cada um gravando em `localStorage`.

Correção: `DeviceCapabilitiesProvider` resolve o tier uma vez e compartilha por
contexto. `useDeviceCapabilities()` agora lança um erro explícito se for chamado
fora do provider, para que a duplicação não volte em silêncio. Depois da
correção o log traz três linhas, com rodadas 1, 2 e 3.

**2. `customCursor` vivia no degrau errado — CORRIGIDO.** Nenhum componente lia
o campo (`CursorProvider` recebe `enabled={false}` fixo), mas o modelo estava
errado: cursor customizado é uma questão de dispositivo de entrada, não de
quantas partículas a GPU aguenta. Como `low+` tinha `customCursor: true` e é
alcançável por promoção a partir de `floor`, um aparelho de toque que
promovesse ganharia cursor no dia em que o campo fosse ligado.

Correção: o campo saiu de `Rung` e passou a ser derivado em `tierFromRung` a
partir de `pointerFine && !reducedMotion`. Um teste percorre a escada inteira
garantindo que `customCursor` segue o ponteiro e nunca o degrau.

**2b. Armadilha de ambiente encontrada durante a verificação.** Renomear
`useDeviceCapabilities.ts` para `.tsx` com o dev server rodando deixa o Vite
servindo o caminho antigo. Pior: parar a tarefa do npm não mata o processo
`vite.js` filho, que continua ocupando a porta. O servidor novo sobe em 8081, em
8082, e os testes seguem batendo no processo velho com o grafo de módulos
obsoleto. Sintoma: 404 em `…/useDeviceCapabilities.ts?t=<timestamp fixo>` e
página em branco, enquanto `npm run build` e `npm test` passam.

Ao renomear arquivo de módulo, encerrar o processo `vite.js` de verdade e
confirmar em qual porta o servidor novo subiu.

**3. Sob movimento reduzido o canvas nunca monta.** `OrbitalExperience` decide
`staticGalaxy = !webgl || reducedMotion` e renderiza `GalaxyBackdrop` no lugar
do `GalaxyCanvas`. Logo `REDUCED_RUNG` é calculado e nunca desenha nada.
Comportamento correto e anterior a este trabalho — só não é o que a Fase 2.3
descrevia.

**4. O A8, medido direito.** A primeira leitura foi 2631,6 fps; uma segunda
execução deu 322,9. Diferença grande demais para servir de base. Causa: o campo
`fps` do HUD é calculado sobre 120 quadros, que a 2900 fps é uma janela de 41 ms
— curta demais, sensível a qualquer engasgo.

Medição refeita com 24 amostras por execução ao longo de 17 s, três execuções:

| Execução | mín | mediana | máx |
|---|---|---|---|
| 1 | 260 | 2878 | 3333 |
| 2 | 251 | 2913 | 3183 |
| 3 | 2691 | 2934 | 3324 |

**Mediana das medianas: 2913 fps, ou 0,34 ms de GPU por quadro**, com 466.400
partículas a 1920×1080 e `devicePixelRatio` 1.

Os mínimos de 251 e 260 em duas execuções mostram que existem quedas
pontuais. Não foram investigadas; a mediana é o número que importa para
dimensionar a escada.

Ressalva: isto mede uma RTX 4060 Laptop. Diz respeito apenas às máquinas que
chegam ao topo da escada, que são máquinas como esta.

---

## 7. Critérios de aceite

A Fase 8 fecha quando:

- Nenhuma classe fica sem partículas animadas.
- Nenhuma classe fica abaixo de 30 fps.
- `cpu/f` fica abaixo de 1 ms em **todas** as classes. Este é o número que prova
  que a Fase 1 resolveu o gargalo em toda a faixa de hardware, não só na sua
  máquina.
- A classe A usa mais partículas que a classe C. Sem isso, a escada não está
  fazendo nada.
- Nenhum erro de shader em nenhuma GPU.

---

## 8. Antes de considerar publicado

Desligar o diagnóstico em produção: abrir o site com `?perf=0` uma vez, ou
limpar `portfolio-perf-debug`.

O HUD só aparece para quem ligou a flag naquele navegador, então ele não vaza
para visitantes. Ainda assim, terminar a bateria com a flag desligada evita
confusão numa sessão futura.
