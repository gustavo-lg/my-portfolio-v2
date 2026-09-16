# Redesign do Portfólio — Conceito "Sistema Orbital"

## Contexto do projeto existente

- Repositório: `github.com/gustavo-lg/my-portfolio` (privado)
- Site publicado: https://gustavogoncalves.dev.br/
- Stack real: **Vite + React + TypeScript + Tailwind + shadcn/ui** (não Next.js — ajustar stack técnica abaixo)
- Conteúdo (textos, projetos, dados) já existe — este redesign é sobre a **camada de experiência/navegação**, não recriar conteúdo do zero
- **Implementação será feita via Claude Code (CLI/VS Code)**, direto no repo local, não neste chat — este `.md` serve como guia/contexto pra passar ao Code

## Referência
- **BlueYard** (blueyard.com) por Unseen Studio — [Awwwards](https://www.awwwards.com/inspiration/blueyard-orbit-systems-galaxy-inspiration)
- Nebulosa de partículas central + tópicos orbitando como pontos de menu + navegação não convencional

## Conceito adaptado

Trocar a temática "cripto/VC" da BlueYard por uma temática de **desenvolvedor fullstack / sistemas**, mantendo a linguagem visual: dark mode, partículas, nebulosa central como elemento de identidade, categorias orbitando como "sistemas" navegáveis.

### Categorias propostas (ao redor do centro)
> Ajustar depois — proposta inicial baseada no seu perfil técnico

- **FRONTEND** — React, Next.js, TypeScript
- **AUTOMAÇÃO** — n8n, integrações, workflows
- **SAAS PROJECTS** — GA4 Clone, RendO.ia, projetos próprios
- **CLIENT WORK** — Mello Imóveis, Top10 Multimarcas, Mapa do Sabor
- **SOBRE MIM** — bio, trajetória (QA → Fullstack)
- **CONTATO**

### Elemento central
Uma "nebulosa" ou "bolha" (nome pessoal, logo abstrata, ou representação do seu stack) — precisa decidir o que ela representa visualmente.

## Transição entre páginas de conteúdo (via bottom navigation)

Quando o usuário navega de uma página pra outra usando a bottom navigation (sem voltar ao mapa central), a transição do conteúdo do main/container segue um efeito de **troca lateral com zoom**:

- **Conteúdo atual (saindo)**: recebe zoom (aumenta/escala) enquanto se desloca para a **direita**, saindo de cena
- **Conteúdo novo (entrando)**: faz o movimento inverso — entra vindo da **esquerda**, com zoom inverso (de pequeno/afastado para o tamanho normal), até se estabilizar na posição final

Os dois movimentos acontecem simultaneamente (crossfade coreografado), reforçando a sensação de "deslizar" entre módulos de um sistema, não uma troca de página tradicional.

## Coreografia da transição de navegação (detalhada)

Ao clicar num botão (após o cursor circular chegar até ele), a transição segue esta sequência, **em ordem**:

1. **Overlay escuro some** (fade out do overlay/vinheta que escurece a cena)
2. **Botões do menu recolhem** — todos os labels/ícones de categoria desaparecem de forma animada, "encolhendo pra baixo" (scale down + translateY + fade, staggered entre os botões)
3. **Câmera se move** — a câmera do Three.js desloca a posição (ex: pra direita) e dá **zoom** na galáxia, reenquadrando a nebulosa numa posição secundária/lateral da tela (deixa de ser o centro absoluto, vira "pano de fundo" da página)
4. **Conteúdo da página carrega** — título, texto e demais elementos da página aparecem na área principal (main/container), sobre o novo enquadramento da galáxia

### Layout padrão de toda página interna
- **Back button** — fixo no canto superior esquerdo (ícone de seta + texto tipo "VIEW ALL" ou "VOLTAR"), presente em todas as páginas
- **Galáxia reenquadrada** — permanece visível como fundo, deslocada (não mais centralizada)
- **Conteúdo principal** — título da seção + texto descritivo, centralizado na área de conteúdo
- **Bottom navigation** — barra inferior fixa, carregada **depois** do conteúdo principal, contendo os ícones das outras categorias (permite pular direto pra outra seção sem voltar ao mapa central)

### Ordem de carregamento da página de destino
1. Câmera termina o movimento/zoom
2. Conteúdo textual da página aparece (fade/slide in)
3. Bottom navigation aparece por último, com os ícones das categorias

## Cursor customizado (elemento central de interação)

O cursor do mouse é substituído por um **círculo customizado** que reforça a sensação de "sistema":

- **Estado padrão**: círculo flutua livremente no centro da tela (ou próximo dele), com movimento sutil/orgânico (não gruda 100% no ponteiro real — segue com leve delay/easing, tipo "lag" suave)
- **Estado hover**: ao passar sobre um botão/categoria, o círculo reage (pode aumentar, mudar cor, ou se "encaixar" na posição do botão)
- **Estado clique**: ao clicar num botão,
  1. o círculo **viaja até a posição exata do botão clicado** (animação de movimento, não instantâneo)
  2. só **depois** de chegar lá, dispara a transição pra próxima página/fase

Isso implica: o cursor real do sistema operacional provavelmente fica oculto (`cursor: none`), e o círculo customizado é renderizado via DOM (div posicionado) ou dentro da cena Three.js, com sua posição controlada por estado + GSAP/spring physics (lerp/lag no seguimento do mouse).

### Implicações técnicas
- Cursor customizado: `useState`/`useRef` pra posição, `requestAnimationFrame` ou `framer-motion`/`GSAP` pra suavizar o movimento (lerp)
- Sequência de clique: máquina de estados adicional — `idle → traveling-to-target → arrived → page-transition`
- Precisa desabilitar o cursor nativo (`cursor: none` no container) e garantir acessibilidade (fallback para teclado/leitores de tela)

## Sequência de animação de entrada (crítico)

O site **não carrega estático** — a experiência começa com uma animação de formação:

1. **Fase 1 — Formação** — as partículas nascem (dispersas ou saindo de um ponto central) e convergem progressivamente até formar a nebulosa/galáxia completa. Efeito tipo "big bang controlado" ou aglutinação gravitacional.
2. **Fase 2 — Assentamento** — a estrutura se estabiliza, com movimento sutil contínuo (respiração/flutuação), sem menu visível ainda.
3. **Fase 3 — Menu aparece** — só depois da estrutura formada, os labels e ícones das categorias fazem fade-in/scale-in sobre a nebulosa já pronta.
4. **Fase 4 — Idle/interativo** — usuário pode hover e clicar nas categorias.

Isso implica uma **máquina de estados** controlando a timeline (ex: `intro-forming` → `intro-settling` → `menu-reveal` → `idle` → `navigating`), coordenada com GSAP Timeline, não só CSS animation solto.

## Stack técnica

| Camada | Tecnologia |
|---|---|
| Framework | **Vite + React + TypeScript** (stack já existente no repo) |
| Estilo | Tailwind + shadcn/ui (já existente) |
| 3D / Partículas | Three.js (via `@react-three/fiber` + `@react-three/drei`) |
| Shader da nebulosa | GLSL customizado (noise + glow/bloom) |
| Sistema de partículas | `Points` do Three.js ou `InstancedMesh`, com movimento browniano sutil |
| Transições de câmera/página | GSAP (dolly/zoom da câmera + fade) |
| Roteamento | React Router (ou o que já estiver no projeto) + transições de rota custom |
| Deploy | Vercel (já em uso) |

## Estrutura de implementação (fases)

### Fase 1 — Fundo de partículas + animação de formação
- Sistema de partículas em Three.js formando a nebulosa
- Estado inicial: partículas dispersas/aleatórias (ou concentradas num ponto)
- Timeline animando a posição de cada partícula até a formação final (ex: interpolação de posição aleatória → posição-alvo na estrutura, com easing)
- Cores: paleta dark com 1-2 cores de destaque (a definir — a BlueYard usa azul/roxo)
- Movimento sutil contínuo após formada (idle), sem travar performance em mobile

### Fase 2 — Núcleo central (bolha/nebulosa)
- Shader com noise deformando uma esfera, ou glow volumétrico
- Efeito de bloom/glow

### Fase 3 — Menu orbital
- Posicionar categorias em pontos fixos ao redor do centro (coordenadas 3D projetadas em 2D)
- Ícone + label por categoria
- **Aparecem só após a Fase 1 (formação) terminar** — fade-in/scale-in coordenado via timeline
- Hover: brilho/escala aumenta, elementos próximos reagem

### Fase 4 — Cursor customizado e transição de navegação
- Implementar círculo flutuante substituindo o cursor nativo
- Clique → círculo viaja até a posição do botão (animação) → **então** dispara a coreografia de transição:
  1. Overlay escuro some
  2. Botões do menu recolhem (staggered)
  3. Câmera se move e dá zoom, reenquadrando a galáxia numa posição secundária
  4. Conteúdo da página carrega (texto) → depois bottom navigation aparece
- Implementar layout padrão de página interna: back button fixo (canto superior esquerdo), galáxia de fundo reenquadrada, conteúdo principal, bottom navigation com ícones das demais categorias
- Implementar transição lateral entre páginas de conteúdo (via bottom nav): conteúdo atual dá zoom + desloca pra direita saindo; conteúdo novo entra da esquerda com zoom inverso, simultâneo (crossfade coreografado)
- Transição de volta ao mapa central (reverso da coreografia, ou nova sequência)

### Fase 5 — Responsividade e performance
- Fallback para mobile (menos partículas, ou versão 2D/CSS do efeito)
- Lazy load do Three.js, teste de FPS

## Pontos em aberto (decidir antes de codar)
- [ ] Definir as categorias finais do menu (usar as seções já existentes no conteúdo real do portfólio)
- [x] Paleta de cores: **azul/roxo**, seguindo a referência BlueYard
- [ ] O que o núcleo central representa (nome, logo, avatar abstrato)
- [ ] Terá áudio ambiente como a BlueYard? (provavelmente não necessário)
- [ ] Nível de fidelidade ao efeito original vs. versão simplificada/performática