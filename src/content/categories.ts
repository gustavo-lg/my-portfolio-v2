import type { CategoryMeta } from "./types";

export const categories: CategoryMeta[] = [
  {
    key: "projetos",
    label: "PROJETOS",
    path: "/projetos",
    icon: "Boxes",
    blurb: "Produtos, plataformas e sites entregues.",
  },
  {
    key: "stack",
    label: "STACK",
    path: "/stack",
    icon: "Layers",
    blurb: "Tecnologias e ferramentas que domino.",
  },
  {
    key: "sobre",
    label: "SOBRE",
    path: "/sobre",
    icon: "User",
    blurb: "Trajetória e forma de trabalhar.",
  },
  {
    key: "contato",
    label: "CONTATO",
    path: "/contato",
    icon: "Mail",
    blurb: "Vamos conversar sobre seu projeto.",
  },
];

export const categoryByPath: Record<string, CategoryMeta> = Object.fromEntries(
  categories.map((c) => [c.path, c]),
);
