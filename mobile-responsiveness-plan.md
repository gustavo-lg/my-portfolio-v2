# Plano de Correção Mobile — Responsividade em Massa

Auditamos todos os componentes do portfólio contra o código atual e mapeamos os
problemas de responsividade. **Nenhuma execução** foi feita neste documento.

**Princípio inegociável:** a experiência completa — canvas WebGL da galáxia,
partículas, labels orbitais, animação Star Wars entre páginas — **continua ativa
no mobile**. Nada de fallback estático por ser touch. O trabalho aqui é fazer o
layout, a tipografia, os alvos de toque e o posicionamento dos labels
funcionarem em telas pequenas, sem desligar efeito nenhum.

---

## Diagnóstico Geral

Breakpoints Tailwind padrão (`sm` 640 / `md` 768 / `lg` 1024). **Não existe
breakpoint `xs`** e **não existe guarda global de `overflow-x`** (nada em
`src/index.css`; o único `overflow-x-clip` está numa div interna do
`ContentArea`).

### Como o mobile realmente se comporta hoje (corrigido)

`staticGalaxy` é `!isWebGLAvailable() || reducedMotion`
([OrbitalExperience.tsx:66](src/experience/OrbitalExperience.tsx#L66),
[OrbitalMenu.tsx:18](src/experience/menu/OrbitalMenu.tsx#L18)). **Não depende de
`pointerFine`.** Consequências no celular (que tem WebGL):

- `<GalaxyCanvas>` renderiza normal — `pointerFine === false` só reduz
  `particleCount` para o tier `LOW` (16 000) e desliga o cursor custom em
  [perfTier.ts](src/experience/lib/perfTier.ts); **não desliga o canvas**.
- Os `OrbitalLabels` **são renderizados** (`menuActive && !staticGalaxy`) e são
  posicionados por projeção 3D das mini-galáxias nos cantos
  ([OrbitalLabels.tsx](src/experience/menu/OrbitalLabels.tsx) →
  `left/top` em `%`).
- O `<nav>` textual da home continua `sr-only`
  ([OrbitalMenu.tsx:31](src/experience/menu/OrbitalMenu.tsx#L31)).

**Logo, no mobile a navegação da home depende inteiramente dos labels
projetados.** Se eles saírem da viewport, ficarem minúsculos ou colidirem, o
usuário fica sem como navegar. Este é o problema mobile mais grave e é o foco da
seção 10.

### Tabela de problemas

| Área | Problema |
|------|----------|
| **Guarda global** | Sem `overflow-x-clip`/`hidden` no root nem no `body`; o `page-out` faz `translateX(210vw) scale(2.9)` sem rede de segurança |
| **Altura de viewport** | `min-h-screen` (100vh) em 3 lugares ([OrbitalExperience.tsx:235](src/experience/OrbitalExperience.tsx#L235), [ContentArea.tsx:80](src/experience/pages/ContentArea.tsx#L80), [OrbitalMenu.tsx:23](src/experience/menu/OrbitalMenu.tsx#L23)) → salto/corte com a barra de endereço dinâmica do iOS/Android |
| **OrbitalLabels (mobile)** | Projeção 3D dos cantos: em ≤ 414px os 4 botões ficam próximos demais / fora da tela; alvos de toque abaixo de 44px; é a única navegação da home no mobile |
| **OrbitalLabel (perf)** | `filter: blur()` animado + `will-change: filter` nos 4 botões — caro no GPU mobile (fora do escopo de layout, anotado) |
| **Home nav `sr-only`** | Sem fallback visível se os labels falharem em telas pequenas |
| **ContentArea** | `pt-24 pb-36` rígidos; não reduzem em mobile |
| **BackButton** | `top-6` fixo; sem safe-area; `px-4 py-2 text-xs` ≈ 30px de altura (< 44px) |
| **BottomNav** | 3 pills lado a lado, `flex justify-center gap-3` **sem wrap** → estoura < 360px; `px-4 py-2` < 44px |
| **CategorySection** | h1 `text-3xl md:text-5xl` (sem `sm:`); `tracking-[0.2em]` pode dar overflow; blurb `<p>` com `mb-10` |
| **ExperienceContainer** | `px-6` fixo em todos os breakpoints |
| **ContactView** | `gap-10`; card `p-6`; inputs `px-3.5 py-2` (< 44px e `text-*` herda 14px → iOS dá zoom no focus) |
| **ProjectsView** | `grid gap-6 md:grid-cols-2`; cards `p-5`; h2 `text-lg` |
| **StackView** | `space-y-12` entre seções (excessivo); só a 1ª `<section>` tem cards `p-5` + `grid gap-4 sm:grid-cols-2`; as outras 2 são chips `px-3 py-1.5` |
| **AboutView** | wrapper `space-y-10`; pilares `p-5` + `grid gap-4 sm:grid-cols-2`; corpo já tem `text-base sm:text-lg` (manter) |
| **Wordmark** | `whitespace-nowrap` + `tracking-[0.18em]` → overflow horizontal em telas estreitas; `filter: blur()` animado |
| **OrbitalMenu (fallback)** | Só aparece com `reducedMotion` ou sem WebGL; links `px-5 py-2.5 tracking-[0.2em] gap-4` com `flex-wrap` |
| **Animação page-in/out** | `translateX(-42vw) scale(0.18)` / `translateX(210vw) scale(2.9)` + `perspective: 2200px` — sem `@media` de mobile; mantém-se, só suaviza amplitude |
| **GalaxyCanvas** | `position: fixed; inset: 0` — OK. Mantido ativo no mobile; só o `particleCount` cai por tier. Sem mudança aqui |

---

## Decisões já tomadas (não são mais "open questions")

1. **Galáxia 3D no mobile:** permanece **ligada**. Não criar caminho
   `staticGalaxy` por touch. `reducedMotion` continua sendo o único opt-out.
2. **Animação Star Wars no mobile:** permanece **ligada**. Reduzir só a
   amplitude via `@media (max-width: 640px)` com keyframes alternativos +
   `perspective` menor — sem desativar.
3. **BottomNav em telas pequenas:** `flex-wrap` + pills compactas com label
   sempre visível (labels são curtas: "Projetos", "Stack", "Sobre", "Contato").
   Sem esconder texto.
4. **OrbitalLabels no mobile:** manter os 4 botões, mas (a) **clampar** cada um
   dentro da viewport com margem, (b) garantir alvo ≥ 44px, (c) reduzir o pill
   em telas pequenas, (d) expor o `<nav>` textual da home como fallback visível
   abaixo de `sm` caso a projeção deixe algum label fora da área segura.

---

## Pré-requisito: breakpoint e guardas globais

### [MODIFY] [tailwind.config.ts](tailwind.config.ts)
- Adicionar `theme.screens` estendido com `xs: "400px"` (mantendo `sm/md/lg/xl/2xl`
  padrão) para poder mirar celulares pequenos separadamente de 640px.

### [MODIFY] [src/index.css](src/index.css)
- No layer base: `html, body { overflow-x: clip; }` (rede de segurança para o
  `page-out`; não afeta o `position: fixed` do canvas).
- `input, textarea, select { font-size: 16px; }` abaixo de `sm` (ou usar
  `text-base` nos campos) — evita o auto-zoom do iOS Safari ao focar um campo.
- Utilitário de safe-area: usar `env(safe-area-inset-*)` nos elementos fixos
  (BackButton, BottomNav, main da home). Garantir `viewport-fit=cover` no
  `<meta name="viewport">` de [index.html](index.html) (verificar; adicionar se
  faltar).

### [MODIFY] [index.html](index.html)
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
  (adicionar `viewport-fit=cover` se ausente).

---

## Proposed Changes (Sem Execução)

### 1. Layout Global e Container

#### [MODIFY] [ExperienceContainer.tsx](src/experience/layout/ExperienceContainer.tsx)
- `px-6` → `px-4 sm:px-6`.
- `EXPERIENCE_MAX_W` (`max-w-3xl`) permanece.

#### [MODIFY] [OrbitalExperience.tsx](src/experience/OrbitalExperience.tsx)
- Root wrapper (`:235`): `min-h-screen` → `min-h-[100svh]` e adicionar
  `overflow-x-clip` (defesa em profundidade junto do CSS global).

---

### 2. ContentArea — Espaçamento Vertical e Altura

#### [MODIFY] [ContentArea.tsx](src/experience/pages/ContentArea.tsx)
- `:80` wrapper: `min-h-screen` → `min-h-[100svh]`.
- `:91` `pb-36 pt-24` → `pb-24 pt-16 sm:pb-36 sm:pt-24`.
- `:92` `perspective: "2200px"` → responsivo: `1400px` abaixo de `sm`, `2200px`
  a partir de `sm` (via classe `[perspective:1400px] sm:[perspective:2200px]` ou
  style condicional com `matchMedia`). Ver seção 13.
- `:108` camada `page-out` tem `top-24` fixo → `top-16 sm:top-24` para casar com
  o `pt` novo.

---

### 3. BackButton — Posicionamento e Toque

#### [MODIFY] [BackButton.tsx](src/experience/pages/BackButton.tsx)
- Wrapper fixo (`:22`): `top-6` → `top-[max(1rem,env(safe-area-inset-top))] sm:top-6`.
- Botão (`:27`): adicionar `min-h-11` (44px) e `text-[0.7rem] sm:text-xs`;
  `px-4` → `px-3.5 sm:px-4`.

---

### 4. BottomNav — Pills de Navegação

#### [MODIFY] [BottomNav.tsx](src/experience/pages/BottomNav.tsx)
- `:39` `bottom-8` → `bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-8`.
- `:41` `flex justify-center gap-3` → `flex flex-wrap justify-center gap-2 sm:gap-3`.
- `:49` pills: `px-4 py-2` → `px-3 py-2 sm:px-4`; adicionar `min-h-11`;
  `text-xs` → `text-[0.65rem] sm:text-xs`; `gap-2` → `gap-1.5 sm:gap-2`.
- Manter ícone + label sempre visíveis (labels curtas, cabem com wrap).

---

### 5. CategorySection — Tipografia

#### [MODIFY] [CategorySection.tsx](src/experience/pages/CategorySection.tsx)
- h1 (`:23`): `text-3xl md:text-5xl` → `text-2xl sm:text-3xl md:text-5xl`;
  `tracking-[0.2em]` → `tracking-[0.12em] sm:tracking-[0.2em]`; adicionar
  `break-words`.
- blurb `<p>` (`:26`): `mb-10` → `mb-6 sm:mb-10` (é aqui que fica o espaço
  título→conteúdo; o h1 tem só `mb-2`).

---

### 6. ProjectsView — Cards

#### [MODIFY] [ProjectsView.tsx](src/experience/pages/sections/ProjectsView.tsx)
- `:5` `grid gap-6 md:grid-cols-2` → `grid gap-4 sm:gap-6 md:grid-cols-2`.
- `:9` card `p-5` → `p-4 sm:p-5`.
- `:11` h2 `text-lg` → `text-base sm:text-lg`.

---

### 7. StackView — Espaçamento e Grid

#### [MODIFY] [StackView.tsx](src/experience/pages/sections/StackView.tsx)
- `:5` `space-y-12` → `space-y-8 sm:space-y-12`.
- `:6` `grid gap-4 sm:grid-cols-2` → `grid gap-3 sm:gap-4 sm:grid-cols-2`.
- `:10` cards da 1ª seção `p-5` → `p-4 sm:p-5` (as outras 2 seções são chips
  `px-3 py-1.5` — deixar como estão).

---

### 8. AboutView — Espaçamento

#### [MODIFY] [AboutView.tsx](src/experience/pages/sections/AboutView.tsx)
- `:26` wrapper `space-y-10` → `space-y-7 sm:space-y-10`.
- `:46` `grid gap-4 sm:grid-cols-2` → `grid gap-3 sm:gap-4 sm:grid-cols-2`.
- `:52` pilares `p-5` → `p-4 sm:p-5`.
- `:72` card de objetivo `p-5` → `p-4 sm:p-5`.
- Corpo (`text-base sm:text-lg` / `text-sm sm:text-base`) já é responsivo —
  **não mexer**.

---

### 9. ContactView — Layout e Formulário

#### [MODIFY] [ContactView.tsx](src/experience/pages/sections/ContactView.tsx)
- `:29` `grid gap-10 lg:grid-cols-2` → `grid gap-6 sm:gap-8 lg:grid-cols-2`.
- `:31` card `p-6` → `p-4 sm:p-6`; `space-y-5` → `space-y-4 sm:space-y-5`.
- Inputs/textarea (`:63,:74,:84,:94`): `px-3.5 py-2` → `px-3.5 py-2.5`;
  adicionar `text-base sm:text-sm` (16px em mobile → sem zoom no iOS) e
  `min-h-11` nos `<input>`.
- `:94` textarea `min-h-[120px]` → `min-h-[104px] sm:min-h-[120px]`.
- `:99` botão: adicionar `min-h-11` (o `py-2.5 text-sm` já fica perto; garantir).

---

### 10. OrbitalLabels / OrbitalLabel — Navegação da Home no Mobile (CRÍTICO)

Estes botões **aparecem no mobile** e são a única navegação da home. Objetivo:
mantê-los na tela, tocáveis e sem colisão, sem alterar a coreografia da galáxia.

#### [MODIFY] [OrbitalLabels.tsx](src/experience/menu/OrbitalLabels.tsx)
- No wrapper de cada label (`:60`), **clampar** a posição projetada dentro de
  uma área segura: em vez de `left: ${pos.xPct}%`, usar
  `left: clamp(<margem>, ${pos.xPct}%, <100 - margem>)` e idem para `top`,
  com margem maior abaixo de `sm` (ex.: 14% mobile / 6% desktop). Isso impede
  que um label projetado para fora da tela suma.
- Alternativa/complemento: abaixo de `sm`, ancorar os 4 labels num layout fixo
  (2×2 nos cantos com padding) em vez da projeção pura — a galáxia continua
  animando atrás, só os botões deixam de seguir 1:1 a projeção quando ela sai
  da viewport. Decidir na implementação qual dá melhor leitura.

#### [MODIFY] [OrbitalLabel.tsx](src/experience/menu/OrbitalLabel.tsx)
- Pill: `px-5 py-2.5` → `px-3.5 py-2 sm:px-5 sm:py-2.5`; adicionar `min-h-11`
  e `min-w-11`; `text-[0.7rem]` mantém.
- **Perf mobile:** trocar `filter: blur()` animado (+ `will-change: filter`)
  por `opacity` + `transform` apenas (o blur animado é caro no GPU do celular).
  Manter o `backdrop-blur` estático da classe.
- Garantir `touch-action: manipulation` e área de toque cheia.

#### [MODIFY] [OrbitalMenu.tsx](src/experience/menu/OrbitalMenu.tsx) — fallback visível
- Hoje o `<nav>` é `sr-only` quando `!staticGalaxy`. Abaixo de `sm`, torná-lo
  **visível** como faixa de navegação compacta (chips com `flex-wrap`), como
  rede de segurança se algum label orbital ficar inacessível. Acima de `sm`
  continua `sr-only`.
  - Classe condicional: `sr-only sm:sr-only` → algo como
    `flex flex-wrap justify-center gap-3 sm:sr-only` quando `!staticGalaxy`.
  - Reaproveitar o estilo de link do modo `staticGalaxy`.

---

### 11. Wordmark — Overflow e Perf

#### [MODIFY] [Wordmark.tsx](src/experience/menu/Wordmark.tsx)
- h1 (`:23`): remover `whitespace-nowrap` **ou** `tracking-[0.18em]` →
  `tracking-[0.1em] sm:tracking-[0.18em]`; adicionar `max-w-full break-words`.
- `text-2xl sm:text-3xl md:text-4xl` — manter.
- **Perf mobile (opcional, anotado):** o `filter: blur()` animado de entrada
  (`:15,:19,:20`) é pesado; se houver hitch no mobile, trocar por
  `opacity`+`transform`. Fora do escopo de layout.

---

### 12. OrbitalMenu (modo `staticGalaxy`) — Fallback de `reducedMotion` / sem WebGL

#### [MODIFY] [OrbitalMenu.tsx](src/experience/menu/OrbitalMenu.tsx)
- `main` (`:23`): `min-h-screen` → `min-h-[100svh]`;
  `pb-[11vh]` → `pb-[max(11vh,calc(env(safe-area-inset-bottom)+2rem))]`.
- Links (`:42`): `px-5` → `px-4 sm:px-5`;
  `tracking-[0.2em]` → `tracking-[0.12em] sm:tracking-[0.2em]`;
  adicionar `min-h-11`.
- `gap-4` do `<nav>` → `gap-3 sm:gap-4`.

---

### 13. Animação page-in/page-out em Telas Pequenas (mantida, só suavizada)

#### [MODIFY] [tailwind.config.ts](tailwind.config.ts) + [src/index.css](src/index.css) + [ContentArea.tsx](src/experience/pages/ContentArea.tsx)
- **Não desativar.** Adicionar variantes de menor amplitude para `max-width: 640px`.
- Em [src/index.css](src/index.css), sob `@media (max-width: 640px)`, redefinir
  os keyframes `page-in` / `page-out` (mesmos nomes) com valores contidos:
  - `page-in`: `translateX(-22vw) scale(0.4) rotateY(-16deg)` → identidade.
  - `page-out`: identidade → `translateX(120vw) scale(1.8) rotateY(-12deg)`.
  - Mantém a mesma duração/curva já definidas em `tailwind.config.ts`
    (`1.35s` / `0.95s`).
- `perspective`: `1400px` abaixo de `sm` (ver seção 2).
- `SWAP_MS` ([pageTransition.ts](src/experience/pages/pageTransition.ts)) —
  verificar se continua ≥ duração do keyframe mais longo após o ajuste (é, pois
  a duração não muda).
- `motion-reduce:animate-none` / `motion-reduce:hidden` já existem
  ([ContentArea.tsx:107-108](src/experience/pages/ContentArea.tsx#L107)) —
  manter.

---

## Ordem de Execução Sugerida

1. **Pré-requisitos** — `tailwind.config.ts` (`screens.xs`), `src/index.css`
   (overflow-x, font-size 16px, safe-area), `index.html` (`viewport-fit`).
2. `ExperienceContainer.tsx` + root do `OrbitalExperience.tsx` — base do layout
   e altura `svh`.
3. `CategorySection.tsx` — afeta as 4 páginas.
4. `ContentArea.tsx` — espaçamento vertical, `svh`, `perspective`.
5. `BackButton.tsx` + `BottomNav.tsx` — navegação das páginas.
6. `ProjectsView` → `StackView` → `AboutView` → `ContactView` — conteúdo.
7. `OrbitalLabels.tsx` + `OrbitalLabel.tsx` + fallback `<nav>` do
   `OrbitalMenu.tsx` — **navegação da home no mobile (bloqueante de UX)**.
8. `Wordmark.tsx` + `OrbitalMenu.tsx` (modo fallback).
9. `tailwind.config.ts` + `src/index.css` + `ContentArea.tsx` — keyframes de
   mobile da animação Star Wars.

---

## Verification Plan

### Testes automatizados
```powershell
npm test
```
**91 testes** devem continuar passando após cada edição (confirmado: 18 files /
91 tests). Atenção a
[OrbitalExperience.test.tsx](src/experience/OrbitalExperience.test.tsx) se o
`<nav>` da home deixar de ser `sr-only` abaixo de `sm` — pode ser preciso ajustar
a asserção que hoje conta os "4 category links".

### `npx tsc -p tsconfig.app.json --noEmit` e `npm run build`
Rodar após as mudanças em style condicional / `matchMedia`.

### Verificação manual
- Viewports: `320px` (galaxy fold/SE antigo), `375px` (iPhone SE), `390px`
  (iPhone 14), `414px` (iPhone XR), `768px` (iPad), `1024px`.
- Emular touch + throttle CPU 4× (o mobile roda o canvas WebGL de verdade).
- Home (`/`):
  - Canvas WebGL + partículas visíveis e animando.
  - Os 4 `OrbitalLabels` **dentro da viewport**, sem colisão, alvo ≥ 44px,
    navegam corretamente.
  - Fallback `<nav>` visível abaixo de `sm` e funcional.
  - Wordmark sem overflow horizontal em 320px.
- 4 páginas (`/projetos`, `/stack`, `/sobre`, `/contato`):
  - Animação Star Wars **acontece** e sem flicker / sem barra de rolagem
    horizontal durante o `page-out`.
  - Sem `overflow-x` em nenhum breakpoint (checar `document.scrollingElement.scrollWidth`).
  - BackButton e BottomNav respeitando safe-area do notch/gesture bar.
  - Inputs do ContactView sem auto-zoom ao focar (iOS).
  - Alvos de toque ≥ 44px (BackButton, BottomNav, botão WhatsApp, links).
  - Tipografia sem truncamento; `perspective` reduzida sem quebrar o efeito.
- `prefers-reduced-motion`: cai no `OrbitalMenu` estático — validar padding e
  safe-area.
