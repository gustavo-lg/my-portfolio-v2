import type { Project } from "./types";
import projetoImob from "@/assets/projeto-imob.jpg";
import projetoPokedex from "@/assets/projeto-pokedex.jpg";
import projetoJarvis from "@/assets/projeto-jarvis.jpg";
import projetoGuardei from "@/assets/projeto-guardei.jpg";
import projetoRendoia from "@/assets/projeto-rendoia.jpg";
import projetoPoupeFacil from "@/assets/projeto-poupefacil.jpg";

export const projects: Project[] = [
  {
    title: "Projeto Imob",
    description:
      "Desenvolvi um site imobiliário completo, rápido e fácil de usar, feito para atrair mais clientes e ter destaque no Google. Mais do que um simples site, é uma plataforma de negócios que se adapta a qualquer imobiliária, com integração a sistemas de CRM e possibilidade de enviar automaticamente os leads para outros sistemas. Tudo isso pensado para facilitar a gestão e aumentar as vendas.",
    image: projetoImob,
    features: [
      "Alta performance",
      "Otimizado para o Google",
      "Contato direto via WhatsApp",
      "Automação inteligente",
      "Gestão fácil de imóveis",
      "Integração com CRM",
      "Design moderno e responsivo",
    ],
    liveUrl: "https://imobiliario.vercel.app/",
    githubUrl: "#",
    featured: true,
  },
  {
    title: "RendO.ia",
    description:
      "Desenvolvi um sistema online moderno e flexível, implantado do zero para atender às necessidades do cliente. A plataforma integra pagamentos via Kiwify, automações inteligentes e atendimento pelo WhatsApp, permitindo uma gestão mais ágil, prática e totalmente automatizada do negócio. ",
    image: projetoRendoia,
    features: [
      "Sistema rápido e moderno",
      "Chatbot funcional",
      "Pagamentos automatizados",
      "Pagamentos via Kiwify",
      "Atendimento via WhatsApp",
      "Automação de tarefas",
      "Integração com inteligência artificial",
      "Gestão simples e eficiente",
    ],
    liveUrl: "https://www.rendoia.com.br/",
    githubUrl: "#",
    featured: true,
  },
  {
    title: "Jarvis",
    description:
      "Desenvolvi uma página de vendas personalizada, integrada à Hotmart para gerenciamento de pagamentos e planos. O sistema conta com um painel dinâmico, chatbot inteligente e automações via WhatsApp, tornando o atendimento e a gestão muito mais rápidos, eficientes e profissionais.",
    image: projetoJarvis,
    features: [
      "Sistema rápido e moderno",
      "Dashboard dinâmico",
      "Chatbot funcional",
      "Layout redesenhado com foco em usabilidade",
      "Desempenho e experiência do usuário",
      "Pagamentos automatizados",
      "Pagamentos via Hotmart",
      "Atendimento via WhatsApp",
      "Automação de tarefas",
      "Integração com inteligência artificial",
      "Gestão simples e eficiente",
    ],
    liveUrl: "https://www.useojarvis.com/",
    githubUrl: "#",
    featured: true,
  },
  {
    title: "Poupe Fácil",
    description:
      "Desenvolvi uma página de vendas personalizada, integrada à Hotmart para gerenciamento de pagamentos e planos. O sistema conta com um painel dinâmico, chatbot inteligente e automações via WhatsApp, tornando o atendimento e a gestão muito mais rápidos, eficientes e profissionais.",
    image: projetoPoupeFacil,
    features: [
      "Sistema rápido e moderno",
      "Chatbot funcional",
      "Layout redesenhado com foco em usabilidade",
      "Desempenho e experiência do usuário",
      "Pagamentos automatizados",
      "Pagamentos via Hotmart",
      "Atendimento via WhatsApp",
      "Automação de tarefas",
      "Integração com inteligência artificial",
      "Gestão simples e eficiente",
    ],
    liveUrl: "https://poupefacilia.com.br/",
    githubUrl: "#",
    featured: true,
  },
  {
    title: "Guardei App",
    description:
      "Desenvolvi um sistema online moderno e flexível, implantado do zero para atender às necessidades do cliente. A plataforma integra pagamentos via Greenn, automações inteligentes e atendimento pelo WhatsApp, permitindo uma gestão mais ágil, prática e totalmente automatizada do negócio. ",
    image: projetoGuardei,
    features: [
      "Sistema rápido e moderno",
      "Chatbot funcional",
      "Layout redesenhado com foco em usabilidade",
      "Desempenho e experiência do usuário",
      "Pagamentos automatizados",
      "Pagamentos via Greenn",
      "Atendimento via WhatsApp",
      "Automação de tarefas",
      "Integração com inteligência artificial",
      "Gestão simples e eficiente",
    ],
    liveUrl: "https://guardei.vercel.app/",
    githubUrl: "#",
    featured: true,
  },
  {
    title: "Pokedex Next",
    description:
      "Pokedex desenvolvida com Next.js (App Router) e TypeScript, integrando a PokéAPI. Permite busca por nome, exibe detalhes dos Pokémon com renderização SSR, paginação e carregamento dinâmico. Interface responsiva com Material UI e Skeleton Loaders para melhor experiência do usuário.",
    image: projetoPokedex,
    features: ["Next.js", "React", "TypeScript", "CSS", "Axios", "MUI", "API Rest"],
    liveUrl: "https://pokedex-next-y3qk.vercel.app/",
    githubUrl: "https://github.com/gustavo-lg/pokedex-next",
    featured: false,
  },
  {
    title: "Meus Repositórios",
    description:
      "Meus Repositórios Aplicação desenvolvida com React que consome a API do GitHub para listar repositórios de um usuário e exibir detalhes individuais de cada um deles.",
    image: null,
    features: ["React", "Javascript", "Axios", "API Rest"],
    liveUrl: "https://meus-repositorios-beta.vercel.app/",
    githubUrl: "https://github.com/gustavo-lg/meus-repositorios",
    featured: false,
  },
  {
    title: "Blog Platform",
    description:
      "Plataforma de blog com editor rico, painel integrado com Supabase para gerenciamento de dados e storage.",
    image: null,
    features: ["Next.js", "MDX", "Tailwind"],
    liveUrl: "https://imobiliario.vercel.app/blog",
    githubUrl: "#",
    featured: false,
  },
  {
    title: "GWD Landing Page",
    description:
      "Landing page criada para a agência GWD - Global Web Development, utilizando React, TypeScript, SCSS e Material UI para uma interface moderna e responsiva.",
    image: null,
    features: ["React", "TypeScript", "SCSS", "MUI", "HTML"],
    liveUrl: "https://gwd-landingpage.vercel.app/",
    githubUrl: "https://github.com/example",
    featured: false,
  },
];
