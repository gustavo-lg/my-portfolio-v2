import type { AboutPillar } from "./types";

export const aboutIntro =
  "Background técnico em QA/SDET e desenvolvimento fullstack, aplicado a um atendimento ao cliente mais rápido e resolutivo.";

export const aboutParagraphs: string[] = [
  "Sei investigar um problema até a causa raiz, entender como uma plataforma funciona por trás da tela e traduzir isso em uma solução clara para quem está do outro lado. Identificar, reproduzir e documentar erros com Pytest, Selenium e Playwright é, essencialmente, diagnosticar problemas de usuário até a origem.",
  "Tenho vivência com produtos SaaS B2B multiproduto, entendendo tanto a lógica de negócio quanto o funcionamento técnico de plataformas web — front-end, back-end, banco de dados e integrações. Lido bem com alto volume de informação e múltiplas frentes simultâneas, rotina comum em projetos com vários clientes e sistemas rodando em paralelo.",
  "Gosto genuinamente de resolver o problema do cliente e de deixar essa experiência mais simples do que ela parecia no início. Também gosto de compartilhar o que aprendo, seja em conversas com o time, documentações ou conteúdos técnicos.",
];

export const aboutGoal =
  "Busco uma posição de Analista de Suporte Técnico em empresa de tecnologia, onde possa unir esse olhar técnico com atendimento e experiência do cliente.";

export const pillars: AboutPillar[] = [
  {
    icon: "Search",
    title: "Diagnóstico até a causa raiz",
    description:
      "Identificar, reproduzir e documentar erros até encontrar onde o problema realmente mora.",
  },
  {
    icon: "Layers",
    title: "Visão fullstack da plataforma",
    description:
      "Front-end, back-end, banco de dados e integrações — entender o sistema inteiro, não só a tela.",
  },
  {
    icon: "Zap",
    title: "Automação de processos",
    description:
      "Uso de n8n para eliminar tarefas repetitivas e otimizar fluxos de atendimento.",
  },
  {
    icon: "MessageSquare",
    title: "Comunicação clara",
    description:
      "Traduzir o técnico em uma solução simples para quem está do outro lado, e documentar o caminho.",
  },
];
