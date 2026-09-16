# Gustavo Gonçalves — Portfólio

Portfólio pessoal como experiência imersiva em WebGL: uma galáxia de
partículas renderizada com Three.js/React Three Fiber substitui a navegação
tradicional por scroll. As categorias (Projetos, Stack, Sobre, Contato)
orbitam um núcleo central; selecionar uma delas dispara uma sequência
coreografada de câmera + morph de partículas até a cena daquela página.

**Produção**: https://gustavogoncalves.dev.br/

## Stack

- **Build**: Vite 5, TypeScript 5, `@vitejs/plugin-react-swc`
- **UI**: React 18, React Router 6, Tailwind CSS 3, shadcn/ui (Radix)
- **3D/animação**: Three.js, `@react-three/fiber`, `@react-three/drei`, GSAP
- **Testes**: Vitest + Testing Library (jsdom)
- **Deploy**: Vercel

## Rodando localmente

Requer Node.js e npm.

```sh
npm install
npm run dev
```

Outros scripts:

```sh
npm run build       # build de produção
npm run build:dev   # build em modo development (debug mais fácil)
npm run preview     # serve o build de produção localmente
npm run lint        # eslint
npm test            # vitest run (suíte completa)
npm run test:watch  # vitest em modo watch
```

## Estrutura

```
src/
  content/       # dados do portfólio (projetos, stack, sobre, contato) — sem CMS/backend
  experience/    # a "experiência orbital": máquina de estados, câmera, galáxia de partículas, menu, cursor
    galaxy/      # geometria/shader/animação das partículas (Three.js puro + R3F)
    lib/         # tier de qualidade adaptativo, capacidades do dispositivo, HUD de perf
    machine/     # máquina de estados da navegação (menu ↔ categoria ↔ retorno)
    menu/        # labels orbitais, menu
    pages/       # conteúdo de cada categoria, transições de página
  pages/         # rotas de nível superior (NotFound)
scratchpad/      # scripts de harness CDP para medir performance (não fazem parte do app)
```

### Sobre a galáxia de partículas

Uma única nuvem de partículas é alocada uma vez por sessão e nunca remontada:
trocar de degrau de qualidade ou de categoria apenas reajusta quanto do
buffer é desenhado (`geometry.groups`/`drawRange`) e para onde as partículas
fazem morph — sem realocar memória nem recompilar shaders. A qualidade inicial
é escolhida a partir de sinais estáticos do dispositivo (GPU, núcleos,
memória) e só pode ser **rebaixada** depois, nunca promovida, com base em FPS
medido de verdade após a formação de entrada terminar.

Detalhes de por que o sistema é assim — e o histórico de bugs de performance
que motivaram o design atual — estão documentados em
`docs/history/fix-performance.md` e `docs/history/fix-performance-v2.md`.

## Testes

A suíte roda em `vitest` + `jsdom`: sem contexto WebGL real, sem compilação
de shader, sem `requestAnimationFrame` confiável. Toda a lógica pura (câmera,
ladder de qualidade, geometria de partículas, máquina de estados) é extraída
para módulos testáveis; os componentes React Three Fiber (`ParticleField`,
`GalaxyCamera`, `GalaxyCanvas`) não têm teste unitário e são verificados
manualmente via Chrome DevTools Protocol (scripts em `scratchpad/`).

## Documentação adicional

- `docs/superpowers/specs/` e `docs/superpowers/plans/` — specs e planos de
  implementação do redesign "Sistema Orbital" e da navegação por galáxia
  (histórico de decisões de arquitetura).
- `docs/history/` — registro histórico, em ordem cronológica de descoberta:
  `redesign-spec.md` (brief original do redesign) e o ciclo de investigação
  de performance do sistema de qualidade adaptativa (`fix-performance.md` →
  `VALIDACAO-PERFORMANCE.md` → `PLANO-CALIBRACAO.md`, cuja recomendação foi
  revertida → `fix-performance-v2.md`, correção definitiva).
