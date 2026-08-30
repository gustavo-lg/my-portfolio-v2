# Redesign do Portfólio — "Sistema Orbital" (Design Doc)

Data: 2026-08-30
Branch: `redesign/sistema-orbital`
Referência visual: BlueYard (blueyard.com) por Unseen Studio
Spec de origem: `redesign-spec.md` (raiz do repo)

## 1. Objetivo

Substituir a camada de experiência/navegação do portfólio (hoje: página única
com scroll + sidebar shadcn) por uma experiência imersiva de "sistema orbital":
uma nebulosa de partículas em WebGL como elemento de identidade central,
categorias orbitando como pontos de menu, cursor customizado, e transições de
câmera coreografadas entre as páginas de conteúdo.

O **conteúdo textual e as imagens já existentes são preservados** — este
redesign é sobre apresentação e navegação, não sobre reescrever conteúdo.

### Não-objetivos

- Não recriar/reescrever o conteúdo dos projetos, bio, ou textos.
- Não adicionar CMS, backend, ou autenticação.
- Não adicionar áudio ambiente.
- Não implementar shader GLSL volumétrico nem post-processing bloom no MVP
  (ver Seção 7 — Riscos).

## 2. Estado atual do repositório (baseline)

- **Stack**: Vite 5 + React 18.3 + TS 5.8 (`@vitejs/plugin-react-swc`),
  Tailwind 3.4 + `tailwindcss-animate`, shadcn/ui (Radix), `react-router-dom` 6.30.
- **Rotas**: apenas `/` → `Index` → `PortfolioLayout`; `*` → `NotFound`.
- **Navegação atual**: `scrollIntoView` em âncoras a partir de `AppSidebar`.
- **Conteúdo**: hardcoded em arrays dentro de cada componente de seção
  (`src/components/sections/*.tsx`). Sem camada de dados.
- **Seções renderizadas**: `Hero`, `About`, `Projects`, `Contact`.
  `Skills.tsx` existe mas **não é renderizado** hoje.
- **Design system** (`src/index.css`): cor de destaque única
  ciano `hsl(195 100% 50%)` (`--primary`/`--accent`/`--ring`); fundo dark
  `hsl(0 0% 12%)` (`--dark-bg`, usado só na sidebar). Tokens `--shadow-glow`,
  `--gradient-hero` e keyframe `glow` já existem. **Dark mode não está ativo**
  (a classe `.dark` nunca é aplicada).
- **Identidade**: sem logo. `public/favicon.ico` é placeholder do Lovable.
  `src/assets/profile.png` é a foto real. Sem fonte custom.
- **Deploy**: Vercel. `lovable-tagger` roda no build de dev.
- **Lixo do template**: `src/App.css` (logo spin do template Vite),
  `@tanstack/react-query` instalado e praticamente sem uso, placeholders no
  `index.html` (`URL_DA_IMAGEM_DE_PREVIEW`, `URL_DO_SEU_SITE`).

## 3. Decisões (lacunas da spec resolvidas)

### 3.1 Categorias do menu orbital — **4 categorias**

Mapeadas 1:1 no conteúdo real já existente:

| Categoria | Rota | Fonte de conteúdo | Ícone (lucide) |
|---|---|---|---|
| **PROJETOS** | `/projetos` | array `projects` de `Projects.tsx` (9 itens, flag `featured`) | `Boxes` |
| **STACK** | `/stack` | `technicalSkills` + `categories` de `Skills.tsx` (reativado) | `Layers` |
| **SOBRE** | `/sobre` | `About.tsx` (bio + 4 pilares: Código Limpo / Inovação / SEO / Performance) | `User` |
| **CONTATO** | `/contato` | `Contact.tsx` (form WhatsApp + Instagram + infos) | `Mail` |

- Projetos ficam **juntos** numa única categoria (decisão do usuário) — sem
  separar "produtos" de "sites".
- O **Hero** ("Desenvolvedor Web / me chamo Gustavo…") **não é categoria**:
  vira o texto de entrada exibido junto/logo após a formação da galáxia,
  antes do menu (Fase 3 da animação de entrada).

### 3.2 Núcleo central — **nebulosa abstrata + wordmark**

Decisão do usuário: **nebulosa abstrata pura** (sem forma reconhecível / sem
monograma). O núcleo é o aglomerado mais denso e luminoso de partículas, com
glow. Sobreposto em DOM 2D, o **wordmark**:

```
Gustavo Gonçalves
Desenvolvedor Web
```

- Paleta: núcleo ciano `hsl(195 100% 50%)` (cor já existente do projeto);
  partículas orbitais em gradiente ciano → roxo (`~hsl(265 80% 62%)`) para
  criar a profundidade azul/roxo da referência BlueYard.
- Fundo: dark `hsl(0 0% 8–12%)`.

### 3.5 Tipografia (proposta inicial — ajustável)

- **Wordmark + títulos**: `Space Grotesk` (Google Fonts) — grotesca com
  personalidade "técnica/sistema", combina com a linguagem da referência.
  No wordmark: peso leve (300/400) com `letter-spacing` aberto.
- **Corpo de texto** (páginas internas): `Inter` (Google Fonts) — neutra,
  altíssima legibilidade em dark.
- Ambas via `@fontsource` ou `<link>` para Google Fonts, com fallback
  `system-ui`. Decisão final na Fase 2 (núcleo/wordmark).

### 3.3 Fidelidade — **abordagem de sprites additivos** (sem GLSL/bloom no MVP)

Nebulosa = um único `<Points>` com `BufferGeometry`, textura de sprite circular
suave, `AdditiveBlending`, leve `fog`. Glow do núcleo via sprite/halo, não via
`EffectComposer`. Bloom real fica como *stretch goal* medido na Fase 2.

### 3.4 Skills — reativado como categoria **STACK**

O conteúdo hoje morto de `Skills.tsx` (`technicalSkills`, `categories`,
`softSkills`) passa a alimentar a página `/stack`.

## 4. Arquitetura

### 4.1 Camadas

```
<App> (Router + providers)
 └── <OrbitalExperience>            layout persistente — NUNCA desmonta
      ├── <GalaxyCanvas>            R3F <Canvas> (lazy) — persiste entre rotas
      │     ├── <ParticleField>     1x <Points>, BufferGeometry, additive
      │     ├── <GalaxyCamera>      posição/zoom controlados por GSAP
      │     └── <IdleMotion>        movimento browniano sutil
      ├── <CustomCursor>            div DOM, lerp rAF (pointer:fine only)
      ├── <ExperienceOverlay>       vinheta/overlay escuro animável
      └── <Routes>
           ├── "/"          → <OrbitalMenu>  (wordmark + 4 labels orbitais)
           ├── "/projetos"  → <ContentPage category="projetos">
           ├── "/stack"     → <ContentPage category="stack">
           ├── "/sobre"     → <ContentPage category="sobre">
           ├── "/contato"   → <ContentPage category="contato">
           └── "*"          → <NotFound>
```

O `<Canvas>` vive no layout persistente, acima do `<Routes>`. Trocar de rota
**não** remonta o WebGL — só muda a posição alvo da câmera e o conteúdo DOM.

### 4.2 Máquina de estados da experiência

Um reducer dedicado (`useExperienceMachine`), sem lib externa:

```
intro-forming   → partículas convergindo (GSAP timeline)
intro-settling  → estrutura estável, movimento idle, sem menu
menu-reveal     → wordmark + labels fazem fade/scale-in staggered
idle            → usuário pode hover/focar/clicar categorias
traveling       → cursor custom viajando até o alvo clicado
navigating      → coreografia de transição rodando (overlay/labels/câmera)
internal-page   → página de conteúdo aberta, galáxia reenquadrada ao fundo
returning       → coreografia reversa de volta ao menu central
```

Transições disparadas por: fim de timeline GSAP (callbacks), clique/tecla do
usuário, e navegação do Router. A máquina é a **fonte única de verdade**; GSAP e
Router são efeitos dela.

### 4.3 Rotas e URL

Cada categoria tem URL real (`/projetos` etc.) — bom para SEO, deep-link e
compartilhamento. Ao carregar direto numa rota interna (sem passar pelo menu),
a experiência pula `intro-forming` e vai direto para `internal-page` com a
galáxia já reenquadrada (sem animação de formação longa; fade curto).

`prefers-reduced-motion` ou `pointer: coarse` (mobile) → sem cursor custom,
transições encurtadas/simplificadas (ver Seção 6).

### 4.4 Camada de conteúdo (nova)

Extrair os dados dos componentes de seção para `src/content/`:

```
src/content/
  projects.ts     // Project[]  — title, description, image, features[], liveUrl, githubUrl, featured
  stack.ts        // technicalSkills[], categories[], softSkills[]
  about.ts        // bio parágrafos[], pillars[] (icon, title, description)
  contact.ts      // email, phone, location, whatsapp, instagram
  profile.ts      // nome, título, tagline do Hero
```

Tipos em `src/content/types.ts`. Componentes passam a **consumir** esses
módulos; nenhum dado novo é inventado.

### 4.5 Componentes novos

| Componente | Responsabilidade | Depende de |
|---|---|---|
| `OrbitalExperience` | layout persistente, monta Canvas + overlay + cursor + rotas | máquina de estados |
| `GalaxyCanvas` | wrapper `<Canvas>`, DPR/perf tier, Suspense | `three`, `@react-three/fiber` |
| `ParticleField` | gera posições (núcleo + halo), anima formação, idle | GSAP, buffer atributos |
| `GalaxyCamera` | expõe API imperativa (`focusCenter()`, `focusSide()`) via GSAP | `gsap`, R3F `useThree` |
| `useExperienceMachine` | reducer de estados + callbacks | — |
| `OrbitalMenu` | wordmark + 4 labels posicionados (projeção 3D→2D), hover/foco | `ParticleField` anchors |
| `CustomCursor` | div DOM, lerp, estados idle/hover/travel | rAF |
| `ContentPage` | layout de página interna (back button, conteúdo, bottom nav) | `src/content/*`, shadcn |
| `BottomNav` | nav inferior com as outras 3 categorias | Router |
| `PageTransition` | transição lateral+zoom entre páginas internas | GSAP/CSS |

### 4.6 Componentes reaproveitados

- shadcn: `button`, `card`, `badge`, `dialog`, `form`/`input`/`textarea`/`label`,
  `toast`/`sonner`, `tooltip`.
- Lógica do form de contato (`handleSubmit` → WhatsApp) de `Contact.tsx`.
- Imagens `src/assets/*.jpg` e `profile.png`.
- Tokens de `src/index.css` (expandidos).

### 4.7 Componentes removidos

- `PortfolioLayout.tsx`, `AppSidebar.tsx` (+ `components/ui/sidebar.tsx` se
  nada mais usar).
- `src/App.css`.
- `useInView` (`src/hooks/use-in-view.tsx`) — scroll-reveal não se aplica.
- `@tanstack/react-query` do `App.tsx` e `package.json` se nenhum uso restar.
- Componentes de seção antigos (`Hero/About/Projects/Skills/Contact`) — a
  lógica de apresentação é reescrita em `ContentPage`; os dados migram para
  `src/content/`.

## 5. Fluxo de dados / interação

### 5.1 Entrada (primeira visita, `/`)

1. `GalaxyCanvas` lazy-carrega; Suspense mostra fundo dark liso.
2. `intro-forming`: partículas partem de posições dispersas → GSAP interpola
   até as posições-alvo (núcleo denso + halo). ~2–3 s.
3. `intro-settling`: idle motion liga; wordmark faz fade-in.
4. `menu-reveal`: 4 labels aparecem staggered (fade + scale) nas âncoras
   orbitais.
5. `idle`: hover/foco realçam label + reagem partículas próximas.

### 5.2 Navegação para categoria (menu → página interna)

1. Clique num label → `traveling`: `CustomCursor` viaja até a posição do label
   (~350–450 ms; segundo clique ou Enter pula direto).
2. Ao chegar → `navigating`, timeline GSAP em ordem:
   a. overlay escuro faz fade-out;
   b. labels recolhem (scale-down + translateY + fade, staggered);
   c. `GalaxyCamera.focusSide()` — dolly + zoom, reenquadra a galáxia numa
      posição lateral/secundária;
   d. Router navega para a rota; `ContentPage` monta;
   e. conteúdo textual faz fade/slide-in;
   f. `BottomNav` aparece por último.
3. Estado final: `internal-page`.

### 5.3 Navegação entre páginas internas (via BottomNav)

`PageTransition`: conteúdo atual dá zoom + desliza para a direita saindo;
conteúdo novo entra da esquerda com zoom inverso; simultâneo (crossfade
coreografado). A câmera **não** volta ao centro. URL muda.

### 5.4 Volta ao mapa central (back button)

`returning`: reverso da coreografia — `BottomNav` some, conteúdo some,
`GalaxyCamera.focusCenter()`, labels re-aparecem, estado volta a `idle`.

### 5.5 Layout de toda página interna

- Back button fixo no canto superior esquerdo (seta + "VER TUDO").
- Galáxia visível ao fundo, reenquadrada (não centralizada).
- Conteúdo principal: título da seção + conteúdo (cards/form shadcn),
  centralizado na área de conteúdo, com scroll interno se necessário.
- `BottomNav` fixo embaixo com as outras 3 categorias.

## 6. Responsividade, acessibilidade, performance

### 6.1 Tiers de performance

| | Desktop | Mobile / low-end |
|---|---|---|
| Partículas | 8 000–15 000 | 2 000–4 000 |
| DPR | até 2 | 1–1.5 (clamp) |
| Bloom | stretch goal (medido) | nunca |
| Idle motion | shader/rAF completo | reduzido ou congelado após settle |
| Cursor custom | sim (`pointer: fine`) | não — tap direto |

Detecção: `window.matchMedia('(pointer: coarse)')`,
`navigator.hardwareConcurrency`, `navigator.deviceMemory` (quando disponível).

### 6.2 `prefers-reduced-motion`

Galáxia renderiza um frame estático (ou imagem/CSS fallback); navegação
instantânea sem coreografia; sem cursor custom; sem idle motion.

### 6.3 Acessibilidade

- Labels orbitais são elementos DOM focáveis (`<a>`/`<button>`), não texto
  WebGL. Ordem de tab lógica, foco visível, `Enter`/`Space` navega.
- `cursor: none` só quando o cursor custom está ativo; nunca em touch/teclado.
- Skip-link para o conteúdo; landmarks (`<main>`, `<nav>`).
- Texto das páginas internas 100% no DOM (crawlers + leitores de tela).
- Contraste AA no texto sobre a galáxia (overlay/vinheta garante legibilidade).

### 6.4 Bundle

- `GalaxyCanvas` e `three`/R3F/drei em chunk separado via `React.lazy`.
- Rota inicial não bloqueia no WebGL: HTML/wordmark aparecem antes do Canvas.
- Fixar: `three@^0.160`, `@react-three/fiber@^8`, `@react-three/drei@^9`,
  `gsap@^3.12`. **Não** subir para R3F 9 (exige React 19).

### 6.5 SEO

- Meta tags por rota (título/descrição por categoria).
- Corrigir placeholders do `index.html` (og:image, canonical).
- Conteúdo textual renderizado no DOM em todas as rotas.

## 7. Riscos e mitigação

| Risco | Severidade | Mitigação |
|---|---|---|
| Shader GLSL volumétrico + bloom caro em mobile | Alta | Cortado do MVP — sprites additivos. Bloom só como stretch medido. |
| Contagem de partículas trava Android mid-range | Média | Tiers de perf; 1 único `<Points>`; animação via atributos de buffer, nunca React state por partícula. |
| Coordenar GSAP ↔ Router ↔ estado ↔ Suspense | Média | Máquina de estados explícita como fonte única; Canvas persistente; testes da máquina isolados. |
| `cursor: none` prejudica a11y / touch | Média | Só em `pointer: fine` + sem reduced-motion; fallback teclado obrigatório. |
| Latência percebida no "cursor viaja até o botão" | Baixa | Duração curta + skip no 2º clique/Enter. |
| Peso do `three` no First Load | Média | Lazy-load + code-split; medir com `vite build` + análise de chunk. |
| Deep-link direto em rota interna sem galáxia formada | Baixa | Pular `intro-forming`, ir direto a `internal-page` com fade curto. |

## 8. Plano de fases (checkpoints de revisão)

### Fase 0 — Fundação
- Instalar e fixar `three`/R3F 8/drei/`gsap`.
- Ativar dark mode como padrão; adicionar token roxo secundário; remover
  `App.css`; remover `react-query` se sem uso.
- Criar `src/content/` e migrar dados de `Hero/About/Projects/Skills/Contact`.
- Implementar `useExperienceMachine` (reducer + testes).
- Scaffold de rotas (`/`, `/projetos`, `/stack`, `/sobre`, `/contato`) e
  `OrbitalExperience` (layout persistente, ainda sem visual).
- **Entregável**: navegação por rota funcionando com placeholders; máquina de
  estados testada. Sem WebGL ainda.

### Fase 1 — Partículas + animação de formação
- `GalaxyCanvas` (lazy + Suspense + perf tier).
- `ParticleField`: 1x `<Points>`, sprite circular additivo; posições-alvo
  (núcleo denso + halo disperso).
- Timeline GSAP: disperso → formado com easing; depois idle motion sutil.
- `prefers-reduced-motion` → frame estático.
- **Entregável**: galáxia se forma ao carregar `/` e respira em idle; roda a
  60 fps no desktop e ≥30 fps num mid-range.

### Fase 2 — Núcleo central
- Densificar/estilizar o aglomerado central + halo de glow (sprite).
- Wordmark 2D ("Gustavo Gonçalves / Desenvolvedor Web") sobreposto.
- Medir bloom real (`@react-three/postprocessing`); manter só se ≥30 fps no
  mid-range, senão descartar.
- **Entregável**: núcleo com identidade visual fechada; wordmark posicionado.

### Fase 3 — Menu orbital
- 4 categorias em âncoras fixas ao redor do núcleo (projeção 3D→2D → labels
  DOM).
- Ícone lucide + label; aparecem só após `menu-reveal` (fade/scale staggered).
- Hover/foco: realce do label + reação das partículas próximas.
- **Entregável**: menu orbital navegável por mouse e teclado (navegação ainda
  sem coreografia — pode ser troca direta).

### Fase 4 — Cursor customizado + coreografia de transição
- `CustomCursor` (div DOM, lerp rAF, estados idle/hover/travel; só
  `pointer: fine`).
- Sequência de clique: cursor viaja → timeline (overlay → labels recolhem →
  câmera `focusSide` → rota → conteúdo → bottom nav).
- `ContentPage` (back button, conteúdo via `src/content/*` + shadcn, bottom
  nav).
- `PageTransition` lateral+zoom entre páginas internas.
- Coreografia reversa (`returning`) ao voltar ao menu.
- Fallbacks: teclado navega direto; reduced-motion pula coreografia.
- **Entregável**: fluxo completo menu ↔ páginas ↔ menu com coreografia.

### Fase 5 — Responsividade, performance, a11y, polish
- Tier mobile completo (menos partículas, sem bloom, cursor nativo, transições
  encurtadas).
- Medição de FPS em device real mid-range; orçamento de draw calls.
- SEO: meta por rota; corrigir `index.html`; validar conteúdo no DOM.
- Estados de loading, foco visível, `aria`, skip-link.
- QA cross-browser (Chrome, Firefox, Safari, Safari iOS, Chrome Android).
- **Entregável**: experiência pronta para produção.

## 9. Estratégia de testes

- **Unitário**: `useExperienceMachine` (todas as transições e guardas);
  utilidades de geração de posições de partículas (determinismo com seed);
  projeção 3D→2D das âncoras.
- **Componente**: `ContentPage` renderiza dados de `src/content/*`;
  `BottomNav` mostra as 3 outras categorias; form de contato monta URL do
  WhatsApp corretamente.
- **Integração**: navegação por rota; deep-link direto em rota interna;
  `prefers-reduced-motion` desliga animações.
- **Manual/visual**: coreografia de transição; FPS por tier; a11y de teclado;
  comportamento touch.
- WebGL em si não é testado por unidade — verificado por FPS/manual.

## 10. Fora de escopo (possíveis follow-ups)

- Shader GLSL volumétrico e post-processing bloom.
- Áudio ambiente.
- i18n.
- Painel/CMS para editar conteúdo.
- Página de detalhe por projeto (hoje cada projeto é um card com link externo).
